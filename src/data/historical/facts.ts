/**
 * 인물·단서·보고서 칸이 공유하는 사실(Fact) 상수. 값 문자열이 일치해야 판정이 맞물린다.
 * 각 사실의 근거는 docs/HISTORICAL_SOURCES.md 의 해당 절.
 *
 * 주의(판정 규칙): 인물이 어떤 kind 의 사실을 하나라도 가지면, 그 kind 의 다른 값은 '모순'으로 판정된다.
 * 그래서 확인되지 않은 사항이 '모순'으로 잘못 판정되지 않도록, 근거가 약한 인물에게는
 * 해당 kind 의 사실을 아예 넣지 않는다(→ '확인할 수 없음'으로 판정됨).
 */
import type { Fact } from '@/core/types';

export const FACT = {
  // 누구 칸(붉은 관복의 당상)의 핵심 사실
  /** 이극돈: "실록청당상관으로서 사초를 정리하다가" (E0043804) */
  officeSillokDangsang: { kind: 'office', value: '실록청 당상' },
  /** 이극돈: "『세조실록』 편수관으로 참여" (E0043804) */
  eventSejoSillok: { kind: 'event', value: '『세조실록』 편찬 참여' },

  // 무슨 일·그 결과 칸의 핵심 사실 — 실록 kja_10407011_001
  claimOrderAllSacho: { kind: 'claim', value: '왕이 한 사관의 사초를 모두 대내로 들이라 명함' },
  claimSachoCustom: { kind: 'claim', value: '사초는 임금이 스스로 보지 않는 것이 관례' },
  claimSixArticles: { kind: 'claim', value: '사초에서 여섯 조목을 가려 봉해 올림' },
  /** 「검열」 E0002091, 「사관」 E0025382 */
  claimGajangCollected: { kind: 'claim', value: '실록청이 가장사초를 거둠' },
  /** 「성종실록」 E0029555 */
  claimSillokCompleted: { kind: 'claim', value: '『성종실록』은 완성되어 사고에 봉안됨' },
  /** 「조의제문」 E0052503, 「무오사화」 E0019174 */
  claimJouijemunInSacho: { kind: 'claim', value: '사초에 「조의제문」이 실림' },

  // 말소된 세계의 DB 상태(가상, 변조 레코드)와 관측에서 생기는 사실
  /** 변조된 DB 상태(fictional): 김일손·권오복·권경유가 같은 달 사망, 사인 기록 없음 */
  claimSameMonthDeaths: { kind: 'claim', value: '같은 달, 사초의 주인과 두 사람이 사인 기록 없이 사망함' },
  /** 관측(재구성 대사): 그날 그 사초를 쓴 사관은 살아 있었다 */
  claimAuthorAlive: { kind: 'claim', value: '그 사초를 쓴 사관이 그날 살아 있었음' },
  /** 변조된 DB 상태(fictional): 실록청 당상이 사유 기록 없이 파직됨 */
  claimDismissedNoReason: { kind: 'claim', value: '실록청 당상이 사유 기록 없이 파직됨' },
  /** 관측(재구성): 앞선 왕을 묘호로 부름 */
  claimMyoho: { kind: 'claim', value: "앞선 왕을 '성종대왕'이라 부름" },

  // 기타 인물 사실
  nameKimIlson: { kind: 'name', value: '김일손' },
  nameYiGeukdon: { kind: 'name', value: '이극돈' },
  possessionTakyeong: { kind: 'possession', value: '거문고(탁영금)' },
} as const satisfies Record<string, Fact>;
