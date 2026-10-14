import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { CutStrip, CutView } from '../src/game/cuts/CutView';
import { getFigureHitboxes, type CutSpec } from '../src/game/cuts';
import { Eye, Sleeve, type EyeState } from './pix';
import { Clock, IBack } from './ui';

const dpr = () => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

export interface EyeItem {
  state: EyeState;
  /** 현재 보고 있는 눈 */
  current?: boolean;
  /** 열리는 중(눈꺼풀 연출 한 프레임) */
  opening?: boolean;
  label: string;
}

/** 눈 줄: 현재 눈 밝게, 탭하면 다른 기억으로. 칸 44×44 터치 */
export function EyeRow({ eyes }: { eyes: EyeItem[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, paddingLeft: 12, height: 48 }}>
      {eyes.map((e, i) => (
        <div key={i} aria-label={e.label} style={{ position: 'relative', width: 44, height: 44, display: 'grid', placeItems: 'center' }}>
          {e.current ? <span style={{ position: 'absolute', inset: 4, borderRadius: 12, background: 'rgba(255,210,122,.1)', boxShadow: 'inset 0 0 0 1px rgba(255,210,122,.38)' }} /> : null}
          {e.opening ? <span style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,210,122,.55), rgba(255,210,122,0) 68%)' }} /> : null}
          <span style={{ opacity: e.current || e.opening ? 1 : e.state === 'never' ? 0.8 : 0.62, position: 'relative' }}>
            <Eye state={e.state} glow={e.current || e.opening} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** 위 띠(반투명 숯): 상태 표시줄 아래 48px + 눈 줄 */
export function TopBand({ title, time, eyes, cold = false, sat }: { title: string; time: string; eyes: EyeItem[]; cold?: boolean; sat: number }) {
  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, top: 0, zIndex: 20,
        paddingTop: sat,
        background: cold ? 'linear-gradient(rgba(14,18,24,.94), rgba(18,23,30,.9))' : 'linear-gradient(rgba(10,13,18,.9), rgba(15,20,28,.8))',
        backdropFilter: 'blur(6px)',
        borderBottom: '1px solid rgba(134,196,189,.22)',
      }}
    >
      <div style={{ height: 48, display: 'flex', alignItems: 'center', paddingLeft: 6, paddingRight: 18 }}>
        <button className="icon-btn" aria-label="뒤로" style={{ color: 'var(--text)' }}><IBack /></button>
        <div className="t-h" style={{ flex: 1, marginLeft: 2, fontSize: 22, color: cold ? 'var(--muted)' : 'var(--text)' }}>{title}</div>
        <Clock color="var(--accent-strong)">{time}</Clock>
      </div>
      <div style={{ height: 1, background: 'rgba(52,68,94,.7)', marginLeft: 12, marginRight: 12 }} />
      <EyeRow eyes={eyes} />
    </div>
  );
}

/** 시선 쪽이 밝은 타원 + 바깥 어둠 + 관측기 모서리 표식(현대 얇은 테두리) */
export function EyeFraming({ w, h, gaze = 'left', cold = false }: { w: number; h: number; gaze?: 'left' | 'right' | 'center'; cold?: boolean }) {
  const gx = gaze === 'left' ? '34%' : gaze === 'right' ? '66%' : '50%';
  const c = cold ? '111,129,150' : '134,196,189';
  const br = (pos: CSSProperties, d: string) => (
    <svg width="22" height="22" viewBox="0 0 22 22" style={{ position: 'absolute', ...pos }} fill="none" stroke={`rgba(${c},.55)`} strokeWidth="1.5"><path d={d} /></svg>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8 }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 78% 62% at ${gx} 46%, rgba(0,0,0,0) 42%, rgba(12,9,6,.5) 100%)` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(10,8,6,.55), rgba(10,8,6,0) 22%, rgba(10,8,6,0) 74%, rgba(10,8,6,.62))' }} />
      {br({ left: 12, top: 150 }, 'M1 21V1h20')}
      {br({ right: 12, top: 150 }, 'M21 21V1H1')}
      {br({ left: 12, bottom: 32 }, 'M1 1v20h20')}
      {br({ right: 12, bottom: 32 }, 'M21 1v20H1')}
    </div>
  );
}

/** 말풍선(과거 언어). 사람 머리 쪽으로 꼬리 */
export function Bubble({ x, y, bottom, w, tail, children, blurred = false, style }: { x: number; y?: number; bottom?: number; w: number; tail?: { x: number; side: 'top' | 'bottom' }; children: ReactNode; blurred?: boolean; style?: CSSProperties }) {
  return (
    <div className="bubble-past" style={{ left: x, top: y, bottom, width: w, zIndex: 15, opacity: blurred ? 0.78 : 1, ...style }}>
      {tail ? <span className="tail" style={tail.side === 'top' ? { left: tail.x - 7, top: -8, transform: 'rotate(225deg)' } : { left: tail.x - 7, bottom: -8 }} /> : null}
      {children}
    </div>
  );
}

export function useHitboxes(spec: CutSpec, w: number, h: number) {
  return useMemo(() => getFigureHitboxes(spec, w, h, dpr()), [spec, w, h]);
}

/** 이름표(태그 뒤에만): 한지색 작은 명패 + 붓 한 획 */
export function NameTag({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)', zIndex: 12, pointerEvents: 'none' }}>
      <div style={{ background: 'rgba(239,229,203,.96)', color: '#25211e', border: '1.5px solid #988a68', borderRadius: 6, padding: '1px 9px 2px', fontSize: 16, lineHeight: '22px', fontWeight: 600, boxShadow: '0 3px 0 rgba(20,17,15,.4)', whiteSpace: 'nowrap' }}>
        {children}
      </div>
      <svg width="64" height="8" viewBox="0 0 64 8" style={{ display: 'block', margin: '1px auto 0' }}>
        <path d="M2 5 C14 1, 30 7, 62 3" stroke="#25211e" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".8" />
      </svg>
    </div>
  );
}

/** 전체 화면 컷 뷰어(CutStrip + 눈 틀 + 위 띠 + 아래 엄지 영역) */
export function Viewer({
  w, h, sat, sab, eyes, title, time, specs, index, ringIds, bubbles, nameTags, actions, cold, children, sleeve = true, gaze = 'left',
}: {
  w: number; h: number; sat: number; sab: number; eyes: EyeItem[]; title: string; time: string; specs: CutSpec[]; index: number;
  ringIds?: string[]; bubbles?: (hit: Record<string, { x: number; y: number; w: number; h: number }>, area: { w: number; h: number }) => ReactNode;
  nameTags?: Record<string, string>; actions: ReactNode; cold?: boolean; children?: ReactNode; sleeve?: boolean; gaze?: 'left' | 'right' | 'center';
}) {
  const bottom = 14 + 56 + 8 + sab; // 엄지 영역
  const cw = w - 8; // 다음 컷 가장자리 8px
  const ch = h - bottom;
  const spec = specs[index]!;
  const boxes = useHitboxes(spec, cw, ch);
  const hit = Object.fromEntries(boxes.map((b) => [b.id, b]));
  const next = specs[index + 1];
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: cw, height: ch, background: '#0b0a08' }}>
        <CutStrip specs={specs} index={index} onIndexChange={() => {}} highlightIds={ringIds} />
        <EyeFraming w={cw} h={ch} gaze={gaze} cold={cold} />
        {sleeve ? <div style={{ position: 'absolute', right: -6, bottom: -2, zIndex: 9, filter: 'drop-shadow(-6px -4px 0 rgba(10,8,6,.28))' }}><Sleeve scale={2} /></div> : null}
        {nameTags
          ? Object.entries(nameTags).map(([id, label]) => (hit[id] ? <NameTag key={id} x={hit[id]!.x + hit[id]!.w / 2} y={hit[id]!.y + 8}>{label}</NameTag> : null))
          : null}
        {bubbles ? bubbles(hit, { w: cw, h: ch }) : null}
        {children}
      </div>
      {next ? (
        <div style={{ position: 'absolute', left: cw, top: 0, width: 8, height: ch, overflow: 'hidden', zIndex: 6, boxShadow: 'inset 2px 0 6px rgba(0,0,0,.7)' }}>
          <div style={{ width: cw, height: ch, filter: 'brightness(.8)' }}><CutView spec={next} transition="none" /></div>
        </div>
      ) : null}
      <TopBand title={title} time={time} eyes={eyes} cold={cold} sat={sat} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bottom, background: 'var(--bg)', borderTop: '1px solid rgba(134,196,189,.28)', padding: `14px 16px ${sab + 8}px`, display: 'flex', gap: 12, zIndex: 20 }}>
        {actions}
      </div>
    </>
  );
}
