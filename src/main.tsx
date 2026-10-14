import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bus } from '@/core/bus';
import { useGameStore } from '@/store/gameStore';
import { App } from './App';
import { PhoneFrame } from './shell/PhoneFrame';
import { registerServiceWorker } from './shell/registerSw';
import { useUi } from './ui/uiStore';
import './styles/ui.css';

if (new URLSearchParams(location.search).get('test') === '1') {
  Object.assign(window, { __STORE__: useGameStore, __BUS__: bus, __UI__: useUi });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PhoneFrame>
      <App />
    </PhoneFrame>
  </StrictMode>,
);

// 서비스 워커: 프로덕션에서만, ?test=1 이면 건너뛰고 기존 등록도 걷어낸다.
registerServiceWorker();
