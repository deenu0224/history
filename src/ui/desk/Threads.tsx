/**
 * 실(thread): 짚은 기록 낱말과 관측 낱말을 잇는다. 빨간 실 = 다름, 노란 점선 = 표기 차이(깜빡이다 끊긴다), 같은 것 = 잠깐 보였다 사라진다.
 * 위치는 낱말 요소(data-seg)의 실제 화면 좌표에서 계산한다 — 레이아웃이 바뀌어도 따라간다.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { InspectLink } from '@/core/duty';

interface Geo {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  relation: InspectLink['relation'];
}

const round = (n: number) => Math.round(n * 2) / 2;

export function Threads({ rootRef, links, born, hidden }: { rootRef: RefObject<HTMLElement | null>; links: InspectLink[]; born: Record<string, number>; hidden?: boolean }) {
  const [geo, setGeo] = useState<Geo[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const last = useRef('');

  useEffect(() => {
    if (hidden || links.length === 0) {
      last.current = '';
      setGeo([]);
      return;
    }
    let raf = 0;
    const measure = () => {
      const root = rootRef.current;
      if (root) {
        const rr = root.getBoundingClientRect();
        const out: Geo[] = [];
        for (const l of links) {
          const a = root.querySelector<HTMLElement>(`[data-seg="rec:${l.record}"]`);
          const b = root.querySelector<HTMLElement>(`[data-seg="obs:${l.observed}"]`);
          if (!a || !b) continue;
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          if (ra.width === 0 || rb.width === 0) continue;
          // 위아래로 놓였으면 아래/위 가장자리 가운데, 나란하면 옆 가장자리
          const vertical = Math.abs(ra.top + ra.height / 2 - (rb.top + rb.height / 2)) > Math.abs(ra.left + ra.width / 2 - (rb.left + rb.width / 2)) * 0.5;
          let x1: number, y1: number, x2: number, y2: number;
          if (vertical) {
            const aUp = ra.top < rb.top;
            x1 = ra.left + ra.width / 2;
            y1 = aUp ? ra.bottom - 3 : ra.top + 3;
            x2 = rb.left + rb.width / 2;
            y2 = aUp ? rb.top + 3 : rb.bottom - 3;
          } else {
            const aLeft = ra.left < rb.left;
            x1 = aLeft ? ra.right - 2 : ra.left + 2;
            y1 = ra.top + ra.height / 2;
            x2 = aLeft ? rb.left + 2 : rb.right - 2;
            y2 = rb.top + rb.height / 2;
          }
          out.push({ key: `${l.record}|${l.observed}`, x1: round(x1 - rr.left), y1: round(y1 - rr.top), x2: round(x2 - rr.left), y2: round(y2 - rr.top), relation: l.relation });
        }
        const sig = JSON.stringify(out);
        if (sig !== last.current) {
          last.current = sig;
          setGeo(out);
        }
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [links, rootRef, hidden]);

  // 방금 생긴 실의 연출 시간이 지나면 한 번 더 그린다(끊김·사라짐)
  useEffect(() => {
    const fresh = Object.values(born).filter((t) => Date.now() - t < 2200);
    if (!fresh.length) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    const stop = window.setTimeout(() => window.clearInterval(t), 2400);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(stop);
    };
  }, [born, links]);

  if (hidden) return null;
  return (
    <div className="threads" aria-hidden="true" data-testid="threads-layer">
      {geo.map((g) => {
        const t = born[g.key];
        const age = t ? now - t : Infinity;
        if (g.relation === 'none' && age > 1100) return null;
        const dx = g.x2 - g.x1;
        const dy = g.y2 - g.y1;
        const len = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        const cls = g.relation === 'differs' ? 'th-red' : g.relation === 'notation' ? 'th-yellow' : 'th-none';
        const fresh = age < 1500;
        const cut = g.relation === 'notation' && !fresh;
        const stub = Math.min(len * 0.3, 54);
        const knot = g.relation === 'notation' ? 'knot-y' : g.relation === 'differs' ? 'knot-r' : 'knot-n';
        return (
          <div key={g.key} className={`th ${cls} ${fresh ? 'th-fresh' : ''} ${cut ? 'th-cut' : ''}`} data-testid={`thread-${g.relation}`} data-key={g.key}>
            {cut ? (
              <>
                <i className="th-line" style={{ left: g.x1, top: g.y1, width: stub, transform: `translateY(-50%) rotate(${ang}rad)` }} />
                <i className="th-line th-end" style={{ left: g.x2, top: g.y2, width: stub, transform: `translateY(-50%) rotate(${ang + Math.PI}rad)` }} />
              </>
            ) : (
              <i className="th-line" style={{ left: g.x1, top: g.y1, width: len, transform: `translateY(-50%) rotate(${ang}rad)` }} />
            )}
            <i className={`th-knot ${knot}`} style={{ left: g.x1, top: g.y1 }} />
            <i className={`th-knot ${knot}`} style={{ left: g.x2, top: g.y2 }} />
          </div>
        );
      })}
    </div>
  );
}
