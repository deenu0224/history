/**
 * 컷 뷰어 — 그 사람의 기억. 고정 컷 3~5장을 밀어 넘긴다(확대·이동·시간 막대 없음).
 * 사람은 탭하면 이름 붙이기 시트가 열린다(listed 인 사람만). 연도·시대·장소·인물은 이름을 붙이기 전엔 알려주지 않는다.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GLOSSARY } from '@/data/glossary';
import { currentEpisode, useGameStore } from '@/store/gameStore';
import { useEpisode, useView } from '@/store/hooks';
import { selectContradictions, selectCut, selectViewer, type CutView } from '@/store/selectors';
import { fx } from '../lib/fx';
import { cutNo, VOLUME_LABEL } from '../lib/format';
import { cutSrc, preloadCut, useManifest, type CutEntry } from '../lib/manifest';
import { glossInline, richSegments } from '../lib/text';
import { EyeRow } from '../parts/EyeRow';
import { IDoc, IPlan, IWarn } from '../parts/icons';
import { NavBar } from '../parts/NavBar';
import { EDGE_PX } from '../lib/nav';
import { useUi } from '../uiStore';

const CUT_W = 390;
const CUT_H = 520;

function useBox(ref: React.RefObject<HTMLElement | null>) {
  const [box, setBox] = useState({ pw: 0, ph: 0, w: CUT_W, h: CUT_H });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => {
      const pw = el.clientWidth;
      const ph = el.clientHeight;
      if (!pw || !ph) return;
      const k = Math.min(pw / CUT_W, ph / CUT_H);
      setBox({ pw, ph, w: Math.round(CUT_W * k), h: Math.round(CUT_H * k) });
    };
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

// ── 말풍선: 컷에 들어오면 차례로 나타난다(글자 수 × 35ms). 컷 빈 곳을 탭하면 즉시 다음 ──
// 한 번에 하나만(가장 최근 말), 세 줄까지 — 넘치면 「…더 보기」. 컷 아래에 자리가 있으면 컷 밖(아래)에,
// 없으면 사람 상자를 덜 가리는 쪽(위/아래)에 놓는다. 말풍선 자체는 탭을 통과시킨다(밑의 사람이 눌린다).
export type BubblePlace = 'below' | 'top' | 'bottom';
function Bubbles({ cut, active, hidden, place, lines, tap }: { cut: CutView; active: boolean; hidden: boolean; place: BubblePlace; lines: number; tap: number }) {
  const ep = useEpisode();
  const canSearch = ep.verbs.search;
  const [shown, setShown] = useState(0);
  const [open, setOpen] = useState<{ line: string; term: string; gloss?: string } | null>(null);
  const [more, setMore] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const txtRef = useRef<HTMLDivElement>(null);
  const reduce = useGameStore((s) => s.settings.reduceMotion);
  const total = cut.bubbles.length;

  useEffect(() => {
    setOpen(null);
    setMore(null);
    if (!active) {
      setShown(0);
      return;
    }
    if (reduce) {
      setShown(total);
      return;
    }
    setShown(0);
    let live = true;
    let n = 0;
    let tm: ReturnType<typeof setTimeout>;
    const step = () => {
      if (!live || n >= total) return;
      n += 1;
      setShown(n);
      if (n < total) tm = setTimeout(step, Math.max(900, cut.bubbles[n - 1]!.text.length * 35));
    };
    tm = setTimeout(step, 450);
    return () => {
      live = false;
      clearTimeout(tm);
    };
  }, [active, cut.id, total, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  // 컷 빈 곳을 탭하면 다음 말
  useEffect(() => {
    if (tap) setShown((n) => Math.min(total, n + 1));
  }, [tap]); // eslint-disable-line react-hooks/exhaustive-deps

  const b = shown > 0 ? cut.bubbles[shown - 1] : undefined;
  useLayoutEffect(() => {
    const el = txtRef.current;
    setOver(!!el && el.scrollHeight > el.clientHeight + 2);
  }, [b?.lineId, lines, place]);

  if (!active || !total || hidden || !b) return null;
  // 풀이: 이 말의 풀이 + 에피소드 풀이 사전(국역 인용 속 어려운 말). 찾기 낱말은 데이터가 정한 것만
  const gl = [...b.glosses, ...(ep.glossary ?? []).filter((x) => !b.glosses.some((y) => y.term === x.term))];
  const segs = richSegments(glossInline(b.text, b.glosses), canSearch ? b.terms : [], gl);
  const who = b.speaker && b.speaker !== '?' && !/\(/.test(b.speaker) ? `${b.speaker} · ${VOLUME_LABEL[b.volume]}` : VOLUME_LABEL[b.volume];
  const expanded = more === b.lineId;
  return (
    <div className={`bubbles ${place}`} aria-live="polite" data-place={place}>
      <div key={b.lineId} className={`bubble${b.garbled ? ' garbled' : ''}`} data-testid="bubble" data-line={b.lineId}>
        <div className="who">{b.garbled ? `${who} · 흐릿하게 들림` : who}</div>
        <div ref={txtRef} className={`txt${expanded ? '' : ' clamp'}`} style={expanded ? undefined : { WebkitLineClamp: lines }}>
          {segs.map((sg, i) =>
            sg.term || sg.gloss ? (
              <button
                key={i}
                className={sg.term ? 'term' : 'gloss'}
                style={{ font: 'inherit', color: 'inherit', display: 'inline' }}
                onClick={(e) => {
                  e.stopPropagation();
                  const w = sg.term ?? sg.gloss!;
                  const g = gl.find((x) => x.term === w) ?? GLOSSARY.find((x) => x.term === w);
                  setOpen(open?.line === b.lineId && open.term === w ? null : { line: b.lineId, term: w, gloss: g?.gloss });
                }}
              >
                {sg.text}
              </button>
            ) : (
              <span key={i}>{sg.text}</span>
            ),
          )}
        </div>
        {over || expanded ? (
          <button
            className="bmore"
            data-testid="bubble-more"
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              setMore(expanded ? null : b.lineId);
            }}
          >
            {expanded ? '접기' : '…더 보기'}
          </button>
        ) : null}
        {open?.line === b.lineId ? (
          <div className="gl">
            {open.gloss ? <span>{open.gloss} </span> : null}
            {canSearch && b.terms.includes(open.term) ? (
              <button
                style={{ color: '#2d5f7a', textDecoration: 'underline', minHeight: 30 }}
                onClick={(e) => {
                  e.stopPropagation();
                  useUi.getState().setSearchSeed(open.term);
                  useUi.getState().push('search');
                }}
              >
                「{open.term}」 찾기 ›
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** 컷 위에 말풍선을 놓을 때: 위·아래 띠 중 사람·세부 상자(이름표 포함)를 덜 가리는 쪽 */
function pickPlace(entry: CutEntry | undefined, h: number): 'top' | 'bottom' {
  if (!entry || !h) return 'bottom';
  const band = Math.min(0.32, 128 / h);
  const chip = 32 / h;
  const boxes = [...entry.figures.filter((f) => f.listed), ...(entry.details ?? [])];
  const cover = (lo: number, hi: number) => boxes.reduce((a, b) => a + Math.max(0, Math.min(hi, b.y + b.h) - Math.max(lo, b.y - chip)) * b.w, 0);
  return cover(0, band) < cover(1 - band, 1) ? 'top' : 'bottom';
}

// ── 컷 한 장 ──
function CutSlide({ cutId, entry, box, active, eyeClosed, selected }: { cutId: string; entry: CutEntry | undefined; box: { pw: number; ph: number; w: number; h: number }; active: boolean; eyeClosed: boolean; selected: string | null }) {
  const cut = useView((ep, s) => selectCut(ep, s, cutId), [cutId]);
  const freshName = useUi((s) => s.freshName);
  const epId = useGameStore((s) => s.episodeId);
  const canSearch = useEpisode().verbs.search;
  const [detail, setDetail] = useState<string | null>(null);
  const [tap, setTap] = useState(0);
  useEffect(() => setDetail(null), [cutId, active]);
  if (!cut) return null;
  if (cut.availability === 'lost')
    return (
      <div className="vslide" data-cut={cutId} data-avail="lost">
        <div className="lostpane" style={{ width: box.w, height: box.h }}>
          <div className="box">
            <div style={{ width: 28, height: 2, background: 'var(--teal)', margin: '0 auto 14px' }} />
            <div className="t-h" data-testid="lost-text">
              볼 수 없다
            </div>
            <p className="t-b" style={{ margin: '6px 0 0', color: '#8fb7b3' }}>
              이 사람의 그날 기록이 지워졌다
            </p>
          </div>
        </div>
      </div>
    );
  if (cut.availability === 'locked') return <div className="vslide" data-cut={cutId} data-avail="locked" />;

  const hasErased = !!entry?.files.erased;
  const memory = cutSrc(entry, cutId, 'memory', epId);
  const erased = cutSrc(entry, cutId, 'erased', epId);
  const closedLook = eyeClosed && hasErased;
  const minTouch = 44;
  const hit = (b: { x: number; y: number; w: number; h: number }) => {
    let x = b.x * box.w;
    let y = b.y * box.h;
    let w = b.w * box.w;
    let h = b.h * box.h;
    if (w < minTouch) {
      x -= (minTouch - w) / 2;
      w = minTouch;
    }
    if (h < minTouch) {
      y -= (minTouch - h) / 2;
      h = minTouch;
    }
    x = Math.max(0, Math.min(box.w - w, x));
    y = Math.max(0, Math.min(box.h - h, y));
    return { left: x, top: y, width: w, height: h };
  };
  // 겹치면 작은 상자가 위(큰 가구 위의 사람, 사람 앞의 두루마리 머리글 모두 눌린다)
  const zOf = new Map<string, number>(
    [...(entry?.figures ?? []), ...(entry?.details ?? [])]
      .sort((a, b) => b.w * b.h - a.w * a.h)
      .map((b, i) => [b.id, 10 + i] as [string, number]),
  );
  const openDetail = detail ? cut.details.find((d) => d.id === detail) : undefined;
  // 컷 아래 남는 자리(세로 화면에서 컷은 위에 붙는다) — 말풍선이 들어가면 컷을 가리지 않는다
  const room = box.ph - box.h;
  const below = room >= 100;
  const place: BubblePlace = below ? 'below' : pickPlace(entry, box.h);
  const lines = below && room < 126 ? 2 : 3;
  const bubbles = <Bubbles cut={cut} active={active} hidden={!!openDetail} place={place} lines={lines} tap={tap} />;
  return (
    <div className="vslide" data-cut={cutId} data-avail={cut.availability} onClick={(e) => e.target === e.currentTarget && setTap((t) => t + 1)}>
      <div
        className={`cutbox${eyeClosed ? ' erased' : ''}`}
        style={{ width: box.w, height: box.h }}
        role="img"
        aria-label={cut.alt}
        onClick={(e) => e.target === e.currentTarget && setTap((t) => t + 1)}
      >
        <img className="cutimg" {...(closedLook ? erased : memory)} sizes={`${box.w}px`} alt="" draggable={false} data-testid={`cut-img-${cutId}`} />
        {closedLook ? <img className="cutimg top" {...memory} sizes={`${box.w}px`} alt="" draggable={false} /> : null}
        <div className="cutvig" />
        {(entry?.figures ?? []).map((b) => {
          const f = cut.figures.find((x) => x.figureId === b.id);
          if (!f) return null;
          const interactive = b.listed && (f.tappable || f.named);
          if (!interactive && !f.named) return null;
          let x = b.x * box.w;
          let y = b.y * box.h;
          let w = b.w * box.w;
          let h = b.h * box.h;
          if (w < minTouch) {
            x -= (minTouch - w) / 2;
            w = minTouch;
          }
          if (h < minTouch) {
            y -= (minTouch - h) / 2;
            h = minTouch;
          }
          x = Math.max(0, Math.min(box.w - w, x));
          y = Math.max(0, Math.min(box.h - h, y));
          const sel = selected === b.id;
          const label = f.named ? f.label : '?';
          return (
            <button
              key={b.id}
              className={`figure ${f.named ? 'named' : 'unnamed'}${sel ? ' sel' : ''}${f.named && freshName === b.id ? ' fresh' : ''}`}
              style={{ left: x, top: y, width: w, height: h, zIndex: zOf.get(b.id) }}
              data-figure={b.id}
              data-named={f.named ? 'true' : 'false'}
              aria-label={f.named ? `${f.label}, 이름 붙인 사람` : `모르는 사람, ${f.label}`}
              disabled={!interactive}
              onClick={() => {
                const g = useGameStore.getState();
                if (f.named) {
                  const cardId = g.named[b.id];
                  if (cardId && g.openCard(cardId)) useUi.getState().openCard(cardId);
                } else {
                  fx('tap');
                  g.tapFigure(cutId, b.id);
                }
              }}
            >
              <span className="tagchip" data-testid={f.named ? 'name-label' : 'q-label'}>
                {label}
              </span>
            </button>
          );
        })}
        {/* 세부(두루마리 머리글 등): 사람 상자보다 먼저 눌린다 */}
        {(entry?.details ?? []).map((b) => {
          const d = cut.details.find((x) => x.id === b.id);
          if (!d) return null;
          return (
            <button
              key={b.id}
              className={`detailbox${detail === b.id ? ' sel' : ''}`}
              style={{ ...hit(b), zIndex: zOf.get(b.id) }}
              data-detail={b.id}
              aria-label={`자세히 보기: ${d.label}`}
              aria-expanded={detail === b.id}
              onClick={() => {
                fx('tap');
                setDetail(detail === b.id ? null : b.id);
              }}
            >
              <span className="mark" aria-hidden="true" />
            </button>
          );
        })}
        {openDetail ? (
          <div className="detail-note" role="note" data-testid="detail-note" data-detail={openDetail.id} onClick={() => setDetail(null)}>
            <div className="who">본 것</div>
            <div className="txt">{openDetail.label}</div>
            {canSearch && openDetail.terms.length ? (
              <button
                className="more"
                onClick={(e) => {
                  e.stopPropagation();
                  useUi.getState().setSearchSeed(openDetail.terms[0]!);
                  useUi.getState().push('search');
                }}
              >
                「{openDetail.terms[0]}」 찾기 ›
              </button>
            ) : null}
          </div>
        ) : null}
        {below ? null : bubbles}
      </div>
      {below ? (
        <div className="bubbles-below" style={{ width: box.w, top: box.h }} onClick={() => setTap((t) => t + 1)}>
          {bubbles}
        </div>
      ) : null}
    </div>
  );
}

export function Viewer() {
  const v = useView(selectViewer);
  const manifest = useManifest();
  const stageRef = useRef<HTMLDivElement>(null);
  const box = useBox(stageRef);
  const [drag, setDrag] = useState(0);
  const [snap, setSnap] = useState(true);
  const tagTarget = useGameStore((s) => s.ui.tagTarget);
  const contradictions = useView((ep, s) => selectContradictions(ep, s).filter((x) => x.status === 'revealed'));
  const eyeId = v?.eyeId;
  const episode = useEpisode();
  const epId = episode.id;
  const eye = useMemo(() => episode.eyes.find((e) => e.id === eyeId), [episode, eyeId]);
  const eyeClosed = !!v && v.eyes.find((e) => e.eyeId === v.eyeId)?.state === 'closed';
  const closureLine = episode.closures.find((c) => c.eyeId === eyeId)?.systemLine;

  const index = v?.index ?? 0;
  const total = v?.total ?? 0;

  const goTo = useCallback(
    (i: number) => {
      const g = useGameStore.getState();
      const cur = g.viewer;
      if (!cur || i < 0 || i >= (currentEpisode(g).eyes.find((e) => e.id === cur.eyeId)?.cuts.length ?? 0) || i === cur.index) return;
      fx('swipe');
      g.closeTagSheet();
      g.viewCut(cur.eyeId, i);
    },
    [],
  );

  // 이 눈이 없어지면(닫힘 직후 등) 홈으로
  useEffect(() => {
    if (!v) useUi.getState().pop();
  }, [v]);

  // 다음 컷 미리 받기
  useEffect(() => {
    if (!eye || !manifest) return;
    const next = eye.cuts[index + 1];
    if (next) preloadCut(manifest.cuts[next], next, eyeClosed, epId);
  }, [eye, manifest, index, eyeClosed, epId]);

  // 키보드: ← → (데스크톱)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [goTo, index]);

  // 밀기
  const st = useRef<{ x: number; y: number; t: number; id: number; on: boolean; dx: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // 왼쪽 가장자리에서 시작한 밀기는 뒤로 가기(lib/nav) — 컷을 넘기지 않는다
    const sl = stageRef.current?.getBoundingClientRect().left ?? 0;
    if (e.clientX - sl <= EDGE_PX) return;
    st.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, on: false, dx: 0 };
    useGameStore.getState().setTouching(true);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.on) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      s.on = true;
      setSnap(false);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* 무시 */
      }
    }
    const atEdge = (index === 0 && dx > 0) || (index === total - 1 && dx < 0);
    s.dx = dx;
    setDrag(atEdge ? dx * 0.28 : dx);
  };
  const onUp = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    st.current = null;
    useGameStore.getState().setTouching(false);
    if (!s.on) return;
    setSnap(true);
    const dt = Math.max(1, performance.now() - s.t);
    const fast = Math.abs(s.dx) / dt > 0.5 && Math.abs(s.dx) > 24;
    const far = Math.abs(s.dx) > box.pw * 0.3;
    setDrag(0);
    if (fast || far) goTo(index + (s.dx < 0 ? 1 : -1));
  };
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) goTo(index + (e.deltaX > 0 ? 1 : -1));
  };

  if (!v || !eye) return <div className="scr" />;
  const cutIds = eye.cuts;
  const curCut = v.cut;
  const offset = -index * box.pw + drag;
  const hasWarn = contradictions.length > 0;
  const back = () => {
    const g = useGameStore.getState();
    g.closeTagSheet();
    g.closeViewer();
    useUi.getState().pop();
  };
  // 풀리지 않은 모순이 있으면 방은 그 모순 보기로 바로 연다(다음 할 일)
  const openRoom = () => {
    const g = useGameStore.getState();
    useUi.getState().setRoomFocus(hasWarn ? contradictions[0]!.id : null);
    g.openRoom();
  };
  const openLog = () => useUi.getState().setLog(true);
  // 아래 가운데 칸 = 지금 할 일 하나: 기록 다시 쓰기 › (이름이 다 붙어 쓸 수 있게 되면) · 그날의 방 · 지금까지 본 것
  const primary: 'rewrite' | 'room' | 'log' = v.rewriteReady ? 'rewrite' : v.canOpenRoom ? 'room' : 'log';
  const logIsPrimary = primary === 'log';
  const toRewrite = () => {
    const g = useGameStore.getState();
    fx('tap');
    g.closeTagSheet();
    g.closeViewer();
    useUi.getState().go('rewrite');
  };

  return (
    <div className="scr" data-screen="viewer" data-eye={v.eyeId} data-index={index}>
      <div className="vtop">
        <div className="l1">
          <div className="title t-b" data-testid="viewer-title">
            {v.eyeLabel}
          </div>
          {v.tags.total ? (
            <span className={`tagprog t-m${v.tags.complete ? ' done' : ''}`} data-testid="tag-progress" aria-label={`이름 붙이기 ${v.tags.done} / ${v.tags.total}`}>
              이름 붙이기 {v.tags.done}/{v.tags.total}
            </span>
          ) : null}
          <span className="clock" data-testid="cut-time">
            {curCut?.time ?? ''}
          </span>
        </div>
        {v.eyes.length > 1 || hasWarn ? (
        <div className="l2">
          <EyeRow
            eyes={v.eyes}
            size={24}
            onPick={(id) => {
              if (id === v.eyeId) return;
              const g = useGameStore.getState();
              g.closeTagSheet();
              g.openEye(id);
            }}
          />
          {hasWarn ? (
            <button
              className="alertchip"
              data-testid="alert-chip"
              onClick={() => {
                useUi.getState().setRoomFocus(contradictions[0]!.id);
                useGameStore.getState().openRoom();
              }}
            >
              <IWarn size={18} /> 모순
            </button>
          ) : null}
        </div>
        ) : null}
        {eyeClosed && closureLine ? (
          <div className="cutnote" data-testid="closure-note">
            {closureLine}
          </div>
        ) : null}
      </div>

      <div
        className="vstage"
        ref={stageRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        // 숨은 넘침(overflow:hidden)도 초점·스크롤 때문에 밀릴 수 있다 — 컷 줄은 transform 으로만 움직인다
        onScroll={(e) => {
          if (e.currentTarget.scrollLeft) e.currentTarget.scrollLeft = 0;
        }}
        data-testid="stage"
      >
        <div className={`vstrip${snap ? ' snap' : ''}`} style={{ width: box.pw * total, transform: `translateX(${offset}px)` }}>
          {cutIds.map((id, i) => (
            <div key={id} style={{ width: box.pw, flex: 'none', height: '100%' }}>
              {Math.abs(i - index) <= 1 ? (
                <CutSlide cutId={id} entry={manifest?.cuts[id]} box={box} active={i === index && !drag} eyeClosed={eyeClosed} selected={i === index && tagTarget?.cutId === id ? tagTarget.figureId : null} />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="vbottom">
        <div className="dots" role="group" aria-label="컷 위치">
          {logIsPrimary ? (
            <span className="dotside" aria-hidden="true" />
          ) : (
            <button className="dotside" aria-label="지금까지 본 것" onClick={openLog} data-testid="btn-log">
              <IDoc />
            </button>
          )}
          {v.dots.map((d, i) => (
            <button key={d.cutId} className="dotbtn" aria-label={`컷 ${i + 1}`} aria-current={d.current} onClick={() => goTo(i)} data-testid={`dot-${cutNo(d.cutId)}`}>
              <i className={d.current ? 'cur' : d.viewed ? 'seen' : ''} />
            </button>
          ))}
          {v.canOpenRoom && primary !== 'room' ? (
            <button className={`dotside${hasWarn ? ' warn' : ''}`} aria-label="그날의 방" onClick={openRoom} data-testid="btn-room">
              <IPlan />
            </button>
          ) : (
            <span className="dotside" aria-hidden="true" />
          )}
        </div>
      </div>
      <NavBar
        onBack={back}
        backTestId="viewer-back"
        primary={
          primary === 'rewrite' ? (
            <button className="btn primary navprimary breath" onClick={toRewrite} data-testid="btn-to-rewrite">
              역사 고정 ›
            </button>
          ) : primary === 'room' ? (
            <button className="btn primary navprimary" onClick={openRoom} data-testid="btn-room">
              {hasWarn ? <IWarn size={20} /> : null}
              그날의 방
            </button>
          ) : (
            <button className="btn secondary navprimary" onClick={openLog} data-testid="btn-log">
              지금까지 본 것
            </button>
          )
        }
      />
    </div>
  );
}
