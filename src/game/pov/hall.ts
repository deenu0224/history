/**
 * 실록청 대청(재구성, reconstructed) — 절차적 저폴리 장면. 정확한 건축 고증을 주장하지 않는다.
 * 우물마루, 초석 위 기둥, 띠살 분합문(남쪽 가운데 두 칸은 들어 올려 엶), 동쪽 창, 서쪽 곳간 판문,
 * 연등천장의 서까래와 대들보, 깊은 처마, 기단과 마당, 병풍, 서안과 사초 더미, 벼루·붓, 방석, 등잔걸이.
 * 7월이라 화로는 없다(DESIGN_V5 §9).
 */
import * as THREE from 'three';
import { Builder, trs } from './geo';
import { ROOM_EP1 as R, SLIP_SPOTS, SLIP_SIZE } from './room';
import { mulberry32 } from './camera';
import type { PovProps } from './types';

/** 재질 색(sRGB). 꼭짓점 색이므로 빛을 받아 어두워진다 — 기본값은 밝은 쪽 */
export const C = {
  floor: '#9a7350',
  floorDark: '#6e4e33',
  beamDark: '#4a3424',
  pillar: '#6a4a30',
  wood: '#7d5a3a',
  woodLacquer: '#4b2f22',
  plaster: '#cfc2a4',
  hanji: '#efe3c4',
  hanjiOld: '#d9c79c',
  ink: '#1d1916',
  stone: '#9b968a',
  stoneDark: '#6d695f',
  soil: '#c8ad80',
  roof: '#4e5258',
  roofUnder: '#3a2d22',
  dancheongGreen: '#3f6b5c',
  dancheongRed: '#8f3f36',
  pine: '#2f4a33',
  bark: '#4b3a2b',
  cushionRed: '#6a3a30',
  cushionBlue: '#3d4b58',
  silkBlue: '#2e3c4a',
  brass: '#8a6a3a',
  iron: '#2c2a28',
} as const;

export interface HallParts {
  group: THREE.Group;
  /** 빛을 내는 한지(분합문·창) — 깊이 패스에서도 보인다 */
  glow: THREE.Mesh[];
  /** 깊이 패스에서 숨길 것(빛줄기·먼지) */
  volumetric: THREE.Object3D[];
}

const W = R.w;
const D = R.h;

/** 띠살 한지 문/창 한 칸: 틀은 builder 에, 한지 판은 glow builder 에 */
function latticePanel(frame: Builder, glow: Builder, x0: number, x1: number, y0: number, y1: number, z: number, axis: 'x' | 'z', rnd: () => number): void {
  const t = 0.05;
  const len = x1 - x0;
  const hgt = y1 - y0;
  const at = (u: number, y: number, dz = 0): [number, number, number] => (axis === 'x' ? [x0 + u, y, z + dz] : [z + dz, y, x0 + u]);
  const boxA = (u: number, y: number, su: number, sy: number, sd: number, col: string, b: Builder, dz = 0) => {
    const [px, py, pz] = at(u, y, dz);
    if (axis === 'x') b.box(px, py, pz, su, sy, sd, col, 0, { ao: false });
    else b.box(px, py, pz, sd, sy, su, col, 0, { ao: false });
  };
  // 한지 판(살 뒤)
  const glowCol = new THREE.Color(C.hanji).multiplyScalar(0.92 + rnd() * 0.08);
  boxA(len / 2, y0 + hgt / 2, len - t, hgt - t, 0.01, '#' + glowCol.getHexString(), glow, 0.03);
  // 틀
  boxA(len / 2, y0 + t / 2, len, t, 0.07, C.wood, frame);
  boxA(len / 2, y1 - t / 2, len, t, 0.07, C.wood, frame);
  boxA(t / 2, y0 + hgt / 2, t, hgt, 0.07, C.wood, frame);
  boxA(len - t / 2, y0 + hgt / 2, t, hgt, 0.07, C.wood, frame);
  // 띠살: 촘촘한 세로살 + 위·가운데·아래 가로 띠
  const n = Math.max(3, Math.round(len / 0.085));
  for (let i = 1; i < n; i++) boxA((len * i) / n, y0 + hgt / 2, 0.016, hgt, 0.03, C.wood, frame);
  for (const f of [0.14, 0.5, 0.86]) for (const d of [-0.04, 0, 0.04]) boxA(len / 2, y0 + hgt * f + d, len, 0.014, 0.03, C.wood, frame);
  // 아래 궁창(판)
  boxA(len / 2, y0 + 0.16, len - t, 0.28, 0.04, C.woodLacquer, frame);
}

export function buildHall(props: PovProps = {}): HallParts {
  const rnd = mulberry32(1498711);
  const group = new THREE.Group();
  const b = new Builder(7);
  const glowB = new Builder(9);
  const outB = new Builder(11); // 바깥(그림자 받기만)

  // ── 우물마루 ────────────────────────────────────────────
  const floorShade = (x: number, _y: number, z: number) => {
    const edge = Math.min(x, W - x, z * 1.4, (D - z) * 3);
    return 0.62 + 0.38 * Math.min(1, edge / 1.4);
  };
  for (let gz = 0; gz <= D + 0.01; gz += 1.5) b.box(W / 2, -0.03, gz, W, 0.06, 0.2, C.floorDark, 0, { ao: false, shade: floorShade });
  for (let gz = 0; gz < D - 0.01; gz += 1.5) {
    for (let gx = 0; gx < W; gx += 1.2) b.box(gx + 0.06, -0.03, gz + 0.75, 0.12, 0.06, 1.3, C.floorDark, 0, { ao: false, shade: floorShade });
    for (let x = 0.12; x < W - 0.05; x += 0.3) {
      if (Math.abs(((x - 0.12) % 1.2) - 1.08) < 0.05) continue;
      b.box(x + 0.14, -0.028, gz + 0.75, 0.286, 0.056, 1.29, C.floor, 0, { jitter: 0.22, ao: false, shade: floorShade });
    }
  }

  // ── 벽 ────────────────────────────────────────────────
  const plasterShade = (_x: number, y: number) => 0.75 + 0.25 * Math.min(1, y / 2.5);
  // 북벽: 머름 + 회벽 + 고창
  b.box(W / 2, 0.25, -0.08, W, 0.5, 0.16, C.woodLacquer);
  b.box(W / 2, 1.45, -0.1, W, 1.9, 0.12, C.plaster, 0, { shade: plasterShade, ao: false });
  for (let bay = 0; bay < 3; bay++) latticePanel(b, glowB, bay * 4 + 0.35, bay * 4 + 3.65, 2.45, 2.92, -0.05, 'x', rnd);
  // 동벽: 회벽 + 창
  const win = R.window;
  b.box(W + 0.08, 0.25, D / 2, 0.16, 0.5, D, C.woodLacquer);
  b.box(W + 0.1, (win.sill + 0.5) / 2, (win.y0 + win.y1) / 2, 0.12, win.sill - 0.5, win.y1 - win.y0, C.plaster, 0, { ao: false });
  for (const [z0, z1] of [[0, win.y0], [win.y1, D]] as const) b.box(W + 0.1, 1.7, (z0 + z1) / 2, 0.12, 2.4, z1 - z0, C.plaster, 0, { shade: plasterShade, ao: false });
  b.box(W + 0.1, (win.top + 2.9) / 2, (win.y0 + win.y1) / 2, 0.12, 2.9 - win.top, win.y1 - win.y0, C.plaster, 0, { ao: false });
  latticePanel(b, glowB, win.y0, (win.y0 + win.y1) / 2, win.sill, win.top, W + 0.02, 'z', rnd);
  latticePanel(b, glowB, (win.y0 + win.y1) / 2, win.y1, win.sill, win.top, W + 0.02, 'z', rnd);
  // 서벽: 회벽 + 곳간 판문
  const sd = R.storeDoor;
  b.box(-0.08, 0.25, D / 2, 0.16, 0.5, D, C.woodLacquer);
  for (const [z0, z1] of [[0, sd.y0], [sd.y1, D]] as const) b.box(-0.1, 1.7, (z0 + z1) / 2, 0.12, 2.4, z1 - z0, C.plaster, 0, { shade: plasterShade, ao: false });
  b.box(-0.1, (sd.top + 2.9) / 2, (sd.y0 + sd.y1) / 2, 0.12, 2.9 - sd.top, sd.y1 - sd.y0, C.plaster, 0, { ao: false });
  for (let z = sd.y0; z < sd.y1 - 0.01; z += 0.2) b.box(-0.06, sd.top / 2, z + 0.1, 0.06, sd.top, 0.19, C.woodLacquer, 0, { jitter: 0.25 });
  for (const y of [0.35, sd.top - 0.35]) b.box(-0.02, y, (sd.y0 + sd.y1) / 2, 0.04, 0.08, sd.y1 - sd.y0, C.iron);
  // 남벽: 양쪽 두 칸은 닫힌 분합문, 가운데 두 칸은 엶
  const dr = R.door;
  for (const x0 of [0, dr.x1]) {
    for (let i = 0; i < 4; i++) latticePanel(b, glowB, x0 + i, x0 + i + 1, 0, dr.top, D + 0.02, 'x', rnd);
  }
  // 문 위 인방·회벽
  b.box(W / 2, (dr.top + 2.95) / 2, D + 0.06, W, 2.95 - dr.top, 0.14, C.plaster, 0, { ao: false });
  b.box(W / 2, dr.top + 0.05, D + 0.06, W, 0.12, 0.18, C.beamDark);
  // ── 기둥 + 초석 ───────────────────────────────────────
  const pillars: [number, number][] = [];
  for (const x of [0, 4, 8, 12]) pillars.push([x, 0], [x, D]);
  for (const z of [3, 6]) pillars.push([0, z], [W, z]);
  for (const [x, z] of pillars) {
    b.cyl(x, -R.plinth + 0.12, z, 0.18, 0.17, 3.1 + R.plinth - 0.12, C.pillar, 12, { ao: false, shade: (_x, y) => 0.7 + 0.3 * Math.min(1, (y + 0.5) / 2.5) });
    b.cyl(x, -R.plinth - 0.05, z, 0.3, 0.27, 0.17, C.stone, 8, { ao: false });
  }

  // ── 지붕틀: 창방·대들보·도리·서까래(연등천장) ──────────
  const wallTop = R.wallH;
  b.box(W / 2, wallTop - 0.1, -0.02, W + 0.3, 0.22, 0.2, C.beamDark);
  b.box(W / 2, wallTop - 0.1, D + 0.02, W + 0.3, 0.22, 0.2, C.beamDark);
  b.box(-0.02, wallTop - 0.1, D / 2, 0.2, 0.22, D, C.beamDark);
  b.box(W + 0.02, wallTop - 0.1, D / 2, 0.2, 0.22, D, C.beamDark);
  for (const x of [0, 4, 8, 12]) {
    b.box(x, wallTop + 0.22, D / 2, 0.36, 0.42, D + 0.4, C.beamDark, 0, { ao: false });
    b.box(x, wallTop + 0.75, D / 2, 0.26, 0.3, D / 2, C.beamDark, 0, { ao: false });
    b.box(x, wallTop + 0.6, D / 2 - 2.2, 0.16, 0.5, 0.16, C.beamDark);
    b.box(x, wallTop + 0.6, D / 2 + 2.2, 0.16, 0.5, 0.16, C.beamDark);
  }
  const ridge = R.ridgeH;
  for (const [z, y] of [[D / 2, ridge - 0.15], [D / 2 - 2.2, wallTop + 0.95], [D / 2 + 2.2, wallTop + 0.95]] as const)
    b.bar({ x: -0.3, y, z }, { x: W + 0.3, y, z }, 0.22, 0.22, C.beamDark, { ao: false });
  // 서까래: 처마 끝까지 이어진다
  const eo = R.eave.out;
  const eh = R.eave.h;
  for (let x = 0.15; x < W; x += 0.32) {
    b.bar({ x, y: ridge - 0.1, z: D / 2 }, { x, y: eh + 0.05, z: D + eo }, 0.09, 0.09, C.beamDark, { ao: false });
    b.bar({ x, y: ridge - 0.1, z: D / 2 }, { x, y: eh + 0.05, z: -eo }, 0.09, 0.09, C.beamDark, { ao: false });
  }
  // 개판(서까래 위 판)
  const roofPlane = (z0: number, y0: number, z1: number, y1: number, col: string, bb: Builder, th = 0.06) => {
    const len = Math.hypot(z1 - z0, y1 - y0);
    const ang = Math.atan2(y1 - y0, z1 - z0);
    bb.geo(new THREE.BoxGeometry(W + 3.2, th, len), trs(W / 2, (y0 + y1) / 2, (z0 + z1) / 2, (-ang * 180) / Math.PI, 0, 0), col, { ao: false });
  };
  roofPlane(D / 2, ridge, D + eo + 0.1, eh + 0.08, C.roofUnder, b);
  roofPlane(D / 2, ridge, -eo - 0.1, eh + 0.08, C.roofUnder, b);
  // 기와 지붕(바깥 위)
  roofPlane(D / 2, ridge + 0.45, D + eo + 0.25, eh + 0.3, C.roof, b, 0.35);
  roofPlane(D / 2, ridge + 0.45, -eo - 0.25, eh + 0.3, C.roof, b, 0.35);
  // 처마 서까래 끝: 탁한 단청 녹
  for (let x = 0.15; x < W; x += 0.32) b.cyl(x, eh - 0.04, D + eo, 0.05, 0.05, 0.06, C.dancheongGreen, 6, { ao: false });
  // 바깥 창방: 탁한 단청 적
  b.box(W / 2, wallTop - 0.1, D + 0.13, W + 0.3, 0.2, 0.04, C.dancheongRed, 0, { ao: false });

  // ── 기단·마당·바깥 ───────────────────────────────────
  outB.box(W / 2, -R.plinth / 2 - 0.02, D + 0.9, W + 3, R.plinth, 2.0, C.stone, 0, { jitter: 0.1, ao: false });
  for (let x = -1.4; x < W + 1.4; x += 0.7) outB.box(x + 0.35, -R.plinth / 2 - 0.02, D + 1.91, 0.68, R.plinth - 0.02, 0.04, C.stoneDark, 0, { ao: false, jitter: 0.2 });
  outB.box(W / 2, -0.03, D + 0.55, W + 0.4, 0.08, 1.1, C.floor, 0, { ao: false, jitter: 0.1 }); // 툇마루
  for (let s = 0; s < 2; s++) outB.box(W / 2, -R.plinth - 0.25 - s * 0.25, D + 2.1 + s * 0.35, 2.4, 0.25, 0.35, C.stone, 0, { ao: false });
  outB.box(W / 2, -R.plinth - 0.8, D + 18, 60, 0.1, 34, C.soil, 0, { ao: false, shade: (x, _y, z) => 0.9 + 0.1 * Math.sin(x * 1.3 + z * 0.7) });
  // 맞은편 담장 + 행각
  const far = D + 14;
  outB.box(W / 2, -R.plinth + 0.3, far, 40, 2.2, 0.5, C.plaster, 0, { ao: false, shade: (_x, y) => 0.8 + 0.2 * Math.min(1, (y + 0.4) / 2) });
  outB.box(W / 2, -R.plinth + 1.5, far, 40.6, 0.25, 0.9, C.roof, 0, { ao: false });
  for (let x = -14; x < 26; x += 3) outB.cyl(x, -R.plinth - 0.8, far + 4, 0.17, 0.16, 3.2, C.pillar, 8, { ao: false });
  roofPlane(far + 6.5, 5.2, far + 2.6, 2.8, C.roof, outB, 0.35);
  roofPlane(far + 6.5, 5.2, far + 10, 2.8, C.roof, outB, 0.35);
  outB.box(W / 2, 0.6, far + 5.2, 44, 2.6, 0.2, C.plaster, 0, { ao: false });
  // 소나무 하나(마당 서쪽)
  const pine = (px: number, pz: number, s: number) => {
    outB.bar({ x: px, y: -R.plinth - 0.8, z: pz }, { x: px + 0.4 * s, y: 3.6 * s, z: pz - 0.3 }, 0.22 * s, 0.22 * s, C.bark, { ao: false });
    for (const [dx, dy, dz, r] of [[0.2, 3.4, 0, 1.4], [0.9, 2.7, 0.4, 1.0], [-0.4, 2.5, -0.3, 0.9], [0.5, 4.0, -0.2, 0.9]] as const)
      outB.geo(new THREE.SphereGeometry(r * s, 7, 4), trs(px + dx * s, dy * s, pz + dz * s, 0, rnd() * 90, 0, 1, 0.38, 0.8), C.pine, { ao: false, jitter: 0.2 });
  };
  void pine; // 마당 나무는 문 축에서 낭독자 머리 뒤에 겹쳐 실루엣을 해친다 → 두지 않는다

  // ── 병풍(윗자리) ─────────────────────────────────────
  const sc = R.screen;
  const pw = (sc.x1 - sc.x0) / sc.panels;
  for (let i = 0; i < sc.panels; i++) {
    const cx = sc.x0 + pw * (i + 0.5);
    const zz = sc.y + (i % 2 === 0 ? 0 : 0.12);
    const ry = i % 2 === 0 ? 7 : -7;
    b.box(cx, sc.h / 2 + 0.03, zz, pw, sc.h, 0.035, C.silkBlue, ry, { ao: false });
    const inkShade = (_x: number, y: number) => 0.7 + 0.3 * Math.min(1, Math.max(0, (y - 0.3) / 1.2));
    b.box(cx, sc.h / 2 + 0.06, zz + 0.022, pw - 0.1, sc.h - 0.24, 0.01, C.hanjiOld, ry, { ao: false, shade: inkShade });
    // 옅은 먹 번짐(추상, 그림 내용을 주장하지 않는다)
    for (let k = 0; k < 3; k++)
      b.box(cx + (rnd() - 0.5) * pw * 0.5, 0.45 + rnd() * 0.5, zz + 0.03, pw * (0.25 + rnd() * 0.4), 0.04 + rnd() * 0.18, 0.004, '#8f826a', ry, { ao: false });
  }

  // ── 서안·사초 더미·소품 ──────────────────────────────
  const dk = R.desk;
  const desk = (x0: number, x1: number, z0: number, z1: number, h: number, rotY = 0, cx?: number, cz?: number) => {
    const X = cx ?? (x0 + x1) / 2;
    const Z = cz ?? (z0 + z1) / 2;
    const sx = x1 - x0;
    const sz = z1 - z0;
    const g = new Builder(3);
    g.box(0, h - 0.025, 0, sx, 0.05, sz, C.woodLacquer, 0, { ao: false });
    g.box(0, h - 0.025, 0, sx + 0.04, 0.02, sz + 0.04, C.woodLacquer, 0, { ao: false });
    g.box(0, h - 0.09, sz / 2 - 0.03, sx - 0.08, 0.08, 0.025, C.woodLacquer, 0, { ao: false });
    g.box(0, h - 0.09, -sz / 2 + 0.03, sx - 0.08, 0.08, 0.025, C.woodLacquer, 0, { ao: false });
    for (const sxn of [-1, 1]) {
      g.box((sxn * (sx - 0.1)) / 2, (h - 0.05) / 2, 0, 0.05, h - 0.05, sz - 0.1, C.woodLacquer);
      g.box((sxn * (sx - 0.1)) / 2, 0.02, 0, 0.09, 0.04, sz, C.woodLacquer);
    }
    b.geo(g.build(), trs(X, 0, Z, 0, rotY, 0), null, { ao: false });
  };
  desk(dk.x0, dk.x1, dk.y0, dk.y1, dk.h);
  desk(-0.22, 0.22, -0.45, 0.45, 0.3, 0, 8.25, 3.75); // W 윤효손
  desk(-0.45, 0.45, -0.22, 0.22, 0.3, 0, 6.0, 2.62); // O 어세겸
  desk(-0.45, 0.45, -0.22, 0.22, 0.3, 45, 10.72, 1.48); // H 홍귀달(구석)

  // 사초 더미: 묶음(한지 + 끈 + 작은 표), 꼭대기는 stack.top 을 넘지 않는다
  const st = R.stack;
  const top = dk.h;
  const cols = 2;
  const rows = 3;
  for (let ci = 0; ci < cols; ci++)
    for (let ri = 0; ri < rows; ri++) {
      const cx = st.x0 + ((st.x1 - st.x0) * (ci + 0.5)) / cols;
      const cz = st.y0 + ((st.y1 - st.y0) * (ri + 0.5)) / rows;
      let y = top;
      const layers = 2 + ((ci + ri) % 2);
      for (let l = 0; l < layers; l++) {
        const th = Math.min(0.055, st.top - y);
        if (th < 0.02) break;
        const rot = (rnd() - 0.5) * 14;
        const col = new THREE.Color(C.hanjiOld).multiplyScalar(0.8 + rnd() * 0.25);
        b.box(cx + (rnd() - 0.5) * 0.03, y + th / 2, cz + (rnd() - 0.5) * 0.03, 0.26, th, 0.3, col, rot, { ao: false, shade: (_x, yy) => 0.8 + 0.2 * Math.min(1, (yy - top) / 0.15) });
        b.box(cx, y + th / 2, cz, 0.27, th + 0.004, 0.018, C.ink, rot, { ao: false });
        y += th;
      }
    }
  // 서안 위 다른 것들: 펼친 책, 종이 묶음, 벼루, 붓, 연적
  const paper = (x: number, z: number, w: number, l: number, n: number, rot: number) => {
    for (let k = 0; k < n; k++) b.box(x + (rnd() - 0.5) * 0.02, top + 0.004 + k * 0.006, z + (rnd() - 0.5) * 0.02, w, 0.006, l, C.hanji, rot + (rnd() - 0.5) * 6, { ao: false, jitter: 0.12 });
  };
  paper(5.55, 3.35, 0.3, 0.42, 4, 8);
  paper(6.15, 4.15, 0.28, 0.38, 6, -5);
  b.geo(new THREE.BoxGeometry(0.22, 0.015, 0.3), trs(5.85, top + 0.03, 3.7, 0, 0, 9), C.hanji, { ao: false });
  b.geo(new THREE.BoxGeometry(0.22, 0.015, 0.3), trs(6.08, top + 0.03, 3.7, 0, 0, -9), C.hanji, { ao: false });
  const inkstone = (x: number, z: number, h0: number, rot: number) => {
    b.box(x, h0 + 0.02, z, 0.14, 0.04, 0.22, '#2a2826', rot, { ao: false });
    b.box(x, h0 + 0.042, z + 0.03, 0.1, 0.004, 0.12, '#0f0e0d', rot, { ao: false });
    b.bar({ x: x + 0.12, y: h0 + 0.012, z: z - 0.1 }, { x: x + 0.14, y: h0 + 0.012, z: z + 0.14 }, 0.012, 0.012, '#3b2c20', { ao: false });
    b.cyl(x - 0.12, h0, z - 0.12, 0.035, 0.03, 0.05, '#a9b2a6', 6, { ao: false });
  };
  inkstone(5.0, 4.25, top, 0);
  inkstone(8.25, 3.45, 0.3, 90);
  inkstone(6.3, 2.62, 0.3, 0);
  inkstone(10.6, 1.38, 0.3, 45);
  paper(8.25, 3.95, 0.24, 0.34, 3, 90);
  paper(10.75, 1.5, 0.26, 0.36, 5, 45);
  paper(5.85, 2.6, 0.26, 0.34, 3, 0);
  // 홍귀달(구석) 책상의 책더미
  for (let k = 0; k < 4; k++) b.box(11.05, 0.3 + 0.03 + k * 0.045, 1.2, 0.2, 0.04, 0.28, k % 2 ? '#c4b18a' : '#3c4a52', 45 + (rnd() - 0.5) * 10, { ao: false });

  // 잘라 낸 종이 조각
  if (props.slips === 'spread') {
    for (const s of SLIP_SPOTS) b.box(s.x, top + 0.003, s.y, SLIP_SIZE.w, 0.004, SLIP_SIZE.l, C.hanji, s.rot, { ao: false });
  }
  if (props.sealedBundle) {
    b.box(5.3, top + 0.06, 4.1, 0.34, 0.12, 0.26, '#7a6a4c', 6, { ao: false });
    b.box(5.3, top + 0.06, 4.1, 0.35, 0.125, 0.03, C.ink, 6, { ao: false });
    b.box(5.3, top + 0.06, 4.1, 0.03, 0.125, 0.27, C.ink, 6, { ao: false });
  }

  // ── 방석 ─────────────────────────────────────────────
  const cushion = (x: number, z: number, col: string, rot: number) => b.box(x, 0.03, z, 0.62, 0.06, 0.62, col, rot, { ao: false, jitter: 0.1 });
  cushion(R.seats.W.x, R.seats.W.y, C.cushionBlue, 0);
  cushion(R.seats.Y.x, R.seats.Y.y, C.cushionRed, 0);
  cushion(R.seats.O.x, R.seats.O.y, C.cushionRed, 0);
  cushion(R.seats.H.x, R.seats.H.y, C.cushionBlue, 45);
  cushion(R.seats.U.x, R.seats.U.y, C.cushionRed, 45);
  cushion(R.seats.A.x, R.seats.A.y, C.cushionBlue, -45);

  // ── 등잔걸이(7월 오후: 불 없음) ───────────────────────
  const lampStand = (x: number, z: number) => {
    b.cyl(x, 0, z, 0.13, 0.11, 0.04, C.brass, 8, { ao: false });
    b.cyl(x, 0.04, z, 0.018, 0.018, 0.82, C.iron, 6, { ao: false });
    b.cyl(x, 0.86, z, 0.09, 0.05, 0.03, C.brass, 8, { ao: false });
  };
  lampStand(7.1, 1.7);
  lampStand(11.7, 2.0);
  lampStand(2.8, 3.0);

  // ── 서벽 앞 궤(사초 상자)·문갑 ────────────────────────
  for (const [z, h] of [[1.3, 0.5], [2.1, 0.5], [5.1, 0.42]] as const) {
    b.box(0.42, h / 2, z, 0.6, h, 0.7, C.wood, 0, { jitter: 0.15 });
    b.box(0.42, h - 0.02, z, 0.62, 0.04, 0.72, C.woodLacquer, 0, { ao: false });
    b.box(0.74, h * 0.6, z, 0.02, 0.06, 0.12, C.brass, 0, { ao: false });
  }
  // 동벽 앞 낮은 서가(책 꽂음)
  b.box(11.72, 0.45, 7.2, 0.45, 0.9, 1.4, C.woodLacquer);
  for (let k = 0; k < 12; k++) b.box(11.55, 0.22 + Math.floor(k / 6) * 0.42, 6.62 + (k % 6) * 0.22, 0.2, 0.3, 0.06, k % 3 ? '#c9b48c' : '#40505a', 0, { ao: false, jitter: 0.2 });

  // ── 메시 ─────────────────────────────────────────────
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  group.add(b.mesh(mat));
  const outMesh = outB.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }));
  outMesh.castShadow = true;
  group.add(outMesh);
  const glowMesh = new THREE.Mesh(glowB.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  glowMesh.castShadow = true;
  group.add(glowMesh);

  return { group, glow: [glowMesh], volumetric: [] };
}
