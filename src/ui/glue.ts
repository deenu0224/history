import { bus } from '@/core/bus';
import { STAGE_LABELS, entryView, stageOf } from '@/core/collection';
import { evidenceView } from '@/core/content';
import type { Id, Interactable, NpcDef } from '@/core/types';
import { canInteract, checkCondition } from '@/core/world';
import { playSfx, setAmbience, unlockAudio } from '@/game/audio';
import { peekSave } from '@/core/save';
import { useGameStore } from '@/store/gameStore';
import { IDX, entryForRef } from './lib/content';
import { OBJ_KEYS } from '@/game/art';
import { isPastScene } from './lib/scene';
import { SCRIPT, endingReached } from './lib/script';
import { dialogKey, useUi, type DialogLine } from './uiStore';

const game = () => useGameStore.getState();
const ui = () => useUi.getState();

// ── 이름 표시: 정체 확인 전에는 '미확인 관료' 같은 라벨 ─────────────
export function npcIdentified(npc: NpcDef): boolean {
  if (!npc.personId) return true;
  const entry = entryForRef('person', npc.personId);
  if (!entry) return false;
  return stageOf(game().collection, entry.id) >= 2;
}

export function npcDisplayName(npc: NpcDef): string {
  if (!npcIdentified(npc)) return npc.label;
  return (npc.personId && IDX.persons[npc.personId]?.name) || npc.label;
}

function speakerFor(npc: NpcDef, speaker?: string): string {
  if (npcIdentified(npc)) return speaker ?? npcDisplayName(npc);
  const person = npc.personId ? IDX.persons[npc.personId] : undefined;
  if (!speaker || (person && (speaker.includes(person.name) || (person.hanja && speaker.includes(person.hanja))))) return npc.label;
  return speaker;
}

// ── 상호작용 ───────────────────────────────────────────────────
function showLines(lines: DialogLine[], title?: string) {
  ui().setDialog({ type: 'lines', key: dialogKey(), title, lines });
  playSfx('open');
}

/** 연구실의 역사 데이터베이스 단말: 조사 후 DB 화면을 연다. */
function isDbConsole(obj: Interactable): boolean {
  return /(console|terminal|database|_db\b|^db_)/i.test(obj.id) || obj.spriteKey === OBJ_KEYS.terminal;
}

function interactObject(obj: Interactable) {
  if (!canInteract(obj, game().flags)) {
    showLines([{ text: '지금은 손댈 수 없다.' }], obj.label);
    return;
  }
  if (obj.kind === 'door' && obj.targetSceneId) {
    playSfx('open');
    bus.emit('scene:goto', { sceneId: obj.targetSceneId });
    return;
  }
  if (obj.kind === 'observe' && obj.targetSceneId) {
    ui().setDialog({
      type: 'observe',
      key: dialogKey(),
      objectId: obj.id,
      label: obj.label,
      lines: obj.examine,
      targetSceneId: obj.targetSceneId,
      toPast: isPastScene(obj.targetSceneId),
    });
    playSfx('open');
    return;
  }
  const res = game().examine(obj.id);
  if (res && isDbConsole(obj)) {
    ui().setDialog({
      type: 'lines',
      key: dialogKey(),
      title: obj.label,
      lines: (res.lines.length ? res.lines : [`${obj.label}에 접속한다.`]).map((text) => ({ text, provenance: obj.provenance })),
      onDone: () => ui().setOverlay({ kind: 'database' }),
    });
    playSfx('open');
    return;
  }
  if (!res) {
    showLines([{ text: '지금은 살펴볼 수 없다.' }], obj.label);
    return;
  }
  const lines = res.lines.length ? res.lines : [`${obj.label}.`];
  showLines(lines.map((text) => ({ text, provenance: obj.provenance })), obj.label);
}

function interactNpc(npc: NpcDef) {
  const res = game().talk(npc.id);
  if (!res) return;
  const lines: DialogLine[] = res.lines.length
    ? res.lines.map((l) => ({ speaker: speakerFor(npc, l.speaker), text: l.text, provenance: l.provenance }))
    : [{ speaker: npc.label, text: '…', provenance: npc.provenance }];
  showLines(lines);
}

export function confirmObserve() {
  const d = ui().dialog;
  if (!d || d.type !== 'observe') return;
  game().examine(d.objectId);
  playSfx(d.toPast ? 'observe' : 'return');
  ui().setDialog(null);
  bus.emit('scene:goto', { sceneId: d.targetSceneId });
}

function onInteract({ targetId }: { targetId: Id }) {
  const g = game();
  const u = ui();
  if (u.phase !== 'play' || u.dialog || u.overlay || u.sequence || g.ui.modal) return;
  const npc = IDX.npcs[targetId];
  if (npc) return interactNpc(npc);
  const obj = IDX.worldObjects[targetId];
  if (!obj) return;
  if (obj.kind === 'npc') return;
  interactObject(obj);
}

// ── 시작/이어하기/저장 상태 ─────────────────────────────────────
/** 상태를 통째로 바꾸는 동안(불러오기·초기화) 토스트를 막는다. */
export async function quietly<T>(fn: () => T | Promise<T>): Promise<T> {
  ui().muteToasts(true);
  try {
    return await fn();
  } finally {
    setTimeout(() => ui().muteToasts(false), 60);
  }
}

export async function refreshAutosave() {
  try {
    ui().setHasAutosave(Boolean(await peekSave('auto')));
  } catch {
    ui().setHasAutosave(false);
  }
}

let lastScene: string | null = null;

function beginPlay() {
  ui().setPhase('play');
  // 월드는 store.currentScene 변화를 보고 스스로 씬을 옮긴다. 비어 있으면 시작 씬으로 지정.
  if (!game().currentScene) game().setScene(lastScene ?? SCRIPT.startSceneId);
  setAmbience(isPastScene(game().currentScene) ? 'past' : 'modern');
}

export async function startNewGame() {
  unlockAudio();
  await quietly(() => game().reset());
  game().closeModal();
  ui().setDialog(null);
  if (SCRIPT.prologue) ui().playSequence('prologue', beginPlay);
  else beginPlay();
}

export async function continueGame(): Promise<boolean> {
  unlockAudio();
  const ok = await quietly(() => game().load('auto'));
  if (!ok) return false;
  ui().setDialog(null);
  ui().setOverlay(null);
  beginPlay();
  return true;
}

export function returnToMenu() {
  game().closeModal();
  ui().setDialog(null);
  ui().setOverlay(null);
  ui().setPhase('menu');
  setAmbience('none');
  void refreshAutosave();
}

// ── 토스트: 획득물 diff ──────────────────────────────────────────
const short = (s: string, n = 28) => (s.length > n ? `${s.slice(0, n)}…` : s);

function installToasts(): () => void {
  let pending: Parameters<ReturnType<typeof ui>['pushToast']>[0][] = [];
  const flush = () => {
    if (ui().dialog) return;
    if (pending.some((p) => p.tone === 'discover')) playSfx('discover');
    for (const t of pending) ui().pushToast(t);
    pending = [];
  };
  const unsubDialog = useUi.subscribe((s, p) => {
    if (s.dialog !== p.dialog && !s.dialog) setTimeout(flush, 120);
  });
  const unsub = useGameStore.subscribe((s, p) => {
    if (ui().toastsMuted) return;
    if (s.evidence !== p.evidence) {
      for (const [id, level] of Object.entries(s.evidence)) {
        const before = p.evidence[id];
        if (before !== undefined && before >= level) continue;
        const ev = IDX.evidence[id];
        if (!ev) continue;
        const label = evidenceView(ev, level).label;
        pending.push({ tone: 'discover', text: before === undefined ? `증거 획득: ${label}` : `증거 갱신: ${label}`, sub: before === undefined ? '조사 노트에 등록되었다' : '카드의 내용이 채워졌다' });
      }
    }
    if (s.collection !== p.collection) {
      for (const [id, stage] of Object.entries(s.collection)) {
        const before = p.collection[id] ?? 0;
        if (stage <= before) continue;
        const entry = IDX.collection[id];
        if (!entry) continue;
        const v = entryView(entry, stage);
        ui().markFresh(id);
        pending.push({ tone: 'discover', text: `도감 ${before === 0 ? '등록' : '갱신'}: ${v.title}`, sub: STAGE_LABELS[stage] });
      }
    }
    if (s.notebook !== p.notebook) {
      for (const sec of ['observed', 'testimony', 'verified', 'question'] as const) {
        const prev = new Set(p.notebook[sec].map((n) => n.id));
        for (const n of s.notebook[sec]) {
          if (prev.has(n.id) || n.id.startsWith('ui_')) continue;
          pending.push({ tone: 'info', text: sec === 'question' ? `의문을 기록했다` : `노트에 기록했다`, sub: short(n.text) });
        }
      }
    }
    if (pending.length) flush();
  });
  return () => {
    unsub();
    unsubDialog();
  };
}

export function installGlue(): () => void {
  const offs: (() => void)[] = [];
  offs.push(bus.on('interact', onInteract));
  offs.push(
    bus.on('scene:enter', ({ sceneId }) => {
      lastScene = sceneId;
      if (ui().phase !== 'play') return;
      game().setScene(sceneId);
      setAmbience(isPastScene(sceneId) ? 'past' : 'modern');
    }),
  );
  offs.push(bus.on('notify', ({ text, tone }) => ui().pushToast({ text, tone: tone ?? 'info' })));
  offs.push(bus.on('ui:open', ({ modal, id }) => game().openModal(modal, id)));
  offs.push(bus.on('ui:close', () => game().closeModal()));
  offs.push(installToasts());
  offs.push(
    useGameStore.subscribe((s, p) => {
      if (s.ui.modal?.kind !== p.ui.modal?.kind && ui().phase === 'play') playSfx(s.ui.modal ? 'open' : 'close');
    }),
  );
  // 후속 연출: 귀환 직후 독백 → 에필로그 → 티저 (각각 한 번만, 플래그로 기억)
  const idle = () => ui().phase === 'play' && !ui().sequence && !ui().dialog && !ui().overlay && !game().ui.modal;
  const check = () => {
    if (!idle()) return;
    const f = game().flags;
    const done = (flag: string) => () => game().setFlag(flag);
    if (f['obs001_returned'] && !f['ui_afterreturn_seen'] && !isPastScene(game().currentScene)) {
      game().setFlag('ui_afterreturn_seen');
      if (SCRIPT.afterReturn.length)
        showLines(SCRIPT.afterReturn.map((l) => ({ speaker: l.speaker, text: l.text, provenance: l.provenance })));
      return;
    }
    if (endingReached(f) && !f['ui_epilogue_seen'] && SCRIPT.epilogue) {
      ui().playSequence('epilogue', done('ui_epilogue_seen'));
    } else if (f['ui_epilogue_seen'] && !f['ui_teaser_seen'] && checkCondition(f, SCRIPT.teaserWhen) && SCRIPT.teaser) {
      ui().playSequence('teaser', done('ui_teaser_seen'));
    }
  };
  offs.push(
    useGameStore.subscribe((s, p) => {
      if (s.flags !== p.flags || s.ui.modal !== p.ui.modal || s.currentScene !== p.currentScene) setTimeout(check, 450);
    }),
    useUi.subscribe((s, p) => {
      if (s.dialog !== p.dialog || s.overlay !== p.overlay || s.sequence !== p.sequence || s.phase !== p.phase) setTimeout(check, 450);
    }),
  );
  void refreshAutosave();
  return () => offs.forEach((o) => o());
}
