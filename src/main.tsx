import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/noto-naskh-arabic/arabic-700.css';
import '@fontsource/cairo/arabic-800.css';
import './index.css';
import App from './App.tsx';
import { installAppHeight } from './lib/appHeight';

installAppHeight();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
