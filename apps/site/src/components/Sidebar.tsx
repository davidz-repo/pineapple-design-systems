import { Stack } from '@pineappleui/stack';

import { Text } from '@pineappleui/text';
import { NavLink } from 'react-router';

import { CATEGORIES, REGISTRY } from '../registry';

function sidebarLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'site-sidebar-link active' : 'site-sidebar-link';
}

export function Sidebar() {
  return (
    <nav className="site-sidebar" aria-label="Documentation">
      <Stack gap="4">
        <Stack gap="1">
          <NavLink to="/" end className={sidebarLinkClass}>Overview</NavLink>
          <NavLink to="/getting-started" className={sidebarLinkClass}>Getting started</NavLink>
        </Stack>
        {CATEGORIES.map(category => (
          <Stack key={category} gap="1">
            <Text size="1" weight="medium" color="gray">{category}</Text>
            {REGISTRY.filter(entry => entry.category === category).map(entry => (
              <NavLink
                key={entry.slug}
                to={`/components/${entry.slug}`}
                className={sidebarLinkClass}
              >
                {entry.name}
              </NavLink>
            ))}
          </Stack>
        ))}
      </Stack>
    </nav>
  );
}
