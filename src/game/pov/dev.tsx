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

/** 14:00 — 전교를 가져온 사람이 문 앞에서 종이를 펴 읽는다(verified 문장의 시각화; 시각·자리·모습은 재구성) */
const AT_1400: PovFigure[] = [
  { id: 'reader', pose: 'standing-reading', seat: 'B', facing: 270, holding: 'paper', robe: 'messenger' },
  { id: 'hong', personId: 'hong_gwidal', pose: 'seated', seat: 'H', facing: 'B', robe: 'blue' },
  { id: 'yi', personId: 'yi_geukdon', pose: 'seated', seat: 'Y', facing: 'B', robe: 'red' },
  { id: 'eo', personId: 'eo_segyeom', pose: 'seated', seat: 'O', facing: 'B', robe: 'red-dark' },
  { id: 'yun', personId: 'yun_hyoson', pose: 'seated', seat: 'N', facing: 'B', robe: 'green' },
  { id: 'clerk', pose: 'standing', pos: { x: 1.4, y: 5.5 }, facing: 'B', robe: 'clerk', beard: 0 },
];

const without = (seat: SeatId) => AT_1400.filter((f) => f.seat !== seat);

interface Shot {
  id: string;
  title: string;
  time: string;
  eyes: ('open' | 'closed' | 'never')[];
  spec: PovSpec;
}

const SHOTS: Shot[] = [
  {
    id: 'hong',
    title: '첫 번째 기억',
    time: '14:00',
    eyes: ['open', 'open', 'open', 'open', 'never'],
    spec: {
      witnessId: 'hong_gwidal',
      seatId: 'H',
      lookAt: { x: 6.0, y: 8.4, h: 0.95 },
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
    id: 'yi',
    title: '두 번째 기억',
    time: '14:00',
    eyes: ['open', 'open', 'open', 'open', 'never'],
    spec: {
      witnessId: 'yi_geukdon',
      seatId: 'Y',
      lookAt: { x: 6.2, y: 8.3, h: 0.95 },
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
    id: 'yun',
    title: '네 번째 기억',
    time: '14:00',
    eyes: ['open', 'open', 'open', 'open', 'never'],
    spec: {
      witnessId: 'yun_hyoson',
      seatId: 'N',
      lookAt: { x: 6.3, y: 8.2, h: 0.85 },
      time: '14:00',
      focus: 'reader',
      figures: without('N'),
      overlay: 'memory',
      self: { robe: 'green', hands: 'rest' },
      props: { slips: 'none' },
      size: SIZE,
    },
  },
  {
    id: 'erased',
    title: '세 번째 기억',
    time: '14:00',
    eyes: ['open', 'open', 'closed', 'open', 'never'],
    spec: {
      witnessId: 'eo_segyeom',
      seatId: 'O',
      lookAt: { x: 6.0, y: 8.6, h: 0.8 },
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
    id: 'closeup',
    title: '두 번째 기억',
    time: '15:00',
    eyes: ['open', 'open', 'open', 'open', 'never'],
    spec: {
      witnessId: 'yi_geukdon',
      seatId: 'Y',
      eye: { x: 4.12, y: 3.78, h: 0.86 },
      lookAt: { x: 4.85, y: 3.72, h: 0.34 },
      fov: 44,
      time: '15:00',
      focus: 'self',
      figures: [{ id: 'hong', personId: 'hong_gwidal', pose: 'seated-writing', seat: 'H', robe: 'blue' }],
      overlay: 'memory',
      self: { robe: 'red', hands: 'hold-slips', at: { x: 4.62, y: 3.86, h: 0.5 } },
      props: { slips: 'none', nameTag: true, sealedBundle: true },
      size: SIZE,
    },
  },
];

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
            <EyeIcon key={i} s={e} active={i === ['hong', 'yi', 'erased', 'yun'].indexOf(shot.id === 'closeup' ? 'yi' : shot.id)} />
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
