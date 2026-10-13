/** 개발 전용 진입점(dev-world.html): GameCanvas 만 전체 화면으로 마운트한다. ?scene=lab|archive|obs001&time=분 */
import { createRoot } from 'react-dom/client';
import { useGameStore } from '@/store/gameStore';
import { GameCanvas } from './GameCanvas';
import { DEV_FIXTURE } from './devFixture';
import { setWorldContentOverride } from './worldContent';
import { devOptions, worldClock } from './scenes/WorldScene';

const q = new URLSearchParams(location.search);
if (q.get('fixture') === '1') setWorldContentOverride(DEV_FIXTURE);
useGameStore.getState().setScene(q.get('scene') ?? 'lab');
if (q.get('zoom')) devOptions.zoom = Number(q.get('zoom'));
const t = q.get('time');
if (t) worldClock.minute = Number(t);
if (q.get('hold') === '1') worldClock.minutesPerSecond = 0;
if (q.get('collect')) useGameStore.getState().advanceCollection(q.get('collect')!, 1);

document.body.style.cssText = 'margin:0;background:#0b0d12;overflow:hidden';
const root = document.getElementById('root')!;
root.style.cssText = 'position:fixed;inset:0';
createRoot(root).render(<GameCanvas />);
