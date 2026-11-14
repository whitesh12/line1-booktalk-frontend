/**
 * 마이크 녹음. 안드로이드·크롬은 webm(opus), 아이폰 사파리는 mp4(aac)로 녹음된다.
 * 서버 음성 인식(POST /speech/transcriptions)으로 보내 글자로 바꾼다.
 */
export const MAX_RECORD_MS = 30_000; // 서버 제한(60초)보다 짧게, 문장 한두 개 길이

export class MicError extends Error {
  constructor(public code: 'NO_MIC' | 'DENIED' | 'UNSUPPORTED', message: string) {
    super(message);
  }
}

const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export interface Recording {
  /** 녹음을 멈추고 녹음 파일을 돌려준다 */
  stop: () => Promise<Blob>;
  /** 녹음을 버린다 (화면을 떠날 때 등) */
  cancel: () => void;
}

/** 자동으로 멈춘 이유: 말을 마침(조용해짐) / 말소리가 없음 / 최대 시간 */
export type AutoStopReason = 'silence' | 'no-speech' | 'max';

export interface RecordOptions {
  /** 소리 크기(0~1)와 녹음한 시간(ms). 약 0.1초마다 */
  onLevel?: (level: number, elapsedMs: number) => void;
  /** 저절로 멈췄을 때 */
  onAutoStop?: (reason: AutoStopReason) => void;
}

const SILENCE_MS = 1500; // 말을 시작한 뒤 이만큼 조용하면 말을 마친 것으로 본다
const NO_SPEECH_MS = 8000; // 처음부터 이만큼 아무 말이 없으면 멈춘다

export async function startRecording(opts: RecordOptions = {}): Promise<Recording> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new MicError('UNSUPPORTED', '이 브라우저에서는 마이크 입력을 쓸 수 없어요. 글로 입력해 주세요.');
  }
  // 아이폰은 '누른 순간'에 만든 오디오만 동작해서, 마이크 권한을 묻기 전에 먼저 만들어 둔다
  const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext });
  const Ctx = AC.AudioContext ?? AC.webkitAudioContext;
  const meterCtx = Ctx ? new Ctx() : null;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    meterCtx?.close?.().catch(() => {});
    const name = (e as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new MicError('DENIED', '마이크 권한을 허용하면 말로 입력할 수 있어요.');
    throw new MicError('NO_MIC', '마이크를 찾지 못했어요. 글로 입력해 주세요.');
  }
  const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported?.(t));
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  let meter: ReturnType<typeof setInterval> | undefined;
  const release = () => {
    clearInterval(meter);
    stream.getTracks().forEach((t) => t.stop());
    meterCtx?.close?.().catch(() => {});
  };
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => { release(); resolve(new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' })); };
  });
  rec.start();
  const started = Date.now();
  const autoStop = (reason: AutoStopReason) => { if (rec.state === 'recording') { rec.stop(); opts.onAutoStop?.(reason); } };

  // 소리 크기 재기 → 화면 막대 + 말을 멈추면 자동으로 끝내기
  if (meterCtx) {
    meterCtx.resume?.().catch(() => {});
    const analyser = meterCtx.createAnalyser();
    analyser.fftSize = 1024;
    meterCtx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let floor = 0; // 주변 소음 크기 (처음 0.4초로 잰다)
    let floorSamples = 0;
    let spoke = false;
    let lastLoud = started;
    meter = setInterval(() => {
      const now = Date.now();
      const elapsed = now - started;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      if (elapsed < 400) { floor = (floor * floorSamples + rms) / ++floorSamples; }
      const threshold = Math.max(0.015, floor * 2.5); // 주변보다 확실히 큰 소리를 '말'로 본다
      if (rms > threshold) { spoke = true; lastLoud = now; }
      opts.onLevel?.(Math.min(1, rms * 6), elapsed);
      if (spoke && now - lastLoud > SILENCE_MS) autoStop('silence');
      else if (!spoke && elapsed > NO_SPEECH_MS) autoStop('no-speech');
      else if (elapsed > MAX_RECORD_MS) autoStop('max');
    }, 100);
  } else {
    // 소리 크기를 잴 수 없는 브라우저: 최대 시간만
    const t = setTimeout(() => autoStop('max'), MAX_RECORD_MS);
    meter = t as unknown as ReturnType<typeof setInterval>;
  }
  return {
    stop: () => { clearInterval(meter); if (rec.state === 'recording') rec.stop(); return done; },
    cancel: () => { rec.ondataavailable = null; if (rec.state === 'recording') rec.stop(); release(); },
  };
}

/** 녹음 파일 확장자 (서버가 파일 이름으로 형식을 판단할 때를 대비) */
export const audioExt = (type: string) => (type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : 'webm');

/**
 * 녹음 파일(webm·mp4 등)을 서버가 받는 wav(16kHz 모노, 16비트)로 바꾼다.
 * 서버 음성 인식은 wav·mp3·aac·ogg·flac 만 받는데, 브라우저는 webm(안드로이드·크롬)·mp4(아이폰)로만 녹음할 수 있다.
 */
export async function toWav(blob: Blob, rate = 16_000): Promise<Blob> {
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext; OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext };
  const AC = w.AudioContext ?? w.webkitAudioContext;
  const OAC = w.OfflineAudioContext ?? w.webkitOfflineAudioContext;
  if (!AC || !OAC) throw new MicError('UNSUPPORTED', '이 브라우저에서는 마이크 입력을 쓸 수 없어요. 글로 입력해 주세요.');
  const ctx = new AC();
  let decoded: AudioBuffer;
  try {
    const buf = await blob.arrayBuffer();
    // 예전 사파리는 콜백 방식만 지원해서 둘 다 받는다
    decoded = await new Promise<AudioBuffer>((resolve, reject) => {
      const p = ctx.decodeAudioData(buf, resolve, reject);
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    });
  } finally {
    ctx.close?.().catch(() => {});
  }
  // 16kHz 모노로 다시 샘플링
  const off = new OAC(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start(0);
  const pcm = (await off.startRendering()).getChannelData(0);
  // WAV(PCM 16비트) 머리말 + 데이터
  const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const v = Math.max(-1, Math.min(1, pcm[i]));
    out.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([out], { type: 'audio/wav' });
}
