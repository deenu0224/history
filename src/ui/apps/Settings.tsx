/** 설정(시스템 패널): 소리·글자·힌트·진동·기록 열람 모드 · 저장/불러오기/초기화 · 도움말 카드. */
import { useEffect, useState } from 'react';
import { peekSave } from '@/core/save';
import type { HintLevel } from '@/core/terminal';
import { setVolume } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { fx } from '../lib/fx';
import { CONTENT } from '../lib/content';
import { formatSavedAt } from '../lib/format';
import { endingReached } from '../lib/objectives';
import { useUi, type SettingsTab } from '../uiStore';

const HINTS: { id: HintLevel; label: string }[] = [
  { id: 'off', label: '끔' },
  { id: 'normal', label: '보통' },
  { id: 'detailed', label: '자세히' },
];
const speedLabel = (v: number) => (v >= 4 ? '즉시' : `${v.toFixed(1)}배`);

export function Settings() {
  const tab = useUi((s) => s.settingsTab);
  const setTab = useUi((s) => s.setSettingsTab);
  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'main', label: '설정' },
    { id: 'save', label: '저장' },
    { id: 'help', label: '도움말' },
  ];
  return (
    <div className="settings" data-testid="app-settings">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'on' : ''}`} data-testid={`set-tab-${t.id}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="set-body scroll">
        {tab === 'main' && <Main />}
        {tab === 'save' && <SavePane />}
        {tab === 'help' && <HelpPane />}
      </div>
    </div>
  );
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange(v: T): void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.id)} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Main() {
  const s = useGameStore((st) => st.settings);
  const update = useGameStore((st) => st.updateSettings);
  const ended = useGameStore((st) => endingReached(st));
  const scale = useUi((st) => st.textScale);
  const setScale = useUi((st) => st.setTextScale);
  return (
    <>
      <section>
        <h4>소리</h4>
        <label className="setrow">
          <span>
            음량 <b>{Math.round(s.volume * 100)}%</b>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            data-testid="set-volume"
            value={s.volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              update({ volume: v });
              setVolume(v);
            }}
            onPointerUp={() => fx('tap')}
          />
        </label>
        <label className="setrow setrow-check">
          <input type="checkbox" data-testid="set-haptics" checked={s.haptics} onChange={(e) => update({ haptics: e.target.checked })} />
          <span>
            진동<small>누를 때 살짝 울립니다(기기가 지원할 때).</small>
          </span>
        </label>
      </section>
      <section>
        <h4>글자</h4>
        <label className="setrow">
          <span>
            글자 속도 <b>{speedLabel(s.textSpeed)}</b>
          </span>
          <input type="range" min={0.5} max={4} step={0.5} value={s.textSpeed} onChange={(e) => update({ textSpeed: Number(e.target.value) })} />
        </label>
        <div className="setrow">
          <span>글자 크기</span>
          <Seg
            label="글자 크기"
            value={scale}
            options={[
              { id: 1, label: '기본' },
              { id: 1.25, label: '크게' },
              { id: 1.5, label: '아주 크게' },
            ]}
            onChange={setScale}
          />
        </div>
      </section>
      <section>
        <h4>힌트</h4>
        <div className="setrow">
          <span>
            힌트 수준<small>끔은 코치마크와 힌트를 숨깁니다. 도움말은 언제든 볼 수 있어요.</small>
          </span>
          <Seg label="힌트 수준" value={s.hintLevel} options={HINTS} onChange={(v) => update({ hintLevel: v })} />
        </div>
      </section>
      <section>
        <h4>화면</h4>
        <label className="setrow setrow-check">
          <input type="checkbox" data-testid="set-flicker" checked={s.reduceFlicker} onChange={(e) => update({ reduceFlicker: e.target.checked })} />
          <span>
            화면 흔들림 줄이기<small>글리치와 글자 깜빡임을 약하게 합니다.</small>
          </span>
        </label>
        <label className={`setrow setrow-check ${ended ? '' : 'locked'}`}>
          <input type="checkbox" data-testid="set-provenance" disabled={!ended} checked={ended && s.showProvenance} onChange={(e) => update({ showProvenance: e.target.checked })} />
          <span>
            기록 열람 모드 (재구성·가상 표식)
            <small>{ended ? '대사와 기록에 출처 구분 표식을 붙입니다.' : '이야기를 마친 뒤에 열립니다.'}</small>
          </span>
        </label>
      </section>
    </>
  );
}

function SavePane() {
  const save = useGameStore((s) => s.save);
  const load = useGameStore((s) => s.load);
  const reset = useGameStore((s) => s.reset);
  const lastSavedAt = useGameStore((s) => s.lastSavedAt);
  const [slots, setSlots] = useState<{ auto: string | null; manual: string | null }>({ auto: null, manual: null });
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);

  const refresh = async () => {
    try {
      const [a, m] = await Promise.all([peekSave('auto'), peekSave('manual')]);
      setSlots({ auto: a?.savedAt ?? null, manual: m?.savedAt ?? null });
    } catch {
      setSlots({ auto: null, manual: null });
    }
  };
  useEffect(() => {
    void refresh();
  }, [lastSavedAt]);

  return (
    <>
      <section>
        <h4>저장</h4>
        <ul className="slots">
          <li>
            <span>수동 저장</span>
            <b>{formatSavedAt(slots.manual)}</b>
            <button
              className="btn btn-small"
              data-testid="save-manual"
              onClick={async () => {
                try {
                  await save('manual');
                  setMsg('저장했다.');
                  fx('tap');
                } catch {
                  setMsg('저장하지 못했다. 브라우저 저장소를 확인하세요.');
                }
                void refresh();
              }}
            >
              저장
            </button>
            <button
              className="btn btn-small"
              data-testid="load-manual"
              disabled={!slots.manual}
              onClick={async () => setMsg((await load('manual').catch(() => false)) ? '불러왔다.' : '저장된 기록이 없다.')}
            >
              불러오기
            </button>
          </li>
          <li>
            <span>자동 저장</span>
            <b>{formatSavedAt(slots.auto)}</b>
            <button
              className="btn btn-small"
              data-testid="load-auto"
              disabled={!slots.auto}
              onClick={async () => setMsg((await load('auto').catch(() => false)) ? '불러왔다.' : '저장된 기록이 없다.')}
            >
              불러오기
            </button>
          </li>
        </ul>
        {msg && (
          <p className="setmsg" role="status">
            {msg}
          </p>
        )}
      </section>
      <section>
        <h4>진행</h4>
        {confirm ? (
          <div className="confirm">
            <p>모든 진행과 저장 상태를 처음으로 되돌립니다. 되돌릴 수 없습니다.</p>
            <button
              className="btn btn-danger"
              data-testid="reset-confirm"
              onClick={() => {
                reset();
                setConfirm(false);
                setMsg('처음으로 되돌렸다.');
                useUi.getState().setPhase('boot');
              }}
            >
              정말 초기화
            </button>
            <button className="btn" onClick={() => setConfirm(false)}>
              취소
            </button>
          </div>
        ) : (
          <button className="btn btn-danger" data-testid="reset" onClick={() => setConfirm(true)}>
            진행 초기화
          </button>
        )}
      </section>
    </>
  );
}

function HelpPane() {
  return (
    <section className="helps">
      {CONTENT.help.map((h) => (
        <article key={h.id} className="help-card" data-testid={`help-${h.id}`}>
          <h4>{h.title}</h4>
          <ul>
            {h.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
