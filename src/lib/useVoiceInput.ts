import { useEffect, useRef, useState } from 'react';
import { transcribe } from '../api/ai';
import { ApiError } from '../api/client';
import { toast } from '../components/ui';
import { MicError, startRecording, toWav, type AutoStopReason, type Recording } from './recorder';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

/**
 * 마이크로 입력: 한 번 누르면 녹음을 시작하고, 말을 멈추면(1.5초 조용하면) 자동으로 끝내서
 * 서버 음성 인식으로 글자로 바꿔 onText 로 넘긴다. 녹음 중에 다시 누르면 바로 끝낸다.
 * level(0~1)·elapsedMs 로 소리 크기 막대와 시간을 보여 줄 수 있다.
 */
export function useVoiceInput(onText: (text: string) => void, hint?: string) {
  const [state, setState] = useState<VoiceState>('idle');
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const rec = useRef<Recording | null>(null);
  const alive = useRef(true);
  const cb = useRef(onText);
  cb.current = onText;

  const starting = useRef(false); // 마이크를 켜는 중 (권한 창이 떠 있는 동안 또 누르는 것을 막는다)
  useEffect(() => {
    alive.current = true; // 개발 모드(StrictMode)에서 다시 붙을 때도 살아 있게
    return () => { alive.current = false; rec.current?.cancel(); rec.current = null; };
  }, []);

  async function finish() {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    setState('transcribing');
    setLevel(0);
    try {
      const recorded = await r.stop();
      if (recorded.size < 1000) { toast('말소리가 들리지 않았어요. 다시 말해 주세요.'); return; }
      const text = await transcribe(await toWav(recorded), hint); // 서버가 받는 wav 로 바꿔서 보낸다
      if (!alive.current) return;
      if (text) cb.current(text); else toast('말을 알아듣지 못했어요. 조금 더 크게 다시 말해 주세요.');
    } catch (e) {
      console.warn('[speech] 음성 인식 실패', e);
      if (alive.current) toast(e instanceof ApiError ? e.message : '말을 글로 바꾸지 못했어요. 다시 시도해 주세요.');
    } finally {
      if (alive.current) setState('idle');
    }
  }

  function onAutoStop(reason: AutoStopReason, from: Recording | null) {
    if (!from || from !== rec.current) return; // 이미 끝났거나 다른 녹음에서 온 신호는 무시
    if (reason === 'no-speech') {
      // 아무 말이 없었으면 서버로 보내지 않는다
      rec.current?.cancel();
      rec.current = null;
      setState('idle');
      setLevel(0);
      toast('말소리가 들리지 않았어요. 마이크를 누르고 다시 말해 주세요.');
      return;
    }
    finish();
  }

  async function toggle() {
    if (state === 'transcribing') return;
    if (state === 'recording') { await finish(); return; }
    if (starting.current || rec.current) return;
    starting.current = true;
    try {
      setElapsedMs(0);
      let mine: Recording | null = null;
      const r = await startRecording({
        onLevel: (l, ms) => { if (alive.current && mine === rec.current) { setLevel(l); setElapsedMs(ms); } },
        onAutoStop: (reason) => onAutoStop(reason, mine),
      });
      mine = r;
      // 마이크를 켜는 사이에 화면을 떠났으면 바로 끈다 (서버로 보내지 않음)
      if (!alive.current) { r.cancel(); return; }
      rec.current = r;
      setState('recording');
    } catch (e) {
      if (alive.current) toast(e instanceof MicError ? e.message : '마이크를 켜지 못했어요. 글로 입력해 주세요.');
    } finally {
      starting.current = false;
    }
  }

  return { state, toggle, level, elapsedMs };
}

/** 0:04 처럼 */
export const formatElapsed = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
