import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DesignSystemProvider, ThemePreferencesProvider } from '@pineappleui/theme';

import { BrowserRouter } from 'react-router';

import { App } from './App';
import { SITE_ACCENT_COLOR, SITE_SCALING } from './site-theme';

// The theme stylesheet is the ONLY design-system stylesheet import — it pulls
// in Radix's own CSS and the Geist font itself.
import '@pineappleui/theme/styles.css';
import './site.css';

// vite's `base` with the trailing slash stripped, so router paths and asset
// paths agree under the GitHub Pages project path.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('index.html has no #root element to mount into');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      {/* The accent is pinned, the appearance is not: this site ships one
          palette and no accent picker, but light/dark/system stays a real
          preference and keeps coming from the stored record. vite.config.ts
          hands the SAME constant to getFoucScript, so first paint and hydration
          agree — see site-theme.ts. */}
      <ThemePreferencesProvider>
        <DesignSystemProvider accentColor={SITE_ACCENT_COLOR} scaling={SITE_SCALING}>
          <App />
        </DesignSystemProvider>
      </ThemePreferencesProvider>
    </BrowserRouter>
  </StrictMode>,
);
