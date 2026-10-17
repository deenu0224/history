// 받침 유무로 조사를 고른다. 한글이 아닌 마지막 글자(따옴표, 숫자 등)는 건너뛰고, 숫자는 읽는 소리로 판단한다.
const DIGIT_HAS_FINAL: Record<string, boolean> = { '0': true, '1': true, '2': false, '3': true, '4': false, '5': false, '6': true, '7': true, '8': true, '9': false };

function hasFinal(word: string): boolean {
  for (let i = word.length - 1; i >= 0; i--) {
    const ch = word[i];
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
    if (ch in DIGIT_HAS_FINAL) return DIGIT_HAS_FINAL[ch];
  }
  return false;
}

type Pair = '을/를' | '은/는' | '이/가' | '와/과';

export function josa(word: string, pair: Pair): string {
  const [withFinal, without] = pair.split('/');
  return word + (hasFinal(word) ? withFinal : without);
}

/** 조사 한 글자 → [받침 있을 때, 없을 때] */
const PARTICLE: Record<string, [string, string]> = { 이: ['이', '가'], 가: ['이', '가'], 을: ['을', '를'], 를: ['을', '를'], 은: ['은', '는'], 는: ['은', '는'], 과: ['과', '와'], 와: ['과', '와'] };

/**
 * 칸 값 뒤에 이어지는 글의 첫 조사를 값에 맞춘다(「최만리」 + 「이 소(疏)를…」 → 「가 소(疏)를…」).
 * 뒤 글이 조사 한 글자 + 띄어쓰기·문장부호(또는 끝)로 시작할 때만 바꾼다 — 「이달에」 같은 낱말은 건드리지 않는다.
 * 값이 비어 있으면(빈칸) 그대로 둔다.
 */
export function josaAfter(word: string, next: string): string {
  if (!word || !next) return next;
  const p = PARTICLE[next[0]!];
  if (!p) return next;
  const after = next[1];
  if (after !== undefined && !/[\s,.;:!?…·」』"'()]/.test(after)) return next;
  return (hasFinal(word) ? p[0] : p[1]) + next.slice(1);
}

/**
 * 방 거리(칸)를 사람 말로: 「약 9칸」. 판정은 내부 값 그대로 쓰고, 화면 글에만 쓴다.
 * 0.5칸 단위로 반올림한다. 견줄 값(들림 반경 등)을 주면 반올림이 대소를 뒤집지 않게 반 칸 밀어 둔다
 * (8.18 vs 반경 8 → 「약 8.5칸」, 7.9 vs 8 → 「약 7.5칸」).
 */
export function cellsText(n: number, compareTo?: number): string {
  let r = Math.round(n * 2) / 2;
  if (compareTo !== undefined) {
    if (n > compareTo && r <= compareTo) r = compareTo + 0.5;
    else if (n < compareTo && r >= compareTo) r = compareTo - 0.5;
  }
  return `약 ${Number.isInteger(r) ? r : r.toFixed(1)}칸`;
}
