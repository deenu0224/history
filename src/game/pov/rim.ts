/**
 * 테 빛(rim): 장면 안 광원(문·창·띠살문 한지) 쪽을 향한 실루엣 가장자리를 살짝 밝힌다.
 * 저해상도 픽셀에서 어둠 속 손·사람이 바탕과 섞이지 않게 하는 화면 문법이다 — 빛의 출처는 늘 장면 안의 실제 광원 자리
 * (ART_DIRECTION_V5 §4·§11: 장면 밖 조명 금지). Lambert 셰이더의 마지막 단계에 더한다(지연 청크 render3d 에서만 쓴다).
 */
import * as THREE from 'three';

export interface RimOpts {
  /** 광원 자리(세계 좌표) */
  from: THREE.Vector3;
  color?: THREE.ColorRepresentation;
  /** 가장자리 세기 */
  strength: number;
  /** 가장자리 폭(프레넬 지수, 클수록 가늘다) */
  power?: number;
  /** 광원 쪽 면을 부드럽게 감싸는 채움(0 = 없음) — 내 손처럼 그늘 속 가까운 덮개에만 */
  wrap?: number;
}

export function withRim(mat: THREE.MeshLambertMaterial, o: RimOpts): THREE.MeshLambertMaterial {
  const key = `rim:${o.strength}:${o.power ?? 2.2}:${o.wrap ?? 0}`;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.rimFrom = { value: o.from.clone() };
    sh.uniforms.rimColor = { value: new THREE.Color(o.color ?? '#ffd9a0') };
    sh.uniforms.rimK = { value: new THREE.Vector3(o.strength, o.power ?? 2.2, o.wrap ?? 0) };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimFrom;\nuniform vec3 rimColor;\nuniform vec3 rimK;')
      .replace(
        '#include <opaque_fragment>',
        `{
  vec3 rimP = -vViewPosition;
  vec3 rimL = normalize((viewMatrix * vec4(rimFrom, 1.0)).xyz - rimP);
  vec3 rimV = normalize(vViewPosition);
  float rimNL = dot(normal, rimL);
  float rimF = pow(1.0 - clamp(dot(normal, rimV), 0.0, 1.0), rimK.y);
  float rimE = rimF * smoothstep(-0.15, 0.55, rimNL);
  float rimW = clamp((rimNL + 0.35) / 1.35, 0.0, 1.0);
  outgoingLight += rimColor * diffuseColor.rgb * (rimK.x * rimE + rimK.z * (0.4 + 0.6 * rimW * rimW));
}
#include <opaque_fragment>`,
      );
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}
