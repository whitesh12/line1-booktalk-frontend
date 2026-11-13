import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { historyIdx, useGo } from '../../lib/nav';
import { Icon, TabBar } from '../../components/ui';
import { USE_MOCK } from '../../api/client';
import { setPendingPhoto } from '../../data/scanned';
import { PhotoError, preparePhoto } from '../../lib/photo';

type Cam = 'starting' | 'live' | 'off';
const MAX_SIDE = 2000; // 업로드 용량을 줄이려고 긴 변을 2000px 이하로

export function ScanPage() {
  const nav = useNavigate();
  const go = useGo();
  const fileRef = useRef<HTMLInputElement>(null); // 휴대폰 카메라 앱으로 찍기 (카메라 화면을 못 띄울 때)
  const albumRef = useRef<HTMLInputElement>(null); // 앨범에서 고르기
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cam, setCam] = useState<Cam>('starting');
  const [denied, setDenied] = useState(false);
  const [flash, setFlash] = useState(false);
  const [preparing, setPreparing] = useState(false); // 사진 줄이는 중
  const [photoError, setPhotoError] = useState<string | null>(null); // 용량 초과 등

  // 화면 안에 카메라(후면) 미리보기를 띄운다. 권한이 없거나 카메라가 없으면 예전처럼 눌러서 카메라 앱을 연다.
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) { setCam('off'); return; }
    let stopped = false;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    }).then((s) => {
      if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = s;
      const v = videoRef.current;
      if (v) { v.srcObject = s; v.play().catch(() => {}); }
      setCam('live');
    }).catch((e: DOMException) => {
      if (stopped) return;
      setDenied(e?.name === 'NotAllowedError');
      setCam('off');
    });
    return () => {
      stopped = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  /** 어떤 사진이든 JPEG 로 줄이고 4MB 이하인지 확인한 뒤 분석 화면으로 넘긴다. 넘으면 사진 용량 안내를 보여 준다. */
  async function submitPhoto(f: Blob) {
    setPhotoError(null);
    setPreparing(true);
    try {
      const photo = await preparePhoto(f);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setPendingPhoto(photo);
      nav('/scan/analyzing');
    } catch (e) {
      setFlash(false);
      setPhotoError(e instanceof PhotoError ? e.message : '사진을 준비하지 못했어요. 다시 찍거나 골라 주세요.');
    } finally {
      setPreparing(false);
    }
  }

  /** 화면 틀에 보이는 부분만 잘라서 사진으로 만든다 (object-fit: cover 와 같은 영역) */
  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const box = v.getBoundingClientRect();
    const scale = Math.max(box.width / v.videoWidth, box.height / v.videoHeight);
    const sw = box.width / scale;
    const sh = box.height / scale;
    const sx = (v.videoWidth - sw) / 2;
    const sy = (v.videoHeight - sh) / 2;
    const out = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * out);
    canvas.height = Math.round(sh * out);
    canvas.getContext('2d')!.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    setFlash(true);
    canvas.toBlob((blob) => {
      if (blob) submitPhoto(blob);
    }, 'image/jpeg', 0.9);
  }

  const shoot = () => {
    if (preparing) return;
    if (cam === 'live') capture();
    else if (USE_MOCK) nav('/scan/analyzing');
    else fileRef.current?.click();
  };

  const corner = (pos: React.CSSProperties, sides: string) => (
    <span style={{ position: 'absolute', zIndex: 2, width: 44, height: 44, ...pos, borderStyle: 'solid', borderColor: 'var(--mint)', borderWidth: 0, ...Object.fromEntries(sides.split(' ').map((s) => [`border${s}Width`, 4])) }} />
  );
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) submitPhoto(f); };

  return (
    // 휴대폰 화면 높이에 딱 맞춘다 (넘치면 스크롤되면서 하단 탭 바가 셔터를 가렸다). 카메라 틀이 남는 공간만큼 줄어든다.
    <div className="screen" style={{ background: '#12151F', color: '#fff', height: '100dvh' }}>
      <header className="header">
        <button className="icon-btn" style={{ color: '#fff' }} aria-label="뒤로" onClick={() => (historyIdx() > 0 ? nav(-1) : go('/books'))}>{Icon.back()}</button>
        <h1>촬영</h1>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 16px 0' }}>
        <div
          role={cam === 'live' ? undefined : 'button'}
          aria-label={cam === 'live' ? undefined : '카메라로 찍기'}
          onClick={cam === 'live' ? undefined : shoot}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 28, background: 'var(--navy)', display: 'grid', placeItems: 'center', cursor: cam === 'live' ? 'default' : 'pointer', minHeight: 160 }}>
          {/* 카메라 미리보기 (playsInline/muted 가 있어야 아이폰에서 화면 안에 재생된다) */}
          <video ref={videoRef} playsInline muted autoPlay aria-label="카메라 화면"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: cam === 'live' ? 'block' : 'none' }} />
          {flash && <span style={{ position: 'absolute', inset: 0, zIndex: 3, background: '#fff', animation: 'shutter-flash .35s ease-out forwards' }} />}
          {preparing && (
            <span role="status" style={{ position: 'absolute', inset: 0, zIndex: 4, display: 'grid', placeItems: 'center', background: 'rgba(18, 21, 31, .6)', fontSize: 15, fontWeight: 700 }}>사진을 준비하는 중…</span>
          )}
          {corner({ top: 24, left: 24, borderTopLeftRadius: 14 }, 'Top Left')}
          {corner({ top: 24, right: 24, borderTopRightRadius: 14 }, 'Top Right')}
          {corner({ bottom: 24, left: 24, borderBottomLeftRadius: 14 }, 'Bottom Left')}
          {corner({ bottom: 24, right: 24, borderBottomRightRadius: 14 }, 'Bottom Right')}
          {cam !== 'live' && (
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#9AA3B5', padding: '0 40px', textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1V19c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1V5.5z" /><path d="M12 6.5V20" /></svg>
              <span style={{ fontSize: 14 }}>{cam === 'starting' ? '카메라를 켜는 중…' : '카메라 화면'}</span>
              {denied && <span style={{ fontSize: 12, lineHeight: 1.5 }}>카메라 권한을 허용하면 이 화면에서 바로 찍을 수 있어요.<br />지금은 눌러서 카메라 앱으로 찍어 주세요.</span>}
            </span>
          )}
        </div>
        {/* 숨긴 파일 선택창은 틀 밖에 둔다 (틀 안에 있으면 클릭이 틀로 전달돼 카메라 앱이 같이 열림) */}
        <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onPick} />
        <input ref={albumRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} />
        {photoError ? (
          // 사진 용량 초과 등: 분석 실패가 아니라 사진 문제라고 알려 준다
          <div role="alert" style={{ flex: 'none', display: 'flex', gap: 10, alignItems: 'center', background: '#3A2326', border: '1px solid #8C3B32', borderRadius: 16, padding: '12px 14px', fontSize: 14, lineHeight: 1.5, color: '#FFD9D2' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF8A75" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5" /><path d="M12 16.5h.01" /></svg>
            <span>{photoError}</span>
          </div>
        ) : (
          <div style={{ flex: 'none', display: 'flex', gap: 10, alignItems: 'center', background: '#232838', borderRadius: 16, padding: '12px 14px', fontSize: 14, lineHeight: 1.5, color: '#E6EAF2' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F7C948" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" /></svg>
            <span>한 페이지를 틀 안에 맞추고, 밝은 곳에서 찍으면 글자가 잘 읽혀요</span>
          </div>
        )}
      </div>
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 20px 16px' }}>
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
          {/* 앨범에서 고르기 (셔터 왼쪽) */}
          <button type="button" aria-label="앨범에서 사진 고르기" onClick={() => albumRef.current?.click()}
            style={{ position: 'absolute', left: 'calc(50% - 116px)', top: 15, width: 48, height: 48, borderRadius: 14, border: '1.5px solid #3A4154', background: '#232838', color: '#E6EAF2', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-8 9" /></svg>
          </button>
          <button aria-label="촬영" onClick={shoot} disabled={cam === 'starting' || preparing} style={{ width: 78, height: 78, borderRadius: '50%', border: '4px solid #fff', background: 'transparent', padding: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', opacity: cam === 'starting' || preparing ? 0.5 : 1 }}>
            <span style={{ width: 62, height: 62, borderRadius: '50%', background: '#fff' }} />
          </button>
        </div>
        <span style={{ fontSize: 13, color: '#B7BFCD' }}>사진은 저장되지 않고 글자를 읽은 뒤 바로 삭제돼요</span>
      </div>
      <TabBar />
    </div>
  );
}
