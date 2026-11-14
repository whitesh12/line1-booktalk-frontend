import { useEffect, useRef, useState } from 'react';
import { transcribe } from '../api/ai';
import { ApiError } from '../api/client';
import { toast } from '../components/ui';
import { MicError, startRecording, toWav, type Recording } from './recorder';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

/**
 * 마이크로 입력: 한 번 누르면 녹음, 다시 누르면 멈추고 서버 음성 인식으로 글자로 바꿔 onText 로 넘긴다.
 * (30초가 지나면 자동으로 멈춘다)
 */
export function useVoiceInput(onText: (text: string) => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const rec = useRef<Recording | null>(null);
  const alive = useRef(true);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => () => { alive.current = false; rec.current?.cancel(); }, []);

  async function finish() {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    setState('transcribing');
    try {
      const recorded = await r.stop();
      if (recorded.size < 1000) { toast('말소리가 들리지 않았어요. 다시 말해 주세요.'); return; }
      const text = await transcribe(await toWav(recorded)); // 서버가 받는 wav 로 바꿔서 보낸다
      if (!alive.current) return;
      if (text) cb.current(text); else toast('말을 알아듣지 못했어요. 조금 더 크게 다시 말해 주세요.');
    } catch (e) {
      console.warn('[speech] 음성 인식 실패', e);
      if (alive.current) toast(e instanceof ApiError ? e.message : '말을 글로 바꾸지 못했어요. 다시 시도해 주세요.');
    } finally {
      if (alive.current) setState('idle');
    }
  }

  async function toggle() {
    if (state === 'transcribing') return;
    if (state === 'recording') { await finish(); return; }
    try {
      rec.current = await startRecording(() => { finish(); });
      setState('recording');
    } catch (e) {
      toast(e instanceof MicError ? e.message : '마이크를 켜지 못했어요. 글로 입력해 주세요.');
    }
  }

  return { state, toggle };
}
