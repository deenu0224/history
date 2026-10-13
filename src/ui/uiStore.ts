import { create } from 'zustand';
import type { Id, Provenance } from '@/core/types';

export type SeqKind = 'prologue' | 'epilogue' | 'teaser';

export interface DialogLine {
  speaker?: string;
  text: string;
  provenance?: Provenance;
}

export type DialogState =
  | { type: 'lines'; key: number; title?: string; lines: DialogLine[]; onDone?: () => void }
  | { type: 'observe'; key: number; objectId: Id; label: string; lines: string[]; targetSceneId: Id; toPast: boolean };

export interface Toast {
  id: number;
  text: string;
  sub?: string;
  tone: 'info' | 'discover' | 'success' | 'warning';
}

export type Overlay = { kind: 'reader'; entryId: Id } | { kind: 'database' } | null;

interface UiLocal {
  phase: 'menu' | 'play';
  sequence: SeqKind | null;
  seqThen: (() => void) | null;
  overlay: Overlay;
  dialog: DialogState | null;
  toasts: Toast[];
  /** 마지막으로 단계가 오른 뒤 아직 보지 않은 도감 항목 */
  fresh: Record<Id, number>;
  hasAutosave: boolean;
  toastsMuted: boolean;
  hudHidden: boolean;

  setPhase(p: 'menu' | 'play'): void;
  playSequence(kind: SeqKind, then?: () => void): void;
  endSequence(): void;
  setOverlay(o: Overlay): void;
  setDialog(d: DialogState | null): void;
  pushToast(t: Omit<Toast, 'id'>): void;
  dropToast(id: number): void;
  markFresh(id: Id): void;
  clearFresh(id: Id): void;
  setHasAutosave(b: boolean): void;
  muteToasts(b: boolean): void;
}

let toastSeq = 1;

export const useUi = create<UiLocal>()((set, get) => ({
  phase: 'menu',
  sequence: null,
  seqThen: null,
  overlay: null,
  dialog: null,
  toasts: [],
  fresh: {},
  hasAutosave: false,
  toastsMuted: true,
  hudHidden: false,

  setPhase: (phase) => set({ phase }),
  playSequence: (kind, then) => set({ sequence: kind, seqThen: then ?? null }),
  endSequence() {
    const then = get().seqThen;
    set({ sequence: null, seqThen: null });
    then?.();
  },
  setOverlay: (overlay) => set({ overlay }),
  setDialog: (dialog) => set({ dialog }),
  pushToast(t) {
    if (get().toastsMuted) return;
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
  },
  dropToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  markFresh: (id) => set((s) => ({ fresh: { ...s.fresh, [id]: Date.now() } })),
  clearFresh(id) {
    if (!(id in get().fresh)) return;
    set((s) => {
      const { [id]: _drop, ...rest } = s.fresh;
      return { fresh: rest };
    });
  },
  setHasAutosave: (hasAutosave) => set({ hasAutosave }),
  muteToasts: (toastsMuted) => set({ toastsMuted }),
}));

export const dialogKey = () => Date.now() + Math.random();
