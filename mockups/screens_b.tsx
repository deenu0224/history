/** 10~11 그날의 방 · 12 찾기 */
import type { ReactNode } from 'react';
import { CutView } from '../src/game/cuts/CutView';
import { Eye } from './pix';
import { Screen, IClose, IBack, ISearch, IClear, IChevR, IWarn, Clock } from './ui';
import { cam, e2Cut21 } from './cuts';

// ───────────────────────── 도면(12×9) ─────────────────────────
const TEAL = '#4a9795';
const TEAL2 = '#86c4bd';
const AMBER = '#e0ae5c';

interface Mk {
  id: string;
  x: number;
  y: number;
  label: string; // 성 한 글자 또는 ?
  eye?: boolean; // 열린 눈의 자리
  facing?: number; // deg, 0=동 90=남
  dup?: boolean; // 겹침(×2)
  dim?: boolean;
  sel?: boolean;
  alert?: boolean;
  speaker?: boolean;
}

export function RoomPlan({ w, mode, markers, extra }: { w: number; mode: 'normal' | 'contra'; markers: Mk[]; extra?: ReactNode }) {
  const c = w / 12;
  const h = c * 9;
  const r = Math.min(14, c * 0.47);
  const P = (x: number, y: number) => [x * c, y * c] as const;
  const sel = markers.find((m) => m.sel && m.eye);
  const cone = (m: Mk, R: number, half: number) => {
    const [cx, cy] = P(m.x, m.y);
    const a0 = ((m.facing! - half) * Math.PI) / 180;
    const a1 = ((m.facing! + half) * Math.PI) / 180;
    const rr = R * c;
    return `M${cx},${cy} L${cx + rr * Math.cos(a0)},${cy + rr * Math.sin(a0)} A${rr},${rr} 0 0 1 ${cx + rr * Math.cos(a1)},${cy + rr * Math.sin(a1)} Z`;
  };
  const B = markers.find((m) => m.speaker);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', background: '#0d1219', borderRadius: 12, border: '1px solid var(--line)' }}>
      <defs>
        <clipPath id={`clip${w}`}><rect x="1" y="1" width={w - 2} height={h - 2} rx="11" /></clipPath>
        <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke={TEAL2} strokeWidth="1.5" /></pattern>
      </defs>
      <g clipPath={`url(#clip${w})`}>
        {/* 격자점 */}
        {Array.from({ length: 11 }, (_, i) => Array.from({ length: 8 }, (_, j) => <circle key={`${i}-${j}`} cx={(i + 1) * c} cy={(j + 1) * c} r="1.1" fill="#26334a" />))}
        {/* 소리/시야 */}
        {mode === 'contra' && B ? (
          <>
            <path fillRule="evenodd" fill="rgba(6,9,14,.6)" d={`M0,0 H${w} V${h} H0 Z M${B.x * c + 8 * c},${B.y * c} A${8 * c},${8 * c} 0 1 0 ${B.x * c - 8 * c},${B.y * c} A${8 * c},${8 * c} 0 1 0 ${B.x * c + 8 * c},${B.y * c} Z`} />
            <circle cx={B.x * c} cy={B.y * c} r={8 * c} fill="rgba(74,151,149,.1)" stroke={TEAL2} strokeWidth="1.5" />
            <circle cx={B.x * c} cy={B.y * c} r={10 * c} fill="none" stroke={TEAL} strokeWidth="1.2" strokeDasharray="3 5" opacity=".7" />
          </>
        ) : null}
        {mode === 'normal' && sel ? (
          <>
            <path d={cone(sel, 7.5, 50)} fill="rgba(74,151,149,.18)" stroke={TEAL} strokeWidth="1.2" />
          </>
        ) : null}
        {mode === 'normal'
          ? markers.filter((m) => m.eye && !m.sel).map((m) => <path key={m.id} d={cone(m, 4.5, 50)} fill="none" stroke="#4a6a78" strokeWidth="1.1" strokeDasharray="3 3" />)
          : null}
        {/* 벽 */}
        <rect x="1" y="1" width={w - 2} height={h - 2} rx="11" fill="none" stroke={TEAL} strokeWidth="2" />
        {/* 문(아래 가운데), 곳간문(왼쪽) */}
        <rect x={5 * c} y={h - 3} width={2 * c} height="5" fill="#0d1219" />
        <path d={`M${5 * c},${h - 1.5} A${c * 0.9},${c * 0.9} 0 0 1 ${5 * c + c * 0.9},${h - 1.5 - c * 0.9}`} fill="none" stroke={TEAL} strokeWidth="1.2" opacity=".7" />
        <rect x="-2" y={6.4 * c} width="5" height={1.2 * c} fill="#0d1219" />
        {/* 병풍 */}
        <line x1={3.2 * c} y1={0.42 * c} x2={8.8 * c} y2={0.42 * c} stroke={AMBER} strokeWidth="3.5" strokeLinecap="round" />
        {mode === 'normal' ? <text x={6 * c} y={0.42 * c + 22} textAnchor="middle" fill="var(--muted)" style={{ font: '16px Pretendard' }}>병풍</text> : null}
        {/* 서안 + 사초 더미 */}
        <rect x={4.5 * c} y={3 * c} width={3 * c} height={1.5 * c} fill="none" stroke={TEAL} strokeWidth="1.5" />
        <rect x={6.6 * c} y={3.2 * c} width={0.6 * c} height={1 * c} fill="url(#hatch)" stroke={TEAL2} strokeWidth="1.2" />
        <text x={5.6 * c} y={3.75 * c + 5} textAnchor="middle" fill="var(--muted)" style={{ font: '16px Pretendard' }} opacity=".0">서안</text>
        {/* 문 라벨 */}
        <text x={7.5 * c} y={h - 8} fill="var(--muted)" style={{ font: '16px Pretendard' }}>문</text>
        {extra}
        {/* 사람 표시 */}
        {markers.map((m) => {
          const [x, y] = P(m.x, m.y);
          const ring = m.alert ? '#d98a7a' : m.eye ? AMBER : m.label === '?' ? '#6f8196' : TEAL2;
          const fill = m.eye ? '#2b2414' : m.label === '?' ? '#131a24' : '#16303a';
          const op = m.dim ? 0.55 : 1;
          return (
            <g key={m.id} opacity={op}>
              {m.dup ? <circle cx={x + 5} cy={y + 4} r={r} fill="#131a24" stroke={ring} strokeWidth="1.6" strokeDasharray="0" /> : null}
              {m.sel ? <circle cx={x} cy={y} r={r + 5} fill="none" stroke={AMBER} strokeWidth="1.5" opacity=".55" /> : null}
              {m.speaker ? <circle cx={x} cy={y} r={r + 5} fill="none" stroke={TEAL2} strokeWidth="1.2" strokeDasharray="2 3" /> : null}
              <circle cx={x} cy={y} r={r} fill={fill} stroke={ring} strokeWidth={m.sel ? 2.4 : 1.8} strokeDasharray={m.label === '?' && !m.eye ? '3 2.5' : undefined} />
              {m.eye && m.facing !== undefined ? (() => {
                const a = (m.facing * Math.PI) / 180;
                const tx = x + (r + 4.5) * Math.cos(a);
                const ty = y + (r + 4.5) * Math.sin(a);
                const px = -Math.sin(a) * 4.2;
                const py = Math.cos(a) * 4.2;
                return <path d={`M${tx + Math.cos(a) * 5},${ty + Math.sin(a) * 5} L${tx + px},${ty + py} L${tx - px},${ty - py} Z`} fill={AMBER} />;
              })() : null}
              <text x={x} y={y + 5.6} textAnchor="middle" fill={m.label === '?' ? '#a9b7c6' : '#eaf2f1'} style={{ font: `600 16px Pretendard` }}>{m.label}</text>
              {m.dup ? <text x={x + r + 7} y={y + r + 10} fill={TEAL2} style={{ font: '600 16px Pretendard' }}>×2</text> : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function Chips({ times, on }: { times: string[]; on: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflow: 'hidden', margin: '0 -16px', padding: '0 16px' }}>
      {times.map((t) => (
        <span key={t} className={`chip${t === on ? ' on' : ''}`}><Clock color={t === on ? 'var(--accent-strong)' : 'var(--text)'}>{t}</Clock></span>
      ))}
    </div>
  );
}

function RoomBase({ w, h, sat, sab, topH, children }: { w: number; h: number; sat: number; sab: number; topH: number; children: ReactNode }) {
  const a = { w, h: topH };
  const spec = { ...e2Cut21(a), camera: cam(15.4, 5.9, 5.8, a) };
  return (
    <Screen w={w} h={h} sat={sat} sab={sab}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: topH, filter: 'blur(2px) brightness(.45) saturate(.7)' }}>
        <CutView spec={{ ...spec, id: 'room-bg' }} transition="none" />
      </div>
      {children}
    </Screen>
  );
}

// ───────────────────────── 10 그날의 방(일반) ─────────────────────────
export function Room({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  const pw = w - 32;
  const sheetH = 36 + 56 + 54 + pw * 0.75 + 12 + 24 + 12 + 64 + sab + 16;
  const topH = h - sheetH;
  const markers: Mk[] = [
    { id: 'Y', x: 3.5, y: 3.75, label: '이', eye: true, sel: true, facing: 0 },
    { id: 'H', x: 9.0, y: 3.75, label: '?', eye: true, facing: 180, dup: true },
    { id: 'S', x: 9.7, y: 5.1, label: '?' },
  ];
  const [hx, hy] = [9.0 * (pw / 12), 3.75 * (pw / 12)];
  return (
    <RoomBase w={w} h={h} sat={sat} sab={sab} topH={topH}>
      <div className="sheet" style={{ height: sheetH }}>
        <div className="grab" />
        <div style={{ padding: '6px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
            <div className="t-h">그날의 방</div>
            <button className="icon-btn" style={{ marginRight: -10 }}><IClose /></button>
          </div>
          <Chips times={['09:10', '11:40', '13:20', '14:00', '14:05', '15:00']} on="11:40" />
          <div style={{ position: 'relative', marginTop: 12 }}>
            <RoomPlan w={pw} mode="normal" markers={markers} />
            <div style={{ position: 'absolute', left: hx - 42, top: hy - 14 - 40, background: 'var(--accent)', color: '#17120a', borderRadius: 14, padding: '1px 12px', fontWeight: 600, fontSize: 16, lineHeight: '24px', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,.5)' }}>같은 사람</div>
          </div>
          <div className="t-m" style={{ marginTop: 10, color: 'var(--text)' }}>
            <span style={{ color: AMBER }}>●</span> 이극돈의 눈 · 11:40
          </div>
          <button className="btn secondary" style={{ marginTop: 8, minHeight: 52, justifyContent: 'space-between', fontWeight: 500 }}>
            <span>이 시각의 컷: 2-1</span><IChevR />
          </button>
        </div>
      </div>
    </RoomBase>
  );
}

// ───────────────────────── 11 그날의 방(모순) ─────────────────────────
export function RoomContra({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  const pw = w - 32;
  const c = pw / 12;
  const sheetH = 14 + 40 + 52 + 12 + pw * 0.75 + 14 + 56 + 8 + 56 + 10 + sab + 4;
  const topH = h - sheetH;
  const markers: Mk[] = [
    { id: 'H', x: 9.0, y: 3.75, label: '홍', eye: true, facing: 180 },
    { id: 'Y', x: 3.5, y: 3.75, label: '이', eye: true, facing: 0 },
    { id: 'O', x: 6.0, y: 2.0, label: '어', eye: true, facing: 90 },
    { id: 'N', x: 11.0, y: 1.1, label: '윤', eye: true, facing: 135, sel: true, alert: true, dim: false },
    { id: 'B', x: 6.0, y: 8.2, label: '?', speaker: true },
  ];
  const nx = 11.0 * c;
  const ny = 1.1 * c;
  const bx = 6.0 * c;
  const by = 8.2 * c;
  return (
    <RoomBase w={w} h={h} sat={sat} sab={sab} topH={topH}>
      <div className="sheet" style={{ height: sheetH }}>
        <div className="grab" />
        <div style={{ padding: '4px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
            <div className="t-h" style={{ color: 'var(--alert)', display: 'flex', gap: 8, alignItems: 'center' }}><IWarn />근거끼리 모순된다</div>
            <button className="icon-btn" style={{ marginRight: -10 }}><IClose /></button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <span className="chip" style={{ height: 44 }}>「모두」 <Clock>1-4</Clock></span>
            <span className="chip on" style={{ height: 44, borderColor: 'var(--alert)', background: 'rgba(217,138,122,.14)', color: '#f0b3a6' }}>「여섯 조목만」 <Clock color="#f0b3a6">4-5</Clock></span>
          </div>
          <div style={{ position: 'relative', marginTop: 12 }}>
            <RoomPlan
              w={pw}
              mode="contra"
              markers={markers}
              extra={
                <>
                  <line x1={nx} y1={ny} x2={bx} y2={by} stroke="#d98a7a" strokeWidth="1.5" strokeDasharray="5 4" />
                  <g transform={`translate(${nx + (bx - nx) * 0.62 + 8},${ny + (by - ny) * 0.62 - 6})`}>
                    <rect x="-4" y="-17" width="64" height="24" rx="6" fill="#0d1219" stroke="#d98a7a" strokeWidth="1" />
                    <text x="28" y="0" textAnchor="middle" fill="#f0b3a6" style={{ font: '600 16px Pretendard' }}>9.2칸</text>
                  </g>
                </>
              }
            />
            <div style={{ position: 'absolute', left: 3.6 * c, top: 20, background: 'rgba(239,229,203,.7)', color: '#6b5e45', border: '1px dashed #988a68', borderRadius: 8, padding: '0 8px', fontSize: 16, lineHeight: '22px', filter: 'blur(.4px)', whiteSpace: 'nowrap' }}>…사초를 …… 들여……</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            <button className="btn primary">「모두」를 남긴다</button>
            <button className="btn secondary">「여섯 조목만」을 남긴다</button>
          </div>
        </div>
      </div>
    </RoomBase>
  );
}

// ───────────────────────── 12 찾기 ─────────────────────────
export function Search({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  return (
    <Screen w={w} h={h} sat={sat} sab={sab}>
      <div style={{ paddingTop: 'var(--sat)', height: 'calc(var(--sat) + 56px)', display: 'flex', alignItems: 'center', padding: `var(--sat) 6px 0` }}>
        <button className="icon-btn"><IBack /></button>
        <div className="t-h" style={{ marginLeft: 2 }}>찾기</div>
      </div>
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ height: 52, borderRadius: 14, background: 'var(--surface)', border: '1.5px solid var(--accent)', display: 'flex', alignItems: 'center', padding: '0 6px 0 16px', boxShadow: '0 0 0 4px rgba(196,151,90,.14)' }}>
          <span style={{ flex: 1, fontSize: 17 }}>김일손<span style={{ display: 'inline-block', width: 2, height: 22, background: 'var(--accent-strong)', verticalAlign: -5, marginLeft: 2 }} /></span>
          <button className="icon-btn" style={{ color: 'var(--muted)' }}><IClear /></button>
          <button className="icon-btn" style={{ background: 'var(--accent)', color: '#17120a', width: 44, height: 40, borderRadius: 10 }}><ISearch /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, overflow: 'hidden', margin: '14px -16px 0', padding: '0 16px' }}>
          <span className="t-m" style={{ whiteSpace: 'nowrap' }}>들은 말에서</span>
          {['김일손', '사초', '대내', '당상'].map((t, i) => (
            <span key={t} className="chip" style={{ height: 44, borderColor: i === 0 ? 'var(--accent)' : 'var(--line)', textDecoration: 'underline', textDecorationColor: '#a04540', textUnderlineOffset: 5, textDecorationThickness: 2 }}>{t}</span>
          ))}
        </div>
        <div style={{ marginTop: 22 }}><Sec>인물</Sec></div>
        <div style={{ marginTop: 10, minHeight: 84, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="t-h">김일손</span><span className="t-b" style={{ color: 'var(--muted)' }}>金馹孫</span>
            </div>
            <div className="t-m" style={{ color: 'var(--text)', opacity: 0.85 }}>1464 ~ 1498</div>
            <div className="t-b" style={{ marginTop: 4 }}>사망 1498년 7월 · 사인: <span style={{ color: 'var(--muted)', borderBottom: '1.5px dashed var(--cold)' }}>기록 없음</span></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 2 }}>
            <Eye state="never" />
            <span className="t-m" style={{ fontSize: 16 }}>눈</span>
          </div>
        </div>
        <div style={{ marginTop: 22 }}><Sec>기록</Sec></div>
        <div className="t-b" style={{ marginTop: 10, minHeight: 56, display: 'flex', alignItems: 'center', color: 'var(--muted)', padding: '0 4px' }}>해당 기사 없음.</div>
        <div style={{ marginTop: 14 }}><Sec>내 관측 로그</Sec></div>
        <div style={{ marginTop: 10, minHeight: 72, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Clock>14:00</Clock><span className="t-m">첫 번째 기억 · 들은 말</span>
          </div>
          <div className="t-b" style={{ marginTop: 2, wordBreak: 'keep-all' }}>「<span style={{ borderBottom: '2px solid var(--accent)' }}>김일손</span>(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라.」</div>
        </div>
      </div>
    </Screen>
  );
}
const Sec = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span className="t-m">{children}</span><span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
  </div>
);
