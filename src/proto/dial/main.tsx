import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PhoneFrame } from '@/shell/PhoneFrame';
import { DialApp } from './DialApp';
import './dial.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PhoneFrame>
      <DialApp />
    </PhoneFrame>
  </StrictMode>,
);
