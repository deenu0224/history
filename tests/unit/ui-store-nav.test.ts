import { beforeEach, describe, expect, it } from 'vitest';
import { useUi } from '@/ui/uiStore';

describe('화면 이동 스택', () => {
  beforeEach(() => useUi.setState({ phase: 'game', stack: ['home'], card: null, picked: null }));
  it('push/pop 은 홈 위에 쌓이고 홈 아래로 내려가지 않는다', () => {
    const u = useUi.getState();
    u.push('viewer');
    u.push('search');
    expect(useUi.getState().stack).toEqual(['home', 'viewer', 'search']);
    useUi.getState().pop();
    expect(useUi.getState().stack).toEqual(['home', 'viewer']);
    useUi.getState().pop();
    useUi.getState().pop();
    expect(useUi.getState().stack).toEqual(['home']);
  });
  it('같은 화면을 연달아 쌓지 않는다', () => {
    useUi.getState().push('messenger');
    useUi.getState().push('messenger');
    expect(useUi.getState().stack).toEqual(['home', 'messenger']);
  });
  it('go 는 홈 바로 위로 바꾼다(복원 화면으로 갈 때)', () => {
    useUi.getState().push('rewrite');
    useUi.getState().go('restore');
    expect(useUi.getState().stack).toEqual(['home', 'restore']);
  });
  it('인물 카드에서 고른 카드를 이름 붙이기 시트로 돌려보낸다', () => {
    useUi.getState().openCard('yi_geukdon', true);
    useUi.getState().setPicked('yi_geukdon');
    useUi.getState().closeCard();
    expect(useUi.getState().picked).toBe('yi_geukdon');
    expect(useUi.getState().card).toBeNull();
  });
});
