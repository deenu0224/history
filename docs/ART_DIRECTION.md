# 결록(缺錄) 아트 디렉션

> 범위: `src/game/art/**` 의 코드 정의 픽셀아트. 외부 아트 툴/이미지 파일 없음 — 모든 스프라이트는 문자 격자(`PixelSprite`)이며 런타임에 캔버스로 렌더된다.
> 한 줄 방향: **절제된 조선 관청(1490년대, 성종~연산군) + 절제된 근미래 연구실.** 네온/홀로그램 금지. 따뜻한 램프빛이 유일한 강한 색.

## 1. 규격

| 항목 | 값 |
|---|---|
| 타일 | 32×32, 3/4 탑다운(RPG 시점). 광원은 좌상단 |
| 캐릭터 | 24×36, 앵커(발) = (12, 34). 그림자 타원 포함 |
| 오브젝트 | 필요 크기(16~96px). 앵커 = 바닥 접지점 중앙 |
| 큰 오브젝트 | 소나무 64×64, 병풍 64×48, 현판 64×24, 서가 32×64, 거문고(임시) 96×16 |
| UI 아이콘 | 24×24 |
| UI 패널 | 48×48 9-slice, 슬라이스 12px (`NINE_SLICE`) |
| 렌더 | 정수 배율 최근접(`imageSmoothingEnabled=false`). Phaser 텍스처는 NEAREST 필터 |

### 데이터 포맷

```ts
type PixelSprite = {
  w: number; h: number;
  palette: Record<string, string>;   // 한 글자 → #rrggbb | #rrggbbaa. '.' 은 투명(정의 금지)
  frames: string[][];                // 프레임마다 h 개 행, 행마다 w 글자
  anchor?: { x: number; y: number };
}
```

- 스프라이트는 `draw.ts` 의 `Grid`(rect/line/ellipse/stamp/speckle/outline…)로 코드에서 만든다. 난수는 시드 고정(`rng(seed)`) → 결정적.
- 팔레트는 마스터 팔레트(`palettes.ts`)에서 **사용된 글자만** 추려 스프라이트에 담는다.
- 반투명 색(`glow*`, `shade*`)은 8자리 hex 로 정의한다(램프 번짐, 바닥 그림자).

## 2. 팔레트

원칙: 재질당 3~4톤(밝음→어두움), 제한된 색 수(총 약 90색), 윤곽선은 **순흑 금지** — 같은 계열의 가장 어두운 색(`OUTLINE_OF`).

### 과거(조선)

| 재질 | 톤 (밝음 → 어두움) |
|---|---|
| 한지 | `hanji0` #efe5cb `hanji1` #dccfae `hanji2` #c0b08a `hanji3` #988a68 |
| 목재 | `wood0` #b07e52 `wood1` #8a5c37 `wood2` #64412a `wood3` #432b1c |
| 먹 | `ink0` #5b5249 `ink1` #3a342f `ink2` #25211e `ink3` #14110f |
| 단청 녹 | `green0` #5a9078 `green1` #3b6f5e `green2` #2f5d50 `green3` #1f3f37 |
| 단청 적(주홍) | `red0` #c46a5a `red1` #a04540 `red2` #7a2f2f `red3` #521f22 |
| 황토/오커 | `ochre0` #dcb468 `ochre1` #b88a3e `ochre2` #8a6428 `ochre3` #5e4219 |
| 슬레이트 블루 | `blue0` #7f9ab4 `blue1` #566f8c `blue2` #3c5068 `blue3` #263648 |
| 마당 흙 | `soil0` #c9ae80 `soil1` #b0946a `soil2` #937a54 `soil3` #72603f |
| 돌 | `stone0` #b6b2a4 `stone1` #918e82 `stone2` #6c6a62 `stone3` #4a4943 |
| 풀 | `grass0` #8aa75a `grass1` #6a8a45 `grass2` #4d6c36 `grass3` #35502a |
| 기와 | `roof0` #8e949e `roof1` #6e7480 `roof2` #4e5460 `roof3` #323844 |
| 피부 | `skin0` #f0cfa8 `skin1` #d9a67c `skin2` #a8774f `skin3` #6b4430 |
| 삼베/무명 | `cloth0` #e4e0d4 `cloth1` #c8c4b6 `cloth2` #a29e90 `cloth3` #7a766a |
| 램프빛 | `lamp0` #fff0b8 `lamp1` #ffd27a `lamp2` #e9a04a `lamp3` #a8602c / 번짐 `glow0` #ffd27a55 `glow1` #ffd27a28 |
| 그림자 | `shade0` #14110f30 `shade1` #14110f60 `shade2` #14110fa0 (반투명) |

### 현대(연구실)

| 재질 | 톤 |
|---|---|
| 남색 | `navy0` #0f141c `navy1` #182130 `navy2` #243046 `navy3` #34445e `navy4` #4c6080 |
| 청회색 | `steel0` #6f8196 `steel1` #93a3b4 `steel2` #b9c4ce `steel3` #dde3e7 |
| 숯색 | `char0` #1e2024 `char1` #2c2f35 `char2` #3e424a `char3` #575c66 |
| 청록 | `teal0` #1d4446 `teal1` #2d6a6b `teal2` #4a9795 `teal3` #86c4bd |
| 카펫 | `carpet0` #2c3a42 `carpet1` #3a4b54 `carpet2` #4c5f69 |
| 창밖 밤 | `night0` #121a2a `night1` #1c2a44 `citylight` #8f8c6c (희미하게) |
| 램프빛 | 과거와 공유 (`lamp*`, `glow*`) |

현대 공간의 목재(바닥·책상)는 과거 `wood*`를 그대로 쓴다 → 두 시대가 같은 따뜻한 나무색으로 이어진다.

## 3. 윤곽선 / 음영 규칙

1. **윤곽선**: 오브젝트·캐릭터 외곽은 `autoOutline` — 이웃 재질의 가장 어두운 톤(목재→`wood3`, 기와→`roof3`, 한지→`ink1`). 타일은 면이 이어져야 하므로 외곽선을 두르지 않고 이음선(줄눈)만 그린다.
2. **음영**: 광원은 좌상단. 면마다 `하이라이트(좌/상) · 기본 · 중간 그늘 · 깊은 그늘(우/하)` 4톤 이내. 질감(점·결)은 기본색 위에 인접 톤 1단계만 흩뿌린다.
3. **바닥 그림자**: 오브젝트 아래 `shade0/shade1` 타원. 캐릭터는 `shade1` 타원.
4. **밴딩 금지**: 2px 이상의 완전 평면 직사각형을 피한다(나뭇결, 한지 얼룩, 기와 줄, 돌 줄눈 등으로 깨뜨림).
5. **램프빛**: `lamp*` 3~4톤 + 반투명 `glow*` 동심 번짐. 화면/화로/등잔 외에는 채도 높은 색 사용 금지.
6. **한지**: 흰색이 아닌 `hanji0~3`. 완전한 흰색(#fff)은 쓰지 않는다.

## 4. 네이밍 규칙

| 접두사 | 용도 | 예 |
|---|---|---|
| `tile_` | 32×32 타일(TILES) | `tile_madang_a`, `tile_wall_corner_tl` |
| `obj_` | 오브젝트/자연물(SPRITES) | `obj_seoan`, `obj_lab_desk` |
| `artifact_` | 사건 유물(고증 대상) | `artifact_geomungo_TEMP` |
| `char_` | 캐릭터 | `char_official_red` |
| `ui_` / `icon_` | UI 패널 / 24×24 아이콘 | `ui_panel_hanji`, `icon_scroll` |
| `anim_` | 오브젝트 애니메이션 키 | `anim_lamp_flicker` |
| `{charKey}_{action}[_{dir}]` | 캐릭터 애니메이션 | `char_sagwan_walk_left`, `char_clerk_bow` |

- 임시 에셋은 키에 `_TEMP` 접미사를 붙인다(현재 `artifact_geomungo_TEMP`). 최종화 시 키를 바꾸므로 코드에서는 `OBJ_KEYS.artifactGeomungoTemp` 상수로만 참조한다.
- 코드 상수: `TILE_KEYS`, `OBJ_KEYS`, `CHAR_KEYS`, `UI_KEYS` (camelCase).

## 5. 타일 목록

- **마당/길/풀**: `tile_madang_a/b/c`(흙 3종: 기본·자갈·빗자루 자국), `tile_bakseok`(박석), `tile_grass_a/b`
- **담장(기와 담, 3/4)**: `tile_wall_h`(가로), `tile_wall_v`(세로), `tile_wall_end_l/r`, `tile_wall_corner_tl/tr/bl/br`. 윗면 기와 띠(14px) + 토석담 면(16px)
- **건물 정면(세로로 쌓기)**: `roof_ridge(_l/_r)` → `roof_body` → `roof_eave(_l/_r)` → `eave_rafter`(서까래+단청 띠) → `pillar` / `window_hanji(_lit)` / `door_hanji` / `door_gate` → `maru`·`toenmaru` → `seomdol`·`stairs`. 측면: `roof_edge_l/r`
- **실내**: `ondol_floor`(장판), `inner_wall`, `door_inner`, `maru`
- **현대 연구실**: `lab_floor_wood`, `lab_carpet`, `lab_wall`, `lab_window`(희미한 밤 도시), `lab_door`

## 6. 오브젝트 목록

- **조선**: `obj_seoan`(서안+문방사우: 벼루·먹·붓·종이·문진), `obj_books_stack`(선장본), `obj_bookshelf`(서가), `obj_sacho_bundle`(사초 묶음), `obj_lamp`(등잔, 3프레임), `obj_folding_screen`(병풍), `obj_chest`(궤), `obj_jar`(항아리), `obj_brazier`(화로, 2프레임), `obj_plaque`(현판), `obj_well`(우물), `artifact_geomungo_TEMP`(거문고 **임시**)
- **자연**: `obj_pine`(64×64), `obj_rock_a/b`, `obj_grass_tuft`
- **현대**: `obj_lab_desk`(모니터 빛 2프레임), `obj_lab_shelf`, `obj_case_empty/filled`(진열장), `obj_display_stand`(진열대), `obj_chair`, `obj_floor_lamp`, `obj_terminal`(DB 콘솔, 2프레임), `obj_plant`

## 7. 캐릭터

24×36. 모든 캐릭터 프레임 배치(`CHAR_FRAMES`)는 동일하다.

| 프레임 | 내용 |
|---|---|
| 0–4 | down: 0=idle, 1–4=walk |
| 5–9 | left |
| 10–14 | right (left 반전) |
| 15–19 | up |
| 20 | bow (NPC 인사) |
| 21–23 | write (사관, 앉아 기록) |
| 24–25 | read (사관, 서책 읽기) |

| 키 | 설명 | 프레임 수 |
|---|---|---|
| `char_player_modern` | 연구자(짙은 코트, 안경, 청록 사원증) | 20 |
| `char_player_observer` | 위와 같은 픽셀, 채도↓ + 반투명 + 푸른 기운(`tintPalette`) — 과거 관찰용 | 20 |
| `char_official_red` | 관료. 붉은 계열 단령, 풍채 큼, 긴 흰 수염, 주름 | 21 |
| `char_official_blue` | 관료. 푸른 계열, 보통 체격, 염소수염 | 21 |
| `char_official_green` | 관료. 올리브 녹색, 마른 체격, 콧수염 | 21 |
| `char_sagwan` | 사관. 짙은 녹청색 단령, 수염 없음, 허리춤 붓. write/read 포함 | 26 |
| `char_clerk` | 서리. 회갈색 평복 + 검은 갓형 모자, 구부정 | 21 |
| `char_servant` | 하인/노비. 흰회색 저고리·바지, 상투+망건 | 21 |

구분 장치(작은 크기에서): ① 실루엣 — 사모의 날개 vs 갓의 챙 vs 상투, ② 수염(긴/염소/콧수염/없음), ③ 로브 색, ④ 체격(`build` ±1)과 자세(서리는 구부정).

### 애니메이션 키 (`ANIMS`)

- 캐릭터마다: `{key}_idle_{down|left|right|up}`(1fps, 반복), `{key}_walk_{dir}`(8fps, 4프레임 반복)
- NPC: `{key}_bow`(1프레임, 반복 없음)
- 사관: `char_sagwan_write`(21–23, 4fps, 반복), `char_sagwan_read`(24–25, 2fps, 반복)
- 오브젝트: `anim_lamp_flicker`(등잔), `anim_brazier_embers`(화로), `anim_lab_desk_screen`(모니터 빛), `anim_terminal_blink`(터미널 LED)

## 8. TEMP vs FINAL 정책

모든 키는 `SPRITE_META[key] = { status: 'temp' | 'final', note?, needsReference? }` 를 가진다(`src/game/art/registry.ts`).

- **final**: 형태·색이 확정되어 시각적으로 출시 가능하고, 알려진 고증 문제가 없는 것(현대 공간, UI, 자연물, 기본 타일 등).
- **temp**: 고증 미확인/자리표시. 반드시 `note`(사유·교체 조건)와 `needsReference`(고증 항목 ID)를 가진다. 테스트가 이를 강제한다.
- 새 에셋은 기본 `final`로 등록되므로, **역사 고증이 걸린 에셋은 `registry.ts` 의 `metaEntries` 에서 `temp(...)` 로 덮어쓴다.**
- 검증된 참고자료가 도착하면: 스프라이트 수정 → 키의 `_TEMP` 제거(필요 시) → `SPRITE_META` 갱신 → 아래 목록에서 해당 항목 삭제.
- 화면에서 TEMP 를 알아보기 쉽도록 거문고 임시 에셋 모서리에 붉은 점을 찍어 두었다.

## 9. 고증 필요 항목 (`REFERENCE_NEEDED`)

**주의: 관복의 색/흉배/품계 표현은 전부 임시이며 정확성을 주장하지 않는다.** 빨강/파랑/초록은 NPC를 구분하기 위한 시각적 장치일 뿐, 성종~연산군 시기의 품계-복색 규정과 대응한다고 가정하지 않는다. 검증 전에는 대사·도감 등에서 "복색으로 품계를 알 수 있다"는 식의 서술에 이 스프라이트를 근거로 쓰지 않는다.

| ID | 주제 | 필요한 확인 |
|---|---|---|
| `geomungo` | 거문고 | 몸통 비례, 괘 수/배치, 술대, 현 색, 문양 (현재 6현·16괘 암시만, 96×16 임시) |
| `gwanbok-color` | 관복 색 | 시대별 품계-복색 대응 |
| `heungbae` | 흉배 | 품계·시기별 유무와 문양 (현재 5×4 임시 도상) |
| `samo` | 사모/단령 | 모자 날개 비례, 단령 소매·길이 |
| `sagwan-tools` | 사관 휴대품 | 붓·먹·사초 휴대 방식 |
| `clerk-attire` | 서리 복식 | 모자·옷감·색 |
| `servant-attire` | 하인/노비 복식 | 머리 모양, 옷, 신발 |
| `plaque-text` | 현판 | 실제 문구·서체 (현재 글자는 실제 한자가 아닌 획 자리표시) |
| `screen-painting` | 병풍 | 그림 소재 |
| `bookshelf-form` | 서가 | 조선 서책 보관 가구 형태 |
| `sacho-form` | 사초 | 종이 규격/묶음/보관 |
| `bookbinding` | 선장본 | 오침안정법 구멍 위치/실 색 |
| `dancheong-pattern` | 단청 | 관아 건물에서의 문양/채색 수위 |
| `gate-form` | 관아 대문 | 솟을대문 여부, 문짝 장식 |
| `roof-ornament` | 지붕 장식 | 치미/잡상 사용 여부 |

## 10. 사용법 (요약)

```ts
import { registerPhaserTextures, registerPhaserAnims, TILE_KEYS, OBJ_KEYS, CHAR_KEYS, charFrame, toDataURL, UI_KEYS } from '@/game/art';

// Phaser (preload/create 초기에)
registerPhaserTextures(this);   // 모든 타일/스프라이트 텍스처 (프레임 이름 = 0..n-1)
registerPhaserAnims(this);      // ANIMS 등록
this.add.image(x, y, TILE_KEYS.madangA);
this.add.sprite(x, y, CHAR_KEYS.sagwan, charFrame('down')).play('char_sagwan_walk_down');
this.add.nineslice(x, y, UI_KEYS.uiPanelHanji, undefined, 160, 96, 12, 12, 12, 12);

// React
<img src={toDataURL(UI_KEYS.iconScroll, 0, 2)} style={{ imageRendering: 'pixelated' }} />
```

- 여러 프레임 스프라이트는 가로 스트립 텍스처 하나로 등록되므로, `add.image/sprite` 에는 **프레임을 명시**한다(기본 프레임은 전체 스트립). 단일 프레임 타일은 키만으로 충분하다.
- `validateSprite(sprite)` 가 행 길이·팔레트 글자·색 형식을 검사한다. `tests/unit/art.test.ts` 가 레지스트리 전체를 검증한다(캔버스 불필요).
- 캔버스가 필요한 함수(`renderSpriteToCanvas`, `toDataURL`, `registerPhaserTextures`)만 DOM 을 요구한다.

## 11. 결록 단말(OS) 아트 (`os_*.ts`)

게임 전체가 근미래 연구자의 단말 OS 라는 전제의 UI 에셋. 전용 팔레트 `os_palette.ts`(`O`/`OSPAL`: 숯·남색·회색 `k0~kw`, 청록 `t0~t4`, 램프 호박 `a0~a4`, 종이 `p0~p4`, 흑연 `g`, 절제된 적 `r`, 목재 `w`, 피부 `f`, 머리 `h`, 반투명 `s*/l*/m*/q*`)를 스프라이트마다 담는다. 네온/홀로그램 금지, 따뜻한 색은 호박 램프와 종이/나무뿐. 코드 접근은 `OS_KEYS`(registry.ts).

| 그룹 | 키 | 크기 |
|---|---|---|
| 앱 아이콘 | `app_db` `app_observe` `app_reader` `app_board` `app_messenger` `app_mail` `app_archive` `app_notebook` `app_settings` `app_timeline` (+`_sm`) | 32×32 / 16×16 |
| 창/컨트롤(9-slice) | `os_window` `os_window_idle`(48², 6/6/20/6), `os_btn[_hover/_pressed]` `os_btn_primary[...]`(24², 6), `os_panel`, `os_field[_focus]`(24×20, 5), `os_tab[_idle]`(24×22), `os_scroll_thumb/_track`(8px, 3) | |
| 컨트롤 소품 | `os_title_min/max/close[_hover]`(16²), `os_checkbox_off/on`(14²), `os_badge`(12²), `os_badge_dot`(8²) | |
| 상태바 | `stat_signal` `stat_battery` `stat_clock` `stat_lock` `stat_sync` `stat_warning` | 12×12 |
| 배경 | `os_wallpaper` 320×180, `os_wallpaper_portrait` 180×320 (정수 배율 최근접 확대) | |
| 관측 오버레이 | `ov_scanline`(32², 타일링), `ov_noise`(64², 4프레임), `ov_viewfinder`(48² 9-slice 12), `ov_scrub_track/_fill`(24×8 9-slice 4/4/2/2), `ov_scrub_tick(_major)`, `ov_scrub_knob`(12×20), `ov_observing_dot`(16², 2프레임 맥동), `ov_observing_pill`(24×16 9-slice 8/8/6/6) | |
| 노트/보드 | `note_paper_tile`(64², 타일링), `note_underline_a/b/c`, `note_check_pencil/red`, `note_circle_pencil/red`, `note_cross_red`, `board_pin_red/teal/amber`, `board_string_h`(16×3), `board_string_knot`, `board_card`(32×24, 6/6/8/6), `board_polaroid`(48×56, 8/8/8/16, 가운데 투명) | |
| 초상 | `avatar_player`(성별 단서 없음) `avatar_colleague_a`(안경) `avatar_colleague_b`(기록관리) `avatar_system`(허구 기관의 추상 문장: 끊어진 고리+칸+점) | 32×32 |
| 전시 | `exhibit_geomungo_TEMP` `exhibit_silrok_book_TEMP` `exhibit_sacho_bundle_TEMP` | 96×96 |

- "관측 중" 문구는 픽셀 글자가 아니라 UI 텍스트로 `ov_observing_pill` 위에 얹는다(영문 REC 표기 없음).
- `ov_*` 오버레이는 반투명이므로 뷰어 위에 `alpha` 그대로 합성한다. 주사선은 약해서 2~3배 확대에서도 거슬리지 않는다.
- 탁영금 전시물(`exhibit_geomungo_TEMP`)은 검증된 특징만: 160:19:10 비례, 중앙 각자 칸(글자 없음), 학 그림, 용두, 운족. 괘/현/기타 문양 없음. **박물관 실물 사진 대조 전까지 temp**(`geomungo`). 서책(`bookbinding`)·사초(`sacho-form`)도 일반형 임시.
- 9-slice 정의는 `NINE_SLICE`(ui.ts)에 합쳐져 테스트가 슬라이스 적합성을 검사한다.
