/**
 * 눈의 주인 자신의 몸(앞쪽 덮개, ART_DIRECTION_V5 §5 / DESIGN_V5 A2·A3).
 * - 쉬는 손(rest·rest-left·rest-both): 카메라 공간에 고정 — 어느 시선이든 화면 아래 모서리에 소매가 들어온다(화면 문법).
 * - 일하는 손(write·read·seal·hold-slips): 세계의 한 점(at)에 손이 닿고, 팔은 화면 아래 바깥에서 들어온다.
 * 증인마다 실루엣이 다르다: 윤효손 오른손+붓 · 이극돈 오른손+종이 · 어세겸 두 소매를 모음(공수) · 홍귀달 왼손+책.
 * 내 소매는 늘 내 몸 그늘 속이라 색을 한 단 밝힌다(화면 문법 — 장면 밖 조명 아님).
 */
import * as THREE from 'three';
import { Builder } from './geo';
import { PAPER, ROBE, SKIN, cone, hand, sleeveArm } from './figure';
import type { PovCamera } from './camera';
import type { SelfRig } from './types';

const V = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);

export function buildSelf(rig: SelfRig, cam: PovCamera, at?: THREE.Vector3): THREE.Mesh {
  const b = new Builder(77);
  const robe = '#' + new THREE.Color(ROBE[rig.robe]).multiplyScalar(1.55).getHexString();
  const eye = V(cam.eye);
  const fwd = V(cam.forward);
  const right = V(cam.right);
  const up = V(cam.up);
  const tanV = Math.tan((cam.fovDeg * Math.PI) / 360);
  const tanH = tanV * cam.aspect;
  const k = rig.scale ?? 1;
  /** 화면 정규 좌표(sx, sy ∈ −1..1, 아래가 −) + 깊이 d(m) → 세계 */
  const ndc = (sx: number, sy: number, d: number) => eye.clone().addScaledVector(fwd, d).addScaledVector(right, sx * d * tanH).addScaledVector(up, sy * d * tanV);
  const worldUp = new THREE.Vector3(0, 1, 0);
  // 수평 기저(몸): 고개를 숙여도 어깨는 수평
  const hf = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
  const hr = new THREE.Vector3().crossVectors(hf, worldUp).normalize();
  const shoulder = (s: number) => eye.clone().addScaledVector(worldUp, -0.27).addScaledVector(hr, s * 0.2).addScaledVector(hf, -0.04);

  const arm = (s: number, e: THREE.Vector3, w: THREE.Vector3, o: { droop?: number; width?: number } = {}) =>
    sleeveArm(b, shoulder(s), e, w, robe, { width: (o.width ?? 0.92) * k, droop: (o.droop ?? 0.16) * k, seg: 18, folds: 3 });

  const brush = (tip: THREE.Vector3, dir: THREE.Vector3) => {
    const top = tip.clone().addScaledVector(dir, 0.2);
    cone(b, [tip.x, tip.y, tip.z], [tip.x + dir.x * 0.035, tip.y + dir.y * 0.035, tip.z + dir.z * 0.035], 0.001, 0.007, '#141110', 8);
    cone(b, [tip.x + dir.x * 0.035, tip.y + dir.y * 0.035, tip.z + dir.z * 0.035], [top.x, top.y, top.z], 0.0055, 0.0055, '#5a3d26', 8);
  };
  const sheet = (c: THREE.Vector3, f: THREE.Vector3, s: THREE.Vector3, w: number, l: number, lines = 5) => {
    const m = new THREE.Matrix4().makeBasis(s, worldUp, f);
    m.setPosition(c);
    b.geo(new THREE.BoxGeometry(w, 0.003, l), m, PAPER, { ao: false });
    // 글줄을 암시하는 옅은 먹 줄(글자는 그리지 않는다)
    for (let i = 0; i < lines; i++) {
      const mm = new THREE.Matrix4().makeBasis(s, worldUp, f);
      mm.setPosition(c.clone().addScaledVector(s, (i - (lines - 1) / 2) * (w / (lines + 1))).addScaledVector(worldUp, 0.002));
      b.geo(new THREE.BoxGeometry(0.004, 0.002, l * 0.8), mm, '#8f8068', { ao: false });
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
          b.geo(new THREE.BoxGeometry(0.004, 0.002, 0.22), ml, '#8f8068', { ao: false });
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
      const e = ndc(s * 1.4, -1.55, 0.36 * k);
      const w = ndc(s * 0.6, -0.84, 0.58 * k);
      arm(s, e, w);
      const f = w.clone().sub(e).normalize().addScaledVector(right, -s * 0.35).normalize();
      hand(b, w, f, worldUp, s, item === 'book' ? 0.15 : 0.55, k);
      if (item === 'brush') brush(w.clone().addScaledVector(f, 0.11 * k).addScaledVector(worldUp, -0.01), f.clone().multiplyScalar(-0.4).addScaledVector(worldUp, 0.9).addScaledVector(right, s * 0.3).normalize());
      if (item === 'sheet') sheet(w.clone().addScaledVector(f, 0.12 * k).addScaledVector(worldUp, -0.02), hf, hr, 0.2, 0.3);
      if (item === 'book') book(w.clone().addScaledVector(f, 0.1 * k).addScaledVector(worldUp, -0.035).addScaledVector(right, -s * 0.06), hf, hr, false);
      break;
    }
    case 'rest-both': {
      // 공수: 두 소매가 아래 가운데서 만나고 손은 소매 속(손이 보이지 않는 실루엣)
      for (const s of [-1, 1]) {
        const e = ndc(s * 1.25, -1.6, 0.38 * k);
        const w = ndc(s * 0.12, -0.98, 0.56 * k);
        arm(s, e, w, { droop: 0.2, width: 1.0 });
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
        if (rig.hands === 'write') {
          // 오른손: 붓을 세워 쥠 / 왼손: 종이를 펴 누름
          w = s > 0 ? T.clone().addScaledVector(hr, 0.07).addScaledVector(hf, -0.1).addScaledVector(worldUp, 0.07) : T.clone().addScaledVector(hr, -0.2).addScaledVector(hf, -0.08).addScaledVector(worldUp, 0.02);
          f = s > 0 ? hf.clone().addScaledVector(hr, -0.5).addScaledVector(worldUp, -0.5).normalize() : hf.clone().addScaledVector(hr, 0.35).addScaledVector(worldUp, -0.15).normalize();
          curl = s > 0 ? 0.85 : 0.1;
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
        const e = ndc(s * 1.3, -1.45, 0.34 * k).lerp(shoulder(s).clone().lerp(w, 0.55).addScaledVector(worldUp, -0.12), 0.35);
        arm(s, e, w.clone().addScaledVector(f, -0.02), { droop: 0.12 });
        hand(b, w, f, n, s, curl, 1);
      }
      if (rig.hands === 'write') {
        const tip = T.clone().addScaledVector(hr, 0.0).addScaledVector(hf, 0.02).addScaledVector(worldUp, 0.006);
        brush(tip, worldUp.clone().addScaledVector(hf, -0.35).addScaledVector(hr, 0.35).normalize());
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
  void SKIN;
  const mesh = b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }), true);
  mesh.name = 'self';
  return mesh;
}
