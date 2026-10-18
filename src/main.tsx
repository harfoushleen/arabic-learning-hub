import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/noto-naskh-arabic/arabic-700.css';
import './index.css';
import App from './App.tsx';
import { installAppHeight } from './lib/appHeight';

installAppHeight();

const root = createRoot(document.getElementById('root')!);
// TEMPORARY: dev-only joining check page. Remove after the iPad check.
if (import.meta.env.DEV && location.pathname === '/dev/joining') {
  import('./dev/JoiningCheck').then(({ default: Page }) => root.render(<Page />));
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
