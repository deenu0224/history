/**
 * 그날의 방 — 도면(SVG). 자리·시야 부채꼴·들림 반경을 같은 방 위에 그린다. 확대·이동 없음.
 * 일반 보기(시각 칩 · 눈의 시야 · 「같은 사람 잇기」: 표시 A 를 고르고 → 잇기 → 다른 관측의 표시 B 를 탭, 엔진이 시각·자리로 판정)
 * 모순 보기(기하만 — 반경 원·시선·가림 빗금·자리·거리. 자리를 탭하면 선이 그려진다. 결론 낱말은 없다 · 판단 + 근거 2칸).
 */
import { useEffect, useMemo, useState } from 'react';
import { currentEpisode, useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { selectContradictionView, selectContradictions, selectRoom, type NeutralGeometry, type RoomMarker } from '@/store/selectors';
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
/** 칸 거리(소수 한 자리) */
const cellsTxt = (n: number) => `${Math.round(n * 10) / 10}칸`;

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
}: {
  room: ReturnType<typeof selectRoom>;
  selEye: string | null;
  selKey: string | null;
  linkFrom: string | null;
  onEye: (id: string) => void;
  onMarker: (m: RoomMarker) => void;
  justMerged: boolean;
  mergePos: string | null;
}) {
  const half = room.eyes[0]?.halfAngleDeg ?? 50;
  const sel = room.eyes.find((e) => e.eyeId === selEye);
  const mergedMarker = room.markers.find((m) => m.merged && (!mergePos || m.posId === mergePos)) ?? room.markers.find((m) => m.merged);
  const seen = new Map<string, number>();
  return (
    <div className="planwrap">
      <svg className="plan" viewBox={`0 0 ${room.w * C} ${room.h * C}`} role="img" aria-label="그날의 방 도면" data-testid="room-plan" data-linking={linkFrom ? 'true' : undefined}>
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
            <g key={e.eyeId} className="mk" onClick={() => onEye(e.eyeId)} data-testid={`eye-${e.eyeId}`} role="button" aria-label={`${e.label}${closed ? ' (닫힘)' : ''}`}>
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
            <g key={m.keys.join('|')} className={m.merged && justMerged && m === mergedMarker ? 'merged-anim' : undefined} style={{ transformOrigin: `${P(m.x + m.ox)}px ${P(m.y)}px` }}>
              <PersonMark
                x={m.x + m.ox}
                y={m.y}
                label={m.label}
                merged={m.merged}
                count={m.count}
                eye={m.owner && m.kind === 'person'}
                dashed={m.label === '?' && !m.owner}
                sel={selKey === k || linkFrom === k}
                linking={linkFrom === k}
                hit={m.ox ? 19 : 22}
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
        <span className="tagmerge" data-testid="same-person" style={{ left: `${((mergedMarker.x + mergedMarker.ox) / room.w) * 100}%`, top: `calc(${(mergedMarker.y / room.h) * 100}% - 52px)` }}>
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
  return (
    <svg className="plan" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="모순 도면" data-testid="conflict-plan">
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
            <PersonMark x={w.x} y={w.y} label={name(w.eyeId)} eye sel={selSeat === w.eyeId} onClick={() => onSeat(w.eyeId)} testId={`seat-${w.eyeId}`} aria={`${name(w.eyeId)} 자리`} />
          </g>
        );
      })}
      {sel ? (
        <text className="lbl" x={Math.max(34, Math.min(W - 34, (P(sel.x) + sx) / 2))} y={(P(sel.y) + sy) / 2 - 8} textAnchor="middle" fill={AMBER} fontSize="16" fontWeight="600" data-testid="seat-distance">
          {cellsTxt(sel.distance)}
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
    setMode(focusId && xs.some((x) => x.id === focusId && x.status !== 'hidden') ? focusId : null);
    setSelEye(room.eyes.find((e) => e.selected)?.eyeId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focusId]);

  const view = useView((ep, s) => (mode ? selectContradictionView(ep, s, mode) : null), [mode]);
  if (!open) return null;

  const close = () => {
    useGameStore.getState().closeRoom();
    useUi.getState().setRoomFocus(null);
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

  /** 표시 탭: 잇는 중이면 B 로 판정, 아니면 고르기 */
  const tapMarker = (m: RoomMarker) => {
    fx('tap');
    setSelEye(null);
    if (linkFrom) {
      if (m.keys.includes(linkFrom.key)) {
        setLinkFrom(null);
        return;
      }
      const j = g.linkMarkers(linkFrom.key, markerKey(m));
      if (j.verdict === 'ok') {
        setLinkFb({ text: '같은 사람으로 이었다', ok: true });
        setSelKey(markerKey(m));
      } else if (j.feedback) {
        fx('tag_no');
        setLinkFb({ text: j.feedback, ok: false });
      }
      setLinkFrom(null);
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
        maxH="82%"
        foot={
          <NavBar
            className="insheet"
            backTestId="room-nav-back"
            onBack={() => {
              // 모순 보기에서는 방(도면)으로, 잇는 중이면 잇기 그만, 방에서는 닫기
              if (view) resetConflict();
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
                      } else if (r.status === 'resolved') setRetry(null);
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
        {!view ? (
          <>
            <div className="chips" data-testid="room-chips">
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
                setSelEye(id === selEye ? null : id);
                if (!linkFrom) setSelKey(null);
              }}
              onMarker={tapMarker}
              justMerged={justMerged}
              mergePos={mergePos}
            />
            <div className="t-m" style={{ marginTop: 10, color: 'var(--hanji)' }} data-testid="room-info">
              {linkFrom ? (
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
                  {marker.merged ? ' · 같은 사람으로 이었다' : ''}
                </>
              ) : (
                <span className="t-m">사람을 탭하면 시야와 컷을 본다 · 둘이 같은 사람이면 「같은 사람 잇기」</span>
              )}
            </div>
            {linkFb ? (
              <div className={`fb${linkFb.ok ? ' ok' : ''}`} role="status" data-testid="link-feedback" data-ok={linkFb.ok ? 'true' : 'false'}>
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
              근거 {view.slots}칸 · ① 판단 + ② 근거
            </div>
            <div className="t-m" style={{ marginTop: 6 }}>① 판단 — 어느 말을 남기나</div>
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
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <Conflict geo={view.geometry} room={room} focusClaim={claim} selSeat={seat} onSeat={(id) => { fx('tap'); setSeat(seat === id ? null : id); }} />
            <div className="t-m" style={{ marginTop: 8 }} data-testid="conflict-caption">
              {view.geometry.kind === 'hearing'
                ? `${view.geometry.time} · 원 = 들림 반경 ${view.geometry.radius}칸 · 자리를 탭하면 거리`
                : `${view.geometry.time} · 원 = 셀 수 있는 거리 ${view.geometry.detailRange}칸 · 빗금 = 가리는 것 · 자리를 탭하면 시선`}
            </div>
            <div className="t-m" style={{ marginTop: 10 }}>② 근거 — 그 판단을 받치는 자리 하나</div>
            <div data-testid="contra-evidence" style={{ marginTop: 4 }}>
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
                <span className="t-b">한 선임이 뭔가 찾고 있다 — 메신저를 먼저 보자</span>
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
              </div>
            ) : null}
          </>
        )}
      </Sheet>
    </>
  );
}
