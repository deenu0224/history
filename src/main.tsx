import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bus } from '@/core/bus';
import { useGameStore } from '@/store/gameStore';
import { App } from './App';
import { useUi } from './ui/uiStore';
import './styles/os.css';

if (new URLSearchParams(location.search).get('test') === '1') {
  Object.assign(window, { __STORE__: useGameStore, __BUS__: bus, __UI__: useUi });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
