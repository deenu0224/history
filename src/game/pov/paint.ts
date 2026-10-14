/**
 * 그림체 'painted' 전용 재질 질감(셰이더 안 절차적 잡음, 텍스처 없음). 지연 청크 render3d 에서만 쓴다.
 *  - wood: 방(기둥·마루·서안) — 수평면은 동서로, 수직면은 위아래로 늘인 결. 밝은 면(한지·회벽)은 결을 줄이고 고운 섬유만.
 *  - cloth: 사람·내 몸 — 위아래로 흐르는 옷 주름 명암 + 고운 올.
 * 기존 onBeforeCompile(테 빛)이 있으면 이어 붙인다.
 */
import * as THREE from 'three';

const NOISE = /* glsl */ `
varying vec3 vPaintW;
varying vec3 vPaintN;
float pH3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float pN3(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(pH3(i), pH3(i + vec3(1,0,0)), f.x), mix(pH3(i + vec3(0,1,0)), pH3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(pH3(i + vec3(0,0,1)), pH3(i + vec3(1,0,1)), f.x), mix(pH3(i + vec3(0,1,1)), pH3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float pFbm(vec3 p){ return 0.5 * pN3(p) + 0.25 * pN3(p * 2.03 + 1.7) + 0.125 * pN3(p * 4.01 + 3.1) + 0.0625 * pN3(p * 8.02 + 5.3); }
`;

export type PaintKind = 'wood' | 'cloth';

export function withPaint(mat: THREE.Material, kind: PaintKind): void {
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPaintW;\nvarying vec3 vPaintN;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvPaintW = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvPaintN = normalize(mat3(modelMatrix) * objectNormal);',
      );
    const body =
      kind === 'wood'
        ? `{
  vec3 p = vPaintW; vec3 an = abs(normalize(vPaintN));
  float Ld = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  float woody = 1.0 - smoothstep(0.18, 0.5, Ld);
  vec3 q = an.y > 0.6 ? vec3(p.x * 1.2, p.y * 6.0, p.z * 26.0) : vec3(p.x * 22.0 + p.z * 22.0, p.y * 0.9, p.z * 4.0 + p.x * 4.0);
  float g = pFbm(q);
  float rings = 0.5 + 0.5 * sin(g * 26.0);
  float k = mix(0.9 + 0.2 * g, 0.72 + 0.32 * g + 0.12 * rings, woody);
  float fib = pN3(p * vec3(90.0, 140.0, 90.0));
  k *= 0.97 + 0.06 * fib;
  float blot = pFbm(p * 0.9);
  k *= 0.9 + 0.2 * blot;
  diffuseColor.rgb *= k;
}`
        : `{
  vec3 p = vPaintW;
  float fold = pFbm(vec3(p.x * 9.0, p.y * 1.1, p.z * 9.0));
  float creases = smoothstep(0.32, 0.6, fold);
  float weave = pN3(p * 260.0);
  diffuseColor.rgb *= (0.74 + 0.36 * creases) * (0.96 + 0.06 * weave);
}`;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + NOISE).replace('#include <color_fragment>', '#include <color_fragment>\n' + body);
  };
  mat.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}|paint:${kind}`;
  mat.needsUpdate = true;
}
