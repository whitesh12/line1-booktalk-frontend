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

export async function startRecording(onAutoStop?: () => void): Promise<Recording> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new MicError('UNSUPPORTED', '이 브라우저에서는 마이크 입력을 쓸 수 없어요. 글로 입력해 주세요.');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    const name = (e as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new MicError('DENIED', '마이크 권한을 허용하면 말로 입력할 수 있어요.');
    throw new MicError('NO_MIC', '마이크를 찾지 못했어요. 글로 입력해 주세요.');
  }
  const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported?.(t));
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const release = () => stream.getTracks().forEach((t) => t.stop());
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => { release(); resolve(new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' })); };
  });
  rec.start();
  const timer = setTimeout(() => { if (rec.state === 'recording') { rec.stop(); onAutoStop?.(); } }, MAX_RECORD_MS);
  return {
    stop: () => { clearTimeout(timer); if (rec.state === 'recording') rec.stop(); return done; },
    cancel: () => { clearTimeout(timer); rec.ondataavailable = null; if (rec.state === 'recording') rec.stop(); release(); },
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
