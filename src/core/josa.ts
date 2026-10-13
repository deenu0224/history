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
