/**
 * 업로드 전 사진 준비: 어떤 사진이든(앨범·카메라 앱·화면 촬영) JPEG 로 줄이고 4MB 이하인지 확인한다.
 * 큰 휴대폰 사진(10MB 넘는 것)도 서버 분석에 충분한 크기(긴 변 2000px)로 줄이면 대부분 1MB 안팎이 된다.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export class PhotoError extends Error {
  constructor(public code: 'TOO_LARGE' | 'UNREADABLE', message: string) {
    super(message);
  }
}

export const PHOTO_TOO_LARGE = '사진 용량이 너무 커요. 4MB 이하가 되도록 다시 찍거나 다른 사진을 골라 주세요.';
const UNREADABLE = '이 사진은 읽을 수 없어요. JPG·PNG 사진으로 다시 찍거나 골라 주세요.';

/** 긴 변 크기와 JPEG 품질을 차례로 낮춰 가며 4MB 이하가 될 때까지 시도한다 */
const STEPS: [number, number][] = [[2000, 0.85], [1600, 0.8], [1280, 0.75], [1024, 0.7]];

type Decoded = { source: CanvasImageSource; width: number; height: number; done: () => void };

async function decode(file: Blob): Promise<Decoded> {
  // 사진의 회전 정보(EXIF)를 반영해서 읽는다
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() };
  } catch { /* 아래 <img> 방식으로 다시 시도 */ }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new PhotoError('UNREADABLE', UNREADABLE);
  }
}

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

/** 사진을 JPEG(4MB 이하)로 만들어 돌려준다. 줄여도 4MB 를 넘거나 읽을 수 없으면 PhotoError */
export async function preparePhoto(file: Blob, name = `page-${Date.now()}.jpg`): Promise<File> {
  // 이미 작은 JPEG 면 그대로 쓴다 (화면 촬영으로 만든 사진 등)
  if (file.type === 'image/jpeg' && file.size <= MAX_UPLOAD_BYTES && file.size < 1.5 * 1024 * 1024) {
    return file instanceof File ? file : new File([file], name, { type: 'image/jpeg' });
  }
  const img = await decode(file);
  try {
    if (!img.width || !img.height) throw new PhotoError('UNREADABLE', UNREADABLE);
    for (const [side, quality] of STEPS) {
      const scale = Math.min(1, side / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff'; // PNG 투명 배경이 검게 나오지 않게
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
      const blob = await toJpeg(canvas, quality);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) return new File([blob], name, { type: 'image/jpeg' });
    }
    throw new PhotoError('TOO_LARGE', PHOTO_TOO_LARGE);
  } finally {
    img.done();
  }
}
