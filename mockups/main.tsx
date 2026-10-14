import { createRoot } from 'react-dom/client';
import type { ComponentType } from 'react';
import { ViewerScreen } from './screens_viewer';
import { Boot, Home, TagScreen, TagOk, PersonCard } from './screens_a';
import { Room, RoomContra, Search } from './screens_b';
import { Messenger, Rewrite, RewriteVerdict, RestoreRecord, RestoreMessenger, ClosedEye, RotateGuard, Desktop } from './screens_c';

export interface Def { id: string; name: string; title: string; w: number; h: number; C: ComponentType }
const S36 = { w: 360, h: 780, sat: 32, sab: 16 };
export const SCREENS: Def[] = [
  { id: '01', name: 'boot', title: '부트 / 프롤로그', w: 390, h: 844, C: () => <Boot /> },
  { id: '02', name: 'home', title: '단말 홈', w: 390, h: 844, C: () => <Home /> },
  { id: '03', name: 'viewer', title: '그 사람의 기억(컷 뷰어)', w: 390, h: 844, C: () => <ViewerScreen /> },
  { id: '04', name: 'tag-cards', title: '이름 붙이기 ① 카드 고르기', w: 390, h: 844, C: () => <TagScreen phase="cards" /> },
  { id: '05', name: 'tag-evidence', title: '이름 붙이기 ② 근거 고르기', w: 390, h: 844, C: () => <TagScreen phase="evidence" /> },
  { id: '06', name: 'tag-ok-eye-opens', title: '성공: 눈이 열린다', w: 390, h: 844, C: () => <TagOk /> },
  { id: '07', name: 'tag-not-pointing', title: '실패: 근거가 가리키지 않는다', w: 390, h: 844, C: () => <TagScreen phase="wrong" /> },
  { id: '08', name: 'tag-contradicts', title: '실패: 근거끼리 모순된다', w: 390, h: 844, C: () => <TagScreen phase="contra" /> },
  { id: '09', name: 'person-card', title: '인물 카드', w: 390, h: 844, C: () => <PersonCard /> },
  { id: '10', name: 'room-plan', title: '그날의 방', w: 390, h: 844, C: () => <Room /> },
  { id: '11', name: 'room-contradiction', title: '그날의 방 · 모순 보기', w: 390, h: 844, C: () => <RoomContra /> },
  { id: '12', name: 'search', title: '찾기', w: 390, h: 844, C: () => <Search /> },
  { id: '13', name: 'messenger-options', title: '메신저 · 답장 선택지', w: 390, h: 844, C: () => <Messenger /> },
  { id: '14', name: 'messenger-typing', title: '메신저 · 입력 중 / 읽음', w: 390, h: 844, C: () => <Messenger typing /> },
  { id: '15', name: 'rewrite-compose', title: '기록 다시 쓰기 · 작성', w: 390, h: 844, C: () => <Rewrite /> },
  { id: '16', name: 'rewrite-verdict', title: '기록 다시 쓰기 · 판정 뒤', w: 390, h: 844, C: () => <RewriteVerdict /> },
  { id: '17', name: 'restore-record', title: '복원 · 기록이 굳는다', w: 390, h: 844, C: () => <RestoreRecord /> },
  { id: '18', name: 'restore-messenger', title: '복원 · 메신저가 다시 쓰인다', w: 390, h: 844, C: () => <RestoreMessenger /> },
  { id: '19', name: 'closed-eye', title: '닫힌 눈', w: 390, h: 844, C: () => <ClosedEye /> },
  { id: '20', name: 'rotate-guard', title: '세로로 돌려 주세요', w: 844, h: 390, C: () => <RotateGuard /> },
  { id: '21', name: 'desktop-frame', title: '데스크톱 가운데 프레임', w: 1280, h: 900, C: () => <Desktop><ViewerScreen w={480} h={900} sat={0} sab={16} noDevice /></Desktop> },
  { id: '22', name: 'room-plan-360', title: '그날의 방 · 360×780', w: 360, h: 780, C: () => <Room {...S36} /> },
  { id: '23', name: 'viewer-360', title: '컷 뷰어 · 360×780', w: 360, h: 780, C: () => <ViewerScreen {...S36} /> },
  { id: '24', name: 'tag-evidence-360', title: '이름 붙이기 근거 · 360×780', w: 360, h: 780, C: () => <TagScreen phase="evidence" {...S36} /> },
];
(window as unknown as { __SCREENS: unknown }).__SCREENS = SCREENS.map(({ C: _c, ...r }) => r);

const hash = location.hash.replace('#/', '');
const def = SCREENS.find((s) => s.id === hash);
createRoot(document.getElementById('root')!).render(
  def ? <def.C /> : <div style={{ padding: 20, color: '#dde3e7' }}>{SCREENS.map((s) => <p key={s.id}><a style={{ color: '#86c4bd' }} href={`#/${s.id}`} onClick={() => setTimeout(() => location.reload())}>{s.id} {s.title}</a></p>)}</div>,
);
