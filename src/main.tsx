import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BAWASLU_LOGO_DATA_URI } from './assets/bawasluLogo';

if (typeof document !== 'undefined') {
  let iconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    document.head.appendChild(iconLink);
  }
  iconLink.type = 'image/png';
  iconLink.href = BAWASLU_LOGO_DATA_URI;
}

createRoot(document.getElementById('root')!).render(<App />);

