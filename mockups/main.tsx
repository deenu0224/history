import { createRoot } from 'react-dom/client';
import type { ComponentType } from 'react';
import { ViewerScreen } from './screens_viewer';

export interface Def { id: string; name: string; title: string; w: number; h: number; vw?: number; vh?: number; C: ComponentType }
export const SCREENS: Def[] = [
  { id: '03', name: 'viewer', title: '그 사람의 기억', w: 390, h: 844, C: () => <ViewerScreen /> },
];
(window as unknown as { __SCREENS: unknown }).__SCREENS = SCREENS.map(({ C: _c, ...r }) => r);

const hash = location.hash.replace('#/', '');
const def = SCREENS.find((s) => s.id === hash);
createRoot(document.getElementById('root')!).render(
  def ? <def.C /> : <div style={{ padding: 20, color: '#dde3e7' }}>{SCREENS.map((s) => <p key={s.id}><a style={{ color: '#86c4bd' }} href={`#/${s.id}`} onClick={() => setTimeout(() => location.reload())}>{s.id} {s.title}</a></p>)}</div>,
);
