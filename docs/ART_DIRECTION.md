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
| `char_naegwan` | 내관(궁중 시종, **temp**). 짙은 남색 도포, 수염 없음, 날개 없는 낮은 모자 | 21 |
| `char_gungnyeo` | 궁녀(**temp**). 노란 저고리 + 남색 치마(`paintSkirt`), 쪽진 머리 + 비녀, 가슴 고름 | 21 |

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
| `naegwan-attire` | 내관 복식 | 복색·관모(성종~연산군) |
| `gungnyeo-attire` | 궁녀 복식 | 저고리·치마 색, 머리 모양, 신분별 차이 |
| `hwijang` | 휘장 | 형태·재질·색·걸이 방식 |
| `bedding-form` | 이부자리 | 침구 형태·색 |
| `decree-form` | 교지 | 형태·색·받드는 법·낭독 절차 |
| `council-seating` | 회의 좌석 | 좌석 배치·방석·낮은 책상·돗자리 |
| `print-storage` | 인쇄본 보관 | 인쇄본/낱장/궤 보관 방식 |
| `woodblock-rack` | 판목 보관 | 판가 형태 |
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
| 앱 아이콘 | `app_db` `app_observe` `app_reader` `app_board` `app_messenger` `app_mail` `app_archive` `app_work` `app_notebook` `app_settings` `app_timeline` (+`_sm`) | 32×32 / 16×16 |
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

## 12. 책상(야간 근무 책상) 아트 (`desk_*.ts`)

Papers-Please식 책상 UI 에셋. 전용 팔레트 `desk_palette.ts`(`D`/`DESKPAL`: OS 팔레트의 종이/목재/적/호박 + 잉크 녹·청, 황동, 황색 실, 반투명 잉크). 글자는 그리지 않는다 — UI 가 선명한 한글 텍스트를 얹는다. 코드 접근은 `DESK_KEYS`(registry.ts).

| 그룹 | 키 | 크기 / 비고 |
|---|---|---|
| 찍힌 자국 | `stamp_ok_a/b/c`(확인·녹) `stamp_fix_a/b/c`(정정·청) `stamp_mismatch_a/b/c`(불일치·적) `stamp_mismatch_aged`(1년 묵은 바랜 적) `stamp_system_a/b/c`(관측 오류·종결, 회색 기계 인쇄) | 64×40, 반투명 잉크(종이가 비침). 가운데 글자 면은 **비어 있다**: UI 가 한글 + 작은 "07" 각인을 얹는다. 변형은 시드·기울기·마름·튄 점이 다르다 |
| 손에 쥐는 도장 | `stamp_hold_ok/fix/mismatch/system` | 32×48, 2프레임(0 대기, 1 눌림 + 번진 잉크). 나무 선반 손잡이 + 색 잉크 받침 |
| 도장 면 | `stamp_face_mismatch` | 64×64 **temp**. 홈에 굳은 붉은 잉크. 거울상 글자는 획 덩어리 자리표시 |
| 상판/조명 | `desk_surface`(64², 타일링) `desk_edge`(64×16, 가로 타일링) `desk_lamp_pool`(192×128 반투명 디더, 가산 느낌으로 얹음) | |
| 종이 9-slice | `desk_card`(48², 8/10/14/10) `desk_slip`(48×24, 9/7/8/7) `desk_rulebook_open`(96×64, 16/16/10/14) | 괘선은 늘어나면 굵어지므로 `desk_rules_tile`(16×8, 가로 타일링)을 UI 가 가운데에 깐다. 펼친 규정집의 접힘은 `desk_rulebook_gutter`(8×32, 세로 타일링)를 가운데에 얹는다 |
| 규정집 | `desk_rulebook_closed` | 48×64. 빈 라벨 칸(제목은 UI) |
| 프린터 | `desk_printer` | 96×80, 3프레임(종이 길이 3→13→25px, LED 깜빡). `anim_desk_printer_feed` |
| 번호판 | `desk_queue_plaque` | 56×32. 빈 숫자 창 + 빈 라벨 홈 |
| 서랍 | `desk_drawer_closed`(64×36) `desk_drawer_open`(64×60) | |
| 조사 실 | `desk_thread_h`(16×4 적색, 가로 타일링) `desk_thread_dash`(16×4 황색 점선) `desk_thread_knot`/`_yellow`(10×10) `desk_pin`(8×10 황동 압정) | 세로는 CSS 회전 |

## 13. 관측 디오라마 신규 (대조전·교지·회의·인쇄 보관)

맵 데이터는 `src/game/scenes/maps/` (`sc_daejojeon`, `sc_court_decree`, `sc_council`, `sc_print_storage`, `index.ts` 의 `DIORAMAS`). 형식은 obs001 과 같은 `{w,h,ground,walls,spawn,ambient}` + `objects: {spriteKey,x,y,frame?,flat?,anim?}[]`. 범례·오토타일은 기존(`MAP_LEGEND`, `logic/autotile.ts`) 그대로이고, 휘장·병풍·이부자리·방석·돗자리·인물은 `objects` 로 얹는다. 오브젝트 좌표: 중심 x = `x*32+16`, 바닥 y = `(y+1)*32-2` (obs001 과 동일), 폭 2칸 스프라이트는 `.5` 단위 허용. 같은 칸의 겹침은 목록 순서.

- **재구성 원칙**: 특정 전각·의식의 실제 구조를 주장하지 않는다. 대조전 내실에는 **몸 형상을 그리지 않는다**(정돈된 이부자리와 시종만). 임금의 자리는 그리지 않는다. 연도·장소 표지 없음.
- **신규 오브젝트**(전부 temp): `obj_hwijang`(휘장 32×64) `obj_hwijang_tied`(걷어 묶음 64×64) `obj_screen_bamboo`(병풍 변형 64×48) `obj_screen_low`(침병 64×32) `obj_bedding`(64×48) `obj_soban` `obj_decree_stand` `obj_low_desk` `obj_cushion_{red,blue,green,plain}` `obj_cushion_row`(96×32) `obj_mat`(돗자리 32², 바닥 깔개) `obj_book_pile_tall` `obj_book_bundle` `obj_sheets_pile` `obj_chest_open` `obj_chest_long`(64×32) `obj_block_rack`(판가 32×56).
- **자세 스프라이트**(`characters_scene.ts`, 걷기 없음, temp): `pose_kneel_{naegwan,gungnyeo_a,gungnyeo_b,servant}`(프레임 0 정면/1 왼쪽/2 오른쪽), `pose_clerk_packing`(2프레임, `anim_clerk_packing`), `pose_decree_{red,blue}`(교지를 받든 관원), `seat_council_{red,blue,green,empty}`(방석+서안 앉은 관원, 프레임 0 정면/1 왼쪽/2 오른쪽).
- 새 고증 항목: `naegwan-attire` `gungnyeo-attire` `hwijang` `bedding-form` `decree-form` `council-seating` `print-storage` `woodblock-rack`.
