/** 설정(시스템 패널): 소리·진동·글자 크기·깜빡임·힌트·저장. 엔딩 뒤에는 기록 열람 모드가 열린다. */
import { useState } from 'react';
import { provenanceBadge, selectCaseLedger, selectRecordLedger, useGameStore } from '@/store/gameStore';
import { fx } from '../lib/fx';
import { restartSession } from '../lib/session';
import { useUi } from '../uiStore';

function Switch({ on, onChange, label, id }: { on: boolean; onChange(v: boolean): void; label: string; id: string }) {
  return (
    <div className="set-row">
      <span id={`${id}-l`}>{label}</span>
      <button type="button" role="switch" aria-checked={on} aria-labelledby={`${id}-l`} className={`switch ${on ? 'on' : ''}`} data-testid={id} onClick={() => (fx('tap'), onChange(!on))}>
        <i />
        <span className="sr">{on ? '켬' : '끔'}</span>
      </button>
    </div>
  );
}

function Seg<T extends string | number>({ value, options, onChange, id }: { value: T; options: { v: T; label: string }[]; onChange(v: T): void; id: string }) {
  return (
    <div className="seg" role="radiogroup" data-testid={id}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" role="radio" aria-checked={o.v === value} className={`segbtn ${o.v === value ? 'on' : ''}`} data-testid={`${id}-${o.v}`} onClick={() => (fx('tap'), onChange(o.v))}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsApp() {
  const st = useGameStore();
  const set = st.updateSettings;
  const scale = useUi((s) => s.textScale);
  const setScale = useUi((s) => s.setTextScale);
  const musicV = useUi((s) => s.musicVolume);
  const sfxV = useUi((s) => s.sfxVolume);
  const setMusicV = useUi((s) => s.setMusicVolume);
  const setSfxV = useUi((s) => s.setSfxVolume);
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [ledger, setLedger] = useState(false);
  const ended = st.duty.ended.includes('duty_3');
  const s = st.settings;

  return (
    <div className="settings" data-testid="app-settings">
      {ended && (
        <section className="set-sec">
          <h4>기록 열람 모드</h4>
          <Switch id="set-prov" label="출처 표식 보기" on={s.showProvenance} onChange={(v) => set({ showProvenance: v })} />
          <button type="button" className="btn" data-testid="ledger-toggle" onClick={() => setLedger((v) => !v)}>
            {ledger ? '기록 열람 닫기' : '기록 열람'}
          </button>
          {ledger && (
            <div data-testid="ledger">
              <ul className="ledger" data-testid="case-ledger">
                {selectCaseLedger(st).map((c) => (
                  <li key={c.id} className="ledger-case">
                    <b>
                      {c.code} · {c.citation}
                    </b>
                    <span className="ledger-badges">
                      <em className="badge">{c.original.badge}</em> {c.original.date}
                      {c.original.text}
                    </span>
                    {c.distortion && (
                      <span className="ledger-badges">
                        <em className="badge badge-from">{c.distortion.badge}</em> ‘{c.distortion.from}’ → ‘{c.distortion.to}’
                      </span>
                    )}
                    {c.notation.map((n) => (
                      <span key={n} className="ledger-badges quiet">
                        표기 · {n}
                      </span>
                    ))}
                    {c.lines.map((l, i) => (
                      <span key={i} className="ledger-badges">
                        <em className="badge">{l.badge}</em> 「{l.text}」
                      </span>
                    ))}
                    <span className="ledger-badges quiet">내 도장 · {c.stamp ?? '—'}</span>
                  </li>
                ))}
              </ul>
              <ul className="ledger">
                {selectRecordLedger(st).map((r) => (
                  <li key={r.id}>
                    <b>{r.current.title}</b>
                    <span className="ledger-badges">
                      <em className="badge">지금 {r.currentBadge}</em>
                      {r.restored && <em className="badge badge-from">처음 {r.originalBadge}</em>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="quiet">‘{provenanceBadge('verified')}’은 출처가 확인된 것, ‘재구성’은 근거로 다시 짠 것, ‘가상’·‘변조’는 이 이야기 속에서만 있는 것이다.</p>
        </section>
      )}
      <section className="set-sec">
        <h4>소리와 손맛</h4>
        <div className="set-row">
          <label htmlFor="set-volume">전체 음량</label>
          <input id="set-volume" data-testid="set-volume" type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => set({ volume: Number(e.target.value) })} />
        </div>
        <div className="set-row">
          <label htmlFor="set-music">음악</label>
          <input id="set-music" data-testid="set-music" type="range" min={0} max={1} step={0.05} value={musicV} onChange={(e) => setMusicV(Number(e.target.value))} />
        </div>
        <div className="set-row">
          <label htmlFor="set-sfx">효과음</label>
          <input id="set-sfx" data-testid="set-sfx" type="range" min={0} max={1} step={0.05} value={sfxV} onChange={(e) => setSfxV(Number(e.target.value))} />
        </div>
        <Switch id="set-haptics" label="진동" on={s.haptics} onChange={(v) => set({ haptics: v })} />
        <Switch id="set-flicker" label="깜빡임·흔들림 줄이기" on={s.reduceFlicker} onChange={(v) => set({ reduceFlicker: v })} />
      </section>

      <section className="set-sec">
        <h4>글자</h4>
        <Seg
          id="set-scale"
          value={scale}
          options={[
            { v: 1, label: '보통' },
            { v: 1.125, label: '크게' },
            { v: 1.25, label: '더 크게' },
            { v: 1.5, label: '아주 크게' },
          ]}
          onChange={setScale}
        />
      </section>

      <section className="set-sec">
        <h4>메신저 힌트</h4>
        <Seg
          id="set-hints"
          value={s.hintLevel}
          options={[
            { v: 'off', label: '끔' },
            { v: 'normal', label: '보통' },
            { v: 'detailed', label: '자세히' },
          ]}
          onChange={(v) => set({ hintLevel: v })}
        />
        <p className="quiet">막혔을 때만 메신저로 온다.</p>
      </section>

      <section className="set-sec">
        <h4>기록</h4>
        <div className="set-btns">
          <button type="button" className="btn" data-testid="save-manual" onClick={async () => (await st.save('manual'), setNote('저장했다.'))}>
            저장
          </button>
          <button type="button" className="btn" data-testid="load-manual" onClick={async () => {
              const ok = await st.load('manual');
              if (ok) restartSession();
              setNote(ok ? '불러왔다.' : '저장된 기록이 없다.');
            }}>
            불러오기
          </button>
          {confirm ? (
            <button type="button" className="btn btn-danger" data-testid="reset-confirm" onClick={() => (st.reset(), restartSession(), setConfirm(false))}>
              정말 처음부터
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" data-testid="reset" onClick={() => setConfirm(true)}>
              처음부터
            </button>
          )}
        </div>
        {note && (
          <p className="quiet" role="status">
            {note}
          </p>
        )}
      </section>

    </div>
  );
}
