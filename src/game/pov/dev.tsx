/**
 * 개발 전용(pov-dev.html): 에피소드 1 컷 20장(+ 지워진 기억)을 실시간 렌더로 훑어본다. 탭하면 탭 영역 표시.
 * `?bake` 이면 굽기 API(bake.ts)만 올린다 — scripts/render-cuts.mjs 가 쓴다. 프로덕션 번들에 들어가지 않는다.
 * `?cut=e1-5` 로 한 장만, `&erased` 로 지워진 변형.
 */
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MOOD, getFigureHitboxes, povInternalSize, renderPovCut, type PovHitbox, type PovSpec } from './index';
import { EP1_CUTS, type CutRenderSpec } from '@/data/cuts/ep1';

const CSS_W = 390;
const CSS_H = 520;
const DPR = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)));
const SIZE = povInternalSize(CSS_W, CSS_H, DPR, 234);
const q = new URLSearchParams(location.search);

function Cut({ cut, erased }: { cut: CutRenderSpec; erased: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<PovHitbox[]>([]);
  const [show, setShow] = useState(false);
  useEffect(() => {
    let live = true;
    const spec: PovSpec = { ...cut.spec, overlay: erased ? 'erased' : 'memory', size: SIZE };
    renderPovCut(spec).then((c) => {
      if (!live || !host.current) return;
      c.style.width = `${CSS_W}px`;
      c.style.height = `${CSS_H}px`;
      c.style.imageRendering = 'pixelated';
      c.style.display = 'block';
      host.current.replaceChildren(c);
      setBoxes(getFigureHitboxes(spec, CSS_W, CSS_H));
    });
    return () => {
      live = false;
    };
  }, [cut, erased]);
  return (
    <section style={{ width: CSS_W, margin: '0 auto 24px' }}>
      <header style={{ display: 'flex', gap: 10, padding: '8px 4px', color: MOOD.hanjiMuted }}>
        <b style={{ color: MOOD.hanji }}>{cut.id}</b>
        <span style={{ color: erased ? MOOD.teal : MOOD.amber }}>{cut.time}</span>
        <span style={{ fontSize: 12 }}>{cut.note}</span>
      </header>
      <div style={{ position: 'relative', width: CSS_W, height: CSS_H, background: MOOD.ink0 }} onClick={() => setShow((s) => !s)}>
        <div ref={host} />
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
  const only = q.get('cut');
  const erased = q.has('erased');
  const cuts = EP1_CUTS.filter((c) => !only || c.id === only);
  return (
    <div>
      {cuts.map((c) => (
        <Cut key={c.id + erased} cut={c} erased={erased && !!c.erasable} />
      ))}
    </div>
  );
}

if (q.has('bake')) void import('./bake');
else
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
