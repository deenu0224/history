/**
 * 그날의 방 — 도면(SVG). 자리·시야 부채꼴·들림 반경을 같은 방 위에 그린다. 확대·이동 없음.
 * 일반 보기(시각 칩 · 눈의 시야 · 겹침 「같은 사람」) / 모순 보기(반경 안은 밝게, 밖은 어둡게 · 두 주장 중 하나를 남긴다).
 */
import { useEffect, useMemo, useState } from 'react';
import type { ContradictionGeometry } from '@/core/contradiction';
import { EPISODE, useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { selectContradictionView, selectContradictions, selectRoom, type RoomMarker } from '@/store/selectors';
import { fx } from '../lib/fx';
import { cutNo } from '../lib/format';
import { BACKDROP } from '../lib/manifest';
import { IChevR, IWarn } from './icons';
import { Sheet } from './Sheet';
import { useUi } from '../uiStore';

const C = 27; // 1칸 = 27 사용자 단위(글자 16 이 폭 328px 에서도 16px 이상)
const AMBER = '#e2a85c';
const TEAL = '#5c9a95';
const TEAL2 = '#9ac9c3';
const ALERT = '#d98a7a';

const P = (v: number) => v * C;

function cone(x: number, y: number, facing: number, half: number, r: number) {
  const a0 = ((facing - half) * Math.PI) / 180;
  const a1 = ((facing + half) * Math.PI) / 180;
  const cx = P(x);
  const cy = P(y);
  const rr = r * C;
  return `M${cx},${cy} L${cx + rr * Math.cos(a0)},${cy + rr * Math.sin(a0)} A${rr},${rr} 0 0 1 ${cx + rr * Math.cos(a1)},${cy + rr * Math.sin(a1)} Z`;
}

const WORD: Record<string, string> = { clear: '또렷', garbled: '흐림', none: '안 들림', countable: '셀 수 있음', occluded: '가려짐', far: '멀다', out_of_view: '시야 밖' };
const ownerChar = (label: string) => (label.endsWith('의 기억') ? label[0]! : '?');

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

function PersonMark({ x, y, label, merged, count, sel, eye, dashed, alert, onClick, testId }: { x: number; y: number; label: string; merged?: boolean; count?: number; sel?: boolean; eye?: boolean; dashed?: boolean; alert?: boolean; onClick?: () => void; testId?: string }) {
  const r = 13;
  const ring = alert ? ALERT : eye ? AMBER : label === '?' ? '#8a8171' : TEAL2;
  const fill = eye ? '#2b2414' : label === '?' ? '#161412' : '#16302f';
  return (
    <g className="mk" onClick={onClick} data-testid={testId} role={onClick ? 'button' : undefined} aria-label={label === '?' ? '모르는 사람' : label}>
      <circle cx={P(x)} cy={P(y)} r={r + 9} fill="transparent" />
      {merged ? <circle cx={P(x) + 5} cy={P(y) + 4} r={r} fill="#161412" stroke={ring} strokeWidth="1.6" /> : null}
      {sel ? <circle cx={P(x)} cy={P(y)} r={r + 5} fill="none" stroke={AMBER} strokeWidth="1.6" opacity=".6" /> : null}
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

// ── 일반 보기 ──
function Plan({ room, selEye, selMarker, setSelEye, setSelMarker, justMerged }: { room: ReturnType<typeof selectRoom>; selEye: string | null; selMarker: number | null; setSelEye: (id: string | null) => void; setSelMarker: (i: number | null) => void; justMerged: boolean }) {
  const half = room.eyes[0]?.halfAngleDeg ?? 50;
  const sel = room.eyes.find((e) => e.eyeId === selEye);
  const mergedMarker = room.markers.find((m) => m.merged);
  return (
    <div className="planwrap">
      <svg className="plan" viewBox={`0 0 ${room.w * C} ${room.h * C}`} role="img" aria-label="그날의 방 도면" data-testid="room-plan">
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
            <g key={e.eyeId} className="mk" onClick={() => { setSelEye(e.eyeId === selEye ? null : e.eyeId); setSelMarker(null); }} data-testid={`eye-${e.eyeId}`} role="button" aria-label={`${e.label}${closed ? ' (닫힘)' : ''}`}>
              <circle cx={P(e.x)} cy={P(e.y)} r="22" fill="transparent" />
              {closed ? <circle cx={P(e.x)} cy={P(e.y)} r="17" fill="none" stroke={TEAL} strokeWidth="1.5" strokeDasharray="3 3" /> : <path d={`M${tx + Math.cos(a) * 6},${ty + Math.sin(a) * 6} L${tx + px},${ty + py} L${tx - px},${ty - py} Z`} fill={AMBER} />}
              {e.selected && !closed ? <circle cx={P(e.x)} cy={P(e.y)} r="18" fill="none" stroke={AMBER} strokeWidth="1.5" opacity=".55" /> : null}
            </g>
          );
        })}
        {room.markers.map((m, i) => {
          const eye = room.eyes.find((e) => Math.hypot(e.x - m.x, e.y - m.y) < 0.05 && m.kind === 'person');
          return (
            <g key={m.keys.join('|')} className={m.merged && justMerged ? 'merged-anim' : undefined} style={{ transformOrigin: `${P(m.x)}px ${P(m.y)}px` }}>
              <PersonMark
                x={m.x}
                y={m.y}
                label={m.label}
                merged={m.merged}
                count={m.count}
                eye={!!eye}
                dashed={m.label === '?' && !eye}
                sel={selMarker === i}
                testId={`marker-${m.posId}`}
                onClick={() => {
                  setSelMarker(selMarker === i ? null : i);
                  setSelEye(null);
                }}
              />
            </g>
          );
        })}
      </svg>
      {justMerged && mergedMarker ? (
        <span className="tagmerge" data-testid="same-person" style={{ left: `${(mergedMarker.x / room.w) * 100}%`, top: `calc(${(mergedMarker.y / room.h) * 100}% - 52px)` }}>
          같은 사람
        </span>
      ) : null}
    </div>
  );
}

// ── 모순 보기 ──
function Conflict({ geo, room, focusClaim }: { geo: ContradictionGeometry; room: ReturnType<typeof selectRoom>; focusClaim: string | null }) {
  const W = room.w * C;
  const H = room.h * C;
  const name = (eyeId: string) => ownerChar(room.eyes.find((e) => e.eyeId === eyeId)?.label ?? '');
  const R = (geo.radius ?? 0) * C;
  const GR = (geo.garbleRadius ?? 0) * C;
  const sx = P(geo.source.x);
  const sy = P(geo.source.y);
  const col = (s: string) => (s === 'clear' || s === 'countable' ? TEAL2 : s === 'garbled' || s === 'far' ? AMBER : ALERT);
  const word = (s: string) => WORD[s] ?? s;
  return (
    <svg className="plan" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="모순 도면" data-testid="conflict-plan">
      <Base room={room}>
        {geo.kind === 'hearing' ? (
          <>
            <path fillRule="evenodd" fill="rgba(5,5,5,.55)" d={`M0,0 H${W} V${H} H0 Z M${sx + R},${sy} A${R},${R} 0 1 0 ${sx - R},${sy} A${R},${R} 0 1 0 ${sx + R},${sy} Z`} />
            <circle cx={sx} cy={sy} r={R} fill="rgba(92,154,149,.1)" stroke={TEAL2} strokeWidth="1.6" />
            <circle cx={sx} cy={sy} r={GR} fill="none" stroke={TEAL} strokeWidth="1.2" strokeDasharray="3 5" opacity=".8" />
          </>
        ) : (
          <circle cx={sx} cy={sy} r={(geo.detailRange ?? 5) * C} fill="none" stroke={TEAL} strokeWidth="1.2" strokeDasharray="3 5" opacity=".7" />
        )}
        {geo.kind === 'sight' && geo.occluder ? (
          <rect x={P(geo.occluder.rect[0])} y={P(geo.occluder.rect[1])} width={P(geo.occluder.rect[2] - geo.occluder.rect[0])} height={P(geo.occluder.rect[3] - geo.occluder.rect[1])} fill="url(#hatch)" stroke={ALERT} strokeWidth="2" />
        ) : null}
      </Base>
      {geo.listeners.map((l) => (
        <circle key={l.key} cx={P(l.x)} cy={P(l.y)} r="5" fill="#161412" stroke={col(l.status)} strokeWidth="1.5" opacity=".8" />
      ))}
      {geo.witnesses.map((w) => {
        const on = !focusClaim || w.claimId === focusClaim;
        return (
          <g key={`${w.eyeId}${w.claimId ?? ''}`} opacity={on ? 1 : 0.35} data-testid={`witness-${w.eyeId}`} data-status={w.status}>
            {geo.kind === 'sight' ? <line x1={P(w.x)} y1={P(w.y)} x2={sx} y2={sy} stroke={col(w.status)} strokeWidth="1.3" strokeDasharray={w.status === 'countable' ? undefined : '4 4'} /> : null}
            <PersonMark x={w.x} y={w.y} label={name(w.eyeId)} eye alert={w.status === 'none' || w.status === 'occluded'} sel={!!focusClaim && w.claimId === focusClaim} />
            <text className="lbl" x={Math.max(34, Math.min(W - 34, P(w.x)))} y={P(w.y) + 34} textAnchor="middle" fill={col(w.status)} fontSize="16" fontWeight="600">
              {word(w.status)}
            </text>
          </g>
        );
      })}
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
  const room = useView(selectRoom);
  const xs = useView(selectContradictions);
  const [mode, setMode] = useState<string | null>(null); // 모순 id
  const [selEye, setSelEye] = useState<string | null>(null);
  const [selMarker, setSelMarker] = useState<number | null>(null);
  const [claim, setClaim] = useState<string | null>(null);
  const [retry, setRetry] = useState<string | null>(null);

  const open1 = useMemo(() => xs.filter((x) => x.status === 'revealed'), [xs]);

  useEffect(() => {
    if (!open) return;
    setRetry(null);
    setClaim(null);
    setSelMarker(null);
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
    const eye = EPISODE.eyes.find((e) => e.cuts.includes(cutId));
    if (!eye) return;
    g.viewCut(eye.id, eye.cuts.indexOf(cutId));
    close();
    const ui = useUi.getState();
    if (!ui.stack.includes('viewer')) ui.push('viewer');
  };

  const eye = room.eyes.find((e) => e.eyeId === selEye);
  const marker: RoomMarker | undefined = selMarker !== null ? room.markers[selMarker] : undefined;
  const cx = view ? xs.find((x) => x.id === view.id) : undefined;

  return (
    <>
      <div className="scr" style={{ zIndex: 28, background: '#0b0a09' }} aria-hidden="true">
        <img src={BACKDROP} alt="" style={{ width: '100%', height: '42%', objectFit: 'cover', imageRendering: 'pixelated', filter: 'blur(2px) brightness(.4) saturate(.7)' }} />
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
          view ? (
            view.resolved ? (
              <button className="btn primary" data-testid="room-back" onClick={() => { setMode(null); setRetry(null); setClaim(null); }}>
                그날의 방으로
              </button>
            ) : (
              <>
                {view.buttons.map((b) => (
                  <button
                    key={b.claimId}
                    className="btn primary"
                    data-testid={`resolve-${b.claimId}`}
                    onClick={() => {
                      const r = g.resolveContradiction(view.id, b.claimId);
                      if (r.status === 'retry') {
                        setRetry(r.text);
                        fx('tag_no');
                      } else if (r.status === 'resolved') setRetry(null);
                    }}
                  >
                    {b.text}
                  </button>
                ))}
              </>
            )
          ) : undefined
        }
      >
        {!view ? (
          <>
            <div className="chips" data-testid="room-chips">
              {open1.length ? (
                <button className="chip warn" data-testid="chip-contradiction" onClick={() => { setMode(open1[0]!.id); setClaim(null); setRetry(null); }}>
                  <IWarn size={18} /> 모순
                </button>
              ) : null}
              {room.chips.map((t) => (
                <button key={t} className={`chip${t === room.time ? ' on' : ''}`} data-testid={`chip-${t}`} aria-pressed={t === room.time} onClick={() => { fx('tap'); g.selectRoomTime(t); setSelMarker(null); }}>
                  <span className="clock" style={{ color: 'inherit' }}>
                    {t}
                  </span>
                </button>
              ))}
            </div>
            <Plan room={room} selEye={selEye} selMarker={selMarker} setSelEye={setSelEye} setSelMarker={setSelMarker} justMerged={justMerged} />
            <div className="t-m" style={{ marginTop: 10, color: 'var(--hanji)' }} data-testid="room-info">
              {eye ? (
                <>
                  <span className="amber">●</span> {eye.label} · {room.time}
                </>
              ) : marker ? (
                <>
                  {marker.label === '?' ? '모르는 사람' : marker.label} · {room.time}
                  {marker.merged ? ' · 같은 사람으로 겹쳤다' : ''}
                </>
              ) : (
                <span className="t-m">눈이나 사람을 탭하면 시야와 컷을 볼 수 있다</span>
              )}
            </div>
            {eye?.cutId ? (
              <button className="link" onClick={() => goCut(eye.cutId!)} data-testid="room-go-cut">
                <span>이 시각의 컷: {cutNo(eye.cutId)}</span>
                <IChevR />
              </button>
            ) : null}
            {marker?.cutIds.length ? (
              <button className="link" onClick={() => goCut(marker.cutIds[0]!)} data-testid="room-go-cut">
                <span>이 사람이 나온 컷: {marker.cutIds.map(cutNo).join(' · ')}</span>
                <IChevR />
              </button>
            ) : null}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              {cx?.claims.map((c) => (
                <button key={c.id} className={`claimchip${claim === c.id ? ' on' : ''}${c.lost ? ' won' : ''}`} data-testid={`claim-${c.id}`} aria-pressed={claim === c.id} onClick={() => setClaim(claim === c.id ? null : c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
            <Conflict geo={view.geometry} room={room} focusClaim={claim} />
            <div className="t-m" style={{ marginTop: 8 }}>
              {view.geometry.kind === 'hearing' ? `${view.geometry.time} · 말이 닿은 거리` : `${view.geometry.time} · 세어 볼 수 있었는가`}
            </div>
            <ul className="wlist t-m" data-testid="witness-list">
              {view.geometry.witnesses.map((w) => (
                <li key={`${w.eyeId}${w.claimId ?? ''}`}>
                  <span style={{ color: 'var(--hanji)' }}>{ownerChar(room.eyes.find((e) => e.eyeId === w.eyeId)?.label ?? '')}</span>
                  <span>{WORD[w.status] ?? w.status}</span>
                  <span className="clock">{w.distance.toFixed(1)}칸</span>
                </li>
              ))}
            </ul>
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
