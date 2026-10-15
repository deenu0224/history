/** 단말 홈 — 오늘의 빈자리. UI_STYLE_GUIDE §2.2 */
import { useGameStore } from '@/store/gameStore';
import { selectHome } from '@/store/selectors';
import { useView } from '@/store/hooks';
import { fx } from '../lib/fx';
import { goNextEpisode } from '../lib/flow';
import { EyeRow } from '../parts/EyeRow';
import { HomeRecord } from '../parts/HomeRecord';
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

/** 열린 눈 중 아직 안 본 컷이 있는 첫 눈(없으면 첫 열린 눈) */
function pickEye(eyes: { eyeId: string; state: string }[]): string | undefined {
  const open = eyes.filter((e) => e.state === 'open');
  return open[0]?.eyeId;
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
  const restored = home.card.status === '복원됨';
  const unseen = home.unread > 0;

  const memories = () => {
    // 아직 안 본 컷이 가장 많은 눈이 아니라, 순서대로 첫 열린 눈
    const id = pickEye(home.eyes);
    if (id) enterMemory(id);
  };

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

      <div className={`card-assign${restored ? ' restored' : ''}`} data-testid="assign-card">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="t-h">
            {home.card.status === '빈자리' ? '빈자리 ' : ''}
            {home.card.code}
          </div>
          <span className="t-m" style={{ color: restored ? 'var(--amber)' : undefined }}>
            {home.card.status}
          </span>
        </div>
        <div className="kv">
          <span className="t-m">일시</span>
          <span className="t-b" style={{ color: restored ? 'var(--hanji)' : 'var(--amber)', fontFamily: restored ? 'var(--f-read)' : 'var(--f-pixel)', letterSpacing: restored ? 0 : '0.08em' }} data-testid="home-date">
            {home.card.date}
          </span>
          <span className="t-m">장소</span>
          <span className="t-b" data-testid="home-place">
            {home.card.place}
          </span>
        </div>
        {home.card.record ? (
          <HomeRecord record={home.card.record} clamp={restored} />
        ) : restored ? null : (
          <>
            <div className="t-m home-record-label">그날 실록</div>
            <GapGraphic />
          </>
        )}
        {home.card.placeNote ? (
          <p className="t-m keep" style={{ margin: '10px 0 0' }}>
            {home.card.placeNote}
          </p>
        ) : null}
        <div className="divider" style={{ marginTop: restored ? 14 : 0 }} />
        <p className="t-b keep" style={{ margin: '14px 0' }}>
          {restored ? '이 날의 기록이 돌아왔다.' : home.card.task}
        </p>
        <div className="divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
          <span className="t-m" style={{ marginRight: 4 }}>
            관측 가능
          </span>
          <EyeRow eyes={home.eyes} onPick={enterMemory} />
        </div>
        {home.resume.eyesOpen > 1 && !restored ? (
          <p className="t-m" style={{ margin: '4px 0 0' }} data-testid="resume-line">
            관측 가능 {home.resume.eyesOpen}
            {home.resume.contradictionsLeft ? ` · 남은 모순 ${home.resume.contradictionsLeft}` : ''}
          </p>
        ) : null}
      </div>

      <div className="home-body">
        {home.buttons.includes('memories') ? (
          <button
            className={`btn primary${home.resume.eyesOpen <= 1 ? ' breath' : ''}`}
            data-testid="btn-memories"
            onClick={() => {
              fx('tap');
              memories();
            }}
          >
            관측하기
          </button>
        ) : null}
        {home.buttons.includes('rewrite') ? (
          <button className="btn primary" data-testid="btn-rewrite" onClick={() => push('rewrite')}>
            기록 다시 쓰기
          </button>
        ) : null}
        {home.buttons.includes('restored') ? (
          <button className={`btn ${home.nextEpisode ? 'secondary' : 'primary'}`} data-testid="btn-restored" onClick={() => push('restore')}>
            복원된 기록
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
        <button onClick={() => push('messenger')} data-testid="dock-messenger" aria-label={unseen ? `메신저, 안 읽은 메시지 ${home.unread}` : '메신저'}>
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
