import { useEffect, useState } from 'react';
import { peekSave } from '@/core/save';
import { UI_KEYS } from '@/game/art';
import { playSfx, setVolume } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { Modal } from '../components/kit';
import { quietly, refreshAutosave, returnToMenu } from '../glue';
import { formatSavedAt } from '../lib/format';
import { endingReached } from '../lib/script';
import { useUi } from '../uiStore';

const speedLabel = (v: number) => (v >= 4 ? '즉시' : `${v.toFixed(1)}배`);

export function SettingsScreen() {
  const close = useGameStore((s) => s.closeModal);
  const settings = useGameStore((s) => s.settings);
  const update = useGameStore((s) => s.updateSettings);
  const save = useGameStore((s) => s.save);
  const load = useGameStore((s) => s.load);
  const reset = useGameStore((s) => s.reset);
  const flags = useGameStore((s) => s.flags);
  const lastSavedAt = useGameStore((s) => s.lastSavedAt);
  const phase = useUi((s) => s.phase);
  const [slots, setSlots] = useState<{ auto: string | null; manual: string | null }>({ auto: null, manual: null });
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const unlocked = endingReached(flags);

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

  const doSave = async () => {
    try {
      await save('manual');
      setMsg('저장했다.');
      playSfx('select');
    } catch {
      setMsg('저장하지 못했다. 브라우저 저장소를 확인하세요.');
    }
    void refresh();
  };
  const doLoad = async (slot: 'auto' | 'manual') => {
    try {
      const ok = await quietly(() => load(slot));
      setMsg(ok ? '불러왔다.' : '저장된 기록이 없다.');
      if (ok) {
        useUi.getState().setPhase('play');
        close();
      }
    } catch {
      setMsg('저장 데이터를 읽을 수 없다.');
    }
  };
  const doReset = async () => {
    await quietly(() => reset());
    setConfirmReset(false);
    setMsg('모든 진행을 지웠다.');
    void refreshAutosave();
    if (phase === 'play') returnToMenu();
    close();
  };

  return (
    <Modal title="설정 및 저장" icon={UI_KEYS.iconSettings} onClose={close}>
      <div className="scroll settings">
        <section>
          <h4>소리와 글자</h4>
          <label className="setrow">
            <span>음량 <b>{Math.round(settings.volume * 100)}%</b></span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                update({ volume: v });
                setVolume(v);
              }}
              onPointerUp={() => playSfx('select')}
            />
          </label>
          <label className="setrow">
            <span>글자 속도 <b>{speedLabel(settings.textSpeed)}</b></span>
            <input type="range" min={0.5} max={4} step={0.5} value={settings.textSpeed} onChange={(e) => update({ textSpeed: Number(e.target.value) })} />
          </label>
          <label className="setrow setrow-check">
            <input type="checkbox" checked={settings.showInteractHints} onChange={(e) => update({ showInteractHints: e.target.checked })} />
            <span>상호작용 힌트 표시<small>조사할 수 있는 대상 근처에 표시를 띄운다.</small></span>
          </label>
          <label className={`setrow setrow-check ${unlocked ? '' : 'locked'}`}>
            <input type="checkbox" disabled={!unlocked} checked={unlocked && settings.showProvenance} onChange={(e) => update({ showProvenance: e.target.checked })} />
            <span>
              기록 열람 모드 (재구성·가상 표식)
              <small>{unlocked ? '대사와 기록에 출처 구분 표식을 붙인다.' : '엔딩을 본 뒤에 열린다.'}</small>
            </span>
          </label>
        </section>
        <section>
          <h4>저장</h4>
          <ul className="slots">
            <li>
              <span>수동 저장</span>
              <b>{formatSavedAt(slots.manual)}</b>
              <button className="btn btn-small" onClick={doSave}>저장</button>
              <button className="btn btn-small" onClick={() => doLoad('manual')} disabled={!slots.manual}>불러오기</button>
            </li>
            <li>
              <span>자동 저장</span>
              <b>{formatSavedAt(slots.auto)}</b>
              <button className="btn btn-small" onClick={() => doLoad('auto')} disabled={!slots.auto}>불러오기</button>
            </li>
          </ul>
          {msg && <p className="setmsg" role="status">{msg}</p>}
        </section>
        <section>
          <h4>진행</h4>
          {phase === 'play' && (
            <button className="btn" onClick={() => { returnToMenu(); close(); }}>
              메인 메뉴로
            </button>
          )}
          {confirmReset ? (
            <div className="confirm">
              <p>모든 진행과 저장 상태를 처음으로 되돌립니다. 되돌릴 수 없습니다.</p>
              <button className="btn btn-danger" onClick={doReset}>정말 초기화</button>
              <button className="btn" onClick={() => setConfirmReset(false)}>취소</button>
            </div>
          ) : (
            <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>진행 초기화</button>
          )}
        </section>
      </div>
    </Modal>
  );
}
