/**
 * 웹 출처(SourceRef) 상수. 모두 docs/HISTORICAL_SOURCES.md 에서 실제 확인한 URL 이다.
 * 새 URL 을 추가할 때는 반드시 그 문서에 먼저 기록할 것.
 */
import type { SourceRef } from '@/core/types';

const ency = (title: string, id: string): SourceRef => ({
  title: `한국민족문화대백과사전 「${title}」`,
  url: `https://encykorea.aks.ac.kr/Article/${id}`,
});
const sillok = (title: string, id: string): SourceRef => ({
  title,
  url: `https://sillok.history.go.kr/id/${id}`,
});

export const REF = {
  // 백과사전
  kimIlson: ency('김일손', 'E0010281'),
  kimJongjik: ency('김종직', 'E0010507'),
  yiGeukdon: { title: '한국민족문화대백과사전 「이극돈」', url: 'https://encykorea.aks.ac.kr/Contents/Item/E0043804' },
  yuJagwang: ency('유자광', 'E0041774'),
  seongjong: { title: '한국민족문화대백과사전 「성종」', url: 'https://encykorea.aks.ac.kr/Contents/Item/E0029554' },
  muoSahwa: ency('무오사화', 'E0019174'),
  seongjongSillok: ency('성종실록', 'E0029555'),
  jouijemun: ency('조의제문', 'E0052503'),
  takyeongEncy: ency('김일손 거문고', 'E0058745'),
  sagwan: ency('사관', 'E0025382'),
  gisagwan: ency('기사관', 'E0008262'),
  geomyeol: ency('검열', 'E0002091'),
  gyeongguk: ency('경국대전', 'E0002296'),
  myoho: ency('묘호', 'E0018910'),
  // 국가유산청 공개 API (보물 「김일손 거문고」)
  takyeongKhs: {
    title: '국가유산청 국가유산 공개 API 「김일손 거문고」',
    url: 'https://www.khs.go.kr/cha/SearchKindOpenapiDt.do?ccbaKdcd=12&ccbaAsno=0009570000000&ccbaCtcd=22',
  },
  // 조선왕조실록
  sillokSeongjongDeath: sillok('『성종실록』 성종 25년 12월 24일 「대조전에서 세상을 떠나다」', 'kia_12512024_004'),
  sillokDaehaengwang: sillok('『연산군일기』 연산 즉위년 12월 29일 (‘대행왕’ 호칭 용례)', 'kja_10012029_001'),
  sillokMyoho: sillok('『연산군일기』 연산 1년 1월 14일 「…성종의 시호·묘호 등을 의논하다」', 'kja_10101014_001'),
  sillokCompileOrder: sillok('『연산군일기』 연산 1년 4월 19일 (『성종실록』 편찬 명령)', 'kja_10104019_002'),
  sillokSachoOrder: sillok(
    '『연산군일기』 연산 4년 7월 11일 「김일손의 사초를 들여올 것을 명하니 이극돈 등이 일부를 절취하여 올리다」',
    'kja_10407011_001',
  ),
  sillokHouseSearch: sillok(
    '『연산군일기』 연산 4년 7월 12일 「김일손의 집에서 찾아낸 사초에 관한 이목·권오복의 편지 내용」',
    'kja_10407012_003',
  ),
  sillokVerdict: sillok(
    '『연산군일기』 연산 4년 7월 26일 「윤필상 등이 사초 사건 관련자 김일손·권오복·권경유 등의 죄목을 논하여 서계하다」',
    'kja_10407026_004',
  ),
  sillokProclaim: sillok('『연산군일기』 연산 4년 7월 27일 「김일손 등을 벤 것을 종묘 사직에 알리고…」', 'kja_10407027_001'),
  // v4 근무 사례(HISTORICAL_SOURCES §10)
  sillokSeongjongIll: sillok('『성종실록』 성종 25년 12월 24일 (종재·시신 문안)', 'kia_12512024_001'),
  sillokCompleted: sillok('『연산군일기』 연산 5년 3월 10일 (『성종실록』 완성, 수찬 당상·낭청 사급)', 'kja_10503010_002'),
  sillokEnshrined: sillok('『연산군일기』 연산 5년 3월 15일 (외방 사고 봉안)', 'kja_10503015_001'),
  sillokSagwanAttend: sillok('『연산군일기』 연산 1년 3월 19일 (승지와 사관이 참석하여 들어야 함)', 'kja_10103019_001'),
  sillokAccession: sillok('『연산군일기』 연산 즉위년 12월 29일 (대보, 창덕궁 즉위)', 'kja_10012029_004'),
  sillokReward: sillok('『연산군일기』 연산 3년 12월 21일 (실록청 총재관·당상 하사)', 'kja_10312021_001'),
  sillokMourning: sillok('『연산군일기』 연산 즉위년 12월 26일 (빈전 도감 제조 이극돈의 아룀)', 'kja_10012026_003'),
  sillokSagwanBarred: sillok('『연산군일기』 연산 3년 8월 1일 (사관은 참예하지 말라)', 'kja_10308001_003'),
  sillokKimIlsonMemorial: sillok('『연산군일기』 연산 1년 5월 28일 (충청도 도사 김일손의 상소)', 'kja_10105028_005'),
  sillokKimIlsonHeonnap: sillok('『연산군일기』 연산 1년 10월 9일 (헌납 김일손의 아룀)', 'kja_10110009_002'),
  sillokBurnSacho: sillok('『연산군일기』 연산 4년 7월 28일 (사초를 불살라 버려라)', 'kja_10407028_003'),
  sillokYiYukPosthumous: sillok('『연산군일기』 연산 5년 1월 24일 (실록청 당상 이육의 사후 처분)', 'kja_10501024_002'),
} as const satisfies Record<string, SourceRef>;
