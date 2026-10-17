import { cellsText, josa } from '@/core/josa';
/**
 * 화면별 보기(셀렉터) — UI_STYLE_GUIDE §1 화면 목록에 맞춘다. 모두 (ep, state) → 순수한 보기 객체.
 * 원칙: 정답·숨은 정체를 내보내지 않는다(이름은 붙인 뒤에만, 연도·장소는 복원 뒤에만).
 */
import { geometry, claimById, claimHeld, type ContradictionGeometry, type WitnessMark } from '@/core/contradiction';
import { appearances, heldEvidence, idx, personGroups, type Appearance } from '@/core/ep';
import { cutAvailability, eyeLabel, eyeState, ownerKnown, type CutAvailability, type EyeState } from '@/core/eyes';
import { view as messengerView, type MessengerView } from '@/core/messenger';
import { alteredView, articleView, figureRestoredLabel, glossInline, homeView, visibleFacts, type AlteredView, type ArticlePartView } from '@/core/reality';
import { availablePieces, fixRate, pieceLabel, renderLine, sentenceOf, sentenceSlots, slotOptions, type LineRender, type LineResult, type SlotOption } from '@/core/rewrite';
import { posOf, sameMoment } from '@/core/room';
import { cardOrder, evidenceOptions, type EvidenceOption } from '@/core/tag';
import type { Episode, FactLink, Gloss, Hhmm, Id, SlotKind, SourceRef } from '@/core/types';
import { canAskHint, contradictionGateOpen, isPreplacedPiece, knowledge, rewriteAvailable, roomUnlocked, timeChips, chipFor, resumeSummary, tagsDone, firstTryOk, mentionShown } from './engine';
import type { PersistedState, SearchLogEntry } from './state';

const world = (s: PersistedState) => ({ restored: s.restored, closures: s.closures });

// ── 눈 줄 ────────────────────────────────────────────────────────
export interface EyeView {
  eyeId: Id;
  order: number;
  state: EyeState;
  /** 열림 + 이름 모름 */
  ownerUnknown: boolean;
  label: string;
  current: boolean;
}

export function selectEyes(ep: Episode, s: PersistedState): EyeView[] {
  const k = knowledge(s);
  return [...ep.eyes]
    .sort((a, b) => a.order - b.order)
    .map((e) => {
      const st = eyeState(ep, k, e);
      return {
        eyeId: e.id,
        order: e.order,
        state: st,
        ownerUnknown: st === 'open' && !ownerKnown(ep, k, e),
        label: st === 'never' ? (s.restored ? `${josa(idx(ep).card.get(e.personId)?.name ?? '?', '이/가')} 본 것` : '관측 불가') : st === 'unopened' ? '' : eyeLabel(ep, k, e),
        current: s.viewer?.eyeId === e.id,
      };
    });
}

// ── 진행: 이름 붙이기 n/m ────────────────────────────────────────
/**
 * 꼭 붙여야 할 이름(Episode.requiredTags, 없으면 규칙 전부) 중 붙인 수. m 은 목표 수일 뿐 — 누구인지는 내보내지 않는다.
 * complete: 마지막 이름을 붙였다(「모두 밝혀졌다」). rewriteReady: 다음 할 일이 기록 다시 쓰기다.
 */
export function selectTagProgress(ep: Episode, s: PersistedState) {
  const req = ep.requiredTags ?? ep.tags.map((t) => t.id);
  const done = tagsDone(ep, s).filter((id) => req.includes(id)).length;
  const complete = req.length > 0 && done >= req.length;
  /**
   * allClear: 꼭 할 일이 하나도 남지 않았다(이름 + 역사 고정 전의 닫힘·모순·보고서 — Episode.rewriteWhen) → 「모두 밝혀졌다」.
   * 이름만 다 붙었으면 「이름 붙이기 m/m」 만(끝 신호는 아니다).
   */
  const allClear = complete && (s.restored || rewriteAvailable(ep, s));
  return { done, total: req.length, complete, allClear };
}

/** 다음 할 일 하나(홈·뷰어의 주요 버튼이 가리킨다). 정답은 없다 — 남은 동작의 종류만 */
export type NextTask = { kind: 'rewrite' } | { kind: 'contradiction'; id: Id } | { kind: 'observe'; eyeId?: Id } | { kind: 'done' };

export function selectNextTask(ep: Episode, s: PersistedState): NextTask {
  if (s.restored) return { kind: 'done' };
  if (rewriteAvailable(ep, s)) return { kind: 'rewrite' };
  const x = s.revealed.find((id) => !s.resolved[id]);
  if (x && roomUnlocked(ep, s)) return { kind: 'contradiction', id: x };
  const k = knowledge(s);
  const eyes = [...ep.eyes].sort((a, b) => a.order - b.order).filter((e) => s.openedEyes.includes(e.id));
  const fresh = eyes.find((e) => e.cuts.some((id) => !s.viewedCuts.includes(id) && cutAvailability(ep, k, id) === 'viewable'));
  return { kind: 'observe', eyeId: (fresh ?? eyes[0])?.id };
}

/** 그날 고정률 NN% — 복원 뒤엔 100 */
export function selectFixRate(ep: Episode, s: PersistedState) {
  const r = fixRate(ep, s.rewrite.results, s.rewrite.lines);
  return s.restored ? { ...r, fixed: r.total, pct: 100 } : r;
}

// ── 홈 ───────────────────────────────────────────────────────────
export type HomeButton = 'memories' | 'rewrite' | 'restored';

export function selectHome(ep: Episode, s: PersistedState) {
  const sum = resumeSummary(ep, s);
  const buttons: HomeButton[] = ['memories'];
  if (rewriteAvailable(ep, s) && !s.restored) buttons.push('rewrite');
  if (s.restored) buttons.push('restored');
  return {
    clock: s.clock,
    card: homeView(ep.home, world(s)),
    eyes: selectEyes(ep, s),
    buttons,
    resume: { eyesOpen: sum.eyesOpen, contradictionsLeft: sum.contradictionsLeft },
    unread: messengerView(s.messenger, 0, s.restored).unread,
    started: s.started,
    /** 지금 에피소드(제목·쓰는 동사 — UI 가 찾기·방 버튼을 감출지 정한다) */
    episode: { id: ep.id, title: ep.title, verbs: ep.verbs },
    /** 끝났으면 다음 에피소드(다리 연출 뒤 startEpisode(next)) */
    nextEpisode: s.epilogueDone && ep.next ? ep.next : null,
    /** 「이름 붙이기 n/m」 */
    tags: selectTagProgress(ep, s),
    /** 그날 고정률 */
    fixRate: selectFixRate(ep, s),
    /** 고정률 계기를 보일까: 첫 에피소드는 역사 고정을 열 수 있을 때부터(그 전엔 「고정」이 무엇인지 모른다 — QA_STORY_R2 N7) */
    showFixRate: ep.order > 0 || rewriteAvailable(ep, s) || s.restored,
    /** 다음 할 일 = 역사 고정(주요 버튼이 그쪽으로 바뀐다) */
    rewriteReady: rewriteAvailable(ep, s) && !s.restored,
    /** 다음 할 일 하나(주요 버튼) */
    next: selectNextTask(ep, s),
  };
}

// ── 컷 ───────────────────────────────────────────────────────────
export interface FigureView {
  figureId: Id;
  label: string;
  named: boolean;
  anonymous: boolean;
  /** 이름 붙이기를 시작할 수 있다 */
  tappable: boolean;
  seatId: Id;
  pose: string;
  visibleTraits: string[];
}

export interface BubbleView {
  lineId: Id;
  text: string;
  garbled: boolean;
  speaker: string;
  volume: 'whisper' | 'talk' | 'read';
  terms: string[];
  glosses: Gloss[];
  /** 플레이 중엔 출처 배지 없음 — 복원 뒤 열람 모드에서만 */
  provenance?: string;
  sources?: SourceRef[];
}

export interface CutView {
  id: Id;
  eyeId: Id;
  n: number;
  time: Hhmm;
  availability: CutAvailability;
  alt: string;
  figures: FigureView[];
  bubbles: BubbleView[];
  details: { id: Id; label: string; terms: string[] }[];
  /** 닫힌 눈의 안 본 컷 */
  lostText?: string;
}

function figureLabel(ep: Episode, s: PersistedState, figureId: Id): { label: string; named: boolean } {
  const I = idx(ep);
  const named = s.named[figureId];
  if (named) return { label: I.card.get(named)?.name ?? '?', named: true };
  const rl = figureRestoredLabel(ep, figureId, world(s));
  if (rl) return { label: rl, named: false };
  return { label: I.figure.get(figureId)?.label ?? '?', named: false };
}

export function selectCut(ep: Episode, s: PersistedState, cutId: Id): CutView | null {
  const I = idx(ep);
  const c = I.cut.get(cutId);
  if (!c) return null;
  const av = cutAvailability(ep, knowledge(s), cutId);
  const base = { id: c.id, eyeId: c.eyeId, n: c.n, time: c.time, availability: av };
  if (av === 'lost' || av === 'locked')
    return { ...base, alt: '', figures: [], bubbles: [], details: [], ...(av === 'lost' ? { lostText: '볼 수 없다 — 이 사람의 그날 기록이 지워졌다' } : {}) };
  const showProv = s.restored && s.settings.showProvenance;
  return {
    ...base,
    alt: c.alt,
    figures: c.figures.map((f) => {
      const fig = I.figure.get(f.figureId)!;
      const l = figureLabel(ep, s, f.figureId);
      return {
        figureId: f.figureId,
        label: l.label,
        named: l.named,
        anonymous: !!fig.anonymous,
        tappable: !l.named && !s.restored && !fig.inert,
        seatId: f.seatId,
        pose: f.pose,
        visibleTraits: f.visibleTraits,
      };
    }),
    bubbles: c.heard.map((h) => {
      const l = I.line.get(h.lineId)!;
      let speaker: string;
      if ('groupId' in l.speaker) {
        const gid = l.speaker.groupId;
        const g = ep.groups.find((x) => x.id === gid)!;
        speaker = s.restored ? g.restoredLabel : g.label;
      } else speaker = figureLabel(ep, s, l.speaker.figureId).label;
      return {
        lineId: l.id,
        text: h.clarity === 'garbled' ? (h.garbledText ?? '……') : l.text,
        garbled: h.clarity === 'garbled',
        speaker,
        volume: l.volume,
        terms: h.clarity === 'garbled' ? [] : (l.terms ?? []),
        glosses: h.clarity === 'garbled' ? [] : (l.glosses ?? []),
        ...(showProv ? { provenance: l.provenance, sources: l.sources } : {}),
      };
    }),
    details: c.details.map((d) => {
      const det = I.detail.get(d)!;
      return { id: det.id, label: det.label, terms: det.terms ?? [] };
    }),
  };
}

export function selectViewer(ep: Episode, s: PersistedState) {
  const v = s.viewer;
  if (!v) return null;
  const eye = idx(ep).eye.get(v.eyeId)!;
  const cutId = eye.cuts[v.index];
  return {
    eyeId: v.eyeId,
    eyeLabel: eyeLabel(ep, knowledge(s), eye),
    index: v.index,
    total: eye.cuts.length,
    cut: selectCut(ep, s, cutId),
    /** 아래 점(●○○○○): 본 컷 */
    dots: eye.cuts.map((id) => ({ cutId: id, viewed: s.viewedCuts.includes(id), current: id === cutId })),
    eyes: selectEyes(ep, s),
    canOpenRoom: roomUnlocked(ep, s),
    /** 「이름 붙이기 n/m」 */
    tags: selectTagProgress(ep, s),
    /** 다음 할 일 = 역사 고정(아래 주요 버튼이 「역사 고정 ›」 로) */
    rewriteReady: rewriteAvailable(ep, s) && !s.restored,
  };
}

// ── 이름 붙이기 시트 ─────────────────────────────────────────────
/**
 * 시트: ① 카드 → ② 근거(들은 말·본 것만 — 카드 줄은 근거가 아니다). evidence 는 카드를 고른 뒤에만(옛 UI 호환),
 * evidenceAll 은 늘. roomLink = 「이 시각, 그날의 방」(방이 열릴 수 있을 때) → openRoomAtCut(cutId).
 * searchSeed = 이 컷에서 들은 밑줄 낱말(「찾기로 더」를 미리 채운다) → searchFromTag().
 */
export function selectTagSheet(ep: Episode, s: PersistedState, cutId: Id, figureId: Id, cardId?: Id) {
  const I = idx(ep);
  const k = knowledge(s);
  const all = (evidenceOptions(ep, k, { cutId, figureId }) as EvidenceOption[]).map((e) => {
    const l = I.line.get(e.id);
    return l?.glosses ? { ...e, text: glossInline(e.text, l.glosses) } : e;
  });
  const cut = I.cut.get(cutId);
  return {
    figure: figureLabel(ep, s, figureId),
    // 작은 카드 = 이름(한자)만. 생몰도 타일에 두지 않는다 — 생몰이 있는 카드가 드물어(Ep1 은 이극돈뿐) 타일 모양이 답을 흘린다
    // (QA_FUN_R3 R3-4). 생몰과 판정에 쓰이는 사실 줄은 「이 카드 펼쳐 보기」 안에. 검증 안 된 생몰은 채우지 않는다(규칙 1).
    // 순서는 이름순(core/tag cardOrder) — 이 방의 카드를 앞에 모으지 않는다
    cards: cardOrder(ep, k).map((id) => {
      const c = I.card.get(id)!;
      return { id, name: c.name, hanja: c.hanja };
    }),
    selectedCard: cardId,
    evidence: cardId ? all : [],
    evidenceAll: all,
    roomLink: roomUnlocked(ep, s) && cut && s.viewedCuts.includes(cutId) ? { cutId, time: cut.time, label: '이 시각, 그날의 방' } : null,
    searchSeed: ep.verbs.search ? selectSearchSeed(ep, s, cutId) : [],
  };
}

/** 「찾기」 미리 채울 낱말: 그 컷(없으면 지금 보는 컷)에서 또렷이 들은 말·본 것의 밑줄 낱말 */
export function selectSearchSeed(ep: Episode, s: PersistedState, cutId?: Id): string[] {
  const I = idx(ep);
  const id = cutId ?? (s.viewer ? I.eye.get(s.viewer.eyeId)?.cuts[s.viewer.index] : undefined);
  const c = id ? I.cut.get(id) : undefined;
  if (!c || !s.viewedCuts.includes(c.id)) return [];
  const out: string[] = [];
  for (const h of c.heard) if (h.clarity === 'clear') for (const t of I.line.get(h.lineId)?.terms ?? []) if (!out.includes(t)) out.push(t);
  for (const d of c.details) for (const t of I.detail.get(d)?.terms ?? []) if (!out.includes(t)) out.push(t);
  return out;
}

// ── 인물 카드 ────────────────────────────────────────────────────
export interface CardView {
  id: Id;
  name: string;
  hanja: string;
  lifespan?: string;
  /** linkedBy: 이 줄에 먹선을 그은 근거(성공한 태그) · links: 줄 안의 낱말 링크(탭 → followFactLink) */
  facts: { id: Id; text: string; plain?: string; source: SourceRef; linkedBy?: Id; links: (FactLink & { found: boolean })[] }[];
  altered: AlteredView[];
  eyeLine: string;
  eyeExtra: { text: string; source: SourceRef }[];
  roomAnchored: boolean;
}

export function selectCard(ep: Episode, s: PersistedState, cardId: Id): CardView | null {
  const I = idx(ep);
  const c = I.card.get(cardId);
  if (!c || !s.cardsFound.includes(cardId)) return null;
  const k = knowledge(s);
  let eyeLine = '관측: 아직 모름';
  let eyeExtra: CardView['eyeExtra'] = [];
  if (c.eye.never) {
    eyeLine = `관측: 불가 — ${c.eye.never.reason}`;
    if (s.restored) eyeExtra = c.eye.never.restoredLines ?? [];
  } else if (c.eye.eyeId) {
    const e = I.eye.get(c.eye.eyeId)!;
    const st = eyeState(ep, k, e);
    if (st === 'closed') eyeLine = '관측: 끊김';
    else if (st === 'open' && ownerKnown(ep, k, e)) eyeLine = '관측: 가능';
  }
  return {
    id: c.id,
    name: c.name,
    hanja: c.hanja,
    lifespan: c.lifespan,
    facts: visibleFacts(c, world(s)).map((f) => ({
      id: f.id,
      text: f.text,
      ...(f.plain ? { plain: f.plain } : {}),
      source: f.source,
      ...(s.factLinks[f.id] ? { linkedBy: s.factLinks[f.id] } : {}),
      links: (f.links ?? []).map((l) => ({ ...l, found: s.cardsFound.includes(l.cardId) })),
    })),
    altered: (c.altered ?? []).map((a) => alteredView(a, world(s))),
    eyeLine,
    eyeExtra,
    roomAnchored: c.roomAnchored,
  };
}

// ── 그날의 방 ────────────────────────────────────────────────────
export interface RoomMarker {
  /** 등장 키들(같은 사람으로 이어졌으면 여럿) */
  keys: string[];
  posId: Id;
  /** 자리 좌표(칸) */
  x: number;
  y: number;
  /** 표시끼리 손가락 44px 이 겹치지 않게 벌린 간격(칸) — 그림에서만(같은 자리의 잇지 않은 표시, 가까운 자리의 표시) */
  ox: number;
  oy: number;
  /** 성 한 글자 · 「?」 · (복원 뒤) 짝 이름 */
  label: string;
  /** 서로 다른 관측의 표시가 같은 사람으로 이어졌다 */
  merged: boolean;
  /** 이어진 관측 수 */
  count: number;
  cutIds: Id[];
  /** 이 표시가 나온 관측(눈) */
  eyeIds: Id[];
  /** 눈의 주인 자신(그 관측의 자리) */
  owner: boolean;
  /** 이 표시의 사람을 태그할 수 있는 컷 속 figure(있으면) */
  figure?: { cutId: Id; figureId: Id };
  kind: 'person' | 'mention';
}

/**
 * 표시 중심 사이의 최소 간격(칸). 도면 1칸 = 27 단위, 360 폭 도면(약 328px)에서 1칸 ≈ 27px → 1.7칸 ≈ 46px:
 * 탭 영역(지름 44 단위)이 서로 겹치지 않는다(QA_UX ux-04).
 */
export const MARKER_SPREAD = 1.7;

/** 표시를 서로 MARKER_SPREAD 이상 벌린다(결정적: 같은 자리는 옆으로 나란히, 그다음 가까운 쌍을 밀어낸다). 방 안에 머문다 */
function spreadMarkers(ms: RoomMarker[], w: number, h: number) {
  const D = MARKER_SPREAD;
  const byPos = new Map<Id, RoomMarker[]>();
  for (const m of ms) byPos.set(m.posId, [...(byPos.get(m.posId) ?? []), m]);
  for (const list of byPos.values()) list.forEach((m, i) => (m.ox = list.length > 1 ? (i - (list.length - 1) / 2) * D : 0));
  const clamp = (m: RoomMarker) => {
    m.ox = Math.min(w - 0.7, Math.max(0.7, m.x + m.ox)) - m.x;
    m.oy = Math.min(h - 0.7, Math.max(0.7, m.y + m.oy)) - m.y;
  };
  for (let it = 0; it < 40; it++) {
    let moved = false;
    for (let i = 0; i < ms.length; i++)
      for (let j = i + 1; j < ms.length; j++) {
        const a = ms[i]!;
        const b = ms[j]!;
        let dx = b.x + b.ox - (a.x + a.ox);
        let dy = b.y + b.oy - (a.y + a.oy);
        let d = Math.hypot(dx, dy);
        if (d >= D - 1e-6) continue;
        if (d < 1e-6) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const push = (D - d) / 2 + 0.01;
        a.ox -= (dx / d) * push;
        a.oy -= (dy / d) * push;
        b.ox += (dx / d) * push;
        b.oy += (dy / d) * push;
        clamp(a);
        clamp(b);
        moved = true;
      }
    if (!moved) break;
  }
  for (const m of ms) {
    m.ox = Math.round(m.ox * 100) / 100;
    m.oy = Math.round(m.oy * 100) / 100;
  }
}

export function selectRoom(ep: Episode, s: PersistedState, time?: Hhmm) {
  const I = idx(ep);
  const k = knowledge(s);
  const chips = timeChips(ep, s.viewedCuts);
  const t = time ? (chipFor(ep, s.viewedCuts, time) ?? time) : (s.roomTime ?? chips[chips.length - 1]);
  const all = t ? appearances(ep, s.viewedCuts).filter((a) => sameMoment(a.time, t)) : [];
  // 「들은 말」(다른 자리의 사람을 가리키는 말)은 플레이어가 도면에 놓아야 그 자리에 표시가 생긴다(복원 뒤엔 보상으로 모두)
  const apps = all.filter((a) => mentionShown(s, a.key));
  const heard = all
    .filter((a): a is Extract<Appearance, { kind: 'mention' }> => a.kind === 'mention' && !mentionShown(s, a.key))
    .map((a) => ({ key: a.key, cutId: a.cutId, eyeId: a.eyeId, text: I.line.get(a.lineId)?.text ?? '' }));
  const byPos = new Map<Id, Appearance[]>();
  for (const a of apps) byPos.set(a.posId, [...(byPos.get(a.posId) ?? []), a]);
  const markers: RoomMarker[] = [];
  // 같은 사람 묶음(한 기억 안의 같은 사람 + 이어진 겹침) — 한 자리에서 묶음 하나 = 표시 하나
  const groups = personGroups(ep, k);
  for (const [posId, list] of byPos) {
    const p = posOf(ep.room, posId);
    const comps = new Map<string, Appearance[]>();
    for (const a of list) {
      const root = groups.get(a.key) ?? a.key;
      comps.set(root, [...(comps.get(root) ?? []), a]);
    }
    const parts = [...comps.values()];
    parts.forEach((g) => {
      let label = '?';
      for (const a of g) {
        if (a.kind === 'figure') {
          const n = s.named[a.figureId];
          if (n) label = (I.card.get(n)?.name ?? '?')[0];
          else if (s.restored) label = figureRestoredLabel(ep, a.figureId, world(s)) ?? label;
        } else if (a.kind === 'owner') {
          const e = I.eye.get(a.eyeId)!;
          if (ownerKnown(ep, k, e)) label = (I.card.get(e.personId)?.name ?? '?')[0];
        }
      }
      const fig = g.find((a): a is Extract<Appearance, { kind: 'figure' }> => a.kind === 'figure');
      const eyeIds = [...new Set(g.map((a) => a.eyeId))];
      markers.push({
        keys: g.map((a) => a.key),
        posId,
        x: p.x,
        y: p.y,
        ox: 0,
        oy: 0,
        label,
        merged: eyeIds.length > 1,
        count: eyeIds.length,
        cutIds: [...new Set(g.map((a) => a.cutId))],
        eyeIds,
        owner: g.some((a) => a.kind === 'owner'),
        ...(fig ? { figure: { cutId: fig.cutId, figureId: fig.figureId } } : {}),
        kind: g.every((a) => a.kind === 'mention') ? 'mention' : 'person',
      });
    });
  }
  spreadMarkers(markers, ep.room.w, ep.room.h);
  const eyes = [...ep.eyes]
    .filter((e) => e.seatId && (s.openedEyes.includes(e.id) || s.closedEyes.includes(e.id)))
    .map((e) => {
      const seat = posOf(ep.room, e.seatId!);
      const facing = ep.room.seats.find((x) => x.id === e.seatId)?.facingDeg ?? 0;
      return {
        eyeId: e.id,
        seatId: e.seatId!,
        x: seat.x,
        y: seat.y,
        facingDeg: facing,
        halfAngleDeg: ep.room.sight.halfAngleDeg,
        state: eyeState(ep, k, e),
        label: eyeLabel(ep, k, e),
        selected: s.viewer?.eyeId === e.id,
        /** 이 시각의 그 눈의 컷 */
        cutId: e.cuts.find((cid) => s.viewedCuts.includes(cid) && t && sameMoment(I.cut.get(cid)!.time, t)),
      };
    });
  return {
    unlocked: roomUnlocked(ep, s),
    w: ep.room.w,
    h: ep.room.h,
    walls: ep.room.walls,
    doors: ep.room.doors,
    screen: ep.room.screen,
    furniture: ep.room.furniture,
    chips,
    time: t ?? null,
    eyes,
    markers,
    /** 이 시각에 들은 말 중 다른 자리의 사람을 가리키는 것(아직 도면에 놓지 않음) — 칩을 고르고 자리를 탭해 놓는다 */
    heard,
    contradictions: selectContradictions(ep, s).filter((x) => x.status !== 'hidden'),
  };
}

// ── 모순 ─────────────────────────────────────────────────────────
export function selectContradictions(ep: Episode, s: PersistedState) {
  const k = knowledge(s);
  return ep.contradictions.map((x) => {
    const winner = s.resolved[x.id];
    return {
      id: x.id,
      status: winner ? ('resolved' as const) : s.revealed.includes(x.id) ? ('revealed' as const) : ('hidden' as const),
      claims: x.claims.map((cid) => {
        const c = claimById(ep, cid);
        return {
          id: cid,
          label: c.label,
          /** 이 주장이 칸에 넣는 값(역사 고정 칸에서 고른 값과 맞춰 판단을 미리 고른다) */
          value: c.value,
          held: claimHeld(ep, k, c),
          /** 이 말을 들은 컷(본 컷만) — 칩 밑 「들은 곳」. 자리와의 대응은 플레이어가 한다(판정 전 증인 자리를 밝히지 않는다) */
          heardIn: [...new Set(c.from.flatMap((e) => idx(ep).evidenceCuts.get(e) ?? []))].filter((cut) => s.viewedCuts.includes(cut)),
          lost: !!winner && winner !== cid,
          lostLabel: winner && winner !== cid ? x.loserLabel : undefined,
          lostNote: winner && winner !== cid ? x.loserNote : undefined,
        };
      }),
      buttons: x.buttons,
    };
  });
}

export function selectContradictionView(ep: Episode, s: PersistedState, id: Id) {
  const x = ep.contradictions.find((y) => y.id === id);
  if (!x || !s.revealed.includes(id)) return null;
  return {
    id,
    heading: '근거끼리 모순된다',
    resolved: !!s.resolved[id],
    /** 풀렸고, 틀린 시도가 없었다 — 도장 「단번에 풀림」(QA_FUN_R3 R3-1) */
    firstTry: !!s.resolved[id] && !s.fails[`contra:${id}`],
    buttons: x.claims.map((cid, i) => ({ claimId: cid, text: x.buttons[i] })),
    /** 근거 2칸: ① 판단(주장 하나) ② 근거(그날의 방의 자리 사실 하나). 두 칸이 차야 확인할 수 있다 */
    slots: 2 as const,
    judgements: x.claims.map((cid, i) => ({ claimId: cid, text: x.buttons[i] })),
    evidence: contradictionEvidence(ep, s, id),
    geometry: neutralGeometry(geometry(ep, knowledge(s), x)),
    /** 아직 판정할 수 없다(기다리는 문서가 오기 전 — Contradiction.resolvableWhen). 고르기는 된다 */
    waiting: !s.resolved[id] && !contradictionGateOpen(ep, s, x),
  };
}

/**
 * 모순 도면에 주는 기하: 판정 전에는 자리마다의 결론(또렷/흐림·셀 수 있음/가려짐)을 내보내지 않는다 —
 * 원(들림 반경)·시선·가림 빗금·자리·거리만. 결론은 플레이어가 그림에서 읽는다(규칙 2).
 */
export type NeutralGeometry = Omit<ContradictionGeometry, 'witnesses' | 'listeners'> & {
  witnesses: Omit<WitnessMark, 'status'>[];
  listeners: { key: string; x: number; y: number }[];
};
function neutralGeometry(g: ContradictionGeometry): NeutralGeometry {
  return {
    ...g,
    witnesses: g.witnesses.map(({ status: _s, ...w }) => w),
    listeners: g.listeners.map(({ status: _s, ...l }) => l),
  };
}


/**
 * 모순의 근거 칸에 고를 수 있는 자리 사실(지금 방에 보이는 눈마다 하나). 글은 데이터에서 계산한다 — 거리와 기준만 적고
 * 결론(안/밖, 가림)은 적지 않는다(플레이어가 도면에서 읽는다):
 * 들림 「홍귀달 자리 — 문 앞에서 9.2칸, 들림 반경 8칸」 / 보임 「윤효손 자리 — 봉하는 자리까지 4.4칸, 셀 수 있는 거리 5칸」.
 * 어느 것이 승패를 가르는지는 여기서 알려 주지 않는다(판정은 엔진).
 */
export function contradictionEvidence(ep: Episode, s: PersistedState, id: Id): { id: Id; eyeId: Id; text: string }[] {
  const x = ep.contradictions.find((y) => y.id === id);
  if (!x) return [];
  const I = idx(ep);
  const k = knowledge(s);
  const g = geometry(ep, k, x);
  const srcLabel = ep.room.points.find((p) => p.id === g.source.posId)?.label ?? ep.room.seats.find((p) => p.id === g.source.posId)?.label ?? '그 자리';
  const seen = new Set<Id>();
  const out: { id: Id; eyeId: Id; text: string }[] = [];
  for (const w of g.witnesses) {
    if (seen.has(w.eyeId)) continue;
    seen.add(w.eyeId);
    const eye = I.eye.get(w.eyeId)!;
    const who = ownerKnown(ep, k, eye) ? (I.card.get(eye.personId)?.name ?? '?') : eyeLabel(ep, k, eye);
    const text =
      g.kind === 'hearing'
        ? `${who} 자리 — ${srcLabel}에서 ${cellsText(w.distance, g.radius)}, 들림 반경 ${g.radius}칸`
        : `${who} 자리 — ${srcLabel}까지 ${cellsText(w.distance, g.detailRange)}, 셀 수 있는 거리 ${g.detailRange}칸`;
    out.push({ id: `${x.id}:${w.eyeId}`, eyeId: w.eyeId, text });
  }
  return out;
}

// ── 찾기 ─────────────────────────────────────────────────────────
export interface SearchResultView {
  kind: 'person' | 'record' | 'log';
  id: Id;
  title: string;
  subtitle: string;
  lines: string[];
  tag?: string;
}

export function resultView(ep: Episode, s: PersistedState, r: { kind: 'person' | 'record' | 'log'; id: Id }): SearchResultView | null {
  if (r.kind === 'person') {
    const c = selectCard(ep, s, r.id);
    if (!c) return null;
    return { kind: 'person', id: c.id, title: `${c.name} ${c.hanja}`, subtitle: c.lifespan ?? '', lines: [...c.altered.filter((a) => a.state !== 'erased').map((a) => a.text), c.eyeLine] };
  }
  if (r.kind === 'record') {
    const rec = ep.records.find((x) => x.id === r.id);
    if (!rec) return null;
    const lines = rec.inWorld && !s.restored ? rec.inWorld : rec.lines.map((l) => l.text);
    return { kind: 'record', id: rec.id, title: rec.title, subtitle: rec.lines[0]?.source.title ?? '', lines, ...(rec.tag ? { tag: rec.tag } : {}) };
  }
  const d = ep.docs.find((x) => x.id === r.id);
  if (!d) return null;
  return { kind: 'log', id: d.id, title: `${d.code} · ${d.when} · ${d.officer}`, subtitle: d.result, lines: [...d.fields.map((f) => `${f.label}: ${f.value}`), `소견: "${d.note}"`] };
}

export function selectSearch(ep: Episode, s: PersistedState) {
  const I = idx(ep);
  const terms: string[] = [];
  for (const cutId of s.viewedCuts) {
    const c = I.cut.get(cutId)!;
    for (const h of c.heard) if (h.clarity === 'clear') for (const t of I.line.get(h.lineId)?.terms ?? []) if (!terms.includes(t)) terms.push(t);
    for (const d of c.details) for (const t of I.detail.get(d)?.terms ?? []) if (!terms.includes(t)) terms.push(t);
  }
  const last: SearchLogEntry | undefined = s.searchLog[s.searchLog.length - 1];
  const teaser = s.epilogueDone ? resultView(ep, s, { kind: 'log', id: ep.epilogue.teaserDocId }) : null;
  return {
    terms,
    last: last ? { ...last, views: last.results.map((r) => resultView(ep, s, r)).filter((x): x is SearchResultView => !!x) } : null,
    log: s.searchLog,
    /** 예고: 찾기 결과 맨 아래 새 줄 */
    footer: teaser,
  };
}

export function selectRecord(ep: Episode, s: PersistedState, id: Id) {
  const rec = ep.records.find((x) => x.id === id);
  if (!rec || ((rec.afterRestore || rec.erasedBeforeRestore) && !s.restored)) return null;
  // 소실 세계의 줄(fictional): 복원 전에는 verified 줄 대신
  if (rec.inWorld && !s.restored) return { ...rec, provenance: 'fictional' as const, lines: rec.inWorld.map((text) => ({ text, source: rec.lines[0].source })) };
  return rec;
}

// ── 내 관측 로그 ─────────────────────────────────────────────────
export function selectLog(ep: Episode, s: PersistedState) {
  const I = idx(ep);
  const k = knowledge(s);
  return {
    cuts: s.viewedCuts.map((id) => {
      const c = I.cut.get(id)!;
      const e = I.eye.get(c.eyeId)!;
      return { cutId: id, eyeId: e.id, eyeLabel: eyeLabel(ep, k, e), time: c.time, closedEye: s.closedEyes.includes(e.id) };
    }),
    evidence: heldEvidence(ep, k).map((id) => ({ id, text: I.line.get(id)?.text ?? I.detail.get(id)?.label ?? '' })),
    witness: s.rewrite.lines
      .filter((l) => s.rewrite.results[l.id] === 'witness')
      .map((l) => ({ lineId: l.id, text: ep.pieces.find((p) => p.id === l.pieceId)?.label ?? '', note: ep.epilogue.witnessLogLabel })),
    docs: s.docs.map((d) => resultView(ep, s, { kind: 'log', id: d })).filter(Boolean) as SearchResultView[],
    searches: s.searchLog.map((e) => ({ clock: e.clock, query: e.query, status: e.status, text: e.status === 'no_article' ? '실록에 없음' : `${e.results.length}건` })),
  };
}

// ── 메신저 ───────────────────────────────────────────────────────
export function selectMessenger(ep: Episode, s: PersistedState, now: number): MessengerView & { canAsk: boolean } {
  return { ...messengerView(s.messenger, now, s.restored), canAsk: canAskHint(ep, s, now) };
}

// ── 기록 다시 쓰기 ───────────────────────────────────────────────
export interface RewriteLineView {
  id: Id;
  pieceId: Id;
  label: string;
  witnessOnly: boolean;
  /** 미리 놓인 줄(빼기 없음) */
  preplaced: boolean;
  render: LineRender;
  result?: LineResult;
  resultText?: string;
  slots: { kind: SlotKind; value?: string; contested?: Id }[];
}

const RESULT_TEXT: Record<LineResult, string> = {
  restored: '',
  witness: '실록이 적지 않은 일 — 내가 본 것에만 남는다',
  not_recorded: '흐릿함 — 그날에 붙지 않았다',
  incomplete: '빈 칸이 있다',
};

export function selectRewrite(ep: Episode, s: PersistedState) {
  const k = knowledge(s);
  const cs = { revealed: s.revealed, resolved: s.resolved, slotsOpened: s.slotsOpened };
  const order = (pid: Id) => ep.pieces.find((p) => p.id === pid)?.time ?? '99:99';
  const lines: RewriteLineView[] = [...s.rewrite.lines]
    .sort((a, b) => order(a.pieceId).localeCompare(order(b.pieceId)))
    .map((l) => {
      const piece = ep.pieces.find((p) => p.id === l.pieceId)!;
      const sent = sentenceOf(ep, piece.sentenceId);
      const result = s.rewrite.results[l.id];
      return {
        id: l.id,
        pieceId: l.pieceId,
        label: pieceLabel(ep, piece, cs),
        witnessOnly: !!piece.witnessOnly,
        preplaced: isPreplacedPiece(ep, l.pieceId),
        render: renderLine(ep, l, result),
        ...(result ? { result, resultText: RESULT_TEXT[result] } : {}),
        slots: sent
          ? sentenceSlots(sent).map((sl) => {
              const opt = slotOptions(ep, k, sl.kind, cs).find((o) => o.value === l.values[sl.kind]);
              return { kind: sl.kind, value: l.values[sl.kind], ...(opt?.contested ? { contested: opt.contested } : {}) };
            })
          : [],
      };
    });
  const placed = new Set(s.rewrite.lines.map((l) => l.pieceId));
  return {
    available: rewriteAvailable(ep, s),
    open: s.rewrite.open,
    code: ep.home.code,
    lines,
    pieces: availablePieces(ep, k)
      .filter((p) => !placed.has(p.id))
      .map((p) => ({ id: p.id, label: pieceLabel(ep, p, cs), time: p.time, witnessOnly: !!p.witnessOnly })),
    complete: s.rewrite.complete,
    restored: s.restored,
    submits: s.rewrite.submits,
    /** 그날 고정률(꼭 돌아와야 할 문장 기준, 판정 뒤에만 오른다) */
    fixRate: selectFixRate(ep, s),
  };
}

export function selectSlotOptions(ep: Episode, s: PersistedState, kind: SlotKind): SlotOption[] {
  return slotOptions(ep, knowledge(s), kind, { revealed: s.revealed, resolved: s.resolved, slotsOpened: s.slotsOpened });
}

// ── 복원 ─────────────────────────────────────────────────────────
/**
 * 작은 집계(복원 카드): 단번에 맞힌 이름 n/m(꼭 붙일 이름 중 틀린 시도 없이 맞힌 것) · 고정한 선택 줄 n · 증인 줄 n.
 * 벌은 없다 — 읽고 맞힌 것에 대한 작은 보상(QA_FUN_R2 N6). 그 에피소드에 없는 갈래(선택 줄·증인 줄)는 undefined.
 */
export function selectTally(ep: Episode, s: PersistedState) {
  const req = ep.requiredTags ?? ep.tags.map((t) => t.id);
  const rules = ep.tags.filter((t) => req.includes(t.id));
  const firstTry = rules.filter((t) => s.named[t.figureId] === t.personId && firstTryOk(s, t.figureId)).length;
  const optionalIds = ep.sentences.filter((x) => !ep.requiredSentences.includes(x.id)).map((x) => x.id);
  const pieceOf = (pid: Id) => ep.pieces.find((p) => p.id === pid);
  const hasOptional = ep.pieces.some((p) => p.sentenceId && optionalIds.includes(p.sentenceId));
  const hasWitness = ep.pieces.some((p) => p.witnessOnly);
  const optional = s.rewrite.lines.filter((l) => s.rewrite.results[l.id] === 'restored' && optionalIds.includes(pieceOf(l.pieceId)?.sentenceId ?? '')).length;
  const witness = s.rewrite.lines.filter((l) => s.rewrite.results[l.id] === 'witness').length;
  return {
    firstTry,
    total: rules.length,
    ...(hasOptional ? { optional } : {}),
    ...(hasWitness ? { witness } : {}),
  };
}

export function selectRestoration(ep: Episode, s: PersistedState) {
  if (!s.restored) return null;
  const written = s.rewrite.lines
    .filter((l) => s.rewrite.results[l.id] === 'restored')
    .map((l) => ep.pieces.find((p) => p.id === l.pieceId)?.sentenceId)
    .filter((x): x is Id => !!x);
  const before = homeView(ep.home, { restored: false, closures: s.closures });
  const after = homeView(ep.home, world(s));
  const cards = ep.cards
    .filter((c) => (c.altered ?? []).length)
    .map((c) => ({
      cardId: c.id,
      name: c.name,
      changes: (c.altered ?? []).map((a) => ({
        label: a.label,
        before: alteredView(a, { restored: false, closures: s.closures }),
        /** 지워졌던 줄(06:00 에 사라짐)도 카드 원문 꼴로 보인다(QA_STORY_R2 N10) */
        display: a.display,
        after: alteredView(a, world(s)),
      })),
    }));
  const messages = s.messenger.log.filter((m) => m.restored).map((m) => ({ id: m.id, from: m.from, before: m.text, after: m.restored! }));
  const pair = ep.figures.find((f) => f.revealOnRestore)?.revealOnRestore;
  const kim = ep.cards.find((c) => c.eye.never);
  return {
    step: ep.restoreSteps[s.restoreStep],
    stepIndex: s.restoreStep,
    steps: ep.restoreSteps,
    article: { citation: ep.article.citation, source: ep.article.source, parts: articleView(ep, written) as ArticlePartView[] },
    home: { before, after },
    cards,
    messages,
    room: pair ? { pairLabel: pair.pairLabel, source: pair.source } : null,
    neverEye: kim ? { name: kim.name, reason: kim.eye.never!.reason, lines: kim.eye.never!.restoredLines ?? [] } : null,
    /** 관측 로그만은 그대로(부재의 증거) */
    absence: s.searchLog.filter((e) => e.status === 'no_article').map((e) => ({ clock: e.clock, query: e.query, text: '실록에 없음' })),
    witnessLines: selectLog(ep, s).witness,
    monologue: ep.epilogue.monologue,
    teaser: resultView(ep, s, { kind: 'log', id: ep.epilogue.teaserDocId }),
    asides: ep.records.filter((r) => r.aside).map((r) => ({ id: r.id, when: r.aside!, title: r.title, lines: r.lines, tag: r.tag, ...(r.inWorld ? { before: r.inWorld } : {}) })),
    epilogueDone: s.epilogueDone,
    tally: selectTally(ep, s),
    /** 끝나면 열리는 다음 에피소드 */
    next: ep.next ?? null,
  };
}

export function selectAboutScene(ep: Episode) {
  return ep.epilogue.aboutScene;
}

/** 안 읽은 메시지 수(아래 막대의 메신저 칸 점) */
export function selectUnread(_ep: Episode, s: PersistedState): number {
  return messengerView(s.messenger, 0, s.restored).unread;
}
