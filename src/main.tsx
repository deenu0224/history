import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { getV6Store } from '@/store/v6/store';
import { App } from './App';
import { PhoneFrame } from './shell/PhoneFrame';
import { registerServiceWorker } from './shell/registerSw';
import './styles/ui.css';
import './styles/v6.css';

if (new URLSearchParams(location.search).get('test') === '1') {
  Object.assign(window, { __STORE__: getV6Store() });
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
