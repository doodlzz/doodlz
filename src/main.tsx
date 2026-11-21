import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LANGUAGES, type Lang } from '../shared/types';
import { loadLanguage } from './i18n';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './index.css';

// Fetch the player's language before the first render so the page doesn't appear in English first.
function savedLang(): Lang {
  try {
    const saved = JSON.parse(localStorage.getItem('doodlz:settings') ?? '{}').lang;
    if (LANGUAGES.includes(saved)) return saved;
  } catch {
    // storage unavailable
  }
  const nav = navigator.language.slice(0, 2).toLowerCase();
  return LANGUAGES.includes(nav as Lang) ? (nav as Lang) : 'en';
}

const render = () =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
// Don't hold the page for more than a moment if the download is slow; it switches when it arrives.
void Promise.race([loadLanguage(savedLang()), new Promise((r) => setTimeout(r, 1500))]).then(render);
