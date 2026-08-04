import { Badge } from '@pineappleui/badge';

import { Inline } from '@pineappleui/inline';
import { Text } from '@pineappleui/text';
import { Link, Outlet } from 'react-router';

import { Sidebar } from './Sidebar';
import { ThemeControls } from './ThemeControls';

export function Layout() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link to="/" className="site-header-brand">
          <span className="accent-swatch" aria-hidden />
          <Text size="3" weight="bold">Pineapple UI</Text>
          <Badge variant="soft" size="1">docs</Badge>
        </Link>
        <Inline gap="4" align="center" wrap="nowrap">
          <ThemeControls />
          <a
            href="https://github.com/davidz-repo/pineapple-design-systems"
            target="_blank"
            rel="noreferrer"
            className="site-sidebar-link"
          >
            GitHub
          </a>
        </Inline>
      </header>
      <Sidebar />
      <main className="site-main">
        <div className="site-page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
