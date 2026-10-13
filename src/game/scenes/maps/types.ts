/**
 * 관측 디오라마 맵 공통 타입. 맵 데이터 형식은 src/data/world/maps.ts 의 SceneMap 과 같다
 * (ground/walls 범례와 autotile 규칙도 동일). 장식·인물은 `objects` 로 얹는다.
 *
 * 모든 디오라마는 재구성(reconstructed)이다: 검증된 도면이 없으므로 구조·배치는 '그럴듯한 일반형'일 뿐
 * 특정 건물의 실제 구조를 주장하지 않는다. 연도·장소·인물 표지는 UI 에 노출하지 않는다.
 */
export interface DioramaObject {
  /** 아트 레지스트리 키(오브젝트/포즈/캐릭터). 캐릭터 키는 frame 으로 방향·동작을 고른다 */
  spriteKey: string;
  /** 타일 좌표. 스프라이트 중심 = x*32+16, 바닥 = (y+1)*32-2. 폭이 2칸인 스프라이트는 .5 단위 허용 */
  x: number;
  y: number;
  /** 기본 프레임 (캐릭터: 0 정면 / 5 왼쪽 / 10 오른쪽 / 15 뒤. 포즈: 0 정면 / 1 왼쪽 / 2 오른쪽) */
  frame?: number;
  /** 바닥에 깔리는 것(항상 캐릭터 아래) */
  flat?: boolean;
  /** 재생할 반복 애니메이션 키(등잔·화로·서리 포장 등) */
  anim?: string;
}

export interface Diorama {
  w: number;
  h: number;
  ground: string[];
  walls: string[];
  spawn: { x: number; y: number };
  ambient: 'past';
  objects: DioramaObject[];
}
