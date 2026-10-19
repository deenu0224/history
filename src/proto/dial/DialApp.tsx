/**
 * 「그날은 주파수다」 — 관측기 = 수신기 프로토타입(Ep0). 메인 게임과 상태를 나누지 않는 단독 화면(dial.html).
 *
 * 흐름: 정적 + 다이얼 → 바깥 고리로 방을 쓸어 상소 읽는 소리를 잡는다 → 고정할 문장의 「소(疏)를 보고」를 눌러
 * 안쪽 고리에 「그 뒤 근처」 표식 → 맥놀이로 마지막 몇 분 → 높은 자리 목소리 잠금(군상) → 가운데를 길게 눌러 고정 → 복원.
 * 판정은 model.ts(데이터 계산). 화면에 정답 글자는 얻기 전까지 나오지 않는다.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react';
import { installAudioUnlock } from '@/game/audio';
import { ROOM_EP0 } from '@/data/v5/ep0/room';
import {
  BEAM_HALF,
  DEG_PER_MIN,
  EONMUN28_TEXT,
  HOLD_MS,
  HOLE_EVIDENCE,
  HOLE_FILL,
  HOME_AFTER,
  HOME_TAIL,
  LOCK_RESIDUE,
  MIN_HI,
  MIN_LO,
  MOMENTS,
  OBSERVER,
  OUTER_STEP,
  SOURCES,
  START_BEAM,
  START_MINUTE,
  TIME_HINTS,
  angDelta,
  canFixAt,
  fmtHm,
  garble,
  norm360,
  signalAt,
  withInlineGloss,
  type Moment,
  type TimeHint,
} from './model';
import { DialAudio, buzz } from './audio';
import { CUT_W, VIEW_H, StaticPainter, loadCut } from './static';

const MSG_START = '돌려 봐. 소리 나는 쪽이 있을 거야.';
const MSG_SO = '방금 그 글… 위 문장에 있는 소(疏)가 그거 아냐?';
const MSG_DONE = '세종대왕이 만든 거 모르는 사람이 어디 있어.';

/** 다이얼 기하(viewBox -150..150) */
const R_OUT = 127;
const R_OUT_W = 40;
const R_IN = 84;
const R_IN_W = 34;
const R_CENTER = 58;

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTest = typeof location !== 'undefined' && new URLSearchParams(location.search).get('test') === '1';
const memorialId = MOMENTS[0].id;
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (r: number, deg: number) => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))] as const;

function arcPath(r: number, a0: number, a1: number): string {
  const [x0, y0] = pt(r, a0);
  const [x1, y1] = pt(r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

type Ring = 'outer' | 'inner' | 'center';

export function DialApp() {
  const [beamVis, setBeamVis] = useState(START_BEAM);
  const [innerVis, setInnerVis] = useState(0);
  const [beam, setBeam] = useState(START_BEAM);
  const [minute, setMinute] = useState(START_MINUTE);
  const [heard, setHeard] = useState<string[]>([]);
  const [marker, setMarker] = useState<TimeHint | null>(null);
  const [fixed, setFixed] = useState(false);
  const [hold, setHold] = useState(0);
  const [msgs, setMsgs] = useState<string[]>([MSG_START]);
  const [note, setNote] = useState(false);
  const [scale, setScale] = useState(3);

  const sig = useMemo(() => signalAt(beam, minute), [beam, minute]);
  const canFix = canFixAt(sig) && !fixed;
  const innerOn = heard.includes(memorialId);
  const soReady = innerOn && !marker && !fixed;

  // ── refs(rAF 루프용) ──
  const audio = useRef<DialAudio | null>(null);
  const sigRef = useRef(sig);
  sigRef.current = sig;
  const fixedRef = useRef(fixed);
  fixedRef.current = fixed;
  const holdRef = useRef<{ start: number } | null>(null);
  const holdVal = useRef(0);
  const canFixRef = useRef(canFix);
  canFixRef.current = canFix;
  const drag = useRef<{ ring: Ring; last: number; id: number } | null>(null);
  const outerRaw = useRef(START_BEAM);
  const innerRaw = useRef(0);
  const cuts = useRef(new Map<string, ImageData | null>());
  const lastMoment = useRef<Moment | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));

  useEffect(() => {
    installAudioUnlock();
    for (const m of MOMENTS) void loadCut(m.cutId).then((d) => cuts.current.set(m.cutId, d));
    return () => {
      timers.current.forEach(clearTimeout);
      audio.current?.stop();
    };
  }, []);

  // 정수 배율
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setScale(Math.max(1, Math.min(3, Math.floor(el.clientWidth / CUT_W)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 처음 잠근 순간
  const lockId = sig.locked && sig.moment ? sig.moment.id : '';
  useEffect(() => {
    if (!lockId) return;
    buzz(45);
    setHeard((h) => (h.includes(lockId) ? h : [...h, lockId]));
    if (lockId === memorialId) later(1500, () => setMsgs((m) => (m.includes(MSG_SO) ? m : [...m, MSG_SO])));
  }, [lockId]);

  // ── 화면·소리 루프 ──
  useEffect(() => {
    const cv = canvas.current;
    const g = cv?.getContext('2d');
    const painter = g ? new StaticPainter(g) : null;
    const slow = reducedMotion();
    let disp = 0;
    let lastPaint = 0;
    let lastBuzz = 0;
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const s = sigRef.current;
      const isFixed = fixedRef.current;
      // 길게 누르기
      if (holdRef.current && canFixRef.current) {
        const p = Math.min(1, (now - holdRef.current.start) / HOLD_MS);
        holdVal.current = p;
        if (p >= 1) {
          holdRef.current = null;
          setFixed(true);
          audio.current?.chime();
          buzz([30, 60, 90]);
          later(1400, () => setMsgs((m) => [...m, MSG_DONE]));
        }
        setHold(p);
      } else if (holdVal.current > 0 && !isFixed) {
        holdVal.current = Math.max(0, holdVal.current - 0.05);
        setHold(holdVal.current);
      }
      const h = isFixed ? 1 : holdVal.current;
      const target = isFixed ? 1 : s.locked ? 1 - LOCK_RESIDUE * (1 - h) : Math.max(s.clarity * 0.9, s.murmur * 0.35);
      disp += (target - disp) * (slow ? 0.5 : 0.14);
      if (s.moment) lastMoment.current = s.moment;
      const m = isFixed ? lastMoment.current : s.moment ?? lastMoment.current;
      if (painter && now - lastPaint > (slow ? 220 : 45)) {
        lastPaint = now;
        painter.paint(m ? cuts.current.get(m.cutId) ?? null : null, disp);
      }
      audio.current?.set({
        staticLevel: isFixed ? 0 : Math.max(0.04, 1 - disp),
        beatHz: isFixed ? null : s.beatHz,
        beatLevel: s.locked ? 0.35 * (1 - h) : s.clarity,
        voice: s.moment?.voice ?? (isFixed ? lastMoment.current?.voice ?? null : null),
        voiceLevel: isFixed ? 0.35 : s.moment ? Math.max(s.clarity, s.murmur) : 0,
        voiceClarity: isFixed ? 1 : s.clarity,
      });
      // 맥놀이 진동: 멀수록 세고 잦게, 가까울수록 부드럽게
      if (!isFixed && s.beatHz && s.beatHz > 0) {
        const period = Math.max(150, 1000 / s.beatHz);
        if (now - lastBuzz > period) {
          lastBuzz = now;
          buzz(Math.round(6 + 24 * (1 - s.clarity)));
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── 다이얼 조작 ──
  const polar = (e: RPE<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    const k = 300 / r.width;
    const x = (e.clientX - (r.left + r.width / 2)) * k;
    const y = (e.clientY - (r.top + r.height / 2)) * k;
    return { r: Math.hypot(x, y), a: (Math.atan2(y, x) * 180) / Math.PI };
  };

  const onDown = (e: RPE<SVGSVGElement>) => {
    if (!audio.current) audio.current = new DialAudio();
    audio.current.start();
    const { r, a } = polar(e);
    let ring: Ring | null = null;
    if (r > R_IN + R_IN_W / 2 + 2) ring = 'outer';
    else if (r > R_CENTER + 2) ring = innerOn ? 'inner' : null;
    else ring = 'center';
    if (!ring) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { ring, last: a, id: e.pointerId };
    if (ring === 'center' && canFixRef.current) holdRef.current = { start: performance.now() };
  };

  const onMove = (e: RPE<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || d.ring === 'center') return;
    const { a } = polar(e);
    const delta = angDelta(d.last, a);
    d.last = a;
    if (d.ring === 'outer') {
      outerRaw.current += delta;
      setBeamVis(outerRaw.current);
      const snapped = norm360(Math.round(outerRaw.current / OUTER_STEP) * OUTER_STEP);
      if (snapped !== beam) {
        setBeam(snapped);
        audio.current?.tick('outer');
        buzz(5);
      }
    } else {
      const lo = (MIN_LO - START_MINUTE) * DEG_PER_MIN;
      const hi = (MIN_HI - START_MINUTE) * DEG_PER_MIN;
      innerRaw.current = Math.max(lo, Math.min(hi, innerRaw.current + delta));
      setInnerVis(innerRaw.current);
      const mm = START_MINUTE + Math.round(innerRaw.current / DEG_PER_MIN);
      if (mm !== minute) {
        setMinute(mm);
        audio.current?.tick('inner');
        buzz(7);
      }
    }
  };

  const onUp = (e: RPE<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    holdRef.current = null;
    // 눈금에 안착
    if (d.ring === 'outer') {
      outerRaw.current = Math.round(outerRaw.current / OUTER_STEP) * OUTER_STEP;
      setBeamVis(outerRaw.current);
    } else if (d.ring === 'inner') {
      innerRaw.current = Math.round(innerRaw.current / DEG_PER_MIN) * DEG_PER_MIN;
      setInnerVis(innerRaw.current);
    }
  };

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    outerRaw.current = START_BEAM;
    innerRaw.current = 0;
    holdRef.current = null;
    holdVal.current = 0;
    lastMoment.current = null;
    setBeamVis(START_BEAM);
    setInnerVis(0);
    setBeam(START_BEAM);
    setMinute(START_MINUTE);
    setHeard([]);
    setMarker(null);
    setFixed(false);
    setHold(0);
    setMsgs([MSG_START]);
    setNote(false);
  }, []);

  const tapSo = () => {
    if (!soReady) return;
    setMarker(TIME_HINTS[0]);
    audio.current?.tick('inner');
    buzz(12);
  };

  // ── 그리기 ──
  const stageW = CUT_W * scale;
  const stageH = VIEW_H * scale;
  const planOpacity = fixed ? 0.12 : Math.max(0.16, 1 - (sig.locked ? 0.84 : sig.clarity * 0.7));
  const homeTailHead = HOME_TAIL.slice(0, HOME_TAIL.indexOf('이르기를,') + '이르기를,'.length);
  const [soBefore, soAfter] = HOME_AFTER.split(TIME_HINTS[0].phrase);

  const heardView = () => {
    if (fixed) {
      return (
        <div className="dl-rest" data-testid="restored">
          <p className="dl-rest__k">같이 돌아온 기록</p>
          <p className="dl-rest__line">「{EONMUN28_TEXT}」</p>
          <a className="dl-src" href={SOURCES.eonmun.url} target="_blank" rel="noreferrer">
            {SOURCES.eonmun.title}
          </a>
        </div>
      );
    }
    const m = sig.moment;
    if (!m) return <p className="dl-heard__none" aria-hidden="true">· · ·</p>;
    if (sig.locked) {
      return (
        <div className="dl-heard__clear" data-testid="clear-line" data-moment={m.id}>
          <p className="dl-heard__who">{m.groupLabel}</p>
          {m.lines.map((l, li) => {
            const t = withInlineGloss(l);
            const cls = li < m.lines.length - 1 ? 'dl-heard__line dl-heard__line--pre' : 'dl-heard__line';
            const key = HOLE_EVIDENCE.includes(l.id) && canFix;
            const term = l.glosses?.find((g) => g.inline);
            if (key && term) {
              const i = t.indexOf(term.term);
              const j = t.indexOf(')', i) + 1;
              return (
                <p key={l.id} className={cls} data-line={l.id} ref={(el) => el?.scrollIntoView({ block: 'nearest' })}>
                  {t.slice(0, i)}
                  <mark className="dl-key">{t.slice(i, j)}</mark>
                  {t.slice(j)}
                </p>
              );
            }
            return (
              <p key={l.id} className={cls} data-line={l.id}>
                {t}
              </p>
            );
          })}
          <p className="dl-gloss">
            {m.lines
              .flatMap((l) => l.glosses ?? [])
              .filter((g) => !g.inline)
              .map((g) => `${g.term} — ${g.gloss}`)
              .join(' · ')}
          </p>
        </div>
      );
    }
    const c = sig.clarity > 0 ? sig.clarity * 0.85 : sig.murmur * 0.55;
    return (
      <p className="dl-heard__garbled" data-testid="garbled">
        「{garble(m.lines.map((l) => l.text).join(' '), c, MOMENTS.indexOf(m) + 3)}」
      </p>
    );
  };

  // 안쪽 고리 눈금(분): 시계 방향 = 뒤 시각. 분 m 은 고리 위에서 -(m-START)*6° 자리(위 = -90°)
  const minAngle = (mm: number) => -90 + (mm - START_MINUTE) * DEG_PER_MIN * -1;
  const innerTicks = [];
  for (let mm = MIN_LO; mm <= MIN_HI; mm++) {
    const a = minAngle(mm);
    const major = mm % 10 === 0;
    const [x0, y0] = pt(R_IN + R_IN_W / 2 - 2, a);
    const [x1, y1] = pt(R_IN + R_IN_W / 2 - (major ? 9 : mm % 5 === 0 ? 6 : 4), a);
    innerTicks.push(<line key={`t${mm}`} x1={x0} y1={y0} x2={x1} y2={y1} className={major ? 'dl-tick dl-tick--major' : 'dl-tick'} />);
    if (major) {
      const [tx, ty] = pt(R_IN - 6, a);
      innerTicks.push(
        <text key={`l${mm}`} x={tx} y={ty} className="dl-tlabel" transform={`rotate(${a + 90} ${tx} ${ty})`}>
          {fmtHm(mm)}
        </text>,
      );
    }
  }
  const outerTicks = [];
  for (let d = 0; d < 360; d += 15) {
    const [x0, y0] = pt(R_OUT + R_OUT_W / 2 - 3, d);
    const [x1, y1] = pt(R_OUT + R_OUT_W / 2 - (d % 45 === 0 ? 10 : 6), d);
    outerTicks.push(<line key={d} x1={x0} y1={y0} x2={x1} y2={y1} className="dl-tick" />);
  }

  // 방 도면: 빔
  const [bx, by] = [OBSERVER.x, OBSERVER.y];
  const ray = (a: number) => [bx + 16 * Math.cos(rad(a)), by + 16 * Math.sin(rad(a))];
  const [r0x, r0y] = ray(beam - BEAM_HALF);
  const [r1x, r1y] = ray(beam + BEAM_HALF);
  const [rcx, rcy] = ray(beam);
  const speakingSeat = sig.moment && (sig.clarity > 0 || sig.murmur > 0) ? sig.moment.seatId : null;
  const dais = ROOM_EP0.furniture.find((f) => f.id === 'dais');

  const debug = isTest ? JSON.stringify(MOMENTS.map((m) => ({ id: m.id, angle: m.angle, minute: m.minute }))) : undefined;

  return (
    <div
      className="dl"
      data-testid="dial-app"
      data-beam={beam}
      data-minute={minute}
      data-lock={sig.locked && sig.moment ? sig.moment.id : ''}
      data-can-fix={canFix ? '1' : '0'}
      data-fixed={fixed ? '1' : '0'}
      data-moments={debug}
    >
      {/* 고정할 문장 */}
      <section className={`dl-home${fixed ? ' is-fixed' : ''}`} aria-label="고정할 문장">
        <p className="dl-home__k">고정할 문장</p>
        <p className="dl-home__s">
          {fixed ? (
            <span className="dl-hole is-filled" data-testid="hole">
              {HOLE_FILL}
            </span>
          ) : (
            <span className={`dl-hole${canFix ? ' is-pulse' : ''}`} data-testid="hole">
              [ ? ]이
            </span>
          )}
          {soBefore}
          <button
            type="button"
            className={`dl-so${soReady ? ' is-ready' : ''}${marker ? ' is-used' : ''}`}
            onClick={tapSo}
            disabled={!soReady}
            data-testid="word-so"
          >
            {TIME_HINTS[0].phrase}
          </button>
          {soAfter}
          {fixed ? `${homeTailHead} …` : '…'}
        </p>
        {fixed && (
          <a className="dl-src" href={SOURCES.home.url} target="_blank" rel="noreferrer">
            {SOURCES.home.title}
          </a>
        )}
      </section>

      {/* 컷 + 방 도면 */}
      <div className="dl-stage" ref={stage}>
        <div className="dl-screen" style={{ width: stageW, height: stageH }}>
          <canvas ref={canvas} width={CUT_W} height={VIEW_H} className="dl-canvas" style={{ width: stageW, height: stageH }} aria-hidden="true" />
          <svg className="dl-plan" viewBox="-0.6 -0.25 13.2 9.75" style={{ opacity: planOpacity }} aria-hidden="true">
            <defs>
              <radialGradient id="dl-beam" cx={bx} cy={by} r="12" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#e2a85c" stopOpacity="0.55" />
                <stop offset="1" stopColor="#e2a85c" stopOpacity="0.02" />
              </radialGradient>
              <clipPath id="dl-room">
                <rect x="0" y="0" width={ROOM_EP0.w} height={ROOM_EP0.h} />
              </clipPath>
            </defs>
            <rect x="0" y="0" width={ROOM_EP0.w} height={ROOM_EP0.h} className="dl-floor" />
            {dais && <rect x={dais.rect[0]} y={dais.rect[1]} width={dais.rect[2] - dais.rect[0]} height={dais.rect[3] - dais.rect[1]} className="dl-dais" />}
            {dais && (
              <text x={(dais.rect[0] + dais.rect[2]) / 2} y={dais.rect[3] + 0.55} className="dl-plan__label">
                {dais.label}
              </text>
            )}
            {ROOM_EP0.walls.map((w, i) => (
              <line key={i} x1={w[0]} y1={w[1]} x2={w[2]} y2={w[3]} className="dl-wall" />
            ))}
            <g clipPath="url(#dl-room)">
              <polygon points={`${bx},${by} ${r0x},${r0y} ${r1x},${r1y}`} fill="url(#dl-beam)" />
              <line x1={bx} y1={by} x2={rcx} y2={rcy} className="dl-beam-axis" />
            </g>
            {ROOM_EP0.seats
              .filter((s) => s.id !== OBSERVER.id)
              .map((s) => (
                <g key={s.id}>
                  {speakingSeat === s.id && <circle cx={s.x} cy={s.y} r={0.55 + 0.3 * sig.clarity} className="dl-seat-glow" />}
                  <circle cx={s.x} cy={s.y} r={0.24} className="dl-seat" />
                </g>
              ))}
            <circle cx={bx} cy={by} r={0.3} className="dl-eye" />
          </svg>
          {msgs.length > 0 && !note && (
            <div className="dl-msg" data-testid="messenger" key={msgs.length}>
              <span className="dl-msg__who">한 선임</span>
              <span className="dl-msg__t">{msgs[msgs.length - 1]}</span>
            </div>
          )}
        </div>
      </div>

      {/* 들은 말 */}
      <div className="dl-heard" aria-live="polite">
        {heardView()}
      </div>

      {/* 다이얼 */}
      <div className="dl-dialwrap">
        <svg
          ref={svg}
          className="dl-dial"
          viewBox="-150 -150 300 300"
          data-testid="dial"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onContextMenu={(e) => e.preventDefault()}
          role="group"
          aria-label="관측기 다이얼"
        >
          {/* 바깥 고리: 방향 */}
          <circle r={R_OUT} className="dl-ring dl-ring--outer" strokeWidth={R_OUT_W} />
          <g transform={`rotate(${beamVis})`}>
            {outerTicks}
            <path d={`M${R_OUT + R_OUT_W / 2 - 1} 0 L${R_OUT - 8} -7 L${R_OUT - 8} 7 Z`} className="dl-antenna" />
          </g>
          {/* 안쪽 고리: 시각 */}
          <g className={innerOn ? 'dl-inner' : 'dl-inner is-off'} data-testid="inner-ring">
            <circle r={R_IN} className="dl-ring dl-ring--inner" strokeWidth={R_IN_W} />
            <g transform={`rotate(${innerVis})`}>
              {marker && (
                <path
                  d={arcPath(R_IN + R_IN_W / 2 - 3, minAngle(marker.span[1]), minAngle(marker.span[0]))}
                  className="dl-marker"
                  data-testid="time-marker"
                />
              )}
              {innerTicks}
            </g>
            <path d={`M0 ${-(R_IN + R_IN_W / 2) - 1} l-6 -9 l12 0 Z`} className="dl-index" />
          </g>
          {/* 가운데: 길게 눌러 고정 */}
          <circle r={R_CENTER} className={`dl-center${canFix ? ' is-ready' : ''}${fixed ? ' is-fixed' : ''}`} data-testid="dial-center" />
          {hold > 0 && !fixed && <path d={arcPath(R_CENTER - 5, -90, -90 + 359.9 * hold)} className="dl-holdarc" />}
          <text className="dl-center__t" y="5">
            {fixed ? '고정됨' : canFix ? '고정' : ''}
          </text>
        </svg>
      </div>

      <footer className="dl-foot">
        <button type="button" className="dl-btn" onClick={reset} data-testid="reset">
          처음부터
        </button>
        <button type="button" className="dl-btn" onClick={() => setNote((v) => !v)} data-testid="about">
          이 장면에 대해
        </button>
      </footer>

      {note && (
        <div className="dl-note" role="dialog" aria-label="이 장면에 대해" onClick={() => setNote(false)}>
          <div className="dl-note__card" onClick={(e) => e.stopPropagation()}>
            <p className="dl-note__h">이 장면에 대해</p>
            <ul>
              <li>
                <b>들리는 말</b> — 실록 국역 그대로(검증). 출처는 고정한 뒤에 보인다.
              </li>
              <li>
                <b>재구성</b> — 방과 자리, 시각(분), 상소를 소리 내어 읽은 일, 목소리와 맥놀이, 화면의 모습.
              </li>
              <li>
                <b>가상</b> — 관측기, 한 선임.
              </li>
            </ul>
            <button type="button" className="dl-btn" onClick={() => setNote(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
