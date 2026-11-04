import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
// The fonts ship with the page, so it makes no request to another host (SEC-8). Only the weights in use; each file
// declares every script's subset, and the browser downloads only the subsets a page needs.
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
// Stylesheets in cascade order: later files may override earlier ones.
import './styles/tokens.css';
import './styles/base.css';
import './styles/controls.css';
import './styles/header.css';
import './styles/toolbar.css';
import './styles/table.css';
import './styles/popovers.css';
import './styles/markdown.css';
import './styles/settings.css';
import './styles/wizard.css';
import './styles/legend.css';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
