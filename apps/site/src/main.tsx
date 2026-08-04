import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DesignSystemProvider, ThemePreferencesProvider } from '@pineappleui/theme';

import { BrowserRouter } from 'react-router';

import { App } from './App';

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
      <ThemePreferencesProvider>
        <DesignSystemProvider>
          <App />
        </DesignSystemProvider>
      </ThemePreferencesProvider>
    </BrowserRouter>
  </StrictMode>,
);
