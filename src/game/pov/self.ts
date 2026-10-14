/**
 * 눈의 주인 자신의 몸(앞쪽 덮개, ART_DIRECTION_V5 §5 / DESIGN_V5 A2·A3).
 * - 쉬는 손(rest·rest-left·rest-both): 카메라 공간에 고정 — 어느 시선이든 화면 아래 모서리에 소매가 들어온다(화면 문법).
 * - 일하는 손(write·read·seal·hold-slips): 세계의 한 점(at)에 손이 닿고, 팔은 화면 아래 바깥에서 들어온다.
 * 증인마다 실루엣이 다르다: 윤효손 오른손+붓 · 이극돈 오른손+종이 · 어세겸 두 소매를 모음(공수) · 홍귀달 왼손+책.
 * 내 소매는 늘 내 몸 그늘 속이라 색을 한 단 밝힌다(화면 문법 — 장면 밖 조명 아님).
 */
import * as THREE from 'three';
import { Builder } from './geo';
import { PAPER, ROBE, cone, hand } from './figure';
import type { PovCamera } from './camera';
import type { SelfRig } from './types';

/** 내 손은 내 몸 그늘 속 — 소매처럼 한 단 밝힌다(화면 문법) */
const SELF_SKIN = '#cd9f7b';
const V = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);
/** 소매 안감 가장자리(입구 테두리) · 속옷 소매(손목을 감싸는 흰 무명) */
const CUFF_LINING = '#cbbd9c';
const UNDER_SLEEVE = '#c4b796';

/**
 * 내 소매(단령의 넓은 소매) — 어깨 → 팔꿈치 → 소매 입구를 잇는 곡선을 따라 단면을 이어 붙인다.
 * 단면은 위가 팔에 붙고 아래로 자락이 처지는 물방울꼴(입구 쪽일수록 넓고 깊다). 비스듬한 주름 물결 + 팔꿈치 접힘,
 * 입구는 열려 있다: 안쪽 면(깊을수록 어두움) + 밝은 안감 테두리 → 통이 아니라 천으로 읽힌다.
 */
function drapeSleeve(b: Builder, pts: THREE.Vector3[], color: string, o: { W: number; hang: number; seed: number; side: THREE.Vector3 }): void {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const NL = 30;
  const M = 24;
  const base = new THREE.Color(color);
  const inside = base.clone().multiplyScalar(0.22);
  const lip = new THREE.Color(CUFF_LINING);
  const down = new THREE.Vector3(0, -1, 0);
  /** 곡선 위 t 의 기저: 점 p, 옆 s, 위 u(중력 반대, 접선에 수직) */
  const frameAt = (t: number) => {
    const tt = Math.max(0, Math.min(1, t));
    const p = curve.getPointAt(tt);
    const T = curve.getTangentAt(tt).normalize();
    let g = down.clone().addScaledVector(T, -down.dot(T));
    if (g.lengthSq() < 0.04) g = o.side.clone().cross(T).negate();
    g.normalize();
    let sv = new THREE.Vector3().crossVectors(T, g).normalize();
    if (sv.dot(o.side) < 0) sv = sv.negate();
    return { p, s: sv, u: g.clone().negate() };
  };
  const sm = (a: number, c: number, x: number) => {
    const q = Math.max(0, Math.min(1, (x - a) / (c - a)));
    return q * q * (3 - 2 * q);
  };
  /** 단면 점(지역 x = 옆, y = 위) */
  const sect = (t: number, phi: number, inset = 1): [number, number, number] => {
    const W = o.W;
    const ra = (0.062 - 0.008 * t) * W;
    const rw = (0.074 + 0.07 * sm(0.3, 1, t)) * W;
    const hd = o.hang * (0.15 + 0.85 * sm(0.25, 1, t) ** 1.3);
    const u = Math.cos(phi);
    const v = Math.sin(phi);
    let x: number;
    let y: number;
    if (v >= 0) {
      x = rw * u;
      y = ra * v;
    } else {
      x = rw * u * (1 - 0.3 * -v * t);
      y = -(ra + hd) * (-v) ** 1.15;
    }
    // 비스듬한 주름 물결 + 팔꿈치 접힘
    const wave = Math.sin(5 * phi + 13 * t + o.seed * 1.7);
    const elbow = Math.sin(t * 34 + o.seed) * Math.exp(-(((t - 0.42) / 0.14) ** 2));
    const a = 1 + 0.1 * wave * (0.35 + 0.65 * t) + 0.07 * elbow;
    const shade = (0.64 + 0.36 * (0.5 + 0.5 * wave)) * (v < 0 ? 1 - 0.38 * -v : 1) * (1 - 0.12 * Math.max(0, elbow));
    return [x * a * inset, y * a * inset, shade];
  };
  /** 입구를 비스듬히 자른다: 위(팔 쪽)가 짧고 아래 자락이 길다 → 위에서 내려다보면 안감이 보인다 */
  const CUT = 0.1;
  const tEff = (t: number, phi: number) => t - CUT * Math.max(0, Math.sin(phi)) * sm(0.62, 1, t);
  const vert = (t: number, phi: number, inset: number) => {
    const te = tEff(t, phi);
    const F = frameAt(te);
    const [x, y, sh] = sect(te, phi, inset);
    return { q: F.p.clone().addScaledVector(F.s, x).addScaledVector(F.u, y), sh, te };
  };
  const surface = (t0: number, inset: number, colorAt: (t: number, shade: number) => THREE.Color, flip: boolean) => {
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const i0 = Math.round(t0 * NL);
    for (let i = i0; i <= NL; i++) {
      const t = i / NL;
      for (let j = 0; j < M; j++) {
        const { q, sh, te } = vert(t, (j / M) * Math.PI * 2, inset);
        pos.push(q.x, q.y, q.z);
        const c = colorAt(te, sh);
        col.push(c.r, c.g, c.b);
      }
    }
    const rows = NL - i0;
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < M; j++) {
        const a = i * M + j;
        const bb = i * M + ((j + 1) % M);
        const c = (i + 1) * M + j;
        const d = (i + 1) * M + ((j + 1) % M);
        if (flip) idx.push(a, bb, c, bb, d, c);
        else idx.push(a, c, bb, bb, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    b.geo(g, new THREE.Matrix4(), null, { ao: false });
  };
  const tmp = new THREE.Color();
  surface(0, 1, (_t, sh) => tmp.copy(base).multiplyScalar(sh), false);
  // 안쪽 면: 입구에서 깊어질수록 어둡다
  surface(0.6, 0.86, (t, sh) => tmp.copy(inside).lerp(lip.clone().multiplyScalar(0.5), sm(0.75, 0.99, t)).multiplyScalar(0.75 + 0.25 * sh), true);
  // 입구 테두리: 바깥 단면과 안쪽 단면을 잇는 밝은 안감 띠
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j < M; j++) {
    const phi = (j / M) * Math.PI * 2;
    for (const inset of [1, 0.86]) {
      const { q, sh } = vert(1, phi, inset);
      pos.push(q.x, q.y, q.z);
      const c = lip.clone().multiplyScalar(0.75 + 0.25 * sh);
      col.push(c.r, c.g, c.b);
    }
    const a = j * 2;
    const n = ((j + 1) % M) * 2;
    idx.push(a, a + 1, n, n, a + 1, n + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  b.geo(g, new THREE.Matrix4(), null, { ao: false });
}

export function buildSelf(rig: SelfRig, cam: PovCamera, at?: THREE.Vector3): THREE.Mesh {
  const b = new Builder(77);
  const robe = '#' + new THREE.Color(ROBE[rig.robe]).multiplyScalar(1.55).getHexString();
  const eye = V(cam.eye);
  const fwd = V(cam.forward);
  const right = V(cam.right);
  const up = V(cam.up);
  const tanV = Math.tan((cam.fovDeg * Math.PI) / 360);
  const tanH = tanV * cam.aspect;
  const k0 = rig.scale ?? 1;
  // 쉬는 손은 화면 공간에서 같은 크기로 보이게: 좁은 시야(먼 곳을 응시)일수록 덮개를 그만큼 작게·가깝게
  const resting = rig.hands === 'rest' || rig.hands === 'rest-left' || rig.hands === 'rest-both';
  const tanRef = Math.tan((27.5 * Math.PI) / 180);
  const k = resting ? k0 * Math.min(1.4, tanV / tanRef) : k0;
  /** 아주 넓은 시야(파노라마)에서는 크기 대신 거리로 맞춘다: 손이 마루 밑·서안 밑으로 가라앉지 않게 */
  const rd = (d: number) => d * (resting ? Math.min(1, (1.4 * tanRef) / tanV) : 1);
  /** 화면 정규 좌표(sx, sy ∈ −1..1, 아래가 −) + 깊이 d(m) → 세계 */
  const shift = cam.shiftTan ?? 0;
  const ndc = (sx: number, sy: number, d: number) => eye.clone().addScaledVector(fwd, d).addScaledVector(right, sx * d * tanH).addScaledVector(up, (sy * tanV + shift) * d);
  const worldUp = new THREE.Vector3(0, 1, 0);
  // 수평 기저(몸): 고개를 숙여도 어깨는 수평
  const hf = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
  const hr = new THREE.Vector3().crossVectors(hf, worldUp).normalize();
  /** 세계 점 → (sx, sy, d) 화면 정규 좌표 */
  const toNdc = (p: THREE.Vector3) => {
    const d = p.clone().sub(eye);
    const z = d.dot(fwd);
    return { sx: d.dot(right) / (z * tanH), sy: (d.dot(up) / z - shift) / tanV, d: z };
  };
  // 어깨는 화면 아래 바깥(카메라 가까이 지나가지 않게): 팔이 늘 화면 모서리 바깥에서 들어온다
  const shoulder = (s: number, d = 0.3) => ndc(s * 1.9, -2.7, d);

  /**
   * 팔 하나: 어깨(화면 밖) → 팔꿈치 e → 손목 w. 소매 입구는 손목보다 조금 안쪽에서 끝나고, 그 사이로 흰 속옷 소매와
   * 손목 살이 보인다(hidden = 공수처럼 손이 소매 속).
   */
  const arm = (s: number, e: THREE.Vector3, w: THREE.Vector3, o: { droop?: number; width?: number; hidden?: boolean } = {}) => {
    const W = (o.width ?? 0.8) * k;
    const fd = w.clone().sub(e).normalize();
    const back = o.hidden ? 0 : 0.045 * Math.max(0.8, W);
    const cuff = w.clone().addScaledVector(fd, -back);
    const S = shoulder(s, Math.max(0.12, toNdc(e).d * 0.8));
    drapeSleeve(b, [S, e, cuff], robe, { W, hang: (o.droop ?? 0.14) * k, seed: s > 0 ? 1 : 4, side: right.clone().multiplyScalar(s) });
    if (o.hidden) return;
    const r = 0.03 * Math.max(0.85, W);
    cone(b, [cuff.x - fd.x * 0.05, cuff.y - fd.y * 0.05, cuff.z - fd.z * 0.05], [cuff.x + fd.x * 0.016, cuff.y + fd.y * 0.016, cuff.z + fd.z * 0.016], r * 1.08, r, UNDER_SLEEVE, 12);
    cone(b, [cuff.x, cuff.y, cuff.z], [w.x + fd.x * 0.01, w.y + fd.y * 0.01, w.z + fd.z * 0.01], 0.027, 0.025, SELF_SKIN, 10);
  };
  /** 손목 w 에서 화면 아래 바깥으로 이어지는 팔꿈치 */
  const elbowFor = (w: THREE.Vector3, s: number) => {
    const q = toNdc(w);
    return ndc(q.sx * 1.15 + s * 0.55, Math.max(-1.25, q.sy - 0.5), q.d * 0.86);
  };

  /** 붓: 먹 묻은 털끝 + 대나무 자루(밝은 대 빛 — 어둠 속에서도 읽힌다) + 자루 끝 고리 */
  const brush = (tip: THREE.Vector3, dir: THREE.Vector3) => {
    const at = (t: number): [number, number, number] => [tip.x + dir.x * t, tip.y + dir.y * t, tip.z + dir.z * t];
    cone(b, at(0), at(0.038), 0.0012, 0.0075, '#141110', 8);
    cone(b, at(0.038), at(0.05), 0.0075, 0.0068, '#3a2a1c', 8);
    cone(b, at(0.05), at(0.23), 0.0066, 0.0062, '#a88a58', 8);
    cone(b, at(0.23), at(0.24), 0.0045, 0.0035, '#3a2a1c', 6);
  };
  const sheet = (c: THREE.Vector3, f: THREE.Vector3, s: THREE.Vector3, w: number, l: number, lines = 5) => {
    const m = new THREE.Matrix4().makeBasis(s, worldUp, f);
    m.setPosition(c);
    b.geo(new THREE.BoxGeometry(w, 0.003, l), m, PAPER, { ao: false });
    // 글줄을 암시하는 옅은 먹 줄(글자는 그리지 않는다)
    for (let i = 0; i < lines; i++) {
      const mm = new THREE.Matrix4().makeBasis(s, worldUp, f);
      mm.setPosition(c.clone().addScaledVector(s, (i - (lines - 1) / 2) * (w / (lines + 1))).addScaledVector(worldUp, 0.002));
      b.geo(new THREE.BoxGeometry(0.0028, 0.0015, l * 0.8), mm, '#ad9d80', { ao: false });
    }
  };
  const book = (c: THREE.Vector3, f: THREE.Vector3, s: THREE.Vector3, open: boolean) => {
    const m = new THREE.Matrix4().makeBasis(s, worldUp, f);
    m.setPosition(c);
    if (open) {
      for (const side of [-1, 1]) {
        const mm = new THREE.Matrix4().makeBasis(s, worldUp, f);
        mm.setPosition(c.clone().addScaledVector(s, side * 0.1).addScaledVector(worldUp, 0.008));
        mm.multiply(new THREE.Matrix4().makeRotationZ(side * 0.06));
        b.geo(new THREE.BoxGeometry(0.2, 0.012, 0.28), mm, '#e2d5b4', { ao: false });
        for (let i = 0; i < 4; i++) {
          const ml = new THREE.Matrix4().makeBasis(s, worldUp, f);
          ml.setPosition(c.clone().addScaledVector(s, side * (0.04 + i * 0.04)).addScaledVector(worldUp, 0.016));
          b.geo(new THREE.BoxGeometry(0.0028, 0.0015, 0.22), ml, '#ad9d80', { ao: false });
        }
      }
      b.geo(new THREE.BoxGeometry(0.42, 0.006, 0.29), m, '#3c4a52', { ao: false }); // 표지(남색 책의)
    } else {
      b.geo(new THREE.BoxGeometry(0.2, 0.03, 0.28), m, '#3c4a52', { ao: false });
      const mm = m.clone();
      mm.setPosition(c.clone().addScaledVector(worldUp, 0.001).addScaledVector(s, 0.004));
      b.geo(new THREE.BoxGeometry(0.19, 0.022, 0.285), mm, '#d9caa6', { ao: false });
    }
  };

  const item = rig.item ?? 'none';
  switch (rig.hands) {
    case 'none':
      break;
    case 'rest':
    case 'rest-left': {
      const s = rig.hands === 'rest' ? 1 : -1;
      // 팔꿈치를 화면 모서리 가까이 두어 소매 자락(처짐·주름·입구)이 아래 모서리에 들어오게
      const e = ndc(s * 1.08, -1.22, rd(0.56));
      const w = ndc(s * 0.58, -0.8, rd(0.78));
      arm(s, e, w, { droop: 0.2, width: 0.9 });
      const f = w.clone().sub(e).normalize().addScaledVector(right, -s * 0.35).normalize();
      hand(b, w, f, worldUp, s, item === 'book' ? 0.15 : 0.55, k, SELF_SKIN, 0.4);
      if (item === 'brush') brush(w.clone().addScaledVector(f, 0.11 * k).addScaledVector(worldUp, -0.01), f.clone().multiplyScalar(-0.4).addScaledVector(worldUp, 0.9).addScaledVector(right, s * 0.3).normalize());
      if (item === 'sheet') sheet(w.clone().addScaledVector(f, 0.12 * k).addScaledVector(worldUp, -0.02), hf, hr, 0.2, 0.3);
      if (item === 'book') book(w.clone().addScaledVector(f, 0.1 * k).addScaledVector(worldUp, -0.035).addScaledVector(right, -s * 0.06), hf, hr, false);
      break;
    }
    case 'rest-both': {
      // 공수: 두 소매가 아래 가운데서 만나고 손은 소매 속(손이 보이지 않는 실루엣)
      if (at) {
        // 맞잡은 두 소매를 서안 앞 가장자리에 얹는다(넓은 시야에서 무릎은 화면 밖이라 — 소매가 서안 위로 들어온다)
        for (const s of [-1, 1]) {
          const w = at.clone().addScaledVector(hr, s * 0.05);
          const e = at.clone().addScaledVector(hr, s * 0.4).addScaledVector(hf, -0.1).addScaledVector(worldUp, 0.01);
          arm(s, e, w, { droop: 0.06, width: 0.82, hidden: true });
        }
        break;
      }
      for (const s of [-1, 1]) {
        const e = ndc(s * 1.2, -1.5, rd(0.58));
        const w = ndc(s * 0.14, -1.0, rd(0.8));
        arm(s, e, w, { droop: 0.16, width: 0.85, hidden: true });
      }
      break;
    }
    default: {
      const T = at ?? eye.clone().addScaledVector(hf, 0.5).addScaledVector(worldUp, -0.42);
      const sides = rig.hands === 'write' ? [1, -1] : [-1, 1];
      for (const s of sides) {
        let w: THREE.Vector3;
        let f: THREE.Vector3;
        let n = worldUp.clone();
        let curl = 0.35;
        let spread = 0.4;
        if (rig.hands === 'write') {
          // 오른손: 붓을 세워 쥔다(손목을 들어 올림) / 왼손: 종이 가장자리를 손가락을 펴서 누른다
          w = s > 0 ? T.clone().addScaledVector(hr, 0.05).addScaledVector(hf, -0.13).addScaledVector(worldUp, 0.12) : T.clone().addScaledVector(hr, item === 'book' ? -0.21 : -0.2).addScaledVector(hf, item === 'book' ? -0.13 : -0.17).addScaledVector(worldUp, 0.026);
          f = s > 0 ? hf.clone().multiplyScalar(0.55).addScaledVector(hr, -0.4).addScaledVector(worldUp, -0.72).normalize() : hf.clone().multiplyScalar(0.8).addScaledVector(hr, 0.35).normalize();
          curl = s > 0 ? 0.62 : 0.06;
          spread = s > 0 ? 0.35 : 1;
        } else if (rig.hands === 'read') {
          w = T.clone().addScaledVector(hr, s * 0.25).addScaledVector(hf, -0.1).addScaledVector(worldUp, 0.03);
          f = hf.clone().addScaledVector(hr, -s * 0.5).addScaledVector(worldUp, -0.2).normalize();
          curl = 0.2;
        } else if (rig.hands === 'seal') {
          w = T.clone().addScaledVector(hr, s * 0.2).addScaledVector(hf, -0.12).addScaledVector(worldUp, 0.04);
          f = hf.clone().addScaledVector(hr, -s * 0.6).addScaledVector(worldUp, -0.35).normalize();
          curl = 0.45;
        } else {
          w = T.clone().addScaledVector(hr, s * 0.12).addScaledVector(hf, -0.05);
          f = w.clone().sub(shoulder(s)).normalize();
          n = worldUp.clone().addScaledVector(hr, -s * 0.5);
        }
        const e = elbowFor(w, s);
        arm(s, e, w.clone().addScaledVector(f, -0.02), { droop: 0.1, width: 0.64 });
        hand(b, w, f, n, s, curl, 1.12, SELF_SKIN, spread);
      }
      if (rig.hands === 'write') {
        const tip = T.clone().addScaledVector(hr, 0.0).addScaledVector(hf, -0.045).addScaledVector(worldUp, 0.004);
        brush(tip, worldUp.clone().addScaledVector(hf, -0.32).addScaledVector(hr, 0.22).normalize());
        if (item === 'book') book(T.clone().addScaledVector(worldUp, -0.008), hf, hr, true);
        else sheet(T.clone().addScaledVector(hr, -0.06), hf, hr, 0.3, 0.42, 8);
      }
      if (rig.hands === 'read') book(T.clone(), hf, hr, true);
      if (rig.hands === 'hold-slips') {
        const yaw = Math.atan2(-hf.z, hf.x);
        for (let i = 0; i < 6; i++) {
          const c = T.clone().addScaledVector(hr, (i - 2.5) * 0.03).addScaledVector(hf, 0.06 - Math.abs(i - 2.5) * 0.008).add(new THREE.Vector3(0, 0.012 * i, 0));
          const m = new THREE.Matrix4()
            .makeTranslation(c.x, c.y, c.z)
            .multiply(new THREE.Matrix4().makeRotationY(yaw + ((i - 2.5) * 5 * Math.PI) / 180))
            .multiply(new THREE.Matrix4().makeRotationZ((16 * Math.PI) / 180));
          b.geo(new THREE.BoxGeometry(0.25, 0.003, 0.07), m, i % 2 ? '#e8dcbc' : PAPER, { ao: false });
        }
      }
    }
  }
  // 양면: 왼손은 거울 기저(side = −1)로 조립되어 삼각형 감김이 뒤집힌다 — 한쪽 면만 그리면 손바닥이 빠진다
  const mesh = b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), true);
  // 내 몸은 눈에 가까울수록 내 그늘 속: 거리로 어둡게(소매가 통처럼 평평하게 읽히지 않게)
  const pos = mesh.geometry.getAttribute('position');
  const col = mesh.geometry.getAttribute('color');
  for (let i = 0; i < pos.count; i++) {
    const d = Math.hypot(pos.getX(i) - eye.x, pos.getY(i) - eye.y, pos.getZ(i) - eye.z);
    const t = Math.max(0, Math.min(1, (d - 0.25) / 0.5));
    const kk = 0.74 + 0.26 * t * t * (3 - 2 * t);
    col.setXYZ(i, col.getX(i) * kk, col.getY(i) * kk, col.getZ(i) * kk);
  }
  mesh.name = 'self';
  return mesh;
}
