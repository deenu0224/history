/** 13~14 메신저 · 15~16 기록 다시 쓰기 · 17~18 복원 · 19 닫힌 눈 · 20 돌려 주세요 · 21 데스크톱 */
import type { ReactNode } from 'react';
import { Screen, Spr, IBack, IExt, IWarn, Clock } from './ui';
import { Eye, RotateIcon } from './pix';
import { Viewer, type EyeItem } from './viewer';
import { e1Cuts, e3ClosedCut } from './cuts';
import { SPRITES, toDataURL } from '../src/game/art';

// ───────────────────────── 메신저 ─────────────────────────
function Avatar({ k, size = 40 }: { k: string; size?: number }) {
  return <img src={toDataURL(k, 0, 1)} width={size} height={size} style={{ imageRendering: 'pixelated', borderRadius: '50%', display: 'block' }} alt="" />;
}
void SPRITES;

const Them = ({ children, first, cold }: { children: ReactNode; first?: boolean; cold?: boolean }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: first ? 14 : 4 }}>
    <div style={{ width: 32, flex: 'none' }}>{first ? <Avatar k="avatar_colleague_a" size={32} /> : null}</div>
    <div className="t-b" style={{ maxWidth: '76%', background: cold ? '#262b33' : '#2c2f35', borderRadius: first ? '6px 18px 18px 18px' : '6px 18px 18px 6px', padding: '8px 14px', color: '#e8ecef' }}>{children}</div>
  </div>
);
const Me = ({ children, first }: { children: ReactNode; first?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: first ? 14 : 4 }}>
    <div className="t-b" style={{ maxWidth: '76%', background: '#1f5659', borderRadius: '18px 6px 18px 18px', padding: '8px 14px', color: '#e6f3f1' }}>{children}</div>
  </div>
);
const Typing = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 4 }}>
    <div style={{ width: 32 }} />
    <div style={{ background: '#2c2f35', borderRadius: '6px 18px 18px 18px', padding: '14px 16px', display: 'flex', gap: 6 }}>
      {[1, 0.6, 0.3].map((o, i) => <span key={i} style={{ width: 8, height: 8, borderRadius: 4, background: '#93a3b4', opacity: o }} />)}
    </div>
  </div>
);
const Stamp = ({ children }: { children: ReactNode }) => (
  <div style={{ textAlign: 'center', marginTop: 18 }}><Clock>{children}</Clock></div>
);

function MsgHeader({ status, online = true }: { status: string; online?: boolean }) {
  return (
    <div style={{ paddingTop: 'var(--sat)', background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 12px 0 6px' }}>
        <button className="icon-btn"><IBack /></button>
        <Avatar k="avatar_colleague_a" size={40} />
        <div style={{ marginLeft: 12, flex: 1 }}>
          <div className="t-b strong" style={{ lineHeight: '24px' }}>한 선임</div>
          <div className="t-m" style={{ lineHeight: '20px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: online ? '#6fcf9f' : '#6f8196' }} />{status}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Messenger({ w = 390, h = 844, sat = 47, sab = 34, typing = false }: { w?: number; h?: number; sat?: number; sab?: number; typing?: boolean }) {
  return (
    <Screen w={w} h={h} sat={sat} sab={sab}>
      <MsgHeader status="온라인" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: sat + 61, bottom: typing ? sab + 24 : sab + 150, padding: '0 14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Stamp>23:05</Stamp>
        <Them first>거기서 셋만 먼저 뽑아서</Them>
        <Them>카드 올려놨어.</Them>
        <Me first>고마워요.</Me>
        <div className="t-m" style={{ textAlign: 'right', marginTop: 2 }}>읽음</div>
        <Them first>응.</Them>
        <Stamp>00:12</Stamp>
        <Them first>열렸다.</Them>
        <Them>이름 맞으면 그 사람 눈이 붙어.</Them>
        {typing ? (
          <>
            <Me first>두 번째 기억 볼게요.</Me>
            <div className="t-m" style={{ textAlign: 'right', marginTop: 2 }}>읽음</div>
            <Typing />
          </>
        ) : (
          <>
            <Them>관측기가 기록 있는 사람</Them>
            <Them>눈만 빌리잖아.</Them>
          </>
        )}
      </div>
      {typing ? (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: sab + 24, background: 'var(--surface)', borderTop: '1px solid var(--line)' }} />
      ) : (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface)', borderTop: '1px solid var(--line)', padding: `12px 16px ${sab + 8}px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn outline" style={{ minHeight: 52 }}>두 번째 기억 볼게요.</button>
          <button className="btn outline" style={{ minHeight: 52 }}>첫 번째는 누구 눈이에요?</button>
        </div>
      )}
    </Screen>
  );
}

// ───────────────────────── 15~16 기록 다시 쓰기 ─────────────────────────
const Slot = ({ children, warn, empty }: { children: ReactNode; warn?: boolean; empty?: boolean }) => (
  <span className={`slot${warn ? ' warn' : ''}${empty ? ' empty' : ''}`}>{warn ? <span style={{ fontWeight: 700 }}>⚠ </span> : null}{children}</span>
);

function Line({ time, children, state, last }: { time: string; children: ReactNode; state?: 'draft' | 'back' | 'witness' | 'fail'; last?: boolean }) {
  const col = state === 'witness' ? 'var(--ink-witness)' : state === 'back' ? 'var(--ink-restored)' : 'var(--ink)';
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: last ? 'none' : '1px dotted rgba(120,98,60,.35)' }}>
      <div style={{ width: 52, flex: 'none', paddingTop: 2 }}><Clock color="#7a6a48">{time}</Clock></div>
      <div className="read" style={{ flex: 1, fontSize: 17, lineHeight: '29px', color: col, wordBreak: 'keep-all', ...(state === 'fail' ? { opacity: 0.9 } : null) }}>{children}</div>
    </div>
  );
}

function PaperHeader({ sat }: { sat: number }) {
  return (
    <div style={{ height: sat + 56, paddingTop: sat, display: 'flex', alignItems: 'center', padding: `${sat}px 10px 0 6px` }}>
      <button className="icon-btn"><IBack /></button>
      <div className="t-h" style={{ marginLeft: 2 }}>빈자리 #C-2217</div>
    </div>
  );
}

function HoldBtn({ pct }: { pct: number }) {
  const R = 14;
  const C = 2 * Math.PI * R;
  return (
    <button className="btn primary" style={{ gap: 12 }}>
      <svg width="34" height="34" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r={R} fill="none" stroke="rgba(10,18,24,.28)" strokeWidth="3.5" />
        <circle cx="17" cy="17" r={R} fill="none" stroke="#0a1218" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 17 17)" />
        <circle cx="17" cy="17" r="4.5" fill="#0a1218" />
      </svg>
      기록을 남긴다 <span style={{ fontWeight: 400, opacity: 0.75 }}>(길게)</span>
    </button>
  );
}

export function Rewrite({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  return (
    <Screen w={w} h={h} sat={sat} sab={sab}>
      <PaperHeader sat={sat} />
      <div className="hanji" style={{ position: 'absolute', left: 12, right: 12, top: sat + 62, bottom: sab + 56 + 56 + 8 + 28, borderRadius: 4, padding: '8px 16px', boxShadow: '0 12px 30px rgba(0,0,0,.55), inset 0 0 0 1px rgba(120,98,60,.3)', overflow: 'hidden' }}>
        <Line time="14:00">전교하기를, "<Slot>김일손(金馹孫)</Slot>의 사초(史草)를 <Slot>모두</Slot> 대내(大內)로 들여오라."</Line>
        <Line time="14:05">(<Slot>당상들</Slot>) "예로부터 사초(史草)는 임금이 스스로 보지 않습니다."</Line>
        <Line time="14:05">(<Slot>당상들</Slot>) "임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다."</Line>
        <Line time="15:00"><Slot>극돈</Slot> 등이 <Slot>일손</Slot>의 사초에서 <Slot warn>몇</Slot>조목을 절취하여 봉해 올리니,</Line>
        <Line time="11:40" last>
          <span style={{ color: 'var(--ink)' }}>붉은 관복이 한 장을 오래 들고 있었다.</span>
        </Line>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 40, background: 'linear-gradient(rgba(239,229,203,0), rgba(222,206,170,.9))' }} />
      </div>
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: sab + 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn secondary" style={{ minHeight: 52 }}>줄 더하기</button>
        <HoldBtn pct={0.62} />
      </div>
    </Screen>
  );
}

const Src = ({ children }: { children: ReactNode }) => (
  <div className="t-m" style={{ color: '#6b5e45', display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 62, marginTop: -4, paddingBottom: 10 }}>
    <span style={{ width: 4, height: 18, background: 'var(--seal)', borderRadius: 2 }} />{children}
  </div>
);

export function RewriteVerdict({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  return (
    <Screen w={w} h={h} sat={sat} sab={sab}>
      <PaperHeader sat={sat} />
      <div className="hanji" style={{ position: 'absolute', left: 12, right: 12, top: sat + 62, bottom: sab + 56 + 56 + 8 + 28, borderRadius: 4, padding: '8px 16px', boxShadow: '0 12px 30px rgba(0,0,0,.55), inset 0 0 0 1px rgba(120,98,60,.3)', overflow: 'hidden' }}>
        <Line time="14:00" state="back">전교하기를, "【김일손(金馹孫)】의 사초(史草)를 【모두】 대내(大內)로 들여오라."</Line>
        <Line time="14:05" state="back">(【당상들】) "예로부터 사초(史草)는 임금이 스스로 보지 않습니다."</Line>
        <Line time="14:05" state="back" last>(【당상들】) "임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다."</Line>
        <Src>『연산군일기』 30권 · 출처 <IExt size={16} /></Src>
        <div style={{ borderTop: '1px dotted rgba(120,98,60,.35)' }} />
        {/* 안 돌아온 줄: 테두리만 차갑게 */}
        <div style={{ margin: '10px 0', padding: '2px 10px 8px', borderRadius: 6, border: '1.5px solid #6f8196', background: 'rgba(111,129,150,.1)' }}>
          <Line time="15:00" state="fail" last><Slot>극돈</Slot> 등이 <Slot>일손</Slot>의 사초에서 <Slot>다섯</Slot>조목을 절취하여 봉해 올리니,</Line>
          <div className="t-m" style={{ color: '#46576b', paddingLeft: 62, marginTop: -4, display: 'flex', gap: 6, alignItems: 'center' }}><IWarn size={18} />이 줄은 기록이 되지 않았다</div>
        </div>
        <Line time="11:40" state="witness" last>
          <span style={{ borderBottom: '1.5px dashed #6b5e45' }}>붉은 관복이 한 장을 오래 들고 있었다.</span>
          <div className="t-m" style={{ color: '#6b5e45', fontFamily: 'var(--f-ui)', marginTop: 2 }}>실록이 적지 않은 일</div>
        </Line>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 28, background: 'linear-gradient(rgba(239,229,203,0), rgba(222,206,170,.9))' }} />
      </div>
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: sab + 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn secondary" style={{ minHeight: 52 }}>줄 더하기</button>
        <HoldBtn pct={0} />
      </div>
    </Screen>
  );
}

// ───────────────────────── 17 복원: 기록 ─────────────────────────
const inkFilter = (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <filter id="ink2" x="-5%" y="-20%" width="110%" height="140%">
      <feGaussianBlur stdDeviation="0.8" result="b" />
      <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 12 -4.5" />
    </filter>
    <filter id="ink" x="-5%" y="-20%" width="110%" height="140%">
      <feGaussianBlur stdDeviation="1.7" result="b" />
      <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
    </filter>
  </svg>
);

function InkLine({ time, children, spread = 1 }: { time: string; children: ReactNode; spread?: number }) {
  // spread: 0..1, 왼쪽부터 굳은 먹. 1 = 완전히 굳음
  const p = Math.round(spread * 100);
  const maskA = `linear-gradient(90deg,#000 ${Math.max(0, p - 12)}%,transparent ${Math.min(100, p + 6)}%)`;
  const maskB = `linear-gradient(90deg,transparent ${Math.max(0, p - 22)}%,#000 ${Math.max(0, p - 4)}%)`;
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0' }}>
      <div style={{ width: 52, flex: 'none', paddingTop: 2 }}><Clock color="#7a6a48">{time}</Clock></div>
      <div className="read" style={{ position: 'relative', flex: 1, fontSize: 17, lineHeight: '29px', wordBreak: 'keep-all' }}>
        <div style={{ color: '#171310', WebkitMaskImage: spread >= 1 ? undefined : maskA, maskImage: spread >= 1 ? undefined : maskA, fontWeight: 700 }}>{children}</div>
        {spread < 1 ? (
          <div style={{ position: 'absolute', inset: 0, color: '#2b241d', filter: 'url(#ink)', WebkitMaskImage: maskB, maskImage: maskB, opacity: 0.85 }}>{children}</div>
        ) : null}
        {spread < 1 ? (
          <div style={{ position: 'absolute', inset: 0, color: 'var(--ink-witness)', opacity: 0.55, WebkitMaskImage: `linear-gradient(90deg,transparent ${p}%,#000 ${p + 18}%)`, maskImage: `linear-gradient(90deg,transparent ${p}%,#000 ${p + 18}%)` }}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}

export function RestoreRecord({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  return (
    <Screen w={w} h={h} sat={sat} sab={sab} bg="#1a1612" dark>
      {inkFilter}
      <div className="hanji" style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', left: 22, right: 22, top: sat + 28 }}>
        <div className="t-m" style={{ color: '#6b5e45' }}>빈자리 #C-2217</div>
        <div style={{ marginTop: 6 }}>
          <InkLine time="14:00">전교하기를, "김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라."</InkLine>
          <InkLine time="14:05" spread={0.97}>(당상들) "예로부터 사초(史草)는 임금이 스스로 보지 않습니다."</InkLine>
          <InkLine time="14:05" spread={0.5}>(당상들) "임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다."</InkLine>
          <InkLine time="15:00" spread={0.0}>극돈 등이 일손의 사초에서 6조목을 절취하여 봉해 올리니,</InkLine>
        </div>
        {/* 출처 + 인장 */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 62 }}>
          <div style={{ width: 60, height: 60, background: 'var(--seal)', borderRadius: 4, transform: 'rotate(-5deg)', display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 2px #efe5cb55, 0 2px 0 rgba(0,0,0,.2)', flex: 'none' }}>
            <span className="read" style={{ color: '#f3e6cc', fontWeight: 700, fontSize: 22, lineHeight: '24px', textAlign: 'center' }}>實<br />錄</span>
          </div>
          <div className="t-b read" style={{ color: '#25211e', fontSize: 17, lineHeight: '26px' }}>
            『연산군일기』 30권,<br />연산 4년 7월 11일 <span style={{ color: 'var(--seal)' }}><IExt size={16} /></span>
          </div>
        </div>
        <div style={{ height: 1, background: 'rgba(120,98,60,.4)', margin: '26px 0 18px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', rowGap: 8, alignItems: 'baseline' }}>
          <span className="t-m" style={{ color: '#6b5e45' }}>일시</span>
          <span className="read" style={{ fontSize: 17, lineHeight: '26px', color: '#171310', fontWeight: 700, position: 'relative' }}>
            <span className="pixel" style={{ color: '#a49880', letterSpacing: '.1em', marginRight: 12, fontWeight: 400, textDecoration: 'line-through' }}>####</span>
            <span style={{ filter: 'url(#ink2)', textShadow: '0 0 3px rgba(23,19,16,.35)' }}>연산군 4년 7월 11일</span>
          </span>
          <span className="t-m" style={{ color: '#6b5e45' }}>장소</span>
          <span className="read" style={{ fontSize: 17, lineHeight: '26px', color: '#8e8264' }}>춘추관 실록청</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: sab + 18 }}>
        <button className="btn" style={{ background: '#25211e', color: '#efe5cb' }}>다음 ▸</button>
      </div>
    </Screen>
  );
}

// ───────────────────────── 18 복원: 메신저가 다시 쓰인다 ─────────────────────────
function Morph({ from, to, k }: { from: string; to: string; k: number }) {
  const n = Math.max(from.length, to.length);
  const out: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const done = i < k;
    const ch = (done ? to[i] : from[i]) ?? '';
    out.push(
      <span key={i} style={{ color: done ? '#fff' : '#9aa7b4', textShadow: i === k - 1 ? '0 0 8px #e0ae5c' : undefined, background: i === k - 1 ? 'rgba(224,174,92,.28)' : undefined }}>{ch}</span>,
    );
  }
  return <>{out}</>;
}

export function RestoreMessenger({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  return (
    <Screen w={w} h={h} sat={sat} sab={sab}>
      <MsgHeader status="온라인" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: sat + 61, bottom: sab + 24, padding: '0 14px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginTop: 10 }}><span className="t-m" style={{ color: '#e0ae5c' }}>통합 역사 DB 동기화 · 기록 다시 쓰는 중</span></div>
        <Stamp>00:48</Stamp>
        <Them first>
          <Morph from="처음 듣는 이름인데." to="김일손이면 무오사화 그 사관이잖아." k={99} />
        </Them>
        <Them>
          <Morph from="사인 칸이 비어 있네." to="사인 다 나와 있는데?" k={7} />
        </Them>
        <Stamp>06:02</Stamp>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 14 }}>
          <div style={{ width: 32, flex: 'none' }}><Avatar k="avatar_colleague_b" size={32} /></div>
          <div className="t-b" style={{ maxWidth: '76%', background: '#2c2f35', borderRadius: '6px 18px 18px 18px', padding: '8px 14px', color: '#9aa7b4' }}>닫힌 눈은 닫힌 거야. 남은 걸로 해.</div>
        </div>
        <div className="t-m" style={{ marginLeft: 40, marginTop: 4 }}>오 실장</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: sab + 24, background: 'var(--surface)', borderTop: '1px solid var(--line)' }} />
    </Screen>
  );
}

// ───────────────────────── 19 닫힌 눈 ─────────────────────────
export function ClosedEye({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  const bottom = 14 + 56 + 8 + sab;
  const a = { w: w - 8, h: h - bottom };
  const closed = e3ClosedCut(a);
  const specs = [0, 1, 2, 3, 4].map((i) => ({ ...closed, id: `c3-${i + 1}` }));
  const eyes: EyeItem[] = [
    { state: 'open', label: '첫 번째 기억' },
    { state: 'open', label: '두 번째 기억' },
    { state: 'closed', current: true, label: '닫힌 눈' },
    { state: 'open', label: '네 번째 기억' },
    { state: 'never', label: '열리지 않음' },
  ];
  void e1Cuts;
  return (
    <Screen w={w} h={h} sat={sat} sab={sab}>
      <div style={{ filter: 'brightness(.88)' }}>
        <Viewer
          w={w} h={h} sat={sat} sab={sab} eyes={eyes} title="어세겸의 기억" time="15:40" specs={specs} index={4} cold sleeve={false} gaze="center"
          actions={<><button className="btn primary" style={{ flex: 1.15 }}>그날의 방</button><button className="btn secondary" style={{ flex: 1 }}>로그</button></>}
        >
          <div style={{ position: 'absolute', left: 0, right: 0, top: sat + 48 + 49 + 14, zIndex: 12, display: 'flex', justifyContent: 'center', padding: '0 14px' }}>
            <div className="t-m" style={{ background: 'rgba(19,24,32,.9)', border: '1px solid var(--line)', borderRadius: 12, padding: '8px 14px', color: '#a7b4c1' }}>06:00 좌표 재계산 · 이 지점을 가리키는 기록 1건 소실 · 열린 눈 1개 닫힘</div>
          </div>
          <div style={{ position: 'absolute', left: 28, right: 28, top: '56%', transform: 'translateY(-50%)', zIndex: 12, background: 'rgba(27,33,42,.96)', border: '1px solid #3a4658', borderRadius: 16, padding: '26px 20px 24px', textAlign: 'center', boxShadow: '0 18px 40px rgba(0,0,0,.55)' }}>
            <div style={{ display: 'grid', placeItems: 'center' }}><Eye state="closed" size={48} /></div>
            <div className="t-h" style={{ marginTop: 12, color: '#c3ccd5' }}>볼 수 없다</div>
            <div className="t-b" style={{ marginTop: 6, color: 'var(--muted)', wordBreak: 'keep-all' }}>이 사람의 그날 기록이 지워졌다</div>
          </div>
        </Viewer>
      </div>
    </Screen>
  );
}

// ───────────────────────── 20 세로로 돌려 주세요 ─────────────────────────
export function RotateGuard() {
  return (
    <div style={{ width: 844, height: 390, background: '#07090c', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div style={{ transform: 'rotate(58deg)', filter: 'drop-shadow(0 0 14px rgba(217,154,60,.35))' }}><RotateIcon scale={1.5} /></div>
      <p className="t-b" style={{ margin: 0, color: '#e8dfc8', fontSize: 17 }}>세로로 돌려 주세요</p>
    </div>
  );
}

// ───────────────────────── 21 데스크톱 프레임 ─────────────────────────
export function Desktop({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: 1280, height: 900, position: 'relative', display: 'grid', placeItems: 'center', background: 'radial-gradient(ellipse at 50% 45%, rgba(40,52,66,.3) 0%, rgba(7,9,13,0) 60%), radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.75) 100%), #07090d' }}>
      <div style={{ width: 480, height: 900, borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,.07), 0 0 80px 8px rgba(0,0,0,.75)', position: 'relative', transform: 'translateZ(0)' }}>{children}</div>
    </div>
  );
}
void Spr;
