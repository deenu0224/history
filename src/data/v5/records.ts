/**
 * 찾기(통합 DB)의 기록 카드·내 관측 로그 문서·홈 배정 카드·에필로그(DESIGN_V5 §2.4, §4.7, §4.9).
 * 기록 카드는 verified 국역 축약(낱말을 바꾸지 않고 줄이기만). 사화의 달 기사는 복원 뒤에만 검색된다.
 */
import type { HomeCard, LogDocument, RecordCard, SourceRef } from '@/core/types';
import { BURN_0728, CHEONGDO_0712, PROCLAIM_0727, VERDICT_0726 } from './cards';
import { ARTICLE_0711_KO } from './puzzle';
import { SRC } from './sources';

export const RECORDS: RecordCard[] = [
  {
    id: 'rec_r18',
    title: '실록청 총재관·당상 하사',
    provenance: 'verified',
    /* 윤효손·홍귀달은 여기서 주지 않는다 — 각자의 찾기 장면(「윤」, 「국장 도감」)에서 얻는다 */
    personIds: ['sin_seungseon', 'eo_segyeom', 'yi_geukdon', 'yu_sun', 'an_chim'],
    lines: [
      {
        text: '연산 3년 12월 21일. 「실록청(實錄廳) 총재관(摠裁官) 신승선(愼承善)·어세겸(魚世謙)에게는 안장을 갖춘 말 한 필과 표리(表裏) 한 벌과 비단 한 필을 하사하고, 당상(堂上) 이극돈(李克墩)·유순(柳洵)·홍귀달(洪貴達)·윤효손(尹孝孫)·안침(安琛)·허침(許琛)·조익정(趙益貞)·이육(李陸)·신종호(申從濩)에게는 안장 갖춘 말 한 필과 표리 한 벌을 하사하고」',
        source: SRC.r18,
      },
    ],
  },
  {
    id: 'rec_r02',
    title: '국장 도감·산릉 도감 제조',
    provenance: 'verified',
    personIds: ['yi_geukgyun', 'han_chihyeong', 'hong_gwidal', 'yu_sun'],
    lines: [
      {
        text: '연산 즉위년 12월 25일. 「지중추부사(知中樞府事) 이극균(李克均)·좌찬성(左贊成) 한치형(韓致亨)·호조 판서(戶曹判書) 홍귀달(洪貴達)을 국장 도감 제조(國葬都監提調)로 삼고, 좌참찬(左參贊) 정문형(鄭文炯)·공조 판서(工曹判書) 유순(柳洵)·광양군(光陽君) 이세좌(李世佐)를 산릉 도감 제조(山陵都監提調)로 삼았다.」',
        source: SRC.r02,
      },
    ],
  },
  {
    id: 'rec_r17',
    title: '사관의 정청 참예 의논',
    provenance: 'verified',
    personIds: ['sin_seungseon', 'eo_segyeom', 'han_chihyeong'],
    lines: [
      {
        text: "연산 3년 8월 1일. 신승선 「…이제부터 시행하는 것도 역시 무방하다고 생각됩니다.」 / 어세겸·정문형·한치형 「…어찌 사관이 꼭 참예를 해야만 됩니까?」 / 전교하기를, 「사관은 참예하도록 하지 말라.」",
        source: SRC.r17,
      },
    ],
    glosses: [{ term: '참예', gloss: '어떤 일에 함께 참여함.' }],
  },
  {
    id: 'rec_compile',
    title: '대행왕 실록 편찬 명령',
    provenance: 'verified',
    personIds: ['eo_segyeom', 'yi_geukdon', 'yu_sun'],
    lines: [
      {
        text: '연산 1년 4월 19일. 「왕이 어세겸(魚世謙)·이극돈(李克墩)·유순(柳洵)·성현(成俔)·권건(權健)·신종호(申從濩)·조위(曺偉)에게 명하여 편찬하게 하였다.」',
        source: SRC.compileOrder,
      },
    ],
  },
  {
    id: 'rec_seongjong_sillok',
    title: '『성종실록』 편찬',
    provenance: 'verified',
    lines: [
      {
        text: '「1495년(연산군 1) 4월, 영의정 노사신(盧思愼) 등의 건의로 춘추관(春秋館) 안에 실록청(實錄廳)을 설치, 편찬에 착수하였다.」',
        source: SRC.seongjongSillok,
      },
    ],
  },
  {
    id: 'rec_jouijemun',
    title: '「조의제문」',
    provenance: 'verified',
    personIds: ['kim_jongjik'],
    lines: [
      { text: '김종직이 지은 글.', source: SRC.jouijemun },
      { text: '「이 글은 김종직의 제자 김일손(金馹孫)이 사관(史官)으로 있을 때 사초(史草)에 기록해」', source: SRC.jouijemun },
    ],
  },
  // ── 복원 뒤 ──
  {
    id: 'rec_0711',
    title: '김일손의 사초를 들이라는 전교',
    provenance: 'verified',
    erasedBeforeRestore: true,
    lines: [{ text: ARTICLE_0711_KO, source: SRC.order0711 }],
  },
  { id: 'rec_0726', title: '사초 사건 관련자 처분', provenance: 'verified', afterRestore: true, personIds: ['kim_ilson'], lines: [{ text: `「${VERDICT_0726}」`, source: SRC.verdict0726 }] },
  { id: 'rec_0727', title: '수사관 처분', provenance: 'verified', afterRestore: true, lines: [{ text: `「${PROCLAIM_0727}」`, source: SRC.proclaim0727 }] },
  { id: 'rec_burn', title: '사초 소각 명령', provenance: 'verified', afterRestore: true, lines: [{ text: BURN_0728, source: SRC.burn0728 }] },
  {
    id: 'rec_0712_cheongdo',
    title: '김일손의 거처',
    provenance: 'verified',
    afterRestore: true,
    personIds: ['kim_ilson'],
    lines: [{ text: `「${CHEONGDO_0712}」`, source: SRC.cheongdo0712 }],
  },
  {
    id: 'rec_0701',
    title: '열흘 전 — 사관도 참예하지 못했다',
    provenance: 'verified',
    afterRestore: true,
    aside: 'before',
    lines: [
      {
        text: "「사관(史官)도 참예하지를 못했다. 그러자 검열(檢閱) 이사공(李思恭)이 참예하기를 청하니, 수근은 말하기를 '참예하여 들을 필요가 없다.' 하였다.」",
        source: SRC.barred0701,
      },
    ],
  },
  {
    id: 'rec_0712_claim',
    title: '이튿날 — 압송 도중 김일손의 말',
    provenance: 'verified',
    afterRestore: true,
    aside: 'after',
    tag: '김일손의 말을 옮긴 기록(그의 주장)',
    lines: [
      {
        text: '「나의 사초(史草)에, 이극돈(李克墩)이 세조조에 불경(佛經)을 잘 외운 것으로 벼슬을 얻어 전라도(全羅道) 관찰사(觀察使)가 된 것과, 정희 왕후(貞熹王后)의 상(喪)을 당하여 장흥(長興)의 관기(官妓) 등을 가까이한 일을 기록하였는데, 듣건대 극돈이 이 조항을 삭제하려다가 오히려 감히 못했다고 한다.」',
        source: SRC.claim0712,
      },
    ],
  },
];

/** 기록 카드 → 찾기 색인어 */
export const RECORD_TERMS: Record<string, string[]> = {
  rec_r18: ['명단', '실록청 명단', '총재관', '하사', '상 받은', '포상'],
  rec_r02: ['국장 도감', '국장', '도감', '산릉 도감', '제조'],
  rec_r17: ['정청', '사관 참예', '참예', '사관이 꼭', '벼슬 정하는 자리'],
  rec_compile: ['실록 편찬', '편찬 명령', '대행왕'],
  rec_seongjong_sillok: ['실록청', '성종실록', '춘추관'],
  rec_jouijemun: ['조의제문', '弔義帝文'],
  rec_0711: ['대내로 들여오라', '사초를 모두', '김일손의 사초', '들여오라', '대내로', '사초'],
  rec_0726: ['능지', '대역', '처분'],
  rec_0727: ['파직', '좌천', '수사관'],
  rec_burn: ['불살라', '소각', '사초 소각'],
  rec_0712_cheongdo: ['청도', '청도군'],
  rec_0701: ['이사공', '참예하여 들을'],
  rec_0712_claim: ['압송', '김일손의 말'],
};

export const DOCS: LogDocument[] = [
  {
    id: 'doc_old_report',
    code: '#C-2217',
    when: '1년 전',
    officer: '대조관 07',
    fields: [
      { label: '관측 가능', value: '2' },
      { label: '역사 고정', value: '미완(근거끼리 모순)' },
      { label: '첨부 컷', value: '보존 기간 만료로 폐기' },
    ],
    note: '「모두」인가, 「여섯 조목」인가. 들은 자리가 다르다. 다음 관측 때 방을 다시 그려 볼 것.',
    result: '관측 오류 · 종결',
    provenance: 'fictional',
  },
  {
    id: 'doc_c0408',
    code: '#C-0408',
    when: '2년 전',
    officer: '대조관 07',
    fields: [],
    note: '기록을 지킨 사람들은 기록에 없다.',
    result: '관측 오류 · 종결',
    provenance: 'fictional',
  },
];

export const DOC_TERMS: Record<string, string[]> = {
  doc_old_report: ['#C-2217', 'C-2217', '2217', '1년 전', '관측 오류'],
  doc_c0408: ['#C-0408', 'C-0408', '0408', '2년 전'],
};

/**
 * 복원 카드에 보일 사건 이름(복원 뒤에만, 출처와 함께) — 메신저 선택지 「무오사화요.」보다 먼저 화면에 나와야 한다(QA_STORY 발견 7).
 * HISTORICAL_SOURCES §3(「무오사화」 E0019174). HomeCard.event 로 복원 카드에 보인다.
 */
export const HOME_EVENT: { name: string; source: SourceRef } = { name: '무오사화(戊午士禍)', source: SRC.muoSahwa };

export const HOME: HomeCard = {
  code: '#C-2217',
  date: { before: '####', after: '연산군 4년 7월 11일' },
  place: {
    before: '미확인',
    after: '『성종실록』 편찬 실록청(춘추관 안)',
    source: SRC.seongjongSillok,
    note: '장소와 전달 방식은 재구성 — 그날 실록에는 장소가 없다',
  },
  task: '이 날의 기록이 비어 있다. 그날 그 자리에 있던 사람들의 눈으로 본다.',
  detection: '관측기가 찾음 · #C-2217 · 일시 #### · 이 지점을 가리키는 기록 3건',
  status: { before: '빈자리', after: '고정됨' },
  event: HOME_EVENT,
};


export const EPILOGUE = {
  monologue: [
    // 김일손을 찾아보지 않은 플레이어도 주어를 잃지 않게(그 이름은 1-4 전교에서 들었다)
    '그날 그 방에서 여러 사람이 한 사관의 사초를 보았다.',
    '나는 그중 네 사람의 눈을 빌려, 그 사관이 남기지 못한 날을 다시 적었다.',
    '그 사초를 쓴 사람, 김일손의 눈은 끝내 열리지 않았다.',
  ],
  teaserDocId: 'doc_c0408',
  oldReportDocId: 'doc_old_report',
  aboutScene: '말과 몸짓은 사료를 바탕으로 만든 재구성이다. 그날 실록에는 장소와 전교를 전한 방식이 없다.',
  witnessLogLabel: '실록이 적지 않은 일',
};

export const CLOCKS = { start: '23:04', S1: '00:40', S2: '02:15', E4: '03:42', S3: '06:00', S4: '06:40', S5: '06:52' };
