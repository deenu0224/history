/** 「원문 보기」(DESIGN_V6 §2.4, UI_STYLE_GUIDE §11.7): 국역 그대로(검증) · 원문 · 낱말 · 출처. 복원 전에는 왕대·연도를 가린다. */
import { selectSceneBasis, selectWonmun } from '@/store/v6/store';
import { SCENE_NOTE } from '@/core/v6/lines';
import { D, useV6 } from './store';
import { IChevDown, IChevUp, ILock } from './icons';

export function WonmunToggle({ lineId, scene }: { lineId: string; scene?: boolean }) {
  const s = useV6((st) => st.s);
  const open = s.wonmunOpen.includes(lineId);
  const toggle = useV6.getState().toggleWonmun;
  return (
    <>
      <button className="v6-wtoggle" aria-expanded={open} data-testid={`wonmun-toggle-${lineId}`} onClick={() => toggle(lineId)}>
        <span>원문 보기</span>
        {open ? <IChevUp size={18} /> : <IChevDown size={18} />}
      </button>
      {open ? scene ? <ScenePanel id={lineId} /> : <WonmunPanel lineId={lineId} /> : null}
    </>
  );
}

export function WonmunPanel({ lineId }: { lineId: string }) {
  const s = useV6((st) => st.s);
  const p = selectWonmun(s, lineId, D);
  if (!p) return null;
  const hidden = !s.restored && p.source.url === undefined;
  return (
    <div className="v6-wpanel" data-testid={`wonmun-${lineId}`}>
      <div className="wrow">
        <div className="wl">국역</div>
        <div className="wv read">
          <span className="vtag">검증</span> 「{p.kukyeok}」
        </div>
      </div>
      <div className="wrow">
        <div className="wl">원문</div>
        <div className={`wv${p.wonmun.status === 'ok' ? ' read' : ' muted'}`}>{p.wonmun.text}</div>
      </div>
      {p.gloss.length ? (
        <div className="wrow">
          <div className="wl">낱말</div>
          <div className="wv">
            {p.gloss.map((g) => (
              <div key={g.term}>
                {g.term}: {g.meaning}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="wrow">
        <div className="wl">출처</div>
        <div className={`wv${hidden ? ' muted' : ''}`} data-testid={`wonmun-source-${lineId}`} data-hidden={hidden ? 'true' : 'false'}>
          {hidden ? <ILock size={18} /> : null} {p.source.text}
          {p.source.url ? <div className="url">{p.source.url}</div> : null}
          {p.source.note ? <div className="muted">{p.source.note}</div> : null}
        </div>
      </div>
    </div>
  );
}

function ScenePanel({ id }: { id: string }) {
  const b = selectSceneBasis(id, D);
  return (
    <div className="v6-wpanel" data-testid={`wonmun-${id}`}>
      <div className="wrow">
        <div className="wl">구분</div>
        <div className="wv muted">{b?.note ?? SCENE_NOTE}</div>
      </div>
      {b ? (
        <div className="wrow">
          <div className="wl">근거</div>
          <div className="wv muted">{b.basis.join(' · ')}</div>
        </div>
      ) : null}
    </div>
  );
}
