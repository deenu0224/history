/**
 * 꼭짓점 색 기하 빌더: 많은 작은 조각(판자·살·소품)을 하나의 BufferGeometry 로 합친다(그리기 호출 최소).
 * 텍스처 없음. 색은 꼭짓점 색 + 조각별 결정적 흔들림 + 높이 기반 접지 그늘(가짜 AO).
 */
import * as THREE from 'three';
import { mulberry32 } from './camera';

export interface AddOpts {
  /** 조각 색 밝기 흔들림(0..1) */
  jitter?: number;
  /** 바닥 가까운 꼭짓점을 어둡게(접지 그늘). 기본 true */
  ao?: boolean;
  /** 꼭짓점별 색 함수(세계 좌표) — 그라데이션 */
  shade?: (x: number, y: number, z: number) => number;
}

const _c = new THREE.Color();
/** 이미 선형인 꼭짓점 색을 다시 변환하지 않도록 setRGB 는 작업 색공간(선형)으로 받는다 */
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _nm = new THREE.Matrix3();

export class Builder {
  private pos: number[] = [];
  private nor: number[] = [];
  private col: number[] = [];
  private rnd: () => number;

  constructor(seed = 1) {
    this.rnd = mulberry32(seed);
  }

  get empty(): boolean {
    return this.pos.length === 0;
  }

  /** color = null 이면 기하의 꼭짓점 색(color 속성)을 그대로 쓴다(중첩 빌더) */
  add(geo: THREE.BufferGeometry, m: THREE.Matrix4, color: THREE.ColorRepresentation | null, o: AddOpts = {}): this {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const vc = color === null ? g.getAttribute('color') : null;
    _nm.getNormalMatrix(m);
    if (color !== null) _c.set(color);
    const j = o.jitter ? 1 + (this.rnd() - 0.5) * o.jitter : 1;
    const ao = o.ao !== false;
    for (let i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(m);
      _n.fromBufferAttribute(n, i).applyMatrix3(_nm).normalize();
      this.pos.push(_v.x, _v.y, _v.z);
      this.nor.push(_n.x, _n.y, _n.z);
      let k = j;
      if (ao) k *= 0.55 + 0.45 * Math.min(1, Math.max(0, (_v.y + 0.02) / 0.35));
      if (o.shade) k *= o.shade(_v.x, _v.y, _v.z);
      if (vc) _c.setRGB(vc.getX(i), vc.getY(i), vc.getZ(i));
      this.col.push(_c.r * k, _c.g * k, _c.b * k);
    }
    if (g !== geo) g.dispose();
    return this;
  }

  /** 상자: 가운데 (x,y,z), 크기 (sx,sy,sz), y축 회전(도) */
  box(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.ColorRepresentation, rotY = 0, o?: AddOpts): this {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (rotY * Math.PI) / 180, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    this.add(g, m, color, o);
    g.dispose();
    return this;
  }

  /** 두 점 사이 상자(막대): 단면 sx×sy */
  bar(a: THREE.Vector3Like, b: THREE.Vector3Like, sx: number, sy: number, color: THREE.ColorRepresentation, o?: AddOpts): this {
    const A = new THREE.Vector3(a.x, a.y, a.z);
    const Bv = new THREE.Vector3(b.x, b.y, b.z);
    const len = A.distanceTo(Bv);
    const g = new THREE.BoxGeometry(sx, sy, len);
    const m = new THREE.Matrix4().lookAt(A, Bv, Math.abs(Bv.y - A.y) > len * 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0));
    m.setPosition(A.clone().add(Bv).multiplyScalar(0.5));
    this.add(g, m, color, o);
    g.dispose();
    return this;
  }

  /** 세로 원기둥 */
  cyl(x: number, y0: number, z: number, r0: number, r1: number, h: number, color: THREE.ColorRepresentation, seg = 10, o?: AddOpts): this {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg);
    const m = new THREE.Matrix4().makeTranslation(x, y0 + h / 2, z);
    this.add(g, m, color, o);
    g.dispose();
    return this;
  }

  /** 임의 기하 + 행렬 */
  geo(g: THREE.BufferGeometry, m: THREE.Matrix4, color: THREE.ColorRepresentation | null, o?: AddOpts): this {
    this.add(g, m, color, o);
    g.dispose();
    return this;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }

  mesh(mat: THREE.Material, shadows = true): THREE.Mesh {
    const me = new THREE.Mesh(this.build(), mat);
    me.castShadow = shadows;
    me.receiveShadow = shadows;
    return me;
  }
}

/** 변환 행렬 도우미 */
export function trs(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): THREE.Matrix4 {
  const d = Math.PI / 180;
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx * d, ry * d, rz * d, 'YXZ')),
    new THREE.Vector3(sx, sy, sz),
  );
}
