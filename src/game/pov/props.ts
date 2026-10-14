/**
 * 시각별 서안 위 소품(재구성) — 각각 이름 붙은 메시라 탭 영역·보임 검사(id 패스)에 쓸 수 있다.
 * slip:0..5 잘라 낸 종이 조각 · cloth 보자기 · cord 끈 · nametag 「金馹孫」 이름표 꾸러미 · bundle:i 아침 꾸러미(이름표에 글자 없음).
 * 유물·문서에 없는 글자를 지어 넣지 않는다: 글줄은 옅은 먹 줄로만 암시한다. 이름표 「金馹孫」 만 글자(사초의 주인, verified).
 */
import * as THREE from 'three';
import { Builder, trs } from './geo';
import { PROP_SPOTS, ROOM_EP1 as R, SLIP_SIZE, SLIP_SPOTS } from './room';
import type { PovProps } from './types';
import { NAME_TAG_GLYPHS } from './glyphs';

const TOP = R.desk.h;

function slipMesh(i: number): THREE.Mesh {
  const s = SLIP_SPOTS[i];
  const b = new Builder(400 + i);
  const g = new Builder(500 + i);
  // 두 반쪽이 아주 조금 들려 빛을 받는다(종이의 휨)
  for (const side of [-1, 1]) {
    g.geo(new THREE.BoxGeometry(SLIP_SIZE.w, 0.004, SLIP_SIZE.l / 2), trs(0, 0.004 + 0.004 * (side > 0 ? 1 : 0.4), (side * SLIP_SIZE.l) / 4, side * -3, 0, 0), '#efe3c4', { ao: false, jitter: 0.06 });
  }
  // 글줄(옅은 먹 줄 두셋 — 글자 아님) + 잘린 가장자리의 그늘
  for (const dx of [-0.025, 0, 0.025]) g.box(dx, 0.0075, 0, 0.006, 0.002, SLIP_SIZE.l * 0.78, '#8a7a62', 0, { ao: false });
  g.box(0, 0.002, SLIP_SIZE.l / 2 - 0.004, SLIP_SIZE.w, 0.004, 0.008, '#b9a882', 0, { ao: false });
  b.geo(g.build(), trs(s.x, TOP, s.y, 0, s.rot, 0), null, { ao: false });
  const m = b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.name = `slip:${i}`;
  return m;
}

/** 「金馹孫」 이름표(재구성: 이름표 형태는 일반형). 코드로 정의한 글자 비트맵을 작은 캔버스 텍스처로 */
function nameTagTexture(): THREE.CanvasTexture {
  const S = 24;
  const c = document.createElement('canvas');
  c.width = S + 6;
  c.height = S * 3 + 8;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ece0c0';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#c4b28a';
  g.fillRect(0, 0, c.width, 1);
  g.fillRect(0, c.height - 1, c.width, 1);
  g.fillStyle = '#17120f';
  (['金', '馹', '孫'] as const).forEach((ch, i) =>
    NAME_TAG_GLYPHS[ch].forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') g.fillRect(3 + x, 2 + i * S + y, 1, 1);
    }),
  );
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function bundle(b: Builder, x: number, z: number, rot: number, col = '#8d7a58', blankTag = true): void {
  b.box(x, TOP + 0.035, z, 0.3, 0.07, 0.22, col, rot, { ao: false, jitter: 0.08 });
  b.box(x, TOP + 0.036, z, 0.305, 0.074, 0.016, '#2a2320', rot, { ao: false });
  if (blankTag) {
    // 글자 없는 이름표(멀어서 안 읽힌다 — 글자를 지어 넣지 않는다)
    const r = (rot * Math.PI) / 180;
    b.box(x - Math.cos(r) * 0.04, TOP + 0.072, z + Math.sin(r) * 0.04, 0.07, 0.003, 0.15, '#e7dab8', rot + 90, { ao: false });
  }
}

export function buildProps(p: PovProps): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  if (p.slips === 'spread') for (let i = 0; i < SLIP_SPOTS.length; i++) out.push(slipMesh(i));
  if (p.wrapSlips) {
    // 보자기: 다섯 장 밑에 마름모로 펼침, 두 모서리는 이미 접혀 올라옴(싸는 중)
    const c = PROP_SPOTS.cloth;
    const b = new Builder(611);
    const col = '#3b4654';
    b.box(c.x, TOP + 0.002, c.y, c.half * 1.42, 0.003, c.half * 1.42, col, 45, { ao: false, jitter: 0.05 });
    // 접힌 모서리 둘(북·남): 얇은 삼각 판을 비스듬히
    for (const s of [-1, 1]) {
      const g = new THREE.BufferGeometry();
      const h = c.half;
      const pts = [0, 0, 0, -0.16, 0, 0, 0.16, 0, 0, 0, 0.09, -s * 0.2];
      g.setAttribute('position', new THREE.Float32BufferAttribute([...pts.slice(0, 3), ...pts.slice(3, 6), ...pts.slice(9, 12), ...pts.slice(0, 3), ...pts.slice(9, 12), ...pts.slice(6, 9)], 3));
      g.computeVertexNormals();
      b.geo(g, trs(c.x, TOP + 0.004, c.y + s * h, 0, 0, 0), '#4a5665', { ao: false });
    }
    const m = b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    m.name = 'cloth';
    out.push(m);
    // 끈: 서안 위에 느슨하게 감긴 고리
    const cb = new Builder(612);
    const cd = PROP_SPOTS.cord;
    cb.geo(new THREE.TorusGeometry(0.07, 0.006, 5, 22, Math.PI * 1.7), trs(cd.x, TOP + 0.007, cd.y, 90, 20, 0), '#6a2e26', { ao: false });
    cb.geo(new THREE.TorusGeometry(0.05, 0.006, 5, 18, Math.PI * 1.5), trs(cd.x + 0.04, TOP + 0.012, cd.y - 0.02, 90, 140, 0), '#6a2e26', { ao: false });
    const cm = cb.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }));
    cm.name = 'cord';
    out.push(cm);
  }
  if (p.nameTag) {
    const t = PROP_SPOTS.nameTag;
    const b = new Builder(613);
    bundle(b, t.x, t.y, t.rot, '#cbb78f', false);
    const bm = b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }));
    bm.name = 'nametag-bundle';
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.095, 0.29), new THREE.MeshLambertMaterial({ map: nameTagTexture() }));
    // 꾸러미 서쪽 면에 기대 세운 이름표: 앞면은 서쪽(Y 이극돈 자리)을 향한다. 한 면만 그려 동쪽(W)에서는 뒷면 — 글자가 보이지 않는다
    tag.position.set(t.x - 0.19, TOP + 0.13, t.y);
    tag.lookAt(tag.position.x - 1, tag.position.y + 0.5, tag.position.z);
    tag.receiveShadow = true;
    tag.name = 'nametag';
    out.push(bm, tag);
  }
  if (p.bundles) {
    // 아침에 들어온 꾸러미(이름표는 있으나 글자는 그리지 않는다 — 멀어 안 읽힘)
    const spots: [number, number, number][] = [
      [5.95, 4.2, 4],
      [6.3, 4.28, -6],
      [5.6, 4.25, 10],
      [6.15, 3.9, -2],
      [5.85, 3.55, 7],
    ];
    const b = new Builder(614);
    spots.slice(0, p.bundles).forEach(([x, z, r], i) => bundle(b, x, z, r, i % 2 ? '#7d6a4c' : '#8d7a58'));
    const m = b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.name = 'bundles';
    out.push(m);
  }
  if (p.sealedBundle) {
    const b = new Builder(615);
    b.box(5.3, TOP + 0.06, 4.1, 0.34, 0.12, 0.26, '#5d4a33', 6, { ao: false });
    b.box(5.3, TOP + 0.06, 4.1, 0.35, 0.125, 0.03, '#1f1a16', 6, { ao: false });
    b.box(5.3, TOP + 0.06, 4.1, 0.03, 0.125, 0.27, '#1f1a16', 6, { ao: false });
    const m = b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.name = 'sealed';
    out.push(m);
  }
  for (const o of out) {
    o.castShadow = true;
    o.receiveShadow = true;
  }
  return out;
}
