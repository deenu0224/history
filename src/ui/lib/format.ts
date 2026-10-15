/** 표시용 작은 도우미(연도·시대·장소·인물은 만들지 않는다). */

/** 'e1-4' → '1-4' */
export const cutNo = (cutId: string) => cutId.replace(/^e/, '');

export const VOLUME_LABEL = { whisper: '귓속말', talk: '말소리', read: '소리 내어 읽음' } as const;

export const FROM_LABEL: Record<string, string> = { han: '한 선임', oh: '오 실장', system: '관측기', me: '나' };
/** 말풍선 옆 작은 표식 — 한글로(한자는 한글 읽기 없이 화면에 두지 않는다) */
export const FROM_MARK: Record<string, string> = { han: '한', oh: '오', system: '·', me: '' };
