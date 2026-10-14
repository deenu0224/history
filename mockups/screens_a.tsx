/** 01 부트 · 02 홈 · 04~08 이름 붙이기 · 09 인물 카드 */
import type { ReactNode } from 'react';
import { CutView } from '../src/game/cuts/CutView';
import type { CutSpec } from '../src/game/cuts';
import { Eye } from './pix';
import { Spr, Screen, AppBar, IGear, IClose, IBack, IBan, IWarn, ISearch, IChevD, IExt, IChevR, Clock } from './ui';
import { cam, e1Cuts, e2Cut21 } from './cuts';
import { Viewer, type EyeItem } from './viewer';

// ───────────────────────── 01 부트 ─────────────────────────
export function Boot({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  return (
    <Screen w={w} h={h} sat={sat} sab={sab} bg="#000">
      <div style={{ position: 'absolute', left: 24, right: 24, top: sat + 18, display: 'flex', gap: 5 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 2, borderRadius: 1, background: i < 5 ? 'rgba(232,223,200,.7)' : 'rgba(232,223,200,.16)' }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 32, right: 32, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ width: 28, height: 2, background: '#e0ae5c', marginBottom: 28, opacity: 0.9 }} />
        <p className="t-b" style={{ margin: 0, fontSize: 17, lineHeight: 1.7, color: '#f1ece0', wordBreak: 'keep-all' }}>
          관측기는 과거를 직접 본다.<br />단, 기록이 가리키는 곳만.
        </p>
        <p className="t-b" style={{ margin: '22px 0 0', lineHeight: 1.7, color: '#f1ece0', wordBreak: 'keep-all' }}>기록은 시간의 주소다.</p>
      </div>
      <div className="t-m" style={{ position: 'absolute', right: 32, bottom: sab + 104, color: '#7f8a96' }}>5 / 8</div>
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: sab + 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn ghost" style={{ width: 'auto', minWidth: 112, color: '#8a95a1' }}>건너뛰기</button>
        <button className="btn" style={{ width: 'auto', minWidth: 124, background: 'transparent', border: '1px solid rgba(232,223,200,.4)', color: '#f1ece0' }}>다음 ▸</button>
      </div>
    </Screen>
  );
}

// ───────────────────────── 02 홈 ─────────────────────────
function Dock({ sab }: { sab: number }) {
  const items = [
    { k: 'app_observe', label: '기억', on: true },
    { k: 'app_db', label: '찾기' },
    { k: 'app_messenger', label: '메신저', dot: true },
  ];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface)', borderTop: '1px solid var(--line)', paddingBottom: sab, display: 'flex' }}>
      {items.map((it) => (
        <div key={it.label} style={{ flex: 1, height: 68, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' }}>
          {it.on ? <span style={{ position: 'absolute', top: 0, width: 36, height: 2, background: 'var(--accent-strong)', borderRadius: 1 }} /> : null}
          <span style={{ position: 'relative', opacity: it.on ? 1 : 0.72 }}>
            <Spr k={it.k} />
            {it.dot ? <span style={{ position: 'absolute', right: -4, top: -3, width: 12, height: 12, borderRadius: 6, background: '#e0ae5c', boxShadow: '0 0 0 2px var(--surface)' }} /> : null}
          </span>
          <span className="t-m" style={{ color: it.on ? 'var(--text)' : 'var(--muted)', fontSize: 16, lineHeight: '20px' }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/** '빈자리' 도해: 기록 줄들 사이의 비어 있는 날(점선 칸). 픽셀 모서리 */
function GapGraphic({ w }: { w: number }) {
  const bar = (y: number, ww: number, o = 1) => <rect x="0" y={y} width={ww} height="4" fill="#34445e" opacity={o} />;
  return (
    <svg width={w} height="104" viewBox={`0 0 ${w} 104`} shapeRendering="crispEdges" style={{ display: 'block' }}>
      <g transform="translate(0,2)">
        {bar(0, w * 0.82)}
        {bar(12, w * 0.64, 0.8)}
        {bar(24, w * 0.9, 0.9)}
        <rect x="0.75" y="38.75" width={w - 1.5} height="30.5" fill="#0f141c" stroke="#4a9795" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={w / 2} y="59" textAnchor="middle" fill="#86c4bd" style={{ font: '16px Galmuri11' }} letterSpacing="3">#### ####</text>
        {bar(80, w * 0.7, 0.55)}
        {bar(92, w * 0.46, 0.4)}
      </g>
    </svg>
  );
}

export function Home({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  const cw = w - 32;
  return (
    <Screen w={w} h={h} sat={sat} sab={sab}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(120% 60% at 50% 0%, rgba(74,151,149,.12), transparent 60%)' }} />
      {/* 위 띠 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: sat, height: 52, display: 'flex', alignItems: 'center', padding: '0 6px 0 20px' }}>
        <Clock color="var(--accent-strong)">23:04</Clock>
        <span className="t-m" style={{ marginLeft: 12, flex: 1 }}>결록 단말</span>
        <button className="icon-btn" aria-label="설정" style={{ color: 'var(--muted)' }}><IGear /></button>
      </div>
      {/* 배정 카드 */}
      <div style={{ position: 'absolute', left: 16, right: 16, top: sat + 66, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: '20px 18px 18px', boxShadow: '0 14px 30px rgba(0,0,0,.4)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="t-h">빈자리 #C-2217</div>
          <span className="t-m" style={{ fontSize: 16 }}>배정 1건</span>
        </div>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '56px 1fr', rowGap: 2 }}>
          <span className="t-m">일시</span><span className="t-b pixel" style={{ letterSpacing: '.08em', color: 'var(--accent-strong)', fontSize: 17 }}>####</span>
          <span className="t-m">장소</span><span className="t-b">미확인</span>
        </div>
        <div style={{ margin: '16px 0 14px' }}><GapGraphic w={cw - 38} /></div>
        <div className="divider" />
        <p className="t-b" style={{ margin: '14px 0 14px', wordBreak: 'keep-all' }}>이 날의 기록이 비어 있다. 그날 그 자리에 있던 사람들의 눈으로 본다.</p>
        <div className="divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <span className="t-m" style={{ marginRight: 4 }}>열린 눈</span>
          <Eye state="unknown" glow />
          <Eye state="never" />
          <Eye state="never" />
          <Eye state="never" />
        </div>
      </div>
      {/* 첫 탭 하나만 은은히 */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: sab + 68 + 28 }}>
        <button className="btn primary breath" style={{ fontSize: 17 }}>기억 보기</button>
      </div>
      <Dock sab={sab} />
    </Screen>
  );
}

// ───────────────────────── 04~08 이름 붙이기 ─────────────────────────
type Phase = 'cards' | 'evidence' | 'wrong' | 'contra';

const CARDS = [
  { n: '이극돈', hj: '李克墩', f: '이 방의 카드' },
  { n: '어세겸', hj: '魚世謙', f: '이 방의 카드' },
  { n: '신승선', hj: '愼承善', f: '이 방의 카드' },
];

function PCard({ c, sel, dim, flag }: { c: (typeof CARDS)[number]; sel?: boolean; dim?: boolean; flag?: boolean }) {
  return (
    <div className={`pcard${sel ? ' sel' : ''}${dim ? ' dim' : ''}`} style={flag ? { boxShadow: '0 0 0 2px var(--cold), 0 6px 14px rgba(0,0,0,.38)' } : undefined}>
      <div className="nm">{c.n}</div>
      <div className="hj">{c.hj}</div>
      <div className="ft">{c.f}</div>
    </div>
  );
}

function EvRow({ kind, time, text, sel, mine, dimmed }: { kind: string; time: string; text: string; sel?: boolean; mine?: boolean; dimmed?: boolean }) {
  return (
    <div style={{ minHeight: 64, display: 'flex', gap: 12, alignItems: 'center', padding: '8px 14px', borderRadius: 12, background: sel ? 'rgba(74,151,149,.16)' : 'var(--surface-2)', border: `1px solid ${sel ? 'var(--accent)' : 'var(--line)'}`, opacity: dimmed ? 0.75 : 1 }}>
      <div style={{ width: 54, flex: 'none', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <span className="t-m" style={{ fontSize: 16, color: mine ? 'var(--accent-strong)' : 'var(--muted)' }}>{kind}</span>
        <Clock>{time}</Clock>
      </div>
      <div className="t-b" style={{ flex: 1, wordBreak: 'keep-all', lineHeight: '25px' }}>{text}</div>
    </div>
  );
}

export function TagScreen({ phase, w = 390, h = 844, sat = 47, sab = 34 }: { phase: Phase; w?: number; h?: number; sat?: number; sab?: number }) {
  const sheetH = phase === 'cards' ? 392 : phase === 'evidence' ? 492 : 548;
  const top = h - sheetH;
  const a = { w, h: top };
  const base = e1Cuts({ w, h: top });
  const spec: CutSpec =
    phase === 'contra'
      ? { ...e2Cut21(a), camera: cam(15.3, 5.9, 5.2, a) }
      : { ...base[1]!, camera: cam(19.5, 6.0, 5.2, a) };
  const ringId = phase === 'contra' ? 'blue' : 'red';
  const selCard = phase === 'evidence' ? 0 : phase === 'contra' ? 0 : -1;
  return (
    <Screen w={w} h={h} sat={sat} sab={sab}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: top, background: '#0b0a08' }}>
        <CutView spec={spec} highlightIds={[ringId]} transition="none" />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(0,0,0,0) 30%, rgba(8,6,4,.55) 100%), linear-gradient(rgba(10,8,6,.7), rgba(10,8,6,0) 30%)', pointerEvents: 'none' }} />
      </div>
      <div style={{ position: 'absolute', left: 6, top: sat + 2, zIndex: 40 }}>
        <button className="icon-btn" style={{ background: 'rgba(15,20,28,.72)', borderRadius: 22, border: '1px solid rgba(134,196,189,.3)' }}><IBack /></button>
      </div>
      <div className="sheet" style={{ height: sheetH, overflow: 'hidden' }}>
        <div className="grab" />
        <div style={{ padding: '10px 16px 0' }}>
          <div className="t-h">이 사람은 누구인가</div>
          <div className="t-m" style={{ marginTop: 10, marginBottom: 8 }}>① 카드</div>
          <div style={{ display: 'flex', gap: 10, margin: '0 -16px', padding: '10px 16px 6px', overflow: 'hidden' }}>
            {CARDS.map((c, i) => (
              <PCard key={c.n} c={c} sel={i === selCard} flag={phase === 'wrong' && i === 1} dim={selCard >= 0 && i !== selCard} />
            ))}
            <div style={{ flex: 'none', width: 112, height: 148, borderRadius: 10, border: '1.5px dashed var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--muted)', marginTop: 0 }}>
              <ISearch />
              <span className="t-m">찾기로 더</span>
            </div>
          </div>
          {phase === 'cards' ? (
            <>
              <div className="t-m" style={{ margin: '8px 0 8px' }}>② 근거 하나</div>
              <div style={{ height: 64, borderRadius: 12, border: '1.5px dashed var(--line)', display: 'flex', alignItems: 'center', padding: '0 16px' }} className="t-m">카드를 고르면 근거가 나온다</div>
            </>
          ) : (
            <>
              {phase === 'wrong' ? (
                <div style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 14px', borderRadius: 12, background: 'rgba(111,129,150,.14)', borderLeft: '3px solid var(--cold)' }}>
                  <span style={{ color: 'var(--muted)', display: 'flex' }}><IBan /></span>
                  <span className="t-b">근거가 이 사람을 가리키지 않는다</span>
                </div>
              ) : null}
              {phase === 'contra' ? (
                <div style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 14px', borderRadius: 12, background: 'rgba(217,138,122,.12)', borderLeft: '3px solid var(--alert)' }}>
                  <span style={{ color: 'var(--alert)', display: 'flex' }}><IWarn /></span>
                  <span className="t-b" style={{ color: 'var(--alert)', fontWeight: 600 }}>근거끼리 모순된다</span>
                </div>
              ) : null}
              <div className="t-m" style={{ margin: '10px 0 8px' }}>② 근거 하나</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {phase === 'contra' ? (
                  <>
                    <EvRow kind="들은 말" time="11:40" mine sel text="「선왕 국장 도감 일을 볼 때보다, 이 일이 더 길구려.」" />
                    <EvRow kind="들은 말" time="13:20" text="「윗자리 대감은 지난해에도, 사관이 꼭 끼어야 하느냐 하셨지.」" />
                  </>
                ) : (
                  <>
                    <EvRow kind="들은 말" time="11:40" mine sel={false} text="「저 당상 영감은 세조대왕 실록 때도 엮는 일을 맡으셨다지.」" />
                    <EvRow kind="들은 말" time="09:10" text="「오늘 들어온 꾸러미입니다.」" dimmed />
                  </>
                )}
              </div>
            </>
          )}
        </div>
        {phase !== 'cards' ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 + sab, background: 'linear-gradient(rgba(24,33,48,0), var(--surface) 70%)' }} /> : null}
      </div>
    </Screen>
  );
}

// ───────────────────────── 06 이름 붙이기 성공(눈이 열린다) ─────────────────────────
export function TagOk({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  const bottom = 14 + 56 + 8 + sab;
  const specs = e1Cuts({ w: w - 8, h: h - bottom }, { tagged: true });
  const eyes: EyeItem[] = [
    { state: 'unknown', current: true, label: '첫 번째 기억' },
    { state: 'half', opening: true, label: '두 번째 기억' },
  ];
  return (
    <Screen w={w} h={h} sat={sat} sab={sab}>
      <Viewer
        w={w} h={h} sat={sat} sab={sab} eyes={eyes} title="첫 번째 기억" time="11:40" specs={specs} index={1}
        nameTags={{ red: '이극돈' }}
        bubbles={(hit, a) => (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 112, display: 'flex', justifyContent: 'center', zIndex: 16 }}>
            <div style={{ background: 'rgba(15,20,28,.9)', border: '1px solid rgba(255,210,122,.5)', borderRadius: 24, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 0 24px rgba(255,210,122,.25)' }}>
              <Eye state="open" glow size={24} />
              <span className="t-b" style={{ color: '#f5e2b0' }}>눈이 하나 열렸다</span>
            </div>
          </div>
        )}
        sleeve
        actions={<><button className="btn primary" style={{ flex: 1.15 }}>그날의 방</button><button className="btn secondary" style={{ flex: 1 }}>로그</button></>}
      />
    </Screen>
  );
}

// ───────────────────────── 09 인물 카드 ─────────────────────────
function Fact({ children, src, open, altered }: { children: ReactNode; src?: ReactNode; open?: boolean; altered?: boolean }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #c0c9d0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minHeight: 32 }}>
        <span style={{ marginTop: 11, width: 5, height: 5, background: altered ? '#8793a0' : '#1e2024', flex: 'none' }} />
        <div className="t-b" style={{ flex: 1, color: 'var(--card-ink)', wordBreak: 'keep-all' }}>{children}</div>
        {src ? <span style={{ color: '#4b5561', marginTop: 2, transform: open ? 'rotate(180deg)' : undefined }}><IChevD /></span> : null}
      </div>
      {open && src ? <div className="t-m" style={{ color: '#46525e', margin: '6px 0 0 15px', wordBreak: 'break-all' }}>{src}</div> : null}
    </div>
  );
}

export function PersonCard({ w = 390, h = 844, sat = 47, sab = 34 }: { w?: number; h?: number; sat?: number; sab?: number }) {
  return (
    <Screen w={w} h={h} sat={sat} sab={sab} bg="#0b1017">
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(100% 50% at 50% 30%, rgba(74,151,149,.1), transparent 70%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: sat, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px' }}>
        <button className="icon-btn"><IBack /></button>
        <button className="icon-btn"><IClose /></button>
      </div>
      <div style={{ position: 'absolute', left: 16, right: 16, top: sat + 62, background: 'var(--card-paper)', color: 'var(--card-ink)', borderRadius: 16, padding: '22px 20px 16px', boxShadow: '0 1px 0 #fff inset, 0 22px 40px rgba(0,0,0,.55)' }}>
        <span style={{ position: 'absolute', top: 14, right: 16, width: 12, height: 12, borderRadius: '50%', background: '#0b1017', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.7)' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="t-h" style={{ fontSize: 22 }}>이극돈</span>
          <span className="t-b" style={{ color: '#4b5561' }}>李克墩</span>
        </div>
        <div className="t-b" style={{ color: '#4b5561', marginTop: 2 }}>1435 ~ 1503</div>
        <div style={{ height: 2, background: '#1e2024', margin: '14px 0 2px', opacity: 0.85 }} />
        <Fact open src="출처 · 한국민족문화대백과 「이극돈」 encykorea.aks.ac.kr/Contents/Item/E0043804" >『세조실록』 편수관으로 참여 (실록을 엮은 관원)</Fact>
        <Fact src>실록청 당상</Fact>
        <Fact src>1457년 친시 문과 급제</Fact>
        <Fact altered>
          <span style={{ borderBottom: '1.5px dashed #6c7885' }}>파직 1498년</span>
          <div style={{ color: '#5f6b77', marginTop: 0 }}>사유: <span style={{ borderBottom: '1.5px dashed #6c7885' }}>기록 없음</span></div>
        </Fact>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14 }}>
          <Eye state="open" tone="paper" />
          <span className="t-b" style={{ color: '#1e2024' }}>눈: 아직 모름</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: sab + 18 }}>
        <button className="btn primary">이 사람으로</button>
      </div>
    </Screen>
  );
}
