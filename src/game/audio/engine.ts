/**
 * 상태를 가진 오디오 엔진(컨텍스트·잠금 해제·볼륨·SFX·앰비언스·음악). 공개 API 는 ../audio.ts 가 다시 내보낸다.
 *
 * "소리가 안 난다" 의 원인과 대응
 *  1. iOS Safari 는 pointerdown 을 오디오 허용 제스처로 치지 않는다(touchend/click 만). 예전엔 pointerdown 한 번(once)만 듣고 끝나서
 *     iOS 에서는 컨텍스트가 영영 suspended 였다 → 모든 제스처(pointer/touch/mouse/click/key)를 영구 청취, running 이 될 때까지 매번 resume.
 *  2. playSfx 가 컨텍스트가 running 이 아니면 조용히 버렸다(최초 탭의 효과음 소실) → 제스처 안의 playSfx 가 컨텍스트를 만들고
 *     resume 을 동기 호출하며, 직전 몇 개 효과음은 대기열에 두었다가 running 이 되면 재생.
 *  3. 컨텍스트가 탭 전환/전화/잠금으로 suspended·interrupted(iOS) 가 되면 복구 경로가 없었다 → statechange/visibilitychange/pageshow/focus 에서 재개.
 *  4. iOS 무음 스위치가 켜져 있으면 WebAudio 는 소리가 나지 않는다 → navigator.audioSession.type='playback' 과 무음 <audio> 재생으로 미디어 채널로 전환.
 *  5. 첫 제스처에서 무음 버퍼를 한 번 재생해 iOS 의 출력을 확실히 연다.
 *  6. SFX 이름 누락: FEEDBACK 의 stamp_auto/erase 는 'none', stamp 는 'page' 로 대체돼 있었다 → sfx.ts 에 전부 구현, SFX_ALIASES 로 변환.
 */
import { AMB_BASE, buildGraph, MASTER_SCALE, MUSIC_SCALE, type Graph } from './graph';
import { makeEnv, type Env } from './env';
import { startModern, startPast, type AmbHandle, type Ambience } from './ambience';
import { MusicEngine, type MusicOpts, type MusicTrack } from './music';
import { renderSfx, resolveSfx, type SfxName } from './sfx';

export type { Ambience };

type ACtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let env: Env | null = null;
let graph: Graph | null = null;
let music: MusicEngine | null = null;

let volume = 0.8;
let sfxVolume = 1;
let musicVolume = 0.7;
let reduced = false;
let muteFlag = false;
let wantAmbience: Ambience = 'none';
let wantMusic: { track: MusicTrack; opts?: MusicOpts } = { track: 'none' };
let activeAmb: AmbHandle | null = null;
let lastStep = 0;
let primed = false;
let installed = false;
let hidden = false;

// 디버그 계측
const dbg = { lastSfx: '', lastSfxAt: 0, played: 0, queued: 0, dropped: 0, unlocks: 0, lastEvent: '' };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

interface Pending {
  name: SfxName;
  at: number;
}
let pending: Pending[] = [];

function getCtor(): ACtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: ACtor; webkitAudioContext?: ACtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

const silent = () => muteFlag || volume <= 0.001;
const musicAllowed = () => !silent() && !reduced && musicVolume > 0.001;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = getCtor();
  if (!Ctor) return null;
  try {
    // 'playback' 힌트: 출력 지연보다 안정성
    ctx = new Ctor({ latencyHint: 'playback' });
  } catch {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  env = makeEnv(ctx);
  graph = buildGraph(ctx);
  music = new MusicEngine(env, graph);
  applyLevels(true);
  ctx.addEventListener('statechange', onStateChange);
  return ctx;
}

function applyLevels(immediate = false): void {
  if (!ctx || !graph) return;
  const t = ctx.currentTime;
  const set = (p: AudioParam, v: number) => (immediate ? (p.value = v) : p.setTargetAtTime(v, t, 0.06));
  set(graph.master.gain, silent() ? 0 : volume * MASTER_SCALE);
  set(graph.sfxBus.gain, sfxVolume * (reduced ? 0.65 : 1));
  set(graph.musicBus.gain, reduced ? 0 : musicVolume * MUSIC_SCALE);
  const duck = music && music.track !== 'none' ? 0.5 : 1;
  set(graph.ambBus.gain, AMB_BASE * duck * (reduced ? 0.5 : 1));
}

function onStateChange(): void {
  dbg.lastEvent = `state:${ctx?.state}`;
  if (ctx?.state === 'running') onRunning();
  notify();
}

function onRunning(): void {
  const now = performance.now();
  const q = pending.filter((p) => now - p.at < 500);
  pending = [];
  for (const p of q) playSfx(p.name);
  applyAmbience();
  applyMusic();
}

// ───────────────────────── 잠금 해제 ─────────────────────────

/** 1프레임 무음 WAV(data URI) — iOS 무음 스위치 우회용 <audio> 재생 */
function silentWavUri(): string {
  const n = 800;
  const buf = new Uint8Array(44 + n * 2);
  const dv = new DataView(buf.buffer);
  const w = (o: number, s: string) => [...s].forEach((ch, i) => dv.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF');
  dv.setUint32(4, 36 + n * 2, true);
  w(8, 'WAVEfmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true);
  dv.setUint32(28, 16000, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  w(36, 'data');
  dv.setUint32(40, n * 2, true);
  let bin = '';
  buf.forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

function primeMediaChannel(): void {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    /* 미지원 */
  }
  try {
    const a = document.createElement('audio');
    a.src = silentWavUri();
    a.setAttribute('playsinline', '');
    a.loop = true;
    a.volume = 0.01;
    void a.play().catch(() => undefined);
    setTimeout(() => a.pause(), 400);
  } catch {
    /* 무시 */
  }
}

/**
 * 사용자 제스처 핸들러 안에서 호출. 멱등: 이미 running 이면 거의 아무 일도 하지 않는다.
 * 컨텍스트 생성 → resume() 를 동기 호출 → 무음 버퍼 재생 → (최초 1회) 미디어 채널 전환.
 */
export function unlockAudio(): void {
  const c = ensure();
  if (!c) return;
  dbg.unlocks++;
  if (c.state !== 'running') {
    try {
      void c.resume().then(() => { if (c.state === 'running') onRunning(); notify(); }).catch(() => undefined);
    } catch {
      /* 무시 */
    }
  }
  try {
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch {
    /* 무시 */
  }
  if (!primed) {
    primed = true;
    primeMediaChannel();
  }
  if (c.state === 'running') {
    applyAmbience();
    applyMusic();
  }
  notify();
}

/**
 * 앱 시작 때 한 번 호출. 모든 제스처에서 unlockAudio 를 영구히 부르고(running 이면 즉시 반환),
 * 탭 복귀/페이지 복원/포커스에서 컨텍스트를 재개한다. 여러 번 불러도 한 번만 설치된다.
 */
export function installAudioUnlock(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const h = () => {
    if (ctx && ctx.state === 'running' && primed) return;
    unlockAudio();
  };
  for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown']) {
    window.addEventListener(ev, h, { capture: true, passive: true });
  }
  const onVis = () => {
    hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (!ctx) return;
    if (hidden) {
      // 보이지 않는 동안엔 CPU 를 쓰지 않는다
      if (ctx.state === 'running') void ctx.suspend().catch(() => undefined);
    } else if (ctx.state !== 'running') {
      void ctx.resume().catch(() => undefined);
    }
    notify();
  };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pageshow', onVis);
  window.addEventListener('focus', onVis);
}

// ───────────────────────── 볼륨 ─────────────────────────

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

/** 마스터 볼륨 0..1 (설정의 volume) */
export function setVolume(v: number): void {
  volume = clamp01(v);
  applyLevels();
  applyAmbience();
  applyMusic();
  notify();
}
export function setSfxVolume(v: number): void {
  sfxVolume = clamp01(v);
  applyLevels();
  notify();
}
export function setMusicVolume(v: number): void {
  musicVolume = clamp01(v);
  applyLevels();
  applyMusic();
  notify();
}
/** 접근성: true 면 음악·대부분의 앰비언스를 끄고 효과음을 낮춘다 */
export function setReducedAudio(on: boolean): void {
  reduced = on;
  applyLevels();
  applyAmbience();
  applyMusic();
  notify();
}
export function setMuted(on: boolean): void {
  muteFlag = on;
  applyLevels();
  applyAmbience();
  applyMusic();
  notify();
}

// ───────────────────────── 효과음 ─────────────────────────

/** SfxName 또는 FEEDBACK 표의 sfx 문자열 모두 받는다. 알 수 없는 이름은 무시하되 dropped 로 센다. */
export function playSfx(name: SfxName | (string & {})): void {
  const resolved = resolveSfx(name);
  if (!resolved || resolved === 'none') {
    if (!resolved) dbg.dropped++;
    return;
  }
  if (silent()) return;
  const c = ensure();
  if (!c || !env || !graph) return;
  if (c.state !== 'running') {
    // 제스처 안이라면 이 resume 이 곧 잠금을 풀고, onRunning 이 대기열을 비운다
    pending.push({ name: resolved, at: performance.now() });
    if (pending.length > 6) pending.shift();
    dbg.queued++;
    try {
      void c.resume().catch(() => undefined);
    } catch {
      /* 무시 */
    }
    notify();
    return;
  }
  if (resolved === 'step') {
    const now = performance.now();
    if (now - lastStep < 140) return;
    lastStep = now;
  }
  renderSfx(env, graph.sfxBus, resolved, c.currentTime + 0.005);
  dbg.lastSfx = resolved;
  dbg.lastSfxAt = performance.now();
  dbg.played++;
  notify();
}

// ───────────────────────── 앰비언스 ─────────────────────────

function stopAmb(): void {
  activeAmb?.stop();
  activeAmb = null;
}

function applyAmbience(): void {
  const c = ctx;
  if (!c || !env || !graph || c.state !== 'running') return;
  if (silent() || reduced || wantAmbience === 'none') {
    stopAmb();
    return;
  }
  if (activeAmb?.kind === wantAmbience) return;
  stopAmb();
  activeAmb = wantAmbience === 'past' ? startPast(env, graph.ambBus) : startModern(env, graph.ambBus);
}

export function setAmbience(kind: Ambience): void {
  wantAmbience = kind;
  applyAmbience();
  notify();
}

// ───────────────────────── 음악 ─────────────────────────

function applyMusic(): void {
  const c = ctx;
  if (!c || !music || c.state !== 'running') return;
  const want = musicAllowed() ? wantMusic : { track: 'none' as MusicTrack, opts: { fade: 0.4 } };
  music.set(want.track, want.opts);
  applyLevels();
  notify();
}

/** 배경 음악 전환(크로스페이드). 'none' 이면 페이드 아웃. 같은 트랙이면 아무 일도 없다. 제스처 전이면 기억했다가 잠금 해제 때 시작. */
export function setMusic(track: MusicTrack, opts?: MusicOpts): void {
  wantMusic = { track, opts };
  applyMusic();
  notify();
}

// ───────────────────────── 디버그 ─────────────────────────

export interface AudioDebug {
  supported: boolean;
  state: string;
  sampleRate: number;
  lastSfx: string;
  lastSfxAgoMs: number;
  played: number;
  queued: number;
  dropped: number;
  unlocks: number;
  music: MusicTrack;
  wantedMusic: MusicTrack;
  ambience: Ambience;
  volume: number;
  sfxVolume: number;
  musicVolume: number;
  reduced: boolean;
  muted: boolean;
  hidden: boolean;
  lastEvent: string;
}

export function getAudioDebug(): AudioDebug {
  return {
    supported: getCtor() !== null,
    state: ctx?.state ?? 'none(미생성)',
    sampleRate: ctx?.sampleRate ?? 0,
    lastSfx: dbg.lastSfx,
    lastSfxAgoMs: dbg.lastSfxAt ? Math.round(performance.now() - dbg.lastSfxAt) : -1,
    played: dbg.played,
    queued: dbg.queued,
    dropped: dbg.dropped,
    unlocks: dbg.unlocks,
    music: music?.track ?? 'none',
    wantedMusic: wantMusic.track,
    ambience: activeAmb?.kind ?? 'none',
    volume,
    sfxVolume,
    musicVolume,
    reduced,
    muted: silent(),
    hidden,
    lastEvent: dbg.lastEvent,
  };
}

export function onAudioDebug(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
