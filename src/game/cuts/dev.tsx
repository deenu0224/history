/** 개발 전용 진입점(cuts-dev.html): 장면별 샘플 컷·탭 강조·스와이프 스트립·오버레이 비교·렌더 시간. 프로덕션 번들에 들어가지 않는다. */
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CutStrip, CutView } from './CutView';
import { CUT_SCENE_IDS, cutPerf, clearBakedCache, clearCutCache, getBaked, renderCut, renderScene, type CutSpec } from './index';
import { computeLayout } from './math';

const W = 390;
const H = 520;
/** 출력 비율(390:520)에 맞는 카메라: 중심 (cx,cy) 타일, 가로 tw 타일 */
const C = (cx: number, cy: number, tw: number) => {
  const h = (tw * H) / W;
  return { x: cx - tw / 2, y: cy - h / 2, w: tw, h };
};

// 폭 3.9 타일(125px) → 390px 영역에서 3 CSS px/화소, 5.8 타일 → 2 CSS px
const T = 3.9;
const M = 5.8;

export const HALL: CutSpec[] = [
  {
    id: 'hall-back-tight',
    sceneId: 'obs001',
    camera: C(19, 5.9, T),
    time: 600,
    figures: [
      { id: 'red', spriteKey: 'npc_official_red', x: 19, y: 5, facing: 'down', highlight: 'unknown' },
      { id: 'servant', spriteKey: 'npc_servant', x: 20.2, y: 7.2, facing: 'left' },
    ],
  },
  {
    id: 'hall-back-wide',
    sceneId: 'obs001',
    camera: C(19.5, 6.4, 8.7),
    time: 600,
    figures: [
      { id: 'blue', spriteKey: 'npc_official_blue', x: 15, y: 5, facing: 'down' },
      { id: 'red', spriteKey: 'npc_official_red', x: 19, y: 5, facing: 'down', highlight: 'tagged' },
      { id: 'green', spriteKey: 'npc_official_green', x: 24, y: 5, facing: 'down' },
      { id: 'clerk', spriteKey: 'npc_clerk', x: 21, y: 8, facing: 'up' },
    ],
  },
  {
    id: 'hall-front',
    sceneId: 'obs001',
    camera: C(19, 9, M),
    time: 840,
    figures: [
      { id: 'clerk', spriteKey: 'npc_clerk', x: 17.5, y: 9, facing: 'right' },
      { id: 'red', spriteKey: 'npc_official_red', x: 19.5, y: 9, facing: 'left', highlight: 'tagged' },
      { id: 'servant', spriteKey: 'npc_servant', x: 21.5, y: 10, facing: 'up', dim: true },
    ],
  },
  {
    id: 'hall-dusk',
    sceneId: 'obs001',
    camera: C(25.5, 6, M),
    time: 1110,
    lights: true,
    overlay: 'memory',
    figures: [{ id: 'sagwan', spriteKey: 'npc_historian', x: 24, y: 7, facing: 'left', highlight: 'unknown' }],
  },
];

export const DECREE: CutSpec[] = [
  {
    id: 'decree-front',
    sceneId: 'sc_court_decree',
    camera: C(9, 6.2, 8.7),
    time: 600,
    figures: [{ id: 'decree', spriteKey: 'pose_decree_red', x: 9, y: 4, highlight: 'unknown' }],
    hideStatic: ['pose_decree_red@9,4'],
  },
  {
    id: 'decree-rows',
    sceneId: 'sc_court_decree',
    camera: C(9, 7, M * 1.5),
    time: 600,
  },
  {
    id: 'decree-tight',
    sceneId: 'sc_court_decree',
    camera: C(6, 7, T),
    time: 600,
    figures: [{ id: 'g1', spriteKey: 'char_official_green', x: 7, y: 6, facing: 'up', highlight: 'tagged' }],
    hideStatic: ['char_official_green@7,6'],
  },
];

export const COUNCIL: CutSpec[] = [
  {
    id: 'council-side',
    sceneId: 'sc_council',
    camera: C(5, 5.2, M),
    time: 780,
    hideStatic: ['seat_council_blue@4,5'],
    figures: [{ id: 'blue', spriteKey: 'seat_council_blue', x: 4, y: 5, frame: 2, highlight: 'unknown' }],
  },
  {
    id: 'council-sagwan',
    sceneId: 'sc_council',
    camera: C(7, 7, T),
    time: 780,
    hideStatic: ['char_sagwan@7,8'],
    figures: [{ id: 'sagwan', spriteKey: 'char_sagwan', x: 7, y: 8, frame: 21, highlight: 'tagged' }],
  },
  {
    id: 'council-empty',
    sceneId: 'sc_council',
    camera: C(10, 6.2, M),
    time: 1110,
    lights: true,
    overlay: 'erased',
  },
];

export const BED: CutSpec[] = [
  {
    id: 'bed-wide',
    sceneId: 'sc_daejojeon',
    camera: C(7.5, 5.6, 8.7),
    time: 1260,
    lights: true,
  },
  {
    id: 'bed-kneel',
    sceneId: 'sc_daejojeon',
    camera: C(5.7, 6, T + 1.4),
    time: 1260,
    lights: true,
    hideStatic: ['pose_kneel_naegwan@5,5'],
    figures: [{ id: 'naegwan', spriteKey: 'pose_kneel_naegwan', x: 5, y: 5, frame: 2, highlight: 'tagged' }],
  },
];

export const PRINT: CutSpec[] = [
  {
    id: 'print-clerk',
    sceneId: 'sc_print_storage',
    camera: C(9.8, 6, M),
    time: 600,
    lights: true,
    hideStatic: ['pose_clerk_packing@10,6'],
    figures: [{ id: 'clerk', spriteKey: 'pose_clerk_packing', x: 10, y: 6, highlight: 'unknown' }],
  },
  {
    id: 'print-shelves',
    sceneId: 'sc_print_storage',
    camera: C(5, 3.8, M),
    time: 600,
  },
];

const OVERLAY_BASE: CutSpec = {
  id: 'ov',
  sceneId: 'sc_council',
  camera: C(7, 5.5, 6.5),
  time: 780,
  figures: [{ id: 'sagwan', spriteKey: 'char_sagwan', x: 7, y: 8, frame: 21 }],
  hideStatic: ['char_sagwan@7,8'],
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ margin: '18px 0' }}>
      <h3 style={{ margin: '0 12px 6px', fontSize: 13, color: '#e8d9b0' }}>{title}</h3>
      {children}
    </section>
  );
}

function Strip({ title, specs }: { title: string; specs: CutSpec[] }) {
  const [i, setI] = useState(0);
  const [hl, setHl] = useState<string[]>([]);
  const [last, setLast] = useState('-');
  return (
    <Section title={`${title} — cut ${i + 1}/${specs.length}  (tap figure: ${last})`}>
      <div style={{ width: W, height: H, margin: '0 auto' }} data-strip={title}>
        <CutStrip
          specs={specs}
          index={i}
          onIndexChange={(n) => {
            setI(n);
            setHl([]);
          }}
          highlightIds={hl}
          onTapFigure={(id, ci) => {
            setLast(`${specs[ci]!.id}/${id}`);
            setHl((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
          }}
        />
      </div>
    </Section>
  );
}

function Perf() {
  const [rows, setRows] = useState<string[][]>([]);
  useEffect(() => {
    const out: string[][] = [];
    const dpr = window.devicePixelRatio || 1;
    clearBakedCache();
    clearCutCache();
    const all = [...HALL, ...DECREE, ...COUNCIL, ...BED, ...PRINT];
    for (const id of CUT_SCENE_IDS) {
      const t0 = performance.now();
      getBaked(id);
      const bake = performance.now() - t0;
      const t1 = performance.now();
      renderScene(id);
      out.push([`bake ${id}`, `${bake.toFixed(1)} ms`, `+full image ${(performance.now() - t1).toFixed(1)} ms`]);
    }
    for (const s of all) {
      const t = performance.now();
      renderCut(s, W, H, dpr);
      const cold = performance.now() - t;
      const t2 = performance.now();
      renderCut(s, W, H, dpr);
      const L = computeLayout(s.camera, W, H, dpr);
      out.push([s.id, `${cold.toFixed(1)} ms`, `cached ${(performance.now() - t2).toFixed(2)} ms · scale ${(L.scale / dpr).toFixed(2)} css px/px`]);
    }
    // 새 크기/overlay 변형 한 번 더(씬 이미 구워짐: 순수 렌더 비용)
    const t = performance.now();
    renderCut({ ...HALL[1]!, overlay: 'erased', id: 'x' }, W, H, dpr);
    out.push(['erased variant (warm scene)', `${(performance.now() - t).toFixed(1)} ms`, '']);
    setRows(out);
    (window as unknown as { __cutRows: string[][] }).__cutRows = out;
    (window as unknown as { __cutPerf: typeof cutPerf }).__cutPerf = cutPerf;
  }, []);
  return (
    <Section title="렌더 시간 (cold = 첫 그리기)">
      <table id="perf" style={{ margin: '0 12px', fontSize: 11, borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td key={i} style={{ padding: '1px 8px 1px 0', color: i === 0 ? '#e8d9b0' : '#b9ad8c' }}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function Dev() {
  const overview = useMemo(() => CUT_SCENE_IDS.map((id) => ({ id, url: renderScene(id).toDataURL() })), []);
  return (
    <div>
      <h2 style={{ margin: '12px 12px 0', fontSize: 15 }}>cuts dev</h2>
      <Perf />
      <Section title="장면 전체(정적 장식만) — renderScene">
        <div style={{ padding: '0 12px', display: 'grid', gap: 8 }}>
          {overview.map((o) => (
            <img key={o.id} src={o.url} alt={o.id} style={{ width: '100%', imageRendering: 'pixelated', background: '#000' }} />
          ))}
        </div>
      </Section>
      <Strip title="실록청 대청 (obs001)" specs={HALL} />
      <Strip title="궐 뜰 교지 (sc_court_decree)" specs={DECREE} />
      <Strip title="회의 (sc_council)" specs={COUNCIL} />
      <Strip title="대조전 (sc_daejojeon)" specs={BED} />
      <Strip title="인쇄 보관 (sc_print_storage)" specs={PRINT} />
      <Section title="오버레이 비교: none / memory / erased (180×240)">
        <div style={{ display: 'flex', gap: 6, padding: '0 12px', flexWrap: 'wrap' }}>
          {(['none', 'memory', 'erased'] as const).map((ov) => (
            <div key={ov} style={{ width: 180, height: 240 }} data-overlay={ov}>
              <CutView spec={{ ...OVERLAY_BASE, id: `ov-${ov}`, overlay: ov }} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dev />
  </StrictMode>,
);
