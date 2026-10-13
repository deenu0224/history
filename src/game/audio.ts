/**
 * 결록 오디오 파사드(WebAudio 합성, 파일 없음). 구현은 ./audio/** .
 *
 * ── UI 연결 가이드 ──────────────────────────────────────────────
 *  앱 시작(App.tsx 마운트 시 1회):   installAudioUnlock();  setVolume(settings.volume);
 *     · 모든 터치/클릭/키 제스처에서 스스로 컨텍스트를 풀고, 탭 복귀/iOS interrupted 도 복구한다.
 *     · 부트의 버튼 핸들러 안에서 unlockAudio() 를 부르는 것은 계속 유효(멱등).
 *  효과음: fx.ts 는 playSfx(FEEDBACK[kind].sfx) 를 그대로 호출해도 된다(옛 이름은 SFX_ALIASES 로 변환, 'none' 은 무음).
 *     feedback.ts 를 새 이름으로 바꾸려면: stamp→'stamp_confirm', stamp_auto→'stamp_auto', erase→'erase', restore→'restore',
 *     hear→'hear', message→'message', capture_full→'capture_full'. 그 외 새 효과음은 직접 playSfx('printer' | 'warning' | 'page' |
 *     'inspect_link' | 'inspect_notation' | 'queue_next' | 'shift_end' | 'stamp_correct' | 'stamp_red').
 *  배경 음악 권장 매핑 — setMusic(track, { fade?: 초(기본 2.5), volume?: 0..1, seed?: 정수 }):
 *     부트 / 프롤로그 ........................ 'title'    (평조, 가야금 독주 → 대금 문답)
 *     책상 / 근무(shift) 중 ................... 'office'   (평조, 굿거리풍 여린 장구 + 밤 사무실 패드)
 *     관측 뷰어 열림 .......................... 'observe'  (계면조, 진양조풍 느린 호흡)   ← 닫으면 'office' 로 복귀
 *     #C-2217 서랍 도장 / 경고 2+ / 06:00 재계산 .. 'tension'  (계면조, 낮은 거문고 + 심장박동 + 해금)
 *     복원 장면 ............................... 'restore'  (평조, 따뜻한 상행)
 *     에필로그 / 티저 ......................... 'ending'   (평조, 성긴 여운)
 *     끄기 .................................... setMusic('none')
 *  앰비언스(setAmbience 'past'|'modern'|'none')는 그대로 쓰되, 음악이 나오는 동안 자동으로 절반으로 낮아진다.
 *  접근성/설정: setMusicVolume(0..1) · setSfxVolume(0..1) · setVolume(마스터) · setMuted(bool) · setReducedAudio(bool: 음악·앰비언스 끔, 효과음 약화).
 *  디버그: getAudioDebug() / onAudioDebug(cb), 개발 페이지 /audio-dev.html
 */
export {
  unlockAudio,
  installAudioUnlock,
  setVolume,
  setSfxVolume,
  setMusicVolume,
  setReducedAudio,
  setMuted,
  playSfx,
  setAmbience,
  setMusic,
  getAudioDebug,
  onAudioDebug,
} from './audio/engine';
export type { Ambience, AudioDebug } from './audio/engine';
export { SFX_NAMES, SFX_ALIASES, resolveSfx } from './audio/sfx';
export type { SfxName } from './audio/sfx';
export type { MusicTrack, MusicOpts } from './audio/music';
export { TRACK_IDS } from './audio/compose';
export type { TrackId } from './audio/compose';
