/** 단말 홈 — 오늘의 빈자리. UI_STYLE_GUIDE §2.2 */
import { useGameStore } from '@/store/gameStore';
import { selectHome } from '@/store/selectors';
import { useView } from '@/store/hooks';
import { fx } from '../lib/fx';
import { goNextEpisode } from '../lib/flow';
import { EyeRow } from '../parts/EyeRow';
import { HomeRecord } from '../parts/HomeRecord';
import { RestoredCard } from '../parts/RestoredCard';
import { FixMeter } from '../parts/FixMeter';
import { openMessenger } from '../lib/nav';
import { IChat, IGear, IMemory, ISearch } from '../parts/icons';
import { useUi } from '../uiStore';

function GapGraphic() {
  const bar = (y: number, w: number, o = 1) => <rect key={y} x="0" y={y} width={`${w}%`} height="4" fill="#2a2521" opacity={o} />;
  return (
    <svg className="gap-gfx" height="96" viewBox="0 0 300 96" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
      {bar(0, 82)}
      {bar(12, 64, 0.8)}
      {bar(24, 90, 0.9)}
      <rect x="1" y="38" width="298" height="30" fill="#0b0a09" stroke="#e2a85c" strokeWidth="1.5" strokeDasharray="5 4" />
      {bar(80, 70, 0.55)}
      {bar(92, 46, 0.4)}
    </svg>
  );
}


export function enterMemory(eyeId: string) {
  const g = useGameStore.getState();
  const r = g.openEye(eyeId);
  if (r.status === 'locked' || r.status === 'no_cut') return;
  useUi.getState().push('viewer');
}

export function Home() {
  const home = useView(selectHome);
  const { push } = useUi.getState();
  const restored = home.buttons.includes('restored');
  const unseen = home.unread > 0;

  // 관측하기 = 다음 할 일의 눈: 순서대로 아직 안 본 컷이 있는 첫 열린 눈(없으면 첫 열린 눈)
  const memories = () => {
    const id = home.next.kind === 'observe' ? home.next.eyeId : home.eyes.find((e) => e.state === 'open')?.eyeId;
    if (id) enterMemory(id);
  };
  /** 다음 할 일이 모순이면: 그날의 방 모순 보기로 바로 */
  const toContradiction = () => {
    if (home.next.kind !== 'contradiction') return;
    fx('tap');
    useUi.getState().setRoomFocus(home.next.id);
    useGameStore.getState().openRoom();
  };
  const contra = home.next.kind === 'contradiction';

  return (
    <div className="scr" data-screen="home">
      <div className="home-top">
        <span className="clock" data-testid="clock">
          {home.clock}
        </span>
        <span className="t-m" style={{ marginLeft: 12, flex: 1 }}>
          결록 단말
        </span>
        <button className="ibtn" aria-label="설정" onClick={() => push('settings')} data-testid="open-settings" style={{ color: 'var(--hanji-muted)' }}>
          <IGear />
        </button>
      </div>

      <div className="home-scroll">
      {restored ? (
        <RestoredCard testId="assign-card">
          <div style={{ marginTop: 8 }}>
            <FixMeter pct={home.fixRate.pct} />
          </div>
          <div className="divider" style={{ marginTop: 10 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
          <span className="t-m" style={{ marginRight: 4 }}>
            관측 가능
          </span>
          <EyeRow eyes={home.eyes} onPick={enterMemory} />
        </div>
        </RestoredCard>
      ) : (
      <div className="card-assign" data-testid="assign-card">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="t-h">{home.card.code}</div>
          <span className="t-m">{home.card.status}</span>
        </div>
        <div className="kv">
          <span className="t-m">일시</span>
          <span className="t-b" style={{ color: 'var(--amber)', fontFamily: 'var(--f-pixel)', letterSpacing: '0.08em' }} data-testid="home-date">
            {home.card.date}
          </span>
          <span className="t-m">장소</span>
          <span className="t-b" data-testid="home-place">
            {home.card.place}
          </span>
        </div>
        {home.card.record ? (
          <HomeRecord record={home.card.record} />
        ) : (
          <>
            <div className="t-m home-record-label">그날 실록</div>
            <GapGraphic />
          </>
        )}
        {/* 그날 고정률: 역사 고정이 무엇인지 알게 되는 때(열릴 수 있을 때)부터 — Ep0 첫 화면의 뜻 없는 계기판을 감춘다(QA_STORY_R2 N7) */}
        {home.showFixRate ? <FixMeter pct={home.fixRate.pct} /> : null}
        <div className="divider" style={{ marginTop: 12 }} />
        <p className="t-b keep" style={{ margin: '14px 0' }}>
          {home.card.task}
        </p>
        <div className="divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
          <span className="t-m" style={{ marginRight: 4 }}>
            관측 가능
          </span>
          <EyeRow eyes={home.eyes} onPick={enterMemory} />
        </div>
        {home.tags.total ? (
          <p className={`t-m tagprog-line${home.tags.complete ? ' done' : ''}`} style={{ margin: '4px 0 0' }} data-testid="home-tag-progress">
            이름 붙이기 {home.tags.done}/{home.tags.total}
            {home.tags.allClear ? ' · 모두 밝혀졌다' : ''}
            {home.resume.contradictionsLeft ? ` · 남은 모순 ${home.resume.contradictionsLeft}` : ''}
          </p>
        ) : null}
      </div>
      )}
      </div>

      <div className="home-body">
        {home.rewriteReady ? (
          <button className="btn primary breath" data-testid="btn-rewrite" onClick={() => push('rewrite')}>
            역사 고정 ›
          </button>
        ) : null}
        {contra ? (
          <button className="btn primary breath" data-testid="btn-contradiction" onClick={toContradiction}>
            ⚠ 모순 풀기 ›
          </button>
        ) : null}
        {home.buttons.includes('memories') && !home.nextEpisode ? (
          <button
            className={`btn ${home.rewriteReady || contra ? 'secondary' : 'primary'}${!home.rewriteReady && home.resume.eyesOpen <= 1 && !home.tags.done ? ' breath' : ''}`}
            data-testid="btn-memories"
            onClick={() => {
              fx('tap');
              memories();
            }}
          >
            관측하기
          </button>
        ) : null}
        {home.buttons.includes('restored') && !home.nextEpisode ? (
          <button className="btn secondary" data-testid="btn-restored" onClick={() => push('restore')}>
            고정된 기록
          </button>
        ) : null}
        {home.nextEpisode ? (
          <button className="btn primary breath" data-testid="btn-next-episode" onClick={() => goNextEpisode(home.nextEpisode)}>
            다음 빈자리 ▸
          </button>
        ) : null}
      </div>

      <nav className="dock" aria-label="앱">
        <button aria-current="true" onClick={memories} data-testid="dock-memory">
          <IMemory />
          <span className="t-m" style={{ lineHeight: '18px', color: 'inherit' }}>
            관측기
          </span>
        </button>
        {home.episode.verbs.search ? (
          <button onClick={() => push('search')} data-testid="dock-search">
            <ISearch />
            <span className="t-m" style={{ lineHeight: '18px', color: 'inherit' }}>
              찾기
            </span>
          </button>
        ) : null}
        <button onClick={openMessenger} data-testid="dock-messenger" aria-label={unseen ? `메신저, 안 읽은 메시지 ${home.unread}` : '메신저'}>
          <span style={{ position: 'relative', display: 'flex' }}>
            <IChat />
            {unseen ? <i className="dot" data-testid="unread-dot" style={{ left: 14, top: -4 }} /> : null}
          </span>
          <span className="t-m" style={{ lineHeight: '18px', color: 'inherit' }}>
            메신저
          </span>
        </button>
      </nav>
    </div>
  );
}
