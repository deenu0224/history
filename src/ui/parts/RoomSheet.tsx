/**
 * 그날의 방 — 도면(SVG). 자리·시야 부채꼴·들림 반경을 같은 방 위에 그린다. 확대·이동 없음.
 * 일반 보기(시각 칩 · 눈의 시야 · 「같은 사람 잇기」: 표시 A 를 고르고 → 잇기 → 다른 관측의 표시 B 를 탭, 엔진이 시각·자리로 판정)
 * 모순 보기(기하만 — 반경 원·시선·가림 빗금·자리·거리. 자리를 탭하면 선이 그려진다. 결론 낱말은 없다 · 판단 + 근거 2칸).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { currentEpisode, useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { selectContradictionView, selectContradictions, selectRoom, type NeutralGeometry, type RoomMarker } from '@/store/selectors';
import { cellsText } from '@/core/josa';
import { fx } from '../lib/fx';
import { cutNo } from '../lib/format';
import { backdropSrc } from '../lib/manifest';
import { IChevR, IWarn } from './icons';
import { Sheet } from './Sheet';
import { NavBar } from './NavBar';
import { openMessenger } from '../lib/nav';
import { useUi } from '../uiStore';

const C = 27; // 1칸 = 27 사용자 단위(글자 16 이 폭 328px 에서도 16px 이상)
const AMBER = '#e2a85c';
const TEAL = '#5c9a95';
const TEAL2 = '#9ac9c3';

const P = (v: number) => v * C;

function cone(x: number, y: number, facing: number, half: number, r: number) {
  const a0 = ((facing - half) * Math.PI) / 180;
  const a1 = ((facing + half) * Math.PI) / 180;
  const cx = P(x);
  const cy = P(y);
  const rr = r * C;
  return `M${cx},${cy} L${cx + rr * Math.cos(a0)},${cy + rr * Math.sin(a0)} A${rr},${rr} 0 0 1 ${cx + rr * Math.cos(a1)},${cy + rr * Math.sin(a1)} Z`;
}

const ownerChar = (label: string) => (/번째|누군가|^\?/.test(label) ? '?' : label[0]!);

function Base({ room, children }: { room: ReturnType<typeof selectRoom>; children?: React.ReactNode }) {
  const W = room.w * C;
  const H = room.h * C;
  return (
    <>
      <defs>
        <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={TEAL2} strokeWidth="1.5" />
        </pattern>
      </defs>
      {Array.from({ length: room.w - 1 }, (_, i) => Array.from({ length: room.h - 1 }, (_, j) => <circle key={`${i}-${j}`} cx={(i + 1) * C} cy={(j + 1) * C} r="1" fill="#2a2521" />))}
      {children}
      {room.walls.map((w, i) => (
        <line key={i} x1={P(w[0])} y1={P(w[1])} x2={P(w[2])} y2={P(w[3])} stroke={TEAL} strokeWidth="2.4" strokeLinecap="square" />
      ))}
      <line x1={P(room.screen[0])} y1={P(room.screen[1] + 0.2)} x2={P(room.screen[2])} y2={P(room.screen[1] + 0.2)} stroke={AMBER} strokeWidth="3.5" strokeLinecap="round" />
      {room.furniture.map((f) => (
        <rect key={f.id} x={P(f.rect[0])} y={P(f.rect[1])} width={P(f.rect[2] - f.rect[0])} height={P(f.rect[3] - f.rect[1])} fill={f.occludes ? 'url(#hatch)' : 'none'} stroke={f.occludes ? TEAL2 : TEAL} strokeWidth="1.5" opacity={f.occludes ? 1 : 0.75} />
      ))}
      <text x={P(7.7)} y={H - 8} fill="#a39780" fontSize="16">
        문
      </text>
      <text x={W / 2} y={P(room.screen[1] + 0.2) + 22} textAnchor="middle" fill="#a39780" fontSize="16">
        병풍
      </text>
    </>
  );
}

function PersonMark({
  x,
  y,
  label,
  merged,
  count,
  sel,
  eye,
  dashed,
  linking,
  hit = 22,
  onClick,
  testId,
  keys,
  aria,
}: {
  x: number;
  y: number;
  label: string;
  merged?: boolean;
  count?: number;
  sel?: boolean;
  eye?: boolean;
  dashed?: boolean;
  /** 잇기의 첫 표시(A) */
  linking?: boolean;
  /** 탭 반경(사용자 단위) */
  hit?: number;
  onClick?: () => void;
  testId?: string;
  keys?: string;
  aria?: string;
}) {
  const r = 13;
  const ring = eye ? AMBER : label === '?' ? '#8a8171' : TEAL2;
  const fill = eye ? '#2b2414' : label === '?' ? '#161412' : '#16302f';
  return (
    <g className="mk" onClick={onClick} data-testid={testId} data-keys={keys} data-sel={sel ? 'true' : undefined} role={onClick ? 'button' : undefined} aria-label={aria ?? (label === '?' ? '모르는 사람' : label)} aria-pressed={onClick ? !!sel : undefined}>
      <circle cx={P(x)} cy={P(y)} r={hit} fill="transparent" />
      {merged ? <circle cx={P(x) + 5} cy={P(y) + 4} r={r} fill="#161412" stroke={ring} strokeWidth="1.6" /> : null}
      {sel ? <circle cx={P(x)} cy={P(y)} r={r + 5} fill="none" stroke={AMBER} strokeWidth={linking ? 2.4 : 1.6} strokeDasharray={linking ? '4 3' : undefined} opacity={linking ? 1 : 0.6} className={linking ? 'linkring' : undefined} /> : null}
      <circle cx={P(x)} cy={P(y)} r={r} fill={fill} stroke={ring} strokeWidth={sel ? 2.6 : 1.9} strokeDasharray={dashed ? '3 2.5' : undefined} />
      <text x={P(x)} y={P(y) + 5.6} textAnchor="middle" fill={label === '?' ? '#b9ae96' : '#f0ead8'} fontSize="16" fontWeight="600">
        {label.length > 2 ? label.slice(0, 1) : label}
      </text>
      {merged && count && count > 1 ? (
        <text x={P(x) + r + 7} y={P(y) + r + 10} fill={TEAL2} fontSize="16" fontWeight="600">
          ×{count}
        </text>
      ) : null}
    </g>
  );
}

const markerKey = (m: RoomMarker) => m.keys[0]!;

function fadeChips(el: HTMLElement) {
  el.classList.toggle('fade-l', el.scrollLeft > 2);
  el.classList.toggle('fade-r', el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
}

// ── 일반 보기 ──
function Plan({
  room,
  selEye,
  selKey,
  linkFrom,
  onEye,
  onMarker,
  justMerged,
  mergePos,
  placing,
}: {
  room: ReturnType<typeof selectRoom>;
  selEye: string | null;
  selKey: string | null;
  linkFrom: string | null;
  onEye: (id: string) => void;
  onMarker: (m: RoomMarker) => void;
  justMerged: boolean;
  mergePos: string | null;
  /** 들은 말을 놓는 중(도면의 자리를 탭) */
  placing?: boolean;
}) {
  const half = room.eyes[0]?.halfAngleDeg ?? 50;
  const sel = room.eyes.find((e) => e.eyeId === selEye);
  const mergedMarker = room.markers.find((m) => m.merged && (!mergePos || m.posId === mergePos)) ?? room.markers.find((m) => m.merged);
  const seen = new Map<string, number>();
  return (
    <div className="planwrap">
      <svg className="plan" viewBox={`0 0 ${room.w * C} ${room.h * C}`} role="img" aria-label="그날의 방 도면" data-testid="room-plan" data-linking={linkFrom ? 'true' : undefined} data-placing={placing ? 'true' : undefined}>
        <Base room={room}>
          {sel && sel.state !== 'closed' ? <path d={cone(sel.x, sel.y, sel.facingDeg, half, 5)} fill="rgba(92,154,149,.2)" stroke={TEAL} strokeWidth="1.2" /> : null}
          {sel && sel.state !== 'closed' ? <path d={cone(sel.x, sel.y, sel.facingDeg, half, 10)} fill="none" stroke={TEAL} strokeWidth="1" strokeDasharray="3 4" opacity=".6" /> : null}
          {room.eyes
            .filter((e) => e.eyeId !== selEye && e.state !== 'closed')
            .map((e) => (
              <path key={e.eyeId} d={cone(e.x, e.y, e.facingDeg, half, 4)} fill="none" stroke="#4d6b69" strokeWidth="1.1" strokeDasharray="3 3" />
            ))}
        </Base>
        {room.eyes.map((e) => {
          const a = (e.facingDeg * Math.PI) / 180;
          const tx = P(e.x) + 19 * Math.cos(a);
          const ty = P(e.y) + 19 * Math.sin(a);
          const px = -Math.sin(a) * 4.5;
          const py = Math.cos(a) * 4.5;
          const closed = e.state === 'closed';
          return (
            <g key={e.eyeId} className="mk" onClick={() => onEye(e.eyeId)} data-testid={`eye-${e.eyeId}`} role="button" aria-label={`${e.label}${closed ? ' (끊김)' : ''}`}>
              <circle cx={P(e.x)} cy={P(e.y)} r="22" fill="transparent" />
              {closed ? <circle cx={P(e.x)} cy={P(e.y)} r="17" fill="none" stroke={TEAL} strokeWidth="1.5" strokeDasharray="3 3" /> : <path d={`M${tx + Math.cos(a) * 6},${ty + Math.sin(a) * 6} L${tx + px},${ty + py} L${tx - px},${ty - py} Z`} fill={AMBER} />}
              {e.selected && !closed ? <circle cx={P(e.x)} cy={P(e.y)} r="18" fill="none" stroke={AMBER} strokeWidth="1.5" opacity=".55" /> : null}
            </g>
          );
        })}
        {room.markers.map((m) => {
          const n = (seen.get(m.posId) ?? 0) + 1;
          seen.set(m.posId, n);
          const k = markerKey(m);
          return (
            <g key={m.keys.join('|')} className={m.merged && justMerged && m === mergedMarker ? 'merged-anim' : undefined} style={{ transformOrigin: `${P(m.x + m.ox)}px ${P(m.y + m.oy)}px` }}>
              <PersonMark
                x={m.x + m.ox}
                y={m.y + m.oy}
                label={m.label}
                merged={m.merged}
                count={m.count}
                eye={m.owner && m.kind === 'person'}
                dashed={m.label === '?' && !m.owner}
                sel={selKey === k || linkFrom === k}
                linking={linkFrom === k}
                hit={23}
                testId={n === 1 ? `marker-${m.posId}` : `marker-${m.posId}-${n}`}
                keys={m.keys.join(' ')}
                aria={`${m.label === '?' ? '모르는 사람' : m.label}${m.kind === 'mention' ? ' (말이 가리킨 자리)' : ''}`}
                onClick={() => onMarker(m)}
              />
            </g>
          );
        })}
      </svg>
      {justMerged && mergedMarker ? (
        <span className="tagmerge" data-testid="same-person" style={{ left: `${((mergedMarker.x + mergedMarker.ox) / room.w) * 100}%`, top: `calc(${((mergedMarker.y + mergedMarker.oy) / room.h) * 100}% - 52px)` }}>
          같은 사람
        </span>
      ) : null}
    </div>
  );
}

// ── 모순 보기 ──
/**
 * 판정 전 도면은 기하만: 들림 반경 원(흐림 한계 점선)·셀 수 있는 거리 원·가림 빗금·자리·말한/세어 본 자리.
 * 자리마다의 결론(또렷/흐림·셀 수 있음/가려짐)은 쓰지 않는다. 자리를 탭하면 그 자리에서 선(+시야 부채꼴)과 거리가 그려진다 — 플레이어가 읽는다.
 */
function Conflict({ geo, room, focusClaim, selSeat, onSeat }: { geo: NeutralGeometry; room: ReturnType<typeof selectRoom>; focusClaim: string | null; selSeat: string | null; onSeat: (eyeId: string) => void }) {
  const W = room.w * C;
  const H = room.h * C;
  const name = (eyeId: string) => ownerChar(room.eyes.find((e) => e.eyeId === eyeId)?.label ?? '');
  const R = (geo.radius ?? 0) * C;
  const GR = (geo.garbleRadius ?? 0) * C;
  const sx = P(geo.source.x);
  const sy = P(geo.source.y);
  const sel = geo.witnesses.find((w) => w.eyeId === selSeat);
  const uniq = geo.witnesses.filter((w, i, all) => all.findIndex((v) => v.eyeId === w.eyeId) === i);
  // 도면이 작게 그려져도(360 폭·낮은 화면) 자리 탭 영역은 화면에서 지름 ≥44px — 그려진 배율로 탭 반경을 잰다(QA_UX_R3 ux3-08)
  const svgRef = useRef<SVGSVGElement>(null);
  const [hit, setHit] = useState(22);
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const upd = () => {
      const r = el.getBoundingClientRect();
      const k = Math.min(r.width / W, r.height / H);
      if (k > 0) setHit(Math.max(22, Math.ceil(23 / k)));
    };
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H]);
  return (
    <svg ref={svgRef} className="plan" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="모순 도면" data-testid="conflict-plan">
      <Base room={room}>
        {geo.kind === 'hearing' ? (
          <>
            <path fillRule="evenodd" fill="rgba(5,5,5,.55)" d={`M0,0 H${W} V${H} H0 Z M${sx + R},${sy} A${R},${R} 0 1 0 ${sx - R},${sy} A${R},${R} 0 1 0 ${sx + R},${sy} Z`} />
            <circle cx={sx} cy={sy} r={R} fill="rgba(92,154,149,.1)" stroke={TEAL2} strokeWidth="1.6" data-testid="hearing-circle" />
            <circle cx={sx} cy={sy} r={GR} fill="none" stroke={TEAL} strokeWidth="1.2" strokeDasharray="3 5" opacity=".8" />
          </>
        ) : (
          <circle cx={sx} cy={sy} r={(geo.detailRange ?? 5) * C} fill="none" stroke={TEAL} strokeWidth="1.2" strokeDasharray="3 5" opacity=".7" data-testid="detail-circle" />
        )}
        {geo.kind === 'sight' && geo.occluder ? (
          <rect x={P(geo.occluder.rect[0])} y={P(geo.occluder.rect[1])} width={P(geo.occluder.rect[2] - geo.occluder.rect[0])} height={P(geo.occluder.rect[3] - geo.occluder.rect[1])} fill="url(#hatch)" stroke={TEAL2} strokeWidth="2" data-testid="occluder" />
        ) : null}
        {/* 모든 자리의 시선은 옅게, 고른 자리는 진하게 */}
        {geo.kind === 'sight'
          ? uniq.map((w) => (
              <path key={`c${w.eyeId}`} d={cone(w.x, w.y, w.dirDeg, geo.halfAngleDeg, 4)} fill="none" stroke="#4d6b69" strokeWidth="1.1" strokeDasharray="3 3" />
            ))
          : null}
        {sel ? (
          <g data-testid="seat-line">
            {geo.kind === 'sight' ? <path d={cone(sel.x, sel.y, sel.dirDeg, geo.halfAngleDeg, 10)} fill="rgba(92,154,149,.16)" stroke={TEAL} strokeWidth="1.2" /> : null}
            <line x1={P(sel.x)} y1={P(sel.y)} x2={sx} y2={sy} stroke={AMBER} strokeWidth="1.8" />
          </g>
        ) : null}
      </Base>
      {geo.listeners.map((l) => (
        <circle key={l.key} cx={P(l.x)} cy={P(l.y)} r="5" fill="#161412" stroke="#8a8171" strokeWidth="1.5" opacity=".8" />
      ))}
      {uniq.map((w) => {
        const on = !focusClaim || geo.witnesses.some((v) => v.eyeId === w.eyeId && v.claimId === focusClaim);
        return (
          <g key={w.eyeId} opacity={on ? 1 : 0.35} data-testid={`witness-${w.eyeId}`}>
            <PersonMark x={w.x} y={w.y} label={name(w.eyeId)} eye sel={selSeat === w.eyeId} hit={hit} onClick={() => onSeat(w.eyeId)} testId={`seat-${w.eyeId}`} aria={`${name(w.eyeId)} 자리`} />
          </g>
        );
      })}
      {sel ? (
        <text className="lbl" x={Math.max(34, Math.min(W - 34, (P(sel.x) + sx) / 2))} y={(P(sel.y) + sy) / 2 - 8} textAnchor="middle" fill={AMBER} fontSize="16" fontWeight="600" data-testid="seat-distance">
          {cellsText(sel.distance, geo.kind === 'hearing' ? geo.radius : geo.detailRange)}
        </text>
      ) : null}
      <circle cx={sx} cy={sy} r="9" fill="#0b0a09" stroke={AMBER} strokeWidth="2.2" strokeDasharray="2 3" />
      <text className="lbl" x={sx} y={geo.kind === 'hearing' ? sy - 15 : sy + 30} textAnchor="middle" fill={AMBER} fontSize="16" fontWeight="600">
        {geo.kind === 'hearing' ? '말한 자리' : '세어 본 자리'}
      </text>
    </svg>
  );
}

export function RoomSheet() {
  const open = useGameStore((s) => s.ui.roomOpen);
  const focusId = useUi((s) => s.roomFocus);
  const mergeUntil = useUi((s) => s.mergeUntil);
  const mergePos = useUi((s) => s.mergePos);
  const room = useView(selectRoom);
  const xs = useView(selectContradictions);
  const [mode, setMode] = useState<string | null>(null); // 모순 id
  const [selEye, setSelEye] = useState<string | null>(null);
  /** 고른 표시(등장 키 하나 — 시각을 바꿔도 남는다) */
  const [selKey, setSelKey] = useState<string | null>(null);
  /** 「같은 사람 잇기」 중: 첫 표시(A)의 키와 설명 */
  const [linkFrom, setLinkFrom] = useState<{ key: string; label: string; time: string } | null>(null);
  const [linkFb, setLinkFb] = useState<{ text: string; ok: boolean } | null>(null);
  /** 「들은 말」을 놓는 중: 그 말의 등장 키 */
  const [placing, setPlacing] = useState<string | null>(null);
  /** 놓지 않은 들은 말이 있는데 잇기가 틀렸다 → 칩이 한 번 숨쉰다(볼 곳을 가리킨다, QA_UX_R3 ux3-06) */
  const [chipPulse, setChipPulse] = useState(0);
  const [claim, setClaim] = useState<string | null>(null);
  const [retry, setRetry] = useState<string | null>(null);
  /** 근거 2칸의 ② 근거(자리 사실 id). ① 판단은 claim */
  const [evid, setEvid] = useState<string | null>(null);
  /** 모순 도면에서 탭한 자리(그 자리의 선·거리) */
  const [seat, setSeat] = useState<string | null>(null);

  const open1 = useMemo(() => xs.filter((x) => x.status === 'revealed'), [xs]);

  useEffect(() => {
    if (!open) return;
    setRetry(null);
    setClaim(null);
    setEvid(null);
    setSeat(null);
    setSelKey(null);
    setLinkFrom(null);
    setLinkFb(null);
    setPlacing(null);
    const m = focusId && xs.some((x) => x.id === focusId && x.status !== 'hidden') ? focusId : null;
    setMode(m);
    // 역사 고정 칸에서 고른 값으로 왔다면 그 값의 판단을 미리 고른다
    const pf = useUi.getState().pendingFill;
    if (m && pf?.contradictionId === m) setClaim(xs.find((x) => x.id === m)?.claims.find((c) => c.value === pf.value)?.id ?? null);
    setSelEye(room.eyes.find((e) => e.selected)?.eyeId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focusId]);

  const view = useView((ep, s) => (mode ? selectContradictionView(ep, s, mode) : null), [mode]);
  const chipsRef = useRef<HTMLDivElement>(null);
  const fbRef = useRef<HTMLDivElement>(null);
  // 잇기·놓기 안내가 생기면 보이게(시트 안에서 가장 가까이로)
  useEffect(() => {
    if (linkFb) fbRef.current?.scrollIntoView({ block: 'nearest' });
  }, [linkFb]);
  // 모순 보기(화면을 다 차지하는 시트)가 열리면 떠 있던 배너를 거둔다 — 새 소식은 메신저 점으로만(닫히면 배너, QA_UX_R4)
  const holding = !!mode;
  useEffect(() => {
    if (holding) useUi.getState().clearBanner();
  }, [holding]);
  const evRef = useRef<HTMLDivElement>(null);
  // 고른 시각 칩이 보이게 밀어 두고, 넘치는 쪽 가장자리를 흐린다
  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    el.querySelector<HTMLElement>('.chip.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    fadeChips(el);
  }, [open, room.time, room.chips.length, mode]);
  if (!open) return null;

  const close = () => {
    useGameStore.getState().closeRoom();
    useUi.getState().setRoomFocus(null);
    useUi.getState().setPendingFill(null);
  };
  const g = useGameStore.getState();
  const justMerged = mergeUntil > Date.now();

  const goCut = (cutId: string) => {
    const eye = currentEpisode(useGameStore.getState()).eyes.find((e) => e.cuts.includes(cutId));
    if (!eye) return;
    g.viewCut(eye.id, eye.cuts.indexOf(cutId));
    useGameStore.getState().leaveRoom();
    useUi.getState().setRoomFocus(null);
    const ui = useUi.getState();
    if (!ui.stack.includes('viewer')) ui.push('viewer');
  };

  const eye = room.eyes.find((e) => e.eyeId === selEye);
  const marker: RoomMarker | undefined = selKey ? room.markers.find((m) => m.keys.includes(selKey)) : undefined;
  const cx = view ? xs.find((x) => x.id === view.id) : undefined;
  const eyeName = (id: string) => room.eyes.find((e) => e.eyeId === id)?.label ?? '';
  const markerName = (m: RoomMarker) => (m.label === '?' ? (m.kind === 'mention' ? '말이 가리킨 사람' : '모르는 사람') : m.label);

  /** 들은 말을 이 자리에 놓아 본다(판정은 엔진 — 말이 가리킨 자리인가) */
  const tryPlace = (posId: string) => {
    if (!placing) return false;
    const r = g.placeMention(placing, posId);
    if (r.verdict === 'ok') {
      fx('merge');
      // 그 자리·그 시각에 다른 관측의 사람이 꼭 하나면 짝이 이미 정해졌다 — 확인 탭 없이 바로 잇는다(QA_FUN_R3 R3-6).
      // 판정은 그대로 엔진(linkMarkers). 후보가 없거나 여럿이면 지금처럼 플레이어가 탭한다.
      const st = useGameStore.getState();
      const fresh = selectRoom(currentEpisode(st), st);
      const placed = fresh.markers.find((m) => m.keys.includes(r.key));
      const others = placed ? fresh.markers.filter((m) => m.posId === r.posId && !m.keys.some((k) => placed.keys.includes(k)) && !sameEye(placed, m)) : [];
      if (placed && others.length === 1) {
        const j = g.linkMarkers(r.key, others[0]!.keys.find((k) => eyeOfKey(k) !== eyeOfKey(r.key)) ?? markerKey(others[0]!));
        if (j.verdict === 'ok') {
          setLinkFb({ text: '말이 가리킨 자리에 놓았다 — 같은 사람으로 이었다', ok: true });
          setSelKey(r.key);
          setPlacing(null);
          return true;
        }
      }
      setLinkFb({ text: '말이 가리킨 자리에 「?」 를 놓았다 — 같은 사람이면 이어 보자', ok: true });
      setSelKey(r.key); // 놓은 「?」 가 골라진 채 — 바로 다른 관측의 사람을 탭하면 잇는다
    } else if (r.verdict === 'wrong') {
      fx('tag_no');
      setLinkFb({ text: r.feedback, ok: false });
    }
    setPlacing(null);
    return true;
  };
  /** 등장 키의 관측(눈): 키는 「컷 id#…」 */
  const eyeOfKey = (key: string) => currentEpisode(useGameStore.getState()).eyes.find((e) => e.cuts.includes(key.split('#')[0]!))?.id;
  /** B 의 등장이 모두 A 의 관측에서 왔나(그러면 잇기가 아니라 고르기를 옮긴다) */
  const sameEye = (a: RoomMarker, b: RoomMarker) => b.eyeIds.every((e) => a.eyeIds.includes(e));
  const tryLink = (fromKey: string, m: RoomMarker) => {
    // B 쪽 키는 A 와 다른 관측의 것으로(이어진 묶음이면 그중 다른 관측의 등장)
    const fromEye = eyeOfKey(fromKey);
    const toKey = m.keys.find((k) => eyeOfKey(k) !== fromEye) ?? markerKey(m);
    const j = g.linkMarkers(fromKey, toKey);
    if (j.verdict === 'ok') {
      setLinkFb({ text: '같은 사람으로 이었다', ok: true });
      setSelKey(markerKey(m));
    } else if (j.feedback) {
      fx('tag_no');
      // 아직 놓지 않은 들은 말이 있으면 그 칩을 가리킨다(정답은 말하지 않는다 — 볼 곳만)
      if (room.heard.length) {
        setLinkFb({ text: `${j.feedback} — 들은 말부터 자리에 놓아 보자`, ok: false });
        setChipPulse((n) => n + 1);
      } else setLinkFb({ text: j.feedback, ok: false });
    }
  };
  /**
   * 표시 탭: 들은 말을 놓는 중이면 그 자리에 놓기 · 잇는 중이면 B 로 판정 ·
   * 표시 A 가 골라져 있고 **다른 관측**의 표시를 탭하면 바로 잇기를 시도한다(버튼 없이도 — QA_UX ux-03) ·
   * 같은 관측의 표시면 고르기만 옮긴다.
   */
  const tapMarker = (m: RoomMarker) => {
    fx('tap');
    setSelEye(null);
    if (placing) {
      tryPlace(m.posId);
      return;
    }
    if (linkFrom) {
      if (m.keys.includes(linkFrom.key)) {
        setLinkFrom(null);
        return;
      }
      tryLink(linkFrom.key, m);
      setLinkFrom(null);
      return;
    }
    if (marker && selKey && !m.keys.includes(selKey) && !sameEye(marker, m)) {
      tryLink(selKey, m);
      return;
    }
    setLinkFb(null);
    setSelKey(selKey && m.keys.includes(selKey) ? null : markerKey(m));
  };
  const startLink = () => {
    if (linkFrom) {
      setLinkFrom(null);
      return;
    }
    if (!marker || !room.time) return;
    fx('tap');
    setLinkFb(null);
    setLinkFrom({ key: markerKey(marker), label: markerName(marker), time: room.time });
  };
  const resetConflict = () => {
    setMode(null);
    setRetry(null);
    setClaim(null);
    setEvid(null);
    setSeat(null);
  };

  return (
    <>
      <div className="scr" style={{ zIndex: 28, background: '#0b0a09' }} aria-hidden="true">
        <img src={backdropSrc(currentEpisode(useGameStore.getState()).id)} alt="" style={{ width: '100%', height: '42%', objectFit: 'cover', imageRendering: 'pixelated', filter: 'blur(2px) brightness(.4) saturate(.7)' }} />
      </div>
      <Sheet
        title={
          view && !view.resolved ? (
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <IWarn /> 근거끼리 모순된다
            </span>
          ) : (
            '그날의 방'
          )
        }
        headClass={view && !view.resolved ? 'alertcol' : ''}
        onClose={close}
        scrim="none"
        testId="room-sheet"
        maxH={view && !view.resolved ? '90%' : '82%'}
        foot={
          <NavBar
            className="insheet"
            backTestId="room-nav-back"
            onBack={() => {
              // 모순 보기에서는 방(도면)으로, 잇는 중이면 잇기 그만, 방에서는 닫기
              if (view) resetConflict();
              else if (placing) setPlacing(null);
              else if (linkFrom) setLinkFrom(null);
              else close();
            }}
            primary={
              view ? (
                view.resolved ? (
                  <button className="btn primary navprimary" data-testid="room-back" onClick={resetConflict}>
                    그날의 방으로
                  </button>
                ) : view.waiting ? (
                  // 긴장 순서: 기다리는 소식(1년 전 보고서)이 먼저 — 판정은 그 뒤
                  <button className="btn primary navprimary" data-testid="resolve-wait" onClick={() => openMessenger()}>
                    메신저부터 ›
                  </button>
                ) : (
                  <button
                    className="btn primary navprimary"
                    data-testid="resolve-confirm"
                    disabled={!claim || !evid}
                    onClick={() => {
                      if (!claim || !evid) return;
                      const r = g.resolveContradiction(view.id, claim, evid);
                      if (r.status === 'retry') {
                        setRetry(r.text);
                        fx('tag_no');
                        setClaim(null);
                        setEvid(null);
                      } else if (r.status === 'resolved') {
                        setRetry(null);
                        // 칸에서 고른 값이 이긴 말이면 그 칸에 그대로 넣어 둔다
                        const pf = useUi.getState().pendingFill;
                        const won = cx?.claims.find((c) => c.id === r.winner)?.value;
                        if (pf && pf.contradictionId === view.id && won === pf.value) useGameStore.getState().fillSlot(pf.lineId, pf.kind, pf.value);
                        useUi.getState().setPendingFill(null);
                      }
                    }}
                  >
                    {view.judgements.find((j) => j.claimId === claim)?.text ?? '판단과 근거를 고른다'}
                  </button>
                )
              ) : room.markers.length ? (
                <button className={`btn ${linkFrom ? 'secondary' : 'primary'} navprimary`} data-testid="link-start" aria-pressed={!!linkFrom} disabled={!linkFrom && !marker} onClick={startLink}>
                  {linkFrom ? '잇기 그만' : '같은 사람 잇기'}
                </button>
              ) : null
            }
          />
        }
      >
        {view && !view.resolved ? <span data-float-hold="" hidden /> : null}
        {!view ? (
          <>
            <div className="chips" data-testid="room-chips" ref={chipsRef} onScroll={(e) => fadeChips(e.currentTarget)}>
              {open1.length ? (
                <button className="chip warn" data-testid="chip-contradiction" onClick={() => { setMode(open1[0]!.id); setClaim(null); setRetry(null); setSeat(null); setLinkFrom(null); }}>
                  <IWarn size={18} /> 모순
                </button>
              ) : null}
              {room.chips.map((t) => (
                <button
                  key={t}
                  className={`chip${t === room.time ? ' on' : ''}`}
                  data-testid={`chip-${t}`}
                  aria-pressed={t === room.time}
                  onClick={() => {
                    fx('tap');
                    g.selectRoomTime(t);
                    // 잇는 중이면 첫 표시는 그대로 — 다른 시각의 표시와도 이어 볼 수 있다
                    if (!linkFrom) setSelKey(null);
                    setPlacing(null);
                    setLinkFb(null);
                  }}
                >
                  <span className="clock" style={{ color: 'inherit' }}>
                    {t}
                  </span>
                </button>
              ))}
            </div>
            <Plan
              room={room}
              selEye={selEye}
              selKey={selKey}
              linkFrom={linkFrom?.key ?? null}
              onEye={(id) => {
                if (placing) {
                  const e = room.eyes.find((x) => x.eyeId === id);
                  if (e) tryPlace(e.seatId);
                  return;
                }
                setSelEye(id === selEye ? null : id);
                if (!linkFrom) setSelKey(null);
              }}
              onMarker={tapMarker}
              justMerged={justMerged}
              mergePos={mergePos}
              placing={!!placing}
            />
            {room.heard.length || room.placedHeard.length ? (
              <div className="heard" data-testid="room-heard">
                <span className="t-m">들은 말 — 어느 자리 얘기일까</span>
                {room.placedHeard.map((h) => (
                  // 놓은 말은 칩 자리를 지킨다(도면이 밀리지 않게) — 누를 수 없다
                  <div key={h.key} className="heardchip done" data-testid={`heard-done-${h.key}`}>
                    <span className="clock t-m">{cutNo(h.cutId)}</span>
                    <span className="tx">「{h.text}」</span>
                    <span className="t-m amber">놓음 ✓</span>
                  </div>
                ))}
                {room.heard.map((h) => (
                  <button
                    key={`${h.key}:${chipPulse}`}
                    className={`heardchip pulse${placing === h.key ? ' on' : ''}`}
                    data-testid={`heard-${h.key}`}
                    aria-pressed={placing === h.key}
                    onClick={() => {
                      fx('tap');
                      setLinkFrom(null);
                      setLinkFb(null);
                      setPlacing(placing === h.key ? null : h.key);
                    }}
                  >
                    <span className="clock t-m">{cutNo(h.cutId)}</span>
                    <span className="tx">「{h.text}」</span>
                    <span className="go" aria-hidden="true">
                      {placing === h.key ? '도면에서 탭' : '놓기'} <IChevR size={16} />
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="t-m" style={{ marginTop: 10, color: 'var(--hanji)' }} data-testid="room-info">
              {placing ? (
                <span data-testid="place-prompt">
                  <span className="amber">◌</span> 그 말이 가리킨 자리를 도면에서 탭
                </span>
              ) : linkFrom ? (
                <span data-testid="link-prompt">
                  <span className="amber">◌</span> {linkFrom.label} · {linkFrom.time} — 같은 사람을 다른 관측에서 탭
                </span>
              ) : eye ? (
                <>
                  <span className="amber">●</span> {eye.label} · {room.time}
                </>
              ) : marker ? (
                <>
                  {markerName(marker)} · {room.time}
                  {marker.eyeIds.length ? ` · ${marker.eyeIds.map(eyeName).join(' · ')}` : ''}
                  {marker.merged ? ' · 같은 사람으로 이었다' : ' — 같은 사람이면 다른 관측에서 탭'}
                </>
              ) : (
                <span className="t-m">사람을 탭하면 시야와 컷을 본다 · 고른 채 다른 관측의 사람을 탭하면 잇는다</span>
              )}
            </div>
            {linkFb ? (
              // 시트 아래 막대 위에 붙어 늘 보인다(sticky) — 360 에서 잇기 안내가 막대 밑에 숨었다(QA_UX_R4)
              <div ref={fbRef} className={`fb stick${linkFb.ok ? ' ok' : ''}`} role="status" data-testid="link-feedback" data-ok={linkFb.ok ? 'true' : 'false'}>
                <span className="t-b">{linkFb.text}</span>
              </div>
            ) : null}
            {eye?.cutId && !linkFrom ? (
              <button className="link" onClick={() => goCut(eye.cutId!)} data-testid="room-go-cut">
                <span>이 시각의 컷: {cutNo(eye.cutId)}</span>
                <IChevR />
              </button>
            ) : null}
            {marker?.cutIds.length && !linkFrom ? (
              <button className="link" onClick={() => goCut(marker.cutIds[0]!)} data-testid="room-go-cut">
                <span>이 사람이 나온 컷: {marker.cutIds.map(cutNo).join(' · ')}</span>
                <IChevR />
              </button>
            ) : null}
          </>
        ) : (
          <>
            <div className="t-m slotsline" data-testid="contra-slots">
              근거 {view.slots}칸 · ① 판단 — 어느 말을 남기나
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {cx?.claims.map((c) => (
                <button
                  key={c.id}
                  className={`claimchip${claim === c.id ? ' on' : ''}${c.lost ? ' won' : ''}`}
                  data-testid={`claim-${c.id}`}
                  aria-pressed={claim === c.id}
                  disabled={view.resolved}
                  onClick={() => {
                    fx('tap');
                    setClaim(claim === c.id ? null : c.id);
                    setRetry(null);
                    // 판단을 고르면 ② 근거가 보이게(작은 화면에서 아래로 밀려 있지 않게)
                    if (claim !== c.id) setTimeout(() => evRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
                  }}
                >
                  <span>{c.label}</span>
                  {c.heardIn.length ? (
                    <small className="claimsrc t-m" data-testid={`claim-src-${c.id}`}>
                      들은 곳: 컷 {c.heardIn.map(cutNo).join(' · ')}
                    </small>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="contra-plan">
            <Conflict geo={view.geometry} room={room} focusClaim={view.resolved ? claim : null} selSeat={seat} onSeat={(id) => { fx('tap'); setSeat(seat === id ? null : id); }} />
            </div>
            <div className="t-m" style={{ marginTop: 8 }} data-testid="conflict-caption" data-float-avoid>
              {view.geometry.kind === 'hearing'
                ? `${view.geometry.time} · 원 = 들림 반경 ${view.geometry.radius}칸 · 자리를 탭하면 거리`
                : `${view.geometry.time} · 원 = 셀 수 있는 거리 ${view.geometry.detailRange}칸 · 빗금 = 가리는 것 · 자리를 탭하면 시선`}
            </div>
            <div className="t-m" style={{ marginTop: 8 }} ref={evRef}>② 근거 — 다른 말이 왜 틀렸나, 사실 한 줄</div>
            <div className="contra-ev" data-testid="contra-evidence" style={{ marginTop: 4 }}>
              {view.evidence.map((e) => (
                <button
                  key={e.id}
                  className={`evrow${evid === e.id ? ' sel' : ''}`}
                  data-testid={`cev-${e.id}`}
                  aria-pressed={evid === e.id}
                  disabled={view.resolved}
                  onClick={() => {
                    fx('tap');
                    setEvid(evid === e.id ? null : e.id);
                    setSeat(e.eyeId);
                    setRetry(null);
                  }}
                >
                  <span className="k">
                    <span className="t-m">{ownerChar(room.eyes.find((x) => x.eyeId === e.eyeId)?.label ?? '')}</span>
                  </span>
                  <span className="tx">{e.text}</span>
                </button>
              ))}
            </div>
            {view.waiting ? (
              <div className="fb" role="status" data-testid="resolve-waiting">
                <span className="t-b">메신저를 먼저 보자</span>
              </div>
            ) : null}
            {retry ? (
              <div className="fb" role="status" data-testid="retry-text">
                <span className="t-b">{retry}</span>
              </div>
            ) : null}
            {view.resolved ? (
              <div className="fb" role="status" data-testid="resolved-text" style={{ background: 'var(--amber-soft)', borderLeftColor: 'var(--amber)' }}>
                <span className="t-b">
                  {cx?.claims.find((c) => c.lost)?.lostLabel ?? '한쪽이 가라앉았다'}
                  {cx?.claims.find((c) => c.lost)?.lostNote ? ` — ${cx.claims.find((c) => c.lost)!.lostNote}` : ''}
                </span>
                {view.firstTry ? (
                  <span className="okfirst inline" data-testid="contra-first-try">
                    단번에 풀림
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </Sheet>
    </>
  );
}
