/**
 * three 렌더(지연 청크). 한 컷 = 장면 조립 → 색 렌더 1회 + 거리 렌더 1회 → 픽셀 읽기. 연속 렌더 루프 없음.
 * WebGL 컨텍스트 하나를 재사용한다. 대청 기하는 소품 상태별로 캐시.
 */
import * as THREE from 'three';
import { buildHall, type HallParts } from './hall';
import { buildFigure, buildSelf } from './figure';
import { FAR, NEAR, figureFacing, figureHeight, figurePos, internalSize, povCamera, sunAt } from './camera';
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
}

const DEPTH_RANGE = 64;

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

/** 「金馹孫」 이름표(재구성: 이름표 형태는 일반형). 작은 캔버스 텍스처 하나 */
function nameTagMesh(): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 40;
  c.height = 120;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ece0c0';
  g.fillRect(0, 0, 40, 120);
  g.fillStyle = '#1c1714';
  g.font = '30px "Nanum Myeongjo", "Noto Serif CJK KR", "Noto Serif KR", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  ['金', '馹', '孫'].forEach((ch, i) => g.fillText(ch, 20, 22 + i * 36));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.18), new THREE.MeshLambertMaterial({ map: tex }));
  m.name = 'nametag';
  return m;
}

function hallFor(spec: PovSpec): HallParts {
  const key = JSON.stringify(spec.props ?? {});
  let h = hallCache.get(key);
  if (!h) {
    h = buildHall(spec.props);
    hallCache.set(key, h);
  }
  return h;
}

/** 해가 남쪽 문으로 드는 빛줄기(가산 반투명 프리즘) + 먼지 */
function sunShaft(dir: THREE.Vector3, seed: number): THREE.Object3D[] {
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
  const hi = 0.11;
  const lo = 0.035;
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
  for (let i = 0; i < 70; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const y = rnd() * ytop;
    const p = P(x, y).addScaledVector(dir, (rnd() * -y) / dir.y);
    dp.push(p.x, p.y + rnd() * 0.3, p.z);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#ffe2b0', size: 1, sizeAttenuation: false, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  dust.name = 'dust';
  return [shaft, dust];
}

export async function render3d(spec: PovSpec): Promise<Raw3d> {
  const t0 = performance.now();
  const { w, h } = internalSize(spec);
  const cam = povCamera(spec);
  const sun = sunAt(spec.time);
  const scene = new THREE.Scene();
  const sky = new THREE.Color('#e6dcc6');
  scene.background = sky;
  scene.fog = new THREE.Fog('#d9cdb3', 16, 46);

  const hall = hallFor(spec);
  scene.add(hall.group);

  // 사람
  const disposables: (THREE.BufferGeometry | THREE.Material)[] = [];
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.38, depthWrite: false });
  disposables.push(shadowMat);
  spec.figures.forEach((f, i) => {
    const m = buildFigure(f, 31 + i);
    const p = figurePos(f);
    m.position.set(p.x, 0, p.y);
    m.rotation.y = (-figureFacing(f, spec.figures) * Math.PI) / 180;
    scene.add(m);
    disposables.push(m.geometry, m.material as THREE.Material);
    const s = new THREE.Mesh(new THREE.CircleGeometry(f.pose.startsWith('seated') ? 0.5 : 0.32, 16), shadowMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(p.x, 0.004, p.y);
    s.renderOrder = 1;
    scene.add(s);
    disposables.push(s.geometry);
  });

  // 눈의 주인 자신
  const eyeV = new THREE.Vector3(...cam.eye);
  const fwdV = new THREE.Vector3(...cam.forward);
  if (spec.self && spec.self.hands !== 'none') {
    const at = spec.self.at ? new THREE.Vector3(spec.self.at.x, spec.self.at.h ?? R.desk.h + 0.08, spec.self.at.y) : undefined;
    const me = buildSelf(spec.self.robe, spec.self.hands, eyeV, fwdV, at);
    scene.add(me);
    disposables.push(me.geometry, me.material as THREE.Material);
  }

  // 이름표 꾸러미
  if (spec.props?.nameTag) {
    const bx = 5.0;
    const bz = 3.42;
    const bundle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.22), new THREE.MeshLambertMaterial({ color: '#cbb78f' }));
    bundle.position.set(bx, R.desk.h + 0.035, bz);
    bundle.rotation.y = 0.08;
    bundle.castShadow = bundle.receiveShadow = true;
    const cord = new THREE.Mesh(new THREE.BoxGeometry(0.305, 0.074, 0.016), new THREE.MeshLambertMaterial({ color: '#2a2320' }));
    cord.position.copy(bundle.position);
    cord.rotation.y = 0.08;
    const tag = nameTagMesh();
    // 눕혀서(x −90°) 글자 위쪽이 동쪽(+x)을 향하게(y −90°): 서쪽 자리에서 바로 읽힌다
    tag.rotation.set(-Math.PI / 2, -Math.PI / 2 + 0.08, 0, 'YXZ');
    tag.position.set(bx - 0.03, R.desk.h + 0.073, bz + 0.02);
    tag.receiveShadow = true;
    scene.add(bundle, cord, tag);
    for (const o of [bundle, cord, tag]) disposables.push(o.geometry, o.material as THREE.Material);
  }

  // 빛 ───────────────────────────────────────────────
  const toSun = new THREE.Vector3(...sun.toSun);
  const lightDir = toSun.clone().negate();
  const sunCol = new THREE.Color('#fff1d8').lerp(new THREE.Color('#ffc883'), sun.warmth);
  const sunL = new THREE.DirectionalLight(sunCol, 3.4);
  sunL.position.set(6 + toSun.x * 40, toSun.y * 40, 6 + toSun.z * 40);
  sunL.target.position.set(6, 0, 6);
  sunL.castShadow = true;
  sunL.shadow.mapSize.set(2048, 2048);
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
  scene.add(new THREE.HemisphereLight('#b5a68c', '#4a3524', 0.55));
  // 햇빛 고인 마루가 되쏘는 빛(문 안쪽 바닥) + 문 바깥 하늘빛
  const bounce = new THREE.PointLight('#ffcf9a', 16, 16, 1.3);
  bounce.position.set(6.4, 0.4, 7.4);
  const doorSky = new THREE.PointLight('#f2e4c8', 18, 18, 1.2);
  doorSky.position.set(6, 1.7, 9.6);
  // 닫힌 분합문·창의 한지가 걸러 들이는 빛
  const winL = new THREE.PointLight('#f1e2c2', 7, 9, 1.4);
  winL.position.set(11.2, 1.4, 4.0);
  const northL = new THREE.PointLight('#e8dcc0', 2.5, 9, 1.5);
  northL.position.set(6, 2.6, 0.6);
  scene.add(bounce, doorSky, winL, northL);
  for (const x of [2, 10]) {
    const pl = new THREE.PointLight('#efdcb8', 4, 8, 1.5);
    pl.position.set(x, 1.3, 8.4);
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
  const vol = sunShaft(lightDir, spec.seed ?? 7);
  for (const o of vol) {
    scene.add(o);
    const mo = o as THREE.Mesh;
    disposables.push(mo.geometry, mo.material as THREE.Material);
  }

  // 카메라 = 증인의 눈
  const camera = new THREE.PerspectiveCamera(cam.fovDeg, cam.aspect, NEAR, FAR);
  camera.position.copy(eyeV);
  const rot = new THREE.Matrix4().makeBasis(new THREE.Vector3(...cam.right), new THREE.Vector3(...cam.up), fwdV.clone().negate());
  camera.quaternion.setFromRotationMatrix(rot);
  camera.updateMatrixWorld(true);

  const t1 = performance.now();
  const r = getRenderer();
  r.setSize(w, h, false);
  r.toneMappingExposure = 1.15;
  r.setClearColor(sky, 1);
  r.render(scene, camera);
  const gl = r.getContext();
  const raw = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, raw);
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) rgba.set(raw.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);

  // 거리 패스
  const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true });
  const dm = depthMaterial();
  for (const o of vol) o.visible = false;
  const bg = scene.background;
  scene.background = null;
  scene.fog = null;
  scene.overrideMaterial = dm;
  r.setRenderTarget(rt);
  r.setClearColor(0xffffff, 1);
  r.clear();
  r.render(scene, camera);
  const dbuf = new Uint8Array(w * h * 4);
  r.readRenderTargetPixels(rt, 0, 0, w, h, dbuf);
  r.setRenderTarget(null);
  scene.overrideMaterial = null;
  scene.background = bg;
  const depth = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = ((h - 1 - y) * w + x) * 4;
      const d = ((dbuf[i] + dbuf[i + 1] / 255) / 255) * DEPTH_RANGE;
      depth[y * w + x] = dbuf[i] >= 254 ? Infinity : d;
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

  scene.remove(hall.group);
  for (const d of disposables) d.dispose();
  const t2 = performance.now();
  return { w, h, rgba, depth, focusDepth, buildMs: t1 - t0, renderMs: t2 - t1 };
}
