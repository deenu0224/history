/**
 * 사람(실제 비율, 약 7~7.5등신) — 원기둥·회전체·타원체로 조립. 얼굴은 최소(눈·입 없음): 실루엣과 빛으로 읽힌다.
 * 단령(둥근 깃 관복) 회전체 + 각대 + 넓은 소매(처진 자락·주름) + 사모(뒤 높은 모체 + 양옆 날개) + 수염.
 * 손은 손바닥 + 마디 둘인 손가락 넷 + 엄지(가까운 컷에서 덩어리로 보이지 않게).
 * 옷 색은 증거가 아니다(화면 구분용).
 * 지역 좌표: 앞 = +x, 오른쪽 = +z, 위 = +y, 원점 = 바닥 위 몸 중심.
 */
import * as THREE from 'three';
import { Builder, segs, trs } from './geo';
import type { HatId, Holding, PovFigure, PovPose, RobeId } from './types';

export const ROBE: Record<RobeId, string> = {
  red: '#8e322c',
  'red-dark': '#6c2623',
  blue: '#34485f',
  green: '#30584a',
  slate: '#4d555c',
  messenger: '#3c3f40',
  clerk: '#bdb5a0',
  young: '#4a6376',
  /** ep0 집현전 학사의 어두운 관복(재구성, 증거 아님) */
  ink: '#2c3440',
  /** ep0 임금의 붉은 포(곤룡포 계열 일반형, reconstructed — 문양 없음) */
  royal: '#9b3229',
};

export const SKIN = '#c49a78';
const SKIN_DARK = '#a77d5e';
const HAT = '#141211';
const BEARD = '#4a4540';
const COLLAR = '#e2d8bf';
const BELT = '#2a2320';
export const PAPER = '#efe3c4';
const LINING = '#d8cdb2';

type P = [number, number, number];
const v = (p: P) => new THREE.Vector3(p[0], p[1], p[2]);
const tp = (o: THREE.Vector3): P => [o.x, o.y, o.z];

const kneelPose = (p: PovPose) => p === 'kneel' || p === 'kneel-whisper' || p === 'kneel-point';
const seatedPose = (p: PovPose) => p.startsWith('seated');

/** a→b 원뿔대(r0 at a, r1 at b) */
export function cone(b: Builder, a: P, c: P, r0: number, r1: number, color: string, seg = 10, shade?: (x: number, y: number, z: number) => number): void {
  const A = v(a);
  const Cc = v(c);
  const dir = Cc.clone().sub(A);
  const len = dir.length();
  if (len < 1e-5) return;
  const g = new THREE.CylinderGeometry(r1, r0, len, segs(seg), 2, false);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const m = new THREE.Matrix4().compose(A.clone().add(Cc).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  b.geo(g, m, color, { ao: false, shade });
}

export function ellipsoid(b: Builder, c: P, r: P, color: string, ry = 0, seg = 10, half = false, jitter = 0): void {
  const g = new THREE.SphereGeometry(1, segs(seg), segs(half ? 4 : Math.max(5, Math.round(seg * 0.6))), 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI);
  b.geo(g, trs(c[0], c[1], c[2], 0, ry, 0, r[0], r[1], r[2]), color, { ao: false, jitter });
}

/** 임의 기저(f, n, s) 위의 타원체 */
function ellBasis(b: Builder, c: THREE.Vector3, f: THREE.Vector3, n: THREE.Vector3, s: THREE.Vector3, rf: number, rn: number, rs: number, color: string, seg = 8): void {
  const m = new THREE.Matrix4().makeBasis(f.clone().multiplyScalar(rf), n.clone().multiplyScalar(rn), s.clone().multiplyScalar(rs));
  m.setPosition(c);
  b.geo(new THREE.SphereGeometry(1, segs(seg), segs(Math.max(4, Math.round(seg * 0.7)))), m, color, { ao: false });
}

/**
 * 손: 손등 방향 n, 손가락 방향 f(손목 → 손끝), side = +1 오른손 / −1 왼손(엄지 쪽 결정).
 * curl 0 = 편 손, 1 = 쥔 손. scale 은 가까운 앞쪽 덮개에서 1.
 * spread > 0 이면 손가락을 부채꼴로 벌리고 사이에 그늘 틈을 둔다(가까운 내 손이 덩어리로 읽히지 않게). 기본 0 = 예전 그대로.
 */
export function hand(b: Builder, wrist: THREE.Vector3, fIn: THREE.Vector3, nIn: THREE.Vector3, side: number, curl = 0.35, scale = 1, skin = SKIN, spread = 0): void {
  const f = fIn.clone().normalize();
  const n = nIn.clone().sub(f.clone().multiplyScalar(nIn.dot(f))).normalize();
  const s = new THREE.Vector3().crossVectors(f, n).normalize().multiplyScalar(side);
  const k = scale;
  // 손목(소매 끝에서 이어지는 짧은 원뿔)
  cone(b, tp(wrist.clone().addScaledVector(f, -0.03 * k)), tp(wrist.clone().addScaledVector(f, 0.02 * k)), 0.026 * k, 0.028 * k, skin, 8);
  // 손바닥: 납작한 타원체, 엄지 쪽이 조금 두껍다
  const pc = wrist.clone().addScaledVector(f, 0.05 * k);
  ellBasis(b, pc, f, n, s, 0.05 * k, 0.017 * k, 0.041 * k, skin, 10);
  // 손등 마디 줄(살짝 밝게: 빛을 받는 능선)
  ellBasis(b, pc.clone().addScaledVector(f, 0.03 * k).addScaledVector(n, 0.006 * k), f, n, s, 0.014 * k, 0.012 * k, 0.04 * k, skin, 8);
  // 손가락 넷(마디 둘): 굽힘은 손바닥 쪽(−n)
  const knuck = pc.clone().addScaledVector(f, 0.045 * k);
  const lens = [0.03, 0.034, 0.033, 0.026];
  const tip = '#' + new THREE.Color(skin).multiplyScalar(1.12).getHexString();
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) * 0.019 * k * (1 + 0.18 * spread);
    // 부채꼴: 바깥 손가락일수록 옆으로 벌어진다
    const ff = f.clone().addScaledVector(s, -(i - 1.5) * 0.14 * spread).normalize();
    const c0 = knuck.clone().addScaledVector(s, -off).addScaledVector(f, i === 3 || i === 0 ? -0.005 * k : 0);
    const a1 = curl * 0.9 + i * 0.05;
    const d1 = ff.clone().multiplyScalar(Math.cos(a1)).addScaledVector(n, -Math.sin(a1));
    const c1 = c0.clone().addScaledVector(d1, lens[i] * k);
    const a2 = a1 + curl * 1.0 + 0.15;
    const d2 = ff.clone().multiplyScalar(Math.cos(a2)).addScaledVector(n, -Math.sin(a2));
    const c2 = c1.clone().addScaledVector(d2, lens[i] * 0.8 * k);
    const rr = spread > 0 ? 0.92 : 1;
    cone(b, tp(c0), tp(c1), 0.0095 * k * rr, 0.0085 * k * rr, skin, 6);
    cone(b, tp(c1), tp(c2), 0.0085 * k * rr, 0.0068 * k * rr, spread > 0 ? tip : i % 2 ? skin : SKIN_DARK, 6);
    // 마디 그늘(첫 마디 사이 틈): 손가락이 갈라져 읽히게
    if (spread > 0 && i < 3) {
      const g0 = c0.clone().addScaledVector(s, -0.0095 * k).addScaledVector(n, 0.002 * k);
      cone(b, tp(g0), tp(g0.clone().addScaledVector(d1, lens[i] * 0.55 * k)), 0.0035 * k, 0.002 * k, SKIN_DARK, 4);
    }
  }
  // 엄지: 손목 가까이 옆에서 앞·아래로
  const t0 = pc.clone().addScaledVector(s, 0.034 * k).addScaledVector(f, -0.022 * k).addScaledVector(n, -0.008 * k);
  const t1 = t0.clone().addScaledVector(f, 0.03 * k).addScaledVector(s, 0.014 * k).addScaledVector(n, -0.014 * k);
  const t2 = t1.clone().addScaledVector(f, 0.025 * k).addScaledVector(s, -0.004 * k).addScaledVector(n, -0.012 * k * (0.5 + curl));
  cone(b, tp(t0), tp(t1), 0.012 * k, 0.0105 * k, skin, 6);
  cone(b, tp(t1), tp(t2), 0.0105 * k, 0.008 * k, skin, 6);
}

/**
 * 넓은 소매(단령): 위팔 + 아래팔(손목 쪽이 넓다) + 아래로 처진 자락 + 주름 능선 + 소매 안 그늘(안감).
 * 방향 down 은 중력. 가까운 덮개에서는 seg 를 키운다.
 */
export function sleeveArm(b: Builder, s: THREE.Vector3, e: THREE.Vector3, w: THREE.Vector3, color: string, o: { width?: number; droop?: number; seg?: number; folds?: number } = {}): void {
  const W = o.width ?? 1;
  const seg = o.seg ?? 10;
  const droop = o.droop ?? 0.24;
  const col = new THREE.Color(color);
  const dark = '#' + col.clone().multiplyScalar(0.62).getHexString();
  const light = '#' + col.clone().multiplyScalar(1.14).getHexString();
  // 위팔
  cone(b, tp(s), tp(e), 0.066 * W, 0.078 * W, color, seg);
  ellipsoid(b, tp(e), [0.08 * W, 0.08 * W, 0.08 * W], color, 0, seg);
  // 아래팔 소매: 세 토막으로 나눠 조금씩 넓어지게(종 모양)
  const fw = w.clone().sub(e);
  const steps = 3;
  let prev = e.clone();
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p = e.clone().addScaledVector(fw, t);
    const r0 = (0.078 + 0.05 * ((i - 1) / steps) ** 1.4) * W;
    const r1 = (0.078 + 0.05 * t ** 1.4) * W;
    cone(b, tp(prev), tp(p), r0, r1, i === steps ? color : i % 2 ? color : light, seg);
    prev = p;
  }
  // 소매 끝 안쪽 그늘(입구): 손목보다 조금 안쪽에 어두운 원판
  const fdir = fw.clone().normalize();
  const cuff = w.clone().addScaledVector(fdir, -0.006);
  const cm = new THREE.Matrix4().compose(cuff, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), fdir), new THREE.Vector3(1, 1, 1));
  b.geo(new THREE.CylinderGeometry(0.118 * W, 0.118 * W, 0.008, seg), cm, dark, { ao: false });
  // 안감(흰 속옷 소매가 살짝 비침)
  cone(b, tp(w.clone().addScaledVector(fdir, -0.03)), tp(w.clone().addScaledVector(fdir, 0.012)), 0.045 * W, 0.05 * W, LINING, 8);
  // 처진 자락: 아래팔 아래로 늘어진 넓은 판(위는 팔, 아래는 둥근 자락)
  if (droop > 0) {
    const down = new THREE.Vector3(0, -1, 0);
    const side = new THREE.Vector3().crossVectors(fdir, down);
    if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
    side.normalize();
    const hang = down.clone().addScaledVector(fdir, -down.dot(fdir)).normalize();
    for (const [t, d, r] of [
      [0.45, 0.45, 0.85],
      [0.72, 0.7, 1],
      [0.92, 0.6, 0.85],
    ] as const) {
      const c = e.clone().addScaledVector(fw, t).addScaledVector(hang, droop * d * 0.55);
      ellBasis(b, c, fdir, hang, side, fw.length() * 0.24 * r, droop * d * 0.62, 0.05 * W, t === 0.72 ? color : dark, seg);
    }
  }
  // 주름 능선: 소매를 따라 비스듬한 가는 줄(밝은 쪽·어두운 쪽 번갈아)
  const folds = o.folds ?? 2;
  const up = new THREE.Vector3(0, 1, 0);
  const side2 = new THREE.Vector3().crossVectors(fdir, up).normalize();
  for (let i = 0; i < folds; i++) {
    const t0 = 0.2 + (i * 0.6) / Math.max(1, folds);
    const a = e.clone().addScaledVector(fw, t0).addScaledVector(side2, 0.07 * W * (i % 2 ? 1 : -1)).addScaledVector(up, 0.05 * W);
    const c = e.clone().addScaledVector(fw, t0 + 0.3).addScaledVector(side2, 0.06 * W * (i % 2 ? -1 : 1)).addScaledVector(up, 0.07 * W);
    cone(b, tp(a), tp(c), 0.012 * W, 0.016 * W, i % 2 ? dark : light, 5);
  }
}

function robeBody(b: Builder, color: string, dy: number, mode: 'stand' | 'seat' | 'kneel', build: number): void {
  const top: [number, number][] = [[0.205, 0.97], [0.218, 1.16], [0.232, 1.29], [0.205, 1.365], [0.13, 1.405], [0.06, 1.425], [0.001, 1.43]];
  const prof: [number, number][] =
    mode === 'stand'
      ? [[0.34, 0.0], [0.33, 0.05], [0.3, 0.3], [0.27, 0.55], [0.222, 0.84], ...top]
      : [[0.222, 0.8], ...top];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * build, y + dy)), segs(20));
  g.computeVertexNormals();
  b.geo(g, trs(0, 0, 0, 0, 0, 0, 0.62, 1, 1), color, { ao: false, shade: (_x, y) => 0.8 + 0.2 * Math.min(1, Math.max(0, (y - dy - 0.7) / 0.6)) });
  // 앞섶 여밈 선(단령의 오른쪽 여밈: 깃에서 옆구리로) — 실루엣 안의 작은 명암
  const dark = '#' + new THREE.Color(color).multiplyScalar(0.6).getHexString();
  cone(b, [0.135 * build, 1.36 + dy, 0.02], [0.13 * build, 1.0 + dy, 0.14 * build], 0.008, 0.008, dark, 4);
  if (mode === 'stand') {
    // 아랫자락 앞 주름(세로 능선 둘)
    for (const z of [-0.1, 0.1]) cone(b, [0.2 * build, 0.82, z], [0.205 * build, 0.06, z * 1.3], 0.012, 0.02, dark, 5);
  }
}

function hat(b: Builder, kind: HatId, hy0: number, m: THREE.Matrix4): void {
  if (kind === 'none') return;
  const hy = hy0 + 0.028;
  const hb = new Builder(5);
  if (kind === 'samo') {
    hb.geo(new THREE.CylinderGeometry(0.098, 0.103, 0.075, 16), trs(0.004, hy + 0.06, 0, 0, 0, 0, 1.05, 1, 0.86), HAT, { ao: false });
    hb.geo(new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), trs(-0.035, hy + 0.1, 0, 0, 0, 0, 0.076, 0.088, 0.073), HAT, { ao: false });
    hb.geo(new THREE.CylinderGeometry(0.075, 0.078, 0.05, 14), trs(-0.035, hy + 0.085, 0, 0, 0, 0, 1, 1, 0.95), HAT, { ao: false });
    // 앞 띠(살짝 밝은 능선: 사모의 형태가 어둠에서 읽히게)
    hb.geo(new THREE.TorusGeometry(0.1, 0.006, 4, 18), trs(0.004, hy + 0.025, 0, 90, 0, 0, 1.05, 0.86, 1), '#2a2622', { ao: false });
    for (const s of [-1, 1]) {
      hb.geo(new THREE.SphereGeometry(1, 12, 6), trs(-0.075, hy + 0.125, s * 0.165, 0, 0, s * 6, 0.01, 0.034, 0.095), HAT, { ao: false });
      hb.geo(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 4), trs(-0.075, hy + 0.13, s * 0.075, 90, 0, 0), HAT, { ao: false });
    }
  } else if (kind === 'ikseon') {
    // 익선관 윤곽(일반형, reconstructed): 앞이 낮은 띠 + 뒤가 높은 둥근 모체 + 모체 뒤에서 위로 곧추선 작은 두 날개. 장식·문양 없음
    hb.geo(new THREE.CylinderGeometry(0.099, 0.103, 0.05, 16), trs(0.004, hy + 0.045, 0, 0, 0, 0, 1.05, 1, 0.88), HAT, { ao: false });
    hb.geo(new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), trs(-0.028, hy + 0.06, 0, 0, 0, 0, 0.078, 0.088, 0.074), HAT, { ao: false });
    hb.geo(new THREE.TorusGeometry(0.102, 0.006, 4, 18), trs(0.004, hy + 0.024, 0, 90, 0, 0, 1.05, 0.86, 1), '#2a2622', { ao: false });
    for (const s of [-1, 1]) hb.geo(new THREE.SphereGeometry(1, 12, 6), trs(-0.085, hy + 0.15, s * 0.04, s * 12, 0, 6, 0.009, 0.042, 0.03), HAT, { ao: false });
  } else {
    hb.geo(new THREE.CylinderGeometry(0.088, 0.1, 0.1, 12), trs(-0.01, hy + 0.05, 0, 0, 0, -8, 1.05, 1, 0.88), HAT, { ao: false });
    hb.box(-0.09, hy + 0.04, 0, 0.02, 0.12, 0.1, HAT, 0, { ao: false });
  }
  b.geo(hb.build(), m, null, { ao: false });
}

interface ArmPose {
  e: P;
  w: P;
  /** 손가락 방향(없으면 아래팔 방향) */
  f?: P;
  /** 손등 방향(없으면 위) */
  n?: P;
  curl?: number;
}

function armPoses(pose: PovPose, sh: number): { L: ArmPose; R: ArmPose; lean: number } {
  const A = (ex: number, ey: number, ez: number, wx: number, wy: number, wz: number, extra: Partial<ArmPose> = {}): ArmPose => ({ e: [ex, sh + ey, ez], w: [wx, sh + wy, wz], ...extra });
  switch (pose) {
    case 'standing': // 공수: 두 손을 배 앞에 모아 소매 속에
      return { L: A(0.06, -0.27, -0.22, 0.2, -0.38, -0.03, { curl: 0.6 }), R: A(0.06, -0.27, 0.22, 0.2, -0.38, 0.03, { curl: 0.6 }), lean: 0 };
    case 'standing-reading':
      return { L: A(0.08, -0.26, -0.24, 0.32, -0.2, -0.17, { f: [0.2, 0.6, 0], n: [-1, 0.2, 0] }), R: A(0.08, -0.26, 0.24, 0.32, -0.2, 0.17, { f: [0.2, 0.6, 0], n: [-1, 0.2, 0] }), lean: 3 };
    case 'standing-carrying':
      return { L: A(0.06, -0.24, -0.24, 0.28, -0.24, -0.13), R: A(0.06, -0.24, 0.24, 0.28, -0.24, 0.13), lean: -3 };
    case 'standing-placing':
      return { L: A(0.16, -0.24, -0.22, 0.44, -0.42, -0.13, { f: [1, -0.5, 0], curl: 0.2 }), R: A(0.16, -0.24, 0.22, 0.44, -0.42, 0.13, { f: [1, -0.5, 0], curl: 0.2 }), lean: 24 };
    case 'standing-reach':
      return { L: A(0.2, -0.2, -0.22, 0.5, -0.3, -0.12, { f: [1, -0.2, 0], n: [0, -1, 0], curl: 0.25 }), R: A(0.2, -0.2, 0.22, 0.5, -0.3, 0.12, { f: [1, -0.2, 0], n: [0, -1, 0], curl: 0.25 }), lean: 16 };
    case 'seated':
      return { L: A(0.06, -0.26, -0.24, 0.26, -0.38, -0.12), R: A(0.06, -0.26, 0.24, 0.26, -0.38, 0.12), lean: 2 };
    case 'seated-reading':
      return { L: A(0.08, -0.25, -0.23, 0.3, -0.13, -0.13, { f: [0.3, 0.6, 0.3], n: [-1, 0, 0] }), R: A(0.08, -0.25, 0.23, 0.3, -0.13, 0.13, { f: [0.3, 0.6, -0.3], n: [-1, 0, 0] }), lean: 6 };
    case 'seated-writing':
      return { L: A(0.08, -0.26, -0.24, 0.34, -0.42, -0.14, { f: [1, -0.3, 0.1], curl: 0.15 }), R: A(0.14, -0.24, 0.22, 0.44, -0.33, 0.1, { curl: 0.7 }), lean: 14 };
    case 'seated-folding':
      return { L: A(0.14, -0.25, -0.2, 0.44, -0.42, -0.07, { f: [1, -0.4, 0.3], curl: 0.4 }), R: A(0.14, -0.25, 0.2, 0.44, -0.42, 0.07, { f: [1, -0.4, -0.3], curl: 0.4 }), lean: 20 };
    case 'seated-address':
      return { L: A(0.14, -0.24, -0.23, 0.36, -0.42, -0.14, { f: [1, -0.6, 0], curl: 0.3 }), R: A(0.14, -0.24, 0.23, 0.36, -0.42, 0.14, { f: [1, -0.6, 0], curl: 0.3 }), lean: 22 };
    case 'kneel':
      return { L: A(0.06, -0.26, -0.22, 0.24, -0.4, -0.1, { curl: 0.5 }), R: A(0.06, -0.26, 0.22, 0.24, -0.4, 0.1, { curl: 0.5 }), lean: 6 };
    case 'kneel-whisper':
      // 오른손을 입가에(손등이 바깥), 왼손은 무릎
      return { L: A(0.06, -0.26, -0.22, 0.24, -0.42, -0.1, { curl: 0.5 }), R: A(0.12, -0.2, 0.2, 0.17, 0.12, 0.05, { f: [0.1, 1, -0.3], n: [0, 0, 1], curl: 0.15 }), lean: 22 };
    case 'kneel-point':
      return { L: A(0.06, -0.26, -0.22, 0.24, -0.42, -0.1, { curl: 0.5 }), R: A(0.22, -0.16, 0.2, 0.5, -0.12, 0.1, { f: [1, 0.05, 0], curl: 0.1 }), lean: 12 };
    case 'seated-present':
            // 두 손으로 접은 상소를 머리 앞 위로 받들어 올린다
      return { L: A(0.18, 0.1, -0.27, 0.3, 0.44, -0.18, { f: [0.1, 1, 0.15], n: [-1, 0, 0], curl: 0.35 }), R: A(0.18, 0.1, 0.27, 0.3, 0.44, 0.18, { f: [0.1, 1, -0.15], n: [-1, 0, 0], curl: 0.35 }), lean: 14 };
    case 'seated-bow':
      // 깊이 엎드림: 두 손을 앞 마루에 모은다(지역 좌표는 기울어진 윗몸 기준)
      return { L: A(0.22, -0.13, -0.24, 0.47, -0.06, -0.1, { f: [0.85, 0.5, 0.15], n: [-0.5, 0.85, 0], curl: 0.2 }), R: A(0.22, -0.13, 0.24, 0.47, -0.06, 0.1, { f: [0.85, 0.5, -0.15], n: [-0.5, 0.85, 0], curl: 0.2 }), lean: 52 };
    case 'seated-gesture':
      // 왼손은 무릎, 오른손을 앞으로 내밀어 말한다(손바닥 아래·조금 펼침)
      return { L: A(0.06, -0.26, -0.24, 0.26, -0.38, -0.12), R: A(0.2, -0.18, 0.28, 0.46, -0.06, 0.2, { f: [1, 0.15, -0.15], n: [0, 1, 0], curl: 0.12 }), lean: 12 };
  }
}

/** 접은 상소 크기(m)·기울기(도, + = 위가 드는 사람 쪽으로)·돌림(도, + = 겉장이 드는 사람의 오른쪽 뒤를 향함) — 재구성 */
const MEMORIAL = { w: 0.36, h: 0.56, tilt: 10, yaw: 32 } as const;
const memorialCenter = (L: ArmPose, R: ArmPose): P => [(L.w[0] + R.w[0]) / 2 + 0.03, (L.w[1] + R.w[1]) / 2 + 0.31, (L.w[2] + R.w[2]) / 2];

/** 상소 겉장 머리글 판(뒤쪽, 드는 사람 쪽 면). 글자는 픽셀 후처리가 찍는다(glyphs.ts MEMORIAL_HEAD_GLYPHS) */
function memorialHead(L: ArmPose, R: ArmPose, leanM: THREE.Matrix4): THREE.Mesh {
  const [mx, my, mz] = memorialCenter(L, R);
  const hb = new Builder(77);
  // 판 중심: 책 뒤 면에서 조금 뒤(지역 −x 를 책과 같이 돌린 방향)
  const d = 0.009;
  const off = new THREE.Vector3(-d, 0, 0).applyEuler(new THREE.Euler(0, (MEMORIAL.yaw * Math.PI) / 180, (MEMORIAL.tilt * Math.PI) / 180));
  hb.geo(new THREE.BoxGeometry(0.003, MEMORIAL.h - 0.03, MEMORIAL.w - 0.03), trs(mx + off.x, my + off.y, mz + off.z, 0, MEMORIAL.yaw, MEMORIAL.tilt), '#e6d8b4', { ao: false });
  const g = hb.build();
  g.applyMatrix4(leanM);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.name = 'detail:d_scroll_head';
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function held(b: Builder, kind: Holding, L: ArmPose, R: ArmPose, standing: boolean): void {
  if (kind === 'none') return;
  const cx = (L.w[0] + R.w[0]) / 2 + 0.07;
  const cy = (L.w[1] + R.w[1]) / 2;
  const cz = (L.w[2] + R.w[2]) / 2;
  switch (kind) {
    case 'paper': {
      const wdt = standing ? 0.46 : 0.34;
      b.geo(new THREE.BoxGeometry(0.004, 0.3, wdt), trs(cx + 0.02, cy + 0.12, cz, 0, 0, -22), PAPER, { ao: false });
      for (const f of [-1 / 3, 1 / 3]) b.geo(new THREE.BoxGeometry(0.006, 0.3, 0.004), trs(cx + 0.025, cy + 0.12, cz + f * wdt, 0, 0, -22), '#cdbf9e', { ao: false });
      break;
    }
    case 'paper-folded':
      b.geo(new THREE.BoxGeometry(0.02, 0.24, 0.1), trs(cx - 0.02, cy + 0.04, cz, 0, 0, -10), PAPER, { ao: false });
      break;
    case 'scroll':
      cone(b, [cx, cy, cz - 0.2], [cx, cy, cz + 0.2], 0.025, 0.025, PAPER, 8);
      break;
    case 'bundle':
      b.box(cx, cy + 0.02, cz, 0.24, 0.16, 0.34, '#8a7a5a', 0, { ao: false });
      b.box(cx, cy + 0.02, cz, 0.25, 0.165, 0.03, '#2a2320', 0, { ao: false });
      break;
    case 'sealed':
      // 보자기로 싸서 끈으로 묶은 꾸러미(재구성: 일반형)
      b.box(cx, cy + 0.03, cz, 0.2, 0.12, 0.3, '#5d4a33', 0, { ao: false });
      ellipsoid(b, [cx, cy + 0.1, cz], [0.06, 0.035, 0.06], '#5d4a33', 0, 8);
      b.box(cx, cy + 0.03, cz, 0.205, 0.125, 0.02, '#1f1a16', 0, { ao: false });
      b.box(cx, cy + 0.03, cz, 0.02, 0.125, 0.305, '#1f1a16', 0, { ao: false });
      break;
    case 'slips':
      for (let i = 0; i < 6; i++) b.geo(new THREE.BoxGeometry(0.003, 0.26, 0.085), trs(cx + 0.01 * i, cy + 0.1, cz + (i - 2.5) * 0.02, 0, (i - 2.5) * 7, -25), PAPER, { ao: false });
      break;
    case 'book':
      b.box(cx, cy + 0.03, cz, 0.2, 0.04, 0.28, '#3c4a52', 0, { ao: false });
      b.box(cx, cy + 0.03, cz, 0.19, 0.03, 0.29, '#d9caa6', 0, { ao: false });
      break;
    case 'memorial': {
      // 접은 상소(무늬 없는 두꺼운 한지 책, 재구성 크기). 앞(임금 쪽)은 글자를 그리지 않는다 — 자모 모양 미확인(HISTORICAL_SOURCES §13.4-7).
      // 겉장 머리글은 따로 이름 붙은 판(memorialHead)이 뒤쪽(드는 사람 쪽)에 붙는다
      const [mx, my, mz] = memorialCenter(L, R);
      b.geo(new THREE.BoxGeometry(0.014, MEMORIAL.h, MEMORIAL.w), trs(mx, my, mz, 0, MEMORIAL.yaw, MEMORIAL.tilt), PAPER, { ao: false });
      break;
    }
  }
}

/** 인물 메시(지역 좌표). 위치·방향은 호출 쪽이 정한다 */
export function buildFigure(f: PovFigure, seed = 1): THREE.Mesh {
  const b = new Builder(seed);
  const seated = seatedPose(f.pose);
  const kneel = kneelPose(f.pose);
  const k = f.build ?? 1;
  const robeId: RobeId = f.robe ?? 'blue';
  const robe = ROBE[robeId];
  const robeDark = '#' + new THREE.Color(robe).multiplyScalar(0.7).getHexString();
  const hatKind: HatId = f.hat ?? (robeId === 'clerk' ? 'clerk-cap' : 'samo');
  const beard = f.beard ?? (hatKind === 'samo' && robeId !== 'young' && robeId !== 'messenger' ? 0.8 : 0);
  // 서 있을 때 엉덩이 관절 0.85 → 앉으면 방석 위 0.17, 무릎 꿇으면(발뒤꿈치 위) 0.36
  const hipY = seated ? 0.17 : kneel ? 0.36 : 0.85;
  const dy = hipY - 0.85;
  const { L, R, lean: baseLean } = armPoses(f.pose, 1.29 + dy);
  const lean = f.lean ?? baseLean;

  // 아랫몸
  if (seated) {
    ellipsoid(b, [0.1, 0.06, 0], [0.37 * k, 0.17, 0.45 * k], robe, 0, 16, true);
    ellipsoid(b, [0.25, 0.11, -0.22 * k], [0.15, 0.085, 0.16], robe, 0, 10);
    ellipsoid(b, [0.25, 0.11, 0.22 * k], [0.15, 0.085, 0.16], robe, 0, 10);
    cone(b, [0, 0.06, 0], [0, 0.22, 0], 0.31 * k, 0.22 * k, robe, 16);
    // 무릎 위로 퍼진 자락의 접힌 선
    cone(b, [0.32, 0.17, -0.05], [0.42, 0.12, 0.08], 0.012, 0.016, robeDark, 5);
  } else if (kneel) {
    // 무릎 꿇음: 정강이는 바닥에, 허벅지는 앞으로
    ellipsoid(b, [-0.06, 0.12, 0], [0.24 * k, 0.13, 0.26 * k], robe, 0, 12);
    for (const s of [-1, 1]) {
      cone(b, [-0.02, 0.22, s * 0.11], [0.3, 0.14, s * 0.12], 0.1 * k, 0.085, robe, 10);
      ellipsoid(b, [0.3, 0.1, s * 0.12], [0.07, 0.08, 0.075], robe, 0, 8);
    }
    cone(b, [-0.05, 0.2, 0], [0, 0.45, 0], 0.24 * k, 0.21 * k, robe, 14);
  }
  // 윗몸(기울기: 엉덩이 축 기준 앞으로)
  const leanM = new THREE.Matrix4()
    .makeTranslation(0, hipY, 0)
    .multiply(new THREE.Matrix4().makeRotationZ((-lean * Math.PI) / 180))
    .multiply(new THREE.Matrix4().makeTranslation(0, -hipY, 0));
  const ub = new Builder(seed + 1);
  robeBody(ub, robe, dy, seated ? 'seat' : kneel ? 'kneel' : 'stand', k);
  // 둥근 깃 + 흰 동정
  ub.geo(new THREE.TorusGeometry(0.078, 0.017, 6, 18), trs(0.01, 1.4 + dy, 0, 90, 0, 0, 0.75, 1, 1), robe, { ao: false });
  ub.geo(new THREE.TorusGeometry(0.06, 0.009, 5, 16), trs(0.015, 1.425 + dy, 0, 90, 0, 0, 0.75, 1, 1), COLLAR, { ao: false });
  // 각대: 앞이 처진다(관원만)
  if (robeId !== 'clerk') ub.geo(new THREE.TorusGeometry(0.215 * k, 0.018, 5, 20), trs(0.03, 0.96 + dy, 0, 90, 0, -9, 0.66, 1, 1), BELT, { ao: false });
  else ub.geo(new THREE.TorusGeometry(0.2 * k, 0.01, 4, 18), trs(0.0, 1.0 + dy, 0, 90, 0, 0, 0.66, 1, 1), '#6b6252', { ao: false });
  // 목
  cone(ub, [0, 1.38 + dy, 0], [0.012, 1.46 + dy, 0], 0.045, 0.043, SKIN, 8);
  // 머리(얼굴 최소: 코·귀·턱 그늘, 눈·입 없음) — 머리 돌림은 목 축 기준
  const hy = 1.53 + dy;
  const hb = new Builder(seed + 2);
  ellipsoid(hb, [0.012, hy, 0], [0.1, 0.118, 0.084], SKIN, 0, 14);
  ellipsoid(hb, [0.04, hy - 0.06, 0], [0.065, 0.05, 0.07], SKIN_DARK, 0, 10); // 턱 아래 그늘
  hb.box(0.106, hy - 0.012, 0, 0.022, 0.04, 0.02, SKIN, 0, { ao: false }); // 코
  for (const s of [-1, 1]) ellipsoid(hb, [-0.005, hy - 0.005, s * 0.083], [0.018, 0.03, 0.012], SKIN_DARK, 0, 6);
  ellipsoid(hb, [-0.03, hy + 0.035, 0], [0.09, 0.075, 0.086], '#1a1715', 0, 12); // 머리털·망건
  if (beard > 0) {
    cone(hb, [0.075, hy - 0.08, 0], [0.095 + beard * 0.02, hy - 0.08 - 0.13 * beard, 0], 0.042, 0.006, BEARD, 8);
    hb.box(0.1, hy - 0.05, 0, 0.012, 0.012, 0.06, BEARD, 0, { ao: false });
  }
  const yaw = ((f.headYaw ?? 0) * Math.PI) / 180;
  const headM = new THREE.Matrix4().makeTranslation(0.01, hy - 0.08, 0).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeTranslation(-0.01, -(hy - 0.08), 0));
  ub.geo(hb.build(), headM, null, { ao: false });
  // 팔
  const shY = 1.29 + dy;
  for (const [side, a] of [[-1, L], [1, R]] as const) {
    const S = new THREE.Vector3(0, shY, side * 0.2 * k);
    const E = v(a.e);
    const Wr = v(a.w);
    sleeveArm(ub, S, E, Wr, robe, { width: robeId === 'clerk' ? 0.72 : 1, droop: robeId === 'clerk' ? 0.08 : 0.24, seg: 10, folds: 1 });
    const fdir = a.f ? v(a.f).normalize() : Wr.clone().sub(E).normalize();
    const n = a.n ? v(a.n) : new THREE.Vector3(0, 1, 0).addScaledVector(fdir, -fdir.y);
    hand(ub, Wr, fdir, n.lengthSq() < 1e-4 ? new THREE.Vector3(0, 0, side) : n, side, a.curl ?? 0.4, 0.95);
  }
  held(ub, f.holding ?? 'none', L, R, !seated && !kneel);
  b.geo(ub.build(), leanM, null, { ao: false });
  // 모자(머리와 같은 기울기·돌림)
  hat(b, hatKind, hy, leanM.clone().multiply(headM));

  const mesh = b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = f.id;
  if (f.holding === 'memorial') mesh.add(memorialHead(L, R, leanM));
  return mesh;
}
