/**
 * three 렌더(지연 청크). 한 컷 = 장면 조립 → 색 렌더 1회 + 거리 렌더 1회 → 픽셀 읽기. 연속 렌더 루프 없음.
 * WebGL 컨텍스트 하나를 재사용한다. 대청 기하는 소품 상태별로 캐시.
 */
import * as THREE from 'three';
import { buildHall, type HallParts } from './hall';
import { povDetail, setPovDetail } from './geo';
import { withPaint } from './paint';
import { buildFigure } from './figure';
import { buildSelf } from './self';
import { buildProps } from './props';
import { withRim } from './rim';
import { FAR, NEAR, type PovCamera, figureFacing, figureHeight, figurePos, internalSize, parseTime, povCamera, sunAt } from './camera';
import { ROOM_EP1 as R } from './room';
import { mulberry32 } from './camera';
import type { PovSpec } from './types';

export interface Raw3d {
  w: number;
  h: number;
  rgba: Uint8Array;
  depth: Float32Array;
  focusDepth?: number;
  buildMs: number;
  renderMs: number;
  /** (painted) 빛줄기·먼지만 그린 가산 덧칠(sRGB RGBA) */
  glow?: Uint8Array;
  /** (style ≠ current) 시점 공간 법선, 픽셀당 xyz(−1..1). 하늘 = 0 */
  normal?: Float32Array;
  /** (style ≠ current) 물체 번호(0 = 하늘·없음) + 번호별 이름(인물 id, 'slip:…', 'self', 'hall', 'prop') */
  obj?: Uint16Array;
  objNames?: string[];
  /** id 패스: 인물·종이 조각별 실제로 보이는 픽셀 수와 경계(내부 px, 끝 포함). 안 보이면 없음 */
  visible: Record<string, PovVisibility>;
}

export interface PovVisibility {
  px: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * 시각별 빛(재구성 연출). 방향은 sunAt, 세기·색은 여기서.
 * 아침: 동창 한지가 주인공, 서늘한 흰빛 · 한낮: 짧은 빛줄기 · 14~15시: 문빛 · 15:20 이후: 낮고 따뜻한 빛, 긴 빛줄기.
 */
export function lightProfile(time: string | number) {
  const m = parseTime(time);
  const k = (a: number, b: number) => Math.max(0, Math.min(1, (m - a) / (b - a)));
  const morning = 1 - k(600, 690); // 10:00 까지 아침
  const late = k(900, 990); // 15:00 → 16:30 늦은 오후
  return {
    sun: 3.4 * (1 - 0.75 * morning) + 0.5 * late,
    sunTint: morning > 0.5 ? '#f4efe2' : late > 0.3 ? '#ffbf78' : undefined,
    window: 14 + 16 * morning - 5 * late,
    windowColor: morning > 0.5 ? '#eef0e6' : '#f1e2c2',
    door: 9 - 3 * morning + 1 * late,
    bounce: 11 * (1 - 0.7 * morning) + 3 * late,
    bounceColor: late > 0.3 ? '#ffb877' : '#ffcf9a',
    hemi: 0.55 + 0.1 * morning,
    sky: morning > 0.5 ? '#e4e2d6' : late > 0.3 ? '#ecd2a6' : '#e6dcc6',
    exposure: 1.16 + 0.08 * morning + 0.04 * late,
  };
}

const DEPTH_RANGE = 64;

/**
 * 파니니 계열 투영 매개변수(PovSpec.pano). x = R·P(θ), P(θ) = (d+1)·sinθ / (d+cosθ) (θ = 수평 시선각),
 * y = yH − R·(높이차 / 가운데 시선 방향 깊이). P'(0) = 1 이라 가운데 배율 R 은 가로·세로가 같다.
 */
function panoParams(p: NonNullable<PovSpec['pano']>, cam: PovCamera, w: number, h: number) {
  const d = p.d ?? 0.5;
  const P = (t: number) => ((d + 1) * Math.sin(t)) / (d + Math.cos(t));
  const half = (p.hfov * Math.PI) / 360;
  const Rp = w / 2 / P(half);
  const inv = (x: number) => {
    let lo = -Math.PI / 2 + 1e-4;
    let hi = Math.PI / 2 - 1e-4;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (P(m) < x) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  };
  const f = new THREE.Vector3(cam.forward[0], 0, cam.forward[2]).normalize();
  const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
  const pitchTan = cam.forward[1] / Math.hypot(cam.forward[0], cam.forward[2]);
  const yH = p.horizon !== undefined ? p.horizon * h : h / 2 + Rp * pitchTan;
  /** 앞쪽 덮개(내 소매)는 가운데 근처의 직선 투영으로 놓는다: 같은 Rp, 같은 수평선 */
  const selfCam: PovCamera = {
    ...cam,
    forward: [f.x, f.y, f.z],
    right: [r.x, r.y, r.z],
    up: [0, 1, 0],
    fovDeg: (2 * Math.atan(h / 2 / Rp) * 180) / Math.PI,
    aspect: w / h,
    shiftTan: (yH - h / 2) / Rp,
  };
  return { Rp, yH, inv, half, level: { f, r }, selfCam };
}

/** 픽셀아트 채움광 보정(감쇠 지수·닿는 거리·세기 배율) */
const PIXEL_FILL = { decay: 0.25, reach: 1.8, gain: 0.36 };

let renderer: THREE.WebGLRenderer | null = null;
const hallCache = new Map<string, HallParts>();

function getRenderer(): THREE.WebGLRenderer {
  if (renderer) return renderer;
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

const depthMaterial = () =>
  new THREE.ShaderMaterial({
    vertexShader: `varying float vZ; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vZ; void main(){ float d = clamp(vZ / ${DEPTH_RANGE.toFixed(1)}, 0.0, 1.0) * 255.0; gl_FragColor = vec4(floor(d)/255.0, fract(d), 0.0, 1.0); }`,
    side: THREE.DoubleSide,
  });

function hallFor(coarse = false): HallParts {
  const key = `hall:${povDetail()}${coarse ? ':coarse' : ''}`;
  let h = hallCache.get(key);
  if (!h) {
    h = buildHall({ coarse });
    hallCache.set(key, h);
  }
  return h;
}

/** 해가 남쪽 문으로 드는 빛줄기(가산 반투명 프리즘) + 먼지 */
function sunShaft(dir: THREE.Vector3, seed: number, dustOpt = { n: 70, size: 1, opacity: 0.55 }, gain = 1): THREE.Object3D[] {
  const D = R.h;
  if (dir.z >= -0.05 || dir.y >= -0.05) return [];
  // 처마 끝을 스친 빛이 벽면(z=D)에 닿는 높이
  const t = -R.eave.out / dir.z;
  const ytop = Math.min(R.door.top, R.eave.h + dir.y * t);
  if (ytop <= 0.1) return [];
  const pos: number[] = [];
  const col: number[] = [];
  const x0 = R.door.x0 + 0.1;
  const x1 = R.door.x1 - 0.1;
  const P = (x: number, y: number) => new THREE.Vector3(x, y, D);
  const end = (p: THREE.Vector3) => p.clone().addScaledVector(dir, -p.y / dir.y);
  const A0 = P(x0, 0.01);
  const A1 = P(x1, 0.01);
  const B0 = P(x0, ytop);
  const B1 = P(x1, ytop);
  const C0 = end(B0);
  const C1 = end(B1);
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, ka: number, kb: number, kc: number) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    col.push(ka, ka * 0.85, ka * 0.62, kb, kb * 0.85, kb * 0.62, kc, kc * 0.85, kc * 0.62);
  };
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, ka: number, kb: number, kc: number, kd: number) => {
    tri(a, b, c, ka, kb, kc);
    tri(a, c, d, ka, kc, kd);
  };
  const hi = 0.11 * gain;
  const lo = 0.035 * gain;
  quad(B0, B1, C1, C0, hi, hi, lo, lo); // 윗면(빛의 경계)
  tri(A0, B0, C0, hi * 0.7, hi, lo); // 옆면
  tri(A1, B1, C1, hi * 0.7, hi, lo);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const shaft = new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: true }),
  );
  shaft.name = 'shaft';
  // 먼지: 빛 안의 작은 점
  const rnd = mulberry32(seed);
  const dp: number[] = [];
  for (let i = 0; i < dustOpt.n; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const y = rnd() * ytop;
    const p = P(x, y).addScaledVector(dir, (rnd() * -y) / dir.y);
    dp.push(p.x, p.y + rnd() * 0.3, p.z);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#ffe2b0', size: dustOpt.size, sizeAttenuation: false, transparent: true, opacity: dustOpt.opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  dust.name = 'dust';
  return [shaft, dust];
}

const normalMaterial = () =>
  new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vN; void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n * 0.5 + 0.5, 1.0); }`,
    side: THREE.DoubleSide,
  });

const idMaterial = (id: number) =>
  new THREE.ShaderMaterial({
    uniforms: { idv: { value: id / 255 } },
    vertexShader: `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float idv; void main(){ gl_FragColor = vec4(idv, 0.0, 0.0, 1.0); }`,
  });

export async function render3d(spec: PovSpec): Promise<Raw3d> {
  const style = spec.style ?? 'current';
  if (style === 'current') return render3dInner(spec, style);
  const prev = povDetail();
  setPovDetail(style === 'painted' || style === 'hd2d' ? 2 : 1);
  try {
    return await render3dInner(spec, style);
  } finally {
    setPovDetail(prev);
  }
}

async function render3dInner(spec: PovSpec, style: NonNullable<PovSpec['style']>): Promise<Raw3d> {
  const extras = style !== 'current';
  const painted = style === 'painted' || style === 'hd2d';
  const t0 = performance.now();
  const { w, h } = internalSize(spec);
  const cam = povCamera(spec);
  const pano = spec.pano ? panoParams(spec.pano, cam, w, h) : null;
  const sun = sunAt(spec.time);
  const lp = lightProfile(spec.time);
  const scene = new THREE.Scene();
  const sky = new THREE.Color(lp.sky);
  scene.background = sky;
  scene.fog = new THREE.Fog('#d9cdb3', 16, 46);

  const pixel = style === 'pixel';
  const hall = hallFor(pixel);
  scene.add(hall.group);

  const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  /** id 패스 대상: 인물 + 종이 조각 */
  const tagged: THREE.Mesh[] = [];

  // 사람
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.38, depthWrite: false });
  disposables.push(shadowMat);
  const blobs: THREE.Mesh[] = [];
  spec.figures.forEach((f, i) => {
    const m = buildFigure(f, 31 + i);
    if (spec.rim && (!spec.rim.ids || spec.rim.ids.includes(f.id)))
      withRim(m.material as THREE.MeshLambertMaterial, { from: new THREE.Vector3(spec.rim.from.x, spec.rim.from.h ?? 1.2, spec.rim.from.y), strength: spec.rim.strength ?? 0.9, power: 2.0 });
    const p = figurePos(f);
    m.position.set(p.x, 0, p.y);
    m.rotation.y = (-figureFacing(f, spec.figures) * Math.PI) / 180;
    scene.add(m);
    tagged.push(m);
    disposables.push(m.geometry, m.material as THREE.Material);
    const s = new THREE.Mesh(new THREE.CircleGeometry(f.pose.startsWith('seated') || f.pose.startsWith('kneel') ? 0.5 : 0.32, 16), shadowMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(p.x, 0.004, p.y);
    s.renderOrder = 1;
    scene.add(s);
    blobs.push(s);
    disposables.push(s.geometry);
  });

  // 소품
  for (const o of buildProps(spec.props ?? {})) {
    scene.add(o);
    const mo = o as THREE.Mesh;
    if (mo.name.startsWith('slip:')) tagged.push(mo);
    disposables.push(mo.geometry, mo.material as THREE.Material);
    const map = (mo.material as THREE.MeshLambertMaterial).map;
    if (map) disposables.push(map);
  }

  // 눈의 주인 자신
  const eyeV = new THREE.Vector3(...cam.eye);
  const fwdV = new THREE.Vector3(...cam.forward);
  if (spec.self && spec.self.hands !== 'none') {
    const at = spec.self.at ? new THREE.Vector3(spec.self.at.x, spec.self.at.h ?? R.desk.h + 0.08, spec.self.at.y) : undefined;
    const me = buildSelf(spec.self, pano ? pano.selfCam : cam, at);
    const rf = spec.self.rimFrom ?? (parseTime(spec.time) < 600 ? { x: 12.2, y: 4.0, h: 1.4 } : { x: 6.0, y: 9.4, h: 1.3 });
    withRim(me.material as THREE.MeshLambertMaterial, { from: new THREE.Vector3(rf.x, rf.h ?? 1.2, rf.y), strength: 1.2, power: 2.2, wrap: 0.32 });
    if (extras) me.name = 'self';
    scene.add(me);
    disposables.push(me.geometry, me.material as THREE.Material);
  }

  // 빛 ───────────────────────────────────────────────
  const toSun = new THREE.Vector3(...sun.toSun);
  const lightDir = toSun.clone().negate();
  const sunCol = new THREE.Color('#fff1d8').lerp(new THREE.Color('#ffc883'), sun.warmth);
  if (lp.sunTint) sunCol.lerp(new THREE.Color(lp.sunTint), 0.5);
  const sunL = new THREE.DirectionalLight(sunCol, lp.sun);
  sunL.position.set(6 + toSun.x * 40, toSun.y * 40, 6 + toSun.z * 40);
  sunL.target.position.set(6, 0, 6);
  sunL.castShadow = true;
  sunL.shadow.mapSize.set(painted ? 4096 : 2048, painted ? 4096 : 2048);
  const sc = sunL.shadow.camera as THREE.OrthographicCamera;
  sc.left = -16;
  sc.right = 16;
  sc.top = 16;
  sc.bottom = -16;
  sc.near = 1;
  sc.far = 90;
  sunL.shadow.bias = -0.0004;
  sunL.shadow.normalBias = 0.02;
  scene.add(sunL, sunL.target);
  scene.add(new THREE.HemisphereLight('#b5a68c', '#4a3524', lp.hemi * (painted ? 1.9 : 1)));
  const bounce = new THREE.PointLight(lp.bounceColor, lp.bounce, 14, 1.6);
  bounce.position.set(6.4, 0.4, 7.4);
  const doorSky = new THREE.PointLight('#f2e4c8', lp.door, 16, 1.5);
  doorSky.position.set(6, 1.7, 9.6);
  const winL = new THREE.PointLight(lp.windowColor, lp.window, 12, 1.5);
  winL.position.set(11.2, 1.4, 4.0);
  const northL = new THREE.PointLight('#e8dcc0', 4.5, 10, 1.5);
  northL.position.set(6, 2.6, 0.6);
  scene.add(bounce, doorSky, winL, northL);
  const fills: THREE.PointLight[] = [bounce, doorSky, winL, northL];
  for (const x of [2, 10]) {
    const pl = new THREE.PointLight('#efdcb8', 1.6 * (spec.latticeGlow ?? 1), 6 + 2 * ((spec.latticeGlow ?? 1) - 1), 1.8);
    pl.position.set(x, 1.3, 8.4);
    scene.add(pl);
    fills.push(pl);
  }
  // 픽셀아트: 채움광의 거리 감쇠를 눅여 벽에 과녁 같은 동심원 띠가 생기지 않게(넓고 평평한 빛 + 해가 만든 모양 있는 빛 조각)
  if (pixel) {
    northL.position.z = 2.2;
    for (const l of fills) {
      l.decay *= PIXEL_FILL.decay;
      l.distance *= PIXEL_FILL.reach;
      l.intensity *= PIXEL_FILL.gain;
    }
  }
  for (const bl of spec.bounces ?? []) {
    const pl = new THREE.PointLight(bl.color ?? '#ffcf96', bl.intensity, bl.distance ?? 1.2, 2);
    pl.position.set(bl.at.x, bl.at.h ?? 0.5, bl.at.y);
    scene.add(pl);
  }
  if (spec.props?.lamps) {
    for (const [x, z] of [[7.1, 1.7], [11.7, 2.0], [2.8, 3.0]] as const) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
      fl.position.set(x, 0.92, z);
      const pl = new THREE.PointLight('#ffb660', 1.6, 5, 2);
      pl.position.set(x, 0.98, z);
      scene.add(fl, pl);
    }
  }
  const vol = painted ? sunShaft(lightDir, spec.seed ?? 7, { n: 240, size: Math.max(1, Math.round(w / 260)), opacity: 0.6 }, 1.25) : sunShaft(lightDir, spec.seed ?? 7);
  for (const o of vol) {
    scene.add(o);
    const mo = o as THREE.Mesh;
    disposables.push(mo.geometry, mo.material as THREE.Material);
  }

  // 회화풍: 재질에 절차적 결·주름(셰이더). 방 기하는 분할 배율별 캐시라 한 번만 붙인다
  if (painted)
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.Material;
      if (!(mat as THREE.MeshLambertMaterial).isMeshLambertMaterial || mat.userData.paint) return;
      mat.userData.paint = true;
      withPaint(mat, m.name.startsWith('fig_') || m.name === 'self' ? 'cloth' : 'wood');
    });

  // 카메라 = 증인의 눈
  const camera = new THREE.PerspectiveCamera(cam.fovDeg, cam.aspect, NEAR, FAR);
  camera.position.copy(eyeV);
  const rot = new THREE.Matrix4().makeBasis(new THREE.Vector3(...cam.right), new THREE.Vector3(...cam.up), fwdV.clone().negate());
  camera.quaternion.setFromRotationMatrix(rot);
  camera.updateMatrixWorld(true);

  /**
   * 파노라마(spec.pano): 세로는 이미 가운데 시선의 직선 투영(수평 고정 + 렌즈 이동)과 같으므로, 넓은 직선 투영으로 한 번 그린 뒤
   * 열(column)만 옮겨 가로를 파니니로 바꾼다 — 이음매 없음. 색·거리·id 세 패스가 같은 열 대응을 쓴다.
   */
  let RW = w;
  let colSrc: Float32Array | null = null;
  if (pano) {
    const tanMax = Math.tan(pano.half);
    RW = Math.ceil(2 * tanMax * pano.Rp);
    const sx = RW / (2 * tanMax);
    colSrc = new Float32Array(w);
    for (let x = 0; x < w; x++) colSrc[x] = Math.max(0, Math.min(RW - 1, RW / 2 + Math.tan(pano.inv((x + 0.5 - w / 2) / pano.Rp)) * sx - 0.5));
    camera.position.copy(eyeV);
    camera.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(pano.level.r, new THREE.Vector3(0, 1, 0), pano.level.f.clone().negate()));
    camera.updateMatrixWorld(true);
    camera.projectionMatrix.makePerspective(-tanMax * NEAR, tanMax * NEAR, (pano.yH / pano.Rp) * NEAR, (-(h - pano.yH) / pano.Rp) * NEAR, NEAR, FAR);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  /** 읽어 낸 버퍼(RW×h, 아래가 0행) → 출력(w×h, 위가 0행). lerp = 색만 가로 보간 */
  const remap = (src: Uint8Array, lerp: boolean): Uint8Array => {
    const out = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      const row = (h - 1 - y) * RW * 4;
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        if (!colSrc) {
          for (let c = 0; c < 4; c++) out[o + c] = src[row + x * 4 + c];
          continue;
        }
        const fx = colSrc[x];
        const x0 = Math.floor(fx);
        if (!lerp) {
          const xi = Math.round(fx) * 4;
          for (let c = 0; c < 4; c++) out[o + c] = src[row + xi + c];
          continue;
        }
        const t = fx - x0;
        const x1 = Math.min(RW - 1, x0 + 1);
        for (let c = 0; c < 4; c++) out[o + c] = Math.round(src[row + x0 * 4 + c] * (1 - t) + src[row + x1 * 4 + c] * t);
      }
    }
    return out;
  };

  const t1 = performance.now();
  const r = getRenderer();
  r.setSize(RW, h, false);
  r.toneMappingExposure = spec.exposure ?? lp.exposure;
  r.setClearColor(sky, 1);
  r.clear();
  // 회화풍: 빛줄기·먼지는 색 패스에서 빼고 따로 그려(가림 반영) 붓질 뒤에 얹는다 — 붓 필터가 먼지를 지우지 않게
  if (painted) for (const o of vol) o.visible = false;
  r.render(scene, camera);
  let glow: Uint8Array | undefined;
  if (painted) {
    const blackM = new THREE.MeshBasicMaterial({ color: '#000000' });
    const sv = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || vol.includes(m)) return;
      sv.set(m, m.material);
      m.material = blackM;
    });
    for (const o of vol) o.visible = true;
    for (const o of blobs) o.visible = false;
    const bgS = scene.background;
    const fogS = scene.fog;
    scene.background = null;
    scene.fog = null;
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(scene, camera);
    const gRaw = new Uint8Array(RW * h * 4);
    r.getContext().readPixels(0, 0, RW, h, r.getContext().RGBA, r.getContext().UNSIGNED_BYTE, gRaw);
    glow = remap(gRaw, true);
    for (const [m, mat] of sv) m.material = mat;
    for (const o of blobs) o.visible = true;
    scene.background = bgS;
    scene.fog = fogS;
    blackM.dispose();
    r.setClearColor(sky, 1);
    // 색 패스 다시(위에서 덮어썼다)
    for (const o of vol) o.visible = false;
    r.clear();
    r.render(scene, camera);
  }
  const gl = r.getContext();
  const raw = new Uint8Array(RW * h * 4);
  gl.readPixels(0, 0, RW, h, gl.RGBA, gl.UNSIGNED_BYTE, raw);
  const rgba = remap(raw, true);

  // 거리 패스
  const rt = new THREE.WebGLRenderTarget(RW, h, { depthBuffer: true });
  const dm = depthMaterial();
  for (const o of vol) o.visible = false;
  for (const o of blobs) o.visible = false;
  const bg = scene.background;
  scene.background = null;
  scene.fog = null;
  scene.overrideMaterial = dm;
  r.setRenderTarget(rt);
  r.setClearColor(0xffffff, 1);
  r.clear();
  r.render(scene, camera);
  const dbufRaw = new Uint8Array(RW * h * 4);
  r.readRenderTargetPixels(rt, 0, 0, RW, h, dbufRaw);
  const dbuf = remap(dbufRaw, false);
  let normal: Float32Array | undefined;
  if (extras) {
    const nm = normalMaterial();
    scene.overrideMaterial = nm;
    r.setClearColor(0x808080, 1);
    r.clear();
    r.render(scene, camera);
    const nRaw = new Uint8Array(RW * h * 4);
    r.readRenderTargetPixels(rt, 0, 0, RW, h, nRaw);
    const nb = remap(nRaw, false);
    normal = new Float32Array(w * h * 3);
    for (let i = 0; i < w * h; i++) for (let c = 0; c < 3; c++) normal[i * 3 + c] = nb[i * 4 + c] / 127.5 - 1;
    nm.dispose();
  }
  scene.overrideMaterial = null;
  const depth = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const d = ((dbuf[i] + dbuf[i + 1] / 255) / 255) * DEPTH_RANGE;
      depth[y * w + x] = dbuf[i] >= 254 ? Infinity : d;
    }

  // id 패스: 인물·종이 조각이 실제로 보이는 픽셀(가림·화면 밖 반영) → 탭 영역·보임 검사
  const saved = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const black = idMaterial(0);
  const idMats: THREE.Material[] = [black];
  /** (extras) 표시 안 된 물체도 번호를 받는다(외곽선용). 번호 > tagged.length 는 보임 검사에서 무시된다 */
  const objNames: string[] = ['', ...tagged.map((m) => m.name)];
  const hallMeshes = new Set<THREE.Object3D>(hall.group.children);
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh && !(o as THREE.Points).isPoints) return;
    saved.set(m, m.material);
    const k = tagged.indexOf(m);
    if (k >= 0) {
      const im = idMaterial(k + 1);
      idMats.push(im);
      m.material = im;
    } else if (extras && m.isMesh && m.visible && objNames.length < 255) {
      objNames.push(hallMeshes.has(m) ? (m.name === 'hanji' || m.name.startsWith('lattice') ? m.name : 'hall') : m.name === 'self' ? 'self' : 'prop');
      const im = idMaterial(objNames.length - 1);
      idMats.push(im);
      m.material = im;
    } else m.material = black;
  });
  r.setRenderTarget(rt);
  r.setClearColor(0x000000, 1);
  r.clear();
  r.render(scene, camera);
  const ibufRaw = new Uint8Array(RW * h * 4);
  r.readRenderTargetPixels(rt, 0, 0, RW, h, ibufRaw);
  const ibuf = remap(ibufRaw, false);
  r.setRenderTarget(null);
  for (const [m, mat] of saved) m.material = mat;
  for (const im of idMats) im.dispose();
  scene.background = bg;
  for (const o of blobs) o.visible = true;
  const visible: Record<string, PovVisibility> = {};
  let obj: Uint16Array | undefined;
  if (extras) {
    obj = new Uint16Array(w * h);
    for (let i = 0; i < w * h; i++) obj[i] = ibuf[i * 4];
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = ibuf[(y * w + x) * 4];
      if (k === 0 || k > tagged.length) continue;
      const id = tagged[k - 1].name;
      const v = (visible[id] ??= { px: 0, x0: x, y0: y, x1: x, y1: y });
      v.px++;
      if (x < v.x0) v.x0 = x;
      if (x > v.x1) v.x1 = x;
      if (y < v.y0) v.y0 = y;
      if (y > v.y1) v.y1 = y;
    }
  rt.dispose();
  dm.dispose();

  // 초점 거리
  let focusDepth: number | undefined;
  const ff = spec.focus ? spec.figures.find((f) => f.id === spec.focus) : undefined;
  if (ff) {
    const p = figurePos(ff);
    const c = new THREE.Vector3(p.x, figureHeight(ff) * 0.6, p.y).sub(eyeV);
    focusDepth = c.dot(fwdV);
  } else if (spec.focus === 'self') focusDepth = 0.55;
  else if (spec.focus === 'desk') focusDepth = new THREE.Vector3(...cam.target).sub(eyeV).dot(fwdV);

  scene.remove(hall.group);
  for (const d of disposables) d.dispose();
  const t2 = performance.now();
  return { w, h, rgba, depth, focusDepth, buildMs: t1 - t0, renderMs: t2 - t1, visible, ...(extras ? { normal, obj, objNames, glow } : {}) };
}
