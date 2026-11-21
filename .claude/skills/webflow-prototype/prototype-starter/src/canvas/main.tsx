// PROTOTYPE-ONLY: the prototype environment's entry (/design/canvas).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WeftlyProvider } from '@weftly/components';
import '@weftly/components/styles.css';
import '@weftly/editor/styles.css';
import './canvas.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
createRoot(root).render(
  <StrictMode>
    <WeftlyProvider>
      <App />
    </WeftlyProvider>
  </StrictMode>,
);
