import { Route, Routes } from 'react-router';

import { Layout } from './components/Layout';
import { GettingStartedPage } from './pages/GettingStartedPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PackagePage } from './pages/package/PackagePage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="getting-started" element={<GettingStartedPage />} />
        <Route path="components/:slug/*" element={<PackagePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
