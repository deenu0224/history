/**
 * 개발 전용(pov-dev.html): 같은 순간(14:00 전교가 도착함)을 세 증인의 눈으로 + 지워진 기억 하나 + 손 클로즈업 하나.
 * 위에는 공유 토큰(MOOD)으로 만든 단말 머리띠 목업 → 단말과 컷의 분위기가 이어지는지 본다. 프로덕션 번들에 들어가지 않는다.
 */
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MOOD, getFigureHitboxes, povInternalSize, povPerf, renderPovCut, type PovFigure, type PovHitbox, type PovSpec, type SeatId } from './index';

const CSS_W = 390;
const CSS_H = 520;
const DPR = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)));
const SIZE = povInternalSize(CSS_W, CSS_H, DPR);

/**
 * 14:00 — 전교를 가져온 사람이 문 앞에서 종이를 펴 읽는다(①: verified 문장, 낭독 연출·시각·자리·모습은 재구성).
 * §13 배치: W 윤효손 · Y 이극돈 · O 어세겸 · H 홍귀달(구석) · U/A 「?」 두 관원(유순·안침, 누가 어느 쪽인지 정하지 않음).
 * 사람 8 = 눈 넷 + 「?」 둘 + 서리 + 전교를 가져온 사람. 김일손은 그 방에 없다. 이 순간은 '듣는' 순간이라 모두 seated.
 */
const AT_1400: PovFigure[] = [
  { id: 'reader', pose: 'standing-reading', seat: 'B', facing: 270, holding: 'paper', robe: 'messenger' },
  { id: 'yun', personId: 'yun_hyoson', pose: 'seated', seat: 'W', facing: 'B', robe: 'green' },
  { id: 'yi', personId: 'yi_geukdon', pose: 'seated', seat: 'Y', facing: 'B', robe: 'red' },
  { id: 'eo', personId: 'eo_segyeom', pose: 'seated', seat: 'O', facing: 'B', robe: 'red-dark' },
  { id: 'hong', personId: 'hong_gwidal', pose: 'seated', seat: 'H', facing: 'B', robe: 'blue' },
  { id: 'q1', personId: 'unknown_ua', pose: 'seated', seat: 'U', facing: 'B', robe: 'young' },
  { id: 'q2', personId: 'unknown_ua', pose: 'seated', seat: 'A', facing: 'B', robe: 'slate' },
  { id: 'clerk', pose: 'standing', seat: 'CL', facing: 'B', robe: 'clerk', beard: 0 },
];

const without = (seat: SeatId) => AT_1400.filter((f) => f.seat !== seat);

/** 눈 줄 순서: E1 윤효손 · E2 이극돈 · E3 어세겸 · E4 홍귀달 · 김일손(열리지 않음) */
const EYE_ORDER = ['yun', 'yi', 'eo', 'hong'];

interface Shot {
  id: string;
  eye: string;
  title: string;
  time: string;
  eyes: ('open' | 'closed' | 'never')[];
  spec: PovSpec;
}

const OPEN4: Shot['eyes'] = ['open', 'open', 'open', 'open', 'never'];

const SHOTS: Shot[] = [
  {
    id: 'e1-yun',
    eye: 'yun',
    title: '첫 번째 기억',
    time: '14:00',
    eyes: OPEN4,
    spec: {
      witnessId: 'yun_hyoson',
      seatId: 'W',
      lookAt: { x: 6.4, y: 8.2, h: 0.55 },
      fov: 55,
      time: '14:00',
      focus: 'reader',
      figures: without('W'),
      overlay: 'memory',
      self: { robe: 'green', hands: 'rest' },
      props: { slips: 'none' },
      size: SIZE,
    },
  },
  {
    id: 'e2-yi',
    eye: 'yi',
    title: '두 번째 기억',
    time: '14:00',
    eyes: OPEN4,
    spec: {
      witnessId: 'yi_geukdon',
      seatId: 'Y',
      lookAt: { x: 6.0, y: 8.2, h: 0.5 },
      fov: 60,
      time: '14:00',
      focus: 'reader',
      figures: without('Y'),
      overlay: 'memory',
      self: { robe: 'red', hands: 'rest' },
      props: { slips: 'none' },
      size: SIZE,
    },
  },
  {
    id: 'e4-hong',
    eye: 'hong',
    title: '네 번째 기억',
    time: '14:00',
    eyes: OPEN4,
    spec: {
      witnessId: 'hong_gwidal',
      seatId: 'H',
      lookAt: { x: 6.6, y: 7.6, h: 0.4 },
      fov: 60,
      time: '14:00',
      focus: 'reader',
      figures: without('H'),
      overlay: 'memory',
      self: { robe: 'blue', hands: 'rest' },
      props: { slips: 'none' },
      size: SIZE,
    },
  },
  {
    id: 'e3-erased',
    eye: 'eo',
    title: '세 번째 기억',
    time: '14:00',
    eyes: ['open', 'open', 'closed', 'open', 'never'],
    spec: {
      witnessId: 'eo_segyeom',
      seatId: 'O',
      lookAt: { x: 6.0, y: 8.6, h: 0.45 },
      fov: 60,
      time: '14:00',
      focus: 'reader',
      figures: without('O'),
      overlay: 'erased',
      self: { robe: 'red-dark', hands: 'rest' },
      props: { slips: 'none' },
      size: SIZE,
    },
  },
  {
    id: 'e2-closeup',
    eye: 'yi',
    title: '두 번째 기억',
    time: '15:00',
    eyes: OPEN4,
    spec: {
      witnessId: 'yi_geukdon',
      seatId: 'Y',
      eye: { x: 4.28, y: 3.84, h: 0.95 },
      lookAt: { x: 4.86, y: 3.8, h: 0.36 },
      fov: 50,
      exposure: 1.5,
      time: '15:00',
      focus: 'self',
      figures: [{ id: 'yun', personId: 'yun_hyoson', pose: 'seated', seat: 'W', robe: 'green' }],
      overlay: 'memory',
      self: { robe: 'red', hands: 'hold-slips', at: { x: 4.74, y: 3.9, h: 0.44 } },
      props: { slips: 'none', nameTag: true, sealedBundle: true },
      size: SIZE,
    },
  },
];

export const POV_DEV_SHOTS = SHOTS;

function EyeIcon({ s, active }: { s: 'open' | 'closed' | 'never'; active: boolean }) {
  const col = s === 'open' ? MOOD.amber : s === 'closed' ? MOOD.teal : MOOD.hanjiMuted;
  return (
    <svg width="28" height="18" viewBox="0 0 28 18" style={{ opacity: active ? 1 : 0.55 }}>
      {s === 'closed' ? (
        <line x1="3" y1="9" x2="25" y2="9" stroke={col} strokeWidth="2" />
      ) : (
        <>
          <path d="M2 9 Q14 -1 26 9 Q14 19 2 9 Z" fill="none" stroke={col} strokeWidth="1.6" strokeDasharray={s === 'never' ? '2 2' : undefined} />
          {s === 'open' && <circle cx="14" cy="9" r="3" fill={col} />}
        </>
      )}
    </svg>
  );
}

function Cut({ shot, onPerf }: { shot: Shot; onPerf: (s: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<PovHitbox[]>([]);
  const [show, setShow] = useState(false);
  useEffect(() => {
    let live = true;
    const t0 = performance.now();
    renderPovCut(shot.spec).then((c) => {
      if (!live || !host.current) return;
      c.style.width = `${(SIZE.w * SIZE.scale) / DPR}px`;
      c.style.height = `${(SIZE.h * SIZE.scale) / DPR}px`;
      c.style.imageRendering = 'pixelated';
      c.style.display = 'block';
      host.current.replaceChildren(c);
      setBoxes(getFigureHitboxes(shot.spec, (SIZE.w * SIZE.scale) / DPR, (SIZE.h * SIZE.scale) / DPR));
      const p = povPerf[povPerf.length - 1];
      onPerf(`${shot.id}: ${Math.round(performance.now() - t0)}ms (build ${p?.buildMs.toFixed(0)} · gl ${p?.renderMs.toFixed(0)} · post ${p?.postMs.toFixed(0)}) ${SIZE.w}×${SIZE.h}×${SIZE.scale}`);
      host.current.dataset.ready = '1';
    });
    return () => {
      live = false;
    };
  }, [shot, onPerf]);
  return (
    <section id={`pov-${shot.id}`} style={{ background: MOOD.ink0, width: CSS_W, margin: '0 auto 0' }}>
      {/* 단말 머리띠: 공유 토큰 */}
      <header style={{ background: MOOD.ink1, borderBottom: `1px solid ${MOOD.ink3}`, padding: '10px 16px 8px', display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ color: MOOD.hanjiMuted, fontSize: 22, lineHeight: '30px' }}>‹</span>
          <span style={{ fontSize: 22, lineHeight: '30px', fontWeight: 600, color: MOOD.hanji, letterSpacing: '-0.01em' }}>{shot.title}</span>
          <span style={{ marginLeft: 'auto', fontSize: 16, color: shot.spec.overlay === 'erased' ? MOOD.teal : MOOD.amber, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.08em' }}>
            {shot.time}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {shot.eyes.map((e, i) => (
            <EyeIcon key={i} s={e} active={i === EYE_ORDER.indexOf(shot.eye)} />
          ))}
        </div>
      </header>
      <div
        style={{ position: 'relative', width: CSS_W, height: CSS_H, background: MOOD.ink0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
        onClick={() => setShow((s) => !s)}
      >
        <div ref={host} className="cut" />
        {show &&
          boxes.map((b) => (
            <div key={b.id} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, outline: `1px dashed ${MOOD.amber}`, color: MOOD.amber, fontSize: 12 }}>
              {b.id}
            </div>
          ))}
      </div>
    </section>
  );
}

function App() {
  const [perf, setPerf] = useState<string[]>([]);
  const onPerf = useRef((s: string) => setPerf((p) => [...p, s])).current;
  return (
    <div>
      {SHOTS.map((s) => (
        <div key={s.id} style={{ marginBottom: 24 }}>
          <Cut shot={s} onPerf={onPerf} />
        </div>
      ))}
      <pre id="perf" style={{ color: MOOD.hanjiMuted, fontSize: 12, padding: 16, whiteSpace: 'pre-wrap' }}>
        dpr {DPR} · {perf.join('\n')}
      </pre>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
