/**
 * 사람(실제 비율, 약 7~7.5등신) — 원기둥·회전체·타원체로 조립. 얼굴은 최소(눈·입 없음): 실루엣과 빛으로 읽힌다.
 * 단령(둥근 깃 관복) 회전체 + 각대 + 넓은 소매 + 사모(뒤 높은 모체 + 양옆 날개) + 수염.
 * 옷 색은 증거가 아니다(화면 구분용).
 * 지역 좌표: 앞 = +x, 오른쪽 = +z, 위 = +y, 원점 = 바닥 위 몸 중심.
 */
import * as THREE from 'three';
import { Builder, trs } from './geo';
import type { HatId, Holding, PovFigure, PovPose, RobeId } from './types';
import { isSeatedPose } from './room';

export const ROBE: Record<RobeId, string> = {
  red: '#8e322c',
  'red-dark': '#6c2623',
  blue: '#3a4e66',
  green: '#30584a',
  messenger: '#3c3f40',
  clerk: '#bdb5a0',
  young: '#4a6376',
};

const SKIN = '#c49a78';
const HAT = '#141211';
const BEARD = '#4a4540';
const COLLAR = '#e2d8bf';
const BELT = '#2a2320';
const PAPER = '#efe3c4';

type P = [number, number, number];
const v = (p: P) => new THREE.Vector3(p[0], p[1], p[2]);

/** a→b 원뿔대(r0 at a, r1 at b) */
function cone(b: Builder, a: P, c: P, r0: number, r1: number, color: string, seg = 9, ao = false): void {
  const A = v(a);
  const Cc = v(c);
  const dir = Cc.clone().sub(A);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const m = new THREE.Matrix4().compose(A.clone().add(Cc).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  b.geo(g, m, color, { ao });
}

function ellipsoid(b: Builder, c: P, r: P, color: string, ry = 0, seg = 10, half = false, jitter = 0): void {
  const g = new THREE.SphereGeometry(1, seg, half ? 4 : Math.max(5, Math.round(seg * 0.6)), 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI);
  b.geo(g, trs(c[0], c[1], c[2], 0, ry, 0, r[0], r[1], r[2]), color, { ao: false, jitter });
}

/** 단령 몸통 회전체(서 있을 때 기준 높이). 앞뒤 두께는 0.62배 */
function robeBody(b: Builder, color: string, dy: number, standing: boolean): void {
  const prof: [number, number][] = standing
    ? [[0.34, 0.0], [0.33, 0.05], [0.285, 0.45], [0.222, 0.84], [0.205, 0.97], [0.218, 1.16], [0.232, 1.29], [0.205, 1.365], [0.13, 1.405], [0.06, 1.425], [0.001, 1.43]]
    : [[0.215, 0.84], [0.205, 0.97], [0.218, 1.16], [0.232, 1.29], [0.205, 1.365], [0.13, 1.405], [0.06, 1.425], [0.001, 1.43]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y + dy)), 16);
  g.computeVertexNormals();
  b.geo(g, trs(0, 0, 0, 0, 0, 0, 0.62, 1, 1), color, { ao: false, shade: (_x, y) => 0.82 + 0.18 * Math.min(1, Math.max(0, (y - dy - 0.7) / 0.6)) });
}

function hat(b: Builder, kind: HatId, hy: number, lean: THREE.Matrix4): void {
  if (kind === 'none') return;
  const hb = new Builder(5);
  if (kind === 'samo') {
    // 앞 낮은 부분
    hb.geo(new THREE.CylinderGeometry(0.098, 0.102, 0.075, 14), trs(0.004, hy + 0.06, 0, 0, 0, 0, 1.05, 1, 0.86), HAT, { ao: false });
    // 뒤 높은 모체
    hb.geo(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), trs(-0.035, hy + 0.1, 0, 0, 0, 0, 0.075, 0.085, 0.072), HAT, { ao: false });
    hb.geo(new THREE.CylinderGeometry(0.075, 0.078, 0.05, 12), trs(-0.035, hy + 0.085, 0, 0, 0, 0, 1, 1, 0.95), HAT, { ao: false });
    // 양옆 날개(뿔): 얇은 타원판, 살짝 위로
    for (const s of [-1, 1]) {
      hb.geo(new THREE.SphereGeometry(1, 10, 5), trs(-0.075, hy + 0.13, s * 0.165, 0, 0, s * 8, 0.012, 0.042, 0.105), HAT, { ao: false });
      hb.geo(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 4), trs(-0.075, hy + 0.13, s * 0.075, 90, 0, 0), HAT, { ao: false });
    }
  } else {
    // 서리: 검은 천 건(단순)
    hb.geo(new THREE.CylinderGeometry(0.088, 0.1, 0.1, 10), trs(-0.01, hy + 0.05, 0, 0, 0, -8, 1.05, 1, 0.88), HAT, { ao: false });
    hb.box(-0.09, hy + 0.04, 0, 0.02, 0.12, 0.1, HAT, 0, { ao: false });
  }
  b.geo(hb.build(), lean, null, { ao: false });
}

interface ArmPose {
  e: P;
  w: P;
}

function armPoses(pose: PovPose, base: number): { L: ArmPose; R: ArmPose; lean: number } {
  // base = 어깨 높이
  const sh = base;
  const A = (ex: number, ey: number, ez: number, wx: number, wy: number, wz: number): ArmPose => ({ e: [ex, sh + ey, ez], w: [wx, sh + wy, wz] });
  switch (pose) {
    case 'standing':
      return { L: A(0.05, -0.27, -0.23, 0.2, -0.36, -0.045), R: A(0.05, -0.27, 0.23, 0.2, -0.36, 0.045), lean: 0 };
    case 'standing-reading':
      return { L: A(0.08, -0.26, -0.24, 0.32, -0.22, -0.17), R: A(0.08, -0.26, 0.24, 0.32, -0.22, 0.17), lean: 3 };
    case 'standing-carrying':
      return { L: A(0.06, -0.24, -0.24, 0.28, -0.24, -0.13), R: A(0.06, -0.24, 0.24, 0.28, -0.24, 0.13), lean: -3 };
    case 'seated':
      return { L: A(0.06, -0.26, -0.24, 0.26, -0.38, -0.12), R: A(0.06, -0.26, 0.24, 0.26, -0.38, 0.12), lean: 2 };
    case 'seated-reading':
      return { L: A(0.08, -0.25, -0.23, 0.3, -0.13, -0.13), R: A(0.08, -0.25, 0.23, 0.3, -0.13, 0.13), lean: 6 };
    case 'seated-writing':
      return { L: A(0.06, -0.26, -0.24, 0.26, -0.38, -0.12), R: A(0.12, -0.24, 0.22, 0.42, -0.3, 0.1), lean: 14 };
    case 'seated-address':
      return { L: A(0.14, -0.24, -0.23, 0.36, -0.42, -0.14), R: A(0.14, -0.24, 0.23, 0.36, -0.42, 0.14), lean: 18 };
  }
}

function sleeve(b: Builder, s: P, a: ArmPose, color: string): void {
  // 위팔: 어깨 → 팔꿈치
  cone(b, s, a.e, 0.065, 0.08, color, 8);
  // 아래팔 + 넓은 소매(손목 쪽이 넓다)
  cone(b, a.e, a.w, 0.08, 0.125, color, 9);
  // 늘어진 소매 자락: 팔 아래로 처진 판
  const mid: P = [(a.e[0] + a.w[0]) / 2, (a.e[1] + a.w[1]) / 2, (a.e[2] + a.w[2]) / 2];
  cone(b, [mid[0] + 0.02, mid[1] - 0.02, mid[2]], [mid[0] - 0.03, mid[1] - 0.27, mid[2] * 1.05], 0.11, 0.06, color, 8);
  // 손(소매 끝에서 조금 나옴)
  const d = v(a.w).sub(v(a.e)).normalize().multiplyScalar(0.06);
  const hc: P = [a.w[0] + d.x, a.w[1] + d.y, a.w[2] + d.z];
  b.geo(new THREE.SphereGeometry(1, 7, 5), trs(hc[0], hc[1], hc[2], 0, 0, 0, 0.045, 0.035, 0.03), SKIN, { ao: false });
}

function held(b: Builder, kind: Holding, L: ArmPose, R: ArmPose, standing: boolean): void {
  if (kind === 'none') return;
  const cx = (L.w[0] + R.w[0]) / 2 + 0.07;
  const cy = (L.w[1] + R.w[1]) / 2;
  const cz = (L.w[2] + R.w[2]) / 2;
  switch (kind) {
    case 'paper': {
      const wdt = standing ? 0.44 : 0.32;
      b.geo(new THREE.BoxGeometry(0.004, 0.3, wdt), trs(cx + 0.02, cy + 0.12, cz, 0, 0, -22), PAPER, { ao: false });
      // 접힌 자국(가운데 두 줄)
      for (const f of [-1 / 3, 1 / 3]) b.geo(new THREE.BoxGeometry(0.006, 0.3, 0.004), trs(cx + 0.025, cy + 0.12, cz + f * wdt, 0, 0, -22), '#cdbf9e', { ao: false });
      break;
    }
    case 'scroll':
      cone(b, [cx, cy, cz - 0.2], [cx, cy, cz + 0.2], 0.025, 0.025, PAPER, 8);
      break;
    case 'bundle':
      b.box(cx, cy + 0.02, cz, 0.24, 0.16, 0.34, '#8a7a5a', 0, { ao: false });
      b.box(cx, cy + 0.02, cz, 0.25, 0.165, 0.03, '#2a2320', 0, { ao: false });
      break;
    case 'slips':
      for (let i = 0; i < 6; i++) b.geo(new THREE.BoxGeometry(0.003, 0.26, 0.085), trs(cx + 0.01 * i, cy + 0.1, cz + (i - 2.5) * 0.02, 0, (i - 2.5) * 7, -25), PAPER, { ao: false });
      break;
    case 'book':
      b.box(cx, cy + 0.03, cz, 0.2, 0.04, 0.28, '#3c4a52', 0, { ao: false });
      b.box(cx, cy + 0.03, cz, 0.19, 0.03, 0.29, '#d9caa6', 0, { ao: false });
      break;
  }
}

/** 인물 메시(지역 좌표). 위치·방향은 호출 쪽이 정한다 */
export function buildFigure(f: PovFigure, seed = 1): THREE.Mesh {
  const b = new Builder(seed);
  const seated = isSeatedPose(f.pose);
  const robeId: RobeId = f.robe ?? 'blue';
  const robe = ROBE[robeId];
  const hatKind: HatId = f.hat ?? (robeId === 'clerk' ? 'clerk-cap' : 'samo');
  const beard = f.beard ?? (hatKind === 'samo' && robeId !== 'young' && robeId !== 'messenger' ? 0.8 : 0);
  // 서 있을 때 엉덩이 관절 0.85 → 앉으면 방석 위 0.17
  const dy = seated ? 0.17 - 0.85 : 0;
  const { L, R, lean } = armPoses(f.pose, 1.29 + dy);

  // 아랫몸
  if (seated) {
    ellipsoid(b, [0.1, 0.06, 0], [0.36, 0.17, 0.44], robe, 0, 14, true);
    ellipsoid(b, [0.24, 0.11, -0.22], [0.15, 0.08, 0.15], robe, 0, 8);
    ellipsoid(b, [0.24, 0.11, 0.22], [0.15, 0.08, 0.15], robe, 0, 8);
    cone(b, [0, 0.06, 0], [0, 0.22, 0], 0.3, 0.22, robe, 14);
  }
  // 윗몸(기울기: 엉덩이 축 기준 앞으로)
  const hipY = seated ? 0.17 : 0.85;
  const leanM = new THREE.Matrix4()
    .makeTranslation(0, hipY, 0)
    .multiply(new THREE.Matrix4().makeRotationZ((-lean * Math.PI) / 180))
    .multiply(new THREE.Matrix4().makeTranslation(0, -hipY, 0));
  const ub = new Builder(seed + 1);
  robeBody(ub, robe, dy, !seated);
  // 둥근 깃 + 흰 동정
  ub.geo(new THREE.TorusGeometry(0.078, 0.017, 6, 16), trs(0.01, 1.4 + dy, 0, 90, 0, 0, 0.75, 1, 1), robe, { ao: false });
  ub.geo(new THREE.TorusGeometry(0.06, 0.009, 5, 14), trs(0.015, 1.425 + dy, 0, 90, 0, 0, 0.75, 1, 1), COLLAR, { ao: false });
  // 각대: 앞이 처진다
  ub.geo(new THREE.TorusGeometry(0.215, 0.018, 5, 18), trs(0.03, 0.96 + dy, 0, 90, 0, -9, 0.66, 1, 1), BELT, { ao: false });
  // 목 + 머리(얼굴 최소)
  cone(ub, [0, 1.38 + dy, 0], [0.012, 1.46 + dy, 0], 0.045, 0.043, SKIN, 7);
  const hy = 1.53 + dy;
  ellipsoid(ub, [0.012, hy, 0], [0.1, 0.116, 0.084], SKIN, 0, 12);
  ub.box(0.106, hy - 0.012, 0, 0.022, 0.04, 0.022, SKIN, 0, { ao: false }); // 코
  for (const s of [-1, 1]) ellipsoid(ub, [-0.005, hy - 0.005, s * 0.083], [0.018, 0.03, 0.012], SKIN, 0, 5);
  // 귀밑머리·상투 그늘(사모 아래 검은 머리 띠)
  ellipsoid(ub, [-0.03, hy + 0.035, 0], [0.09, 0.075, 0.086], '#1a1715', 0, 10);
  if (beard > 0) {
    cone(ub, [0.075, hy - 0.08, 0], [0.095 + beard * 0.02, hy - 0.08 - 0.13 * beard, 0], 0.04, 0.006, BEARD, 7);
    ub.box(0.1, hy - 0.05, 0, 0.012, 0.012, 0.06, BEARD, 0, { ao: false });
  }
  // 팔
  const shY = 1.29 + dy;
  sleeve(ub, [0, shY, -0.2], L, robe);
  sleeve(ub, [0, shY, 0.2], R, robe);
  held(ub, f.holding ?? 'none', L, R, !seated);
  b.geo(ub.build(), leanM, null, { ao: false });
  // 모자(머리와 같은 기울기)
  hat(b, hatKind, hy, leanM);

  const mesh = b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = f.id;
  return mesh;
}

/** 눈의 주인 자신의 소매·손(앞쪽 덮개). 세계 좌표에서 카메라 기저로 놓는다 */
export function buildSelf(robeId: RobeId, hands: 'rest' | 'hold-slips' | 'write', eye: THREE.Vector3, fwd: THREE.Vector3, at?: THREE.Vector3, withTag = false): THREE.Mesh {
  const b = new Builder(77);
  const robe = ROBE[robeId];
  const f = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
  const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
  const P = (o: THREE.Vector3): P => [o.x, o.y, o.z];
  const down = new THREE.Vector3(0, -1, 0);
  /** 눈 기준 점: 앞 a, 아래 d, 오른쪽 r(m) */
  const E = (a: number, d: number, r: number) => eye.clone().addScaledVector(f, a).addScaledVector(down, d).addScaledVector(right, r);
  const hand = (w: THREE.Vector3, dir: THREE.Vector3, s: number) => {
    const hc = w.clone().addScaledVector(dir, 0.05);
    b.geo(new THREE.SphereGeometry(1, 8, 6), trs(hc.x, hc.y, hc.z, 0, 0, 0, 0.046, 0.03, 0.05), SKIN, { ao: false });
    const fc = hc.clone().addScaledVector(dir, 0.045).addScaledVector(right, -s * 0.012);
    b.geo(new THREE.BoxGeometry(0.05, 0.018, 0.06), trs(fc.x, fc.y, fc.z, 0, 0, 0), SKIN, { ao: false });
  };
  if (hands === 'rest') {
    // 오른손이 무릎(또는 제 서안 모서리) 위에 놓인 소매: 화면 오른쪽 아래 모서리
    const e = E(0.2, 0.46, 0.34);
    const w = E(0.62, 0.36, 0.17);
    cone(b, P(E(-0.05, 0.25, 0.22)), P(e), 0.075, 0.09, robe, 10);
    cone(b, P(e), P(w), 0.09, 0.15, robe, 12);
    cone(b, P(e.clone().lerp(w, 0.5)), P(e.clone().lerp(w, 0.6).addScaledVector(down, 0.2)), 0.12, 0.07, robe, 9);
    hand(w, w.clone().sub(e).normalize(), 1);
    // 무릎 위 옷자락
    ellipsoid(b, P(E(0.42, 0.74, 0.0)), [0.34, 0.1, 0.36], robe, 0, 12);
  } else {
    const T = at ?? E(0.45, 0.4, 0);
    for (const s of [-1, 1]) {
      if (hands === 'write' && s < 0) continue;
      const w = T.clone().addScaledVector(right, s * (hands === 'write' ? 0.04 : 0.12)).addScaledVector(f, -0.05);
      const e = E(0.16, 0.62, s * 0.3);
      cone(b, P(E(-0.08, 0.3, s * 0.22)), P(e), 0.06, 0.07, robe, 10);
      cone(b, P(e), P(w), 0.07, 0.105, robe, 12);
      cone(b, P(e.clone().lerp(w, 0.4)), P(e.clone().lerp(w, 0.5).addScaledVector(down, 0.12)), 0.08, 0.04, robe, 9);
      hand(w, w.clone().sub(e).normalize(), s);
    }
    if (hands === 'hold-slips') {
      // 여섯 장의 종이 조각을 부채꼴로 쥔다 — 종이 면이 눈을 향하게 세움
      const toEye = eye.clone().sub(T).normalize();
      for (let i = 0; i < 6; i++) {
        const c = T.clone().addScaledVector(right, (i - 2.5) * 0.036).addScaledVector(f, 0.05 + Math.abs(i - 2.5) * -0.006).add(new THREE.Vector3(0, 0.06, 0));
        const g = new THREE.BoxGeometry(0.075, 0.24, 0.003);
        const m = new THREE.Matrix4().lookAt(c, c.clone().add(toEye), new THREE.Vector3(0, 1, 0));
        m.multiply(new THREE.Matrix4().makeRotationZ(((i - 2.5) * -5 * Math.PI) / 180));
        m.setPosition(c.addScaledVector(toEye, i * 0.004));
        b.geo(g, m, i % 2 ? '#e8dcbc' : PAPER, { ao: false });
      }
    }
  }
  void withTag;
  const mesh = b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }), true);
  mesh.name = 'self';
  return mesh;
}
