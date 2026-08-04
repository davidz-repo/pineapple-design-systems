import { useId, useRef, useState } from 'react';

import { Button } from '@pineappleui/button';
import { LiveRegion } from '@pineappleui/live-region';

import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { TextField } from '@pineappleui/text-field';
import { NavLink } from 'react-router';

import { CATEGORIES, REGISTRY } from '../registry';

import type { RegistryEntry } from '../registry';

interface SidebarProps {
  /** Named by the header's Menu trigger through `aria-controls`. */
  id: string;
  /** Panel state below 860px; ignored by the desktop layout. */
  isOpen: boolean;
  /** Dismiss the panel when a link is followed, including a link to the current page. */
  onNavigate: () => void;
}

function sidebarLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'site-sidebar-link active' : 'site-sidebar-link';
}

// Name and blurb, because the blurb is where the words people search for live
// ("dropdown", "input") when the component is named something else.
function entryMatches(entry: RegistryEntry, query: string): boolean {
  const needle = query.toLowerCase();
  return entry.name.toLowerCase().includes(needle)
    || entry.blurb.toLowerCase().includes(needle);
}

// Local state, not the URL: the filter is a way to find a link in this list,
// not a view of the site anyone would deep-link or share.
export function Sidebar({ id, isOpen, onNavigate }: SidebarProps) {
  const [query, setQuery] = useState('');
  const filterInputRef = useRef<HTMLInputElement>(null);
  const filterId = useId();

  const needle = query.trim();
  const matched = needle === ''
    ? REGISTRY
    : REGISTRY.filter(entry => entryMatches(entry, needle));

  const groups = CATEGORIES
    .map(category => ({
      category,
      entries: matched.filter(entry => entry.category === category),
    }))
    .filter(group => group.entries.length > 0);

  function clearFilter() {
    setQuery('');
    filterInputRef.current?.focus();
  }

  return (
    <nav id={id} className="site-sidebar" aria-label="Documentation" data-open={isOpen}>
      <Stack gap="4">
        <div>
          <label className="site-visually-hidden" htmlFor={`${filterId}-filter`}>
            Filter components
          </label>
          <TextField.Root
            id={`${filterId}-filter`}
            ref={filterInputRef}
            size="1"
            value={query}
            placeholder="Filter components"
            onChange={event => setQuery(event.target.value)}
          />
        </div>
        <ul role="list" className="site-nav-list">
          <li>
            <NavLink to="/" end className={sidebarLinkClass} onClick={onNavigate}>
              Introduction
            </NavLink>
          </li>
          <li>
            <NavLink to="/getting-started" className={sidebarLinkClass} onClick={onNavigate}>
              Getting started
            </NavLink>
          </li>
        </ul>
        {/* One group per category rather than 18 loose links: the category is
            the group's accessible name, so "Badge, Feedback group" is what a
            screen reader reads instead of "Badge, link, 14 of 20". */}
        {groups.map(({ category, entries }) => {
          const labelId = `${filterId}-${category.toLowerCase().replace(/[^a-z0-9]+/gu, '-')}`;
          return (
            <Stack key={category} gap="1" role="group" aria-labelledby={labelId}>
              <Text
                as="p"
                id={labelId}
                className="site-nav-group-label"
                size="1"
                weight="medium"
                color="gray"
              >
                {category}
              </Text>
              <ul role="list" className="site-nav-list">
                {entries.map(entry => (
                  <li key={entry.slug}>
                    <NavLink
                      to={`/components/${entry.slug}`}
                      className={sidebarLinkClass}
                      onClick={onNavigate}
                    >
                      {entry.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </Stack>
          );
        })}
        {/* Mounted whether or not it has anything to say — LiveRegion's
            contract is that the region stays put and its children change; a
            region that appears already filled is not reliably announced. */}
        <LiveRegion role="status">
          {groups.length === 0 && (
            <Stack gap="2" align="start">
              <Text as="p" size="1" color="gray">
                No component matches “
                {needle}
                ”.
              </Text>
              <Button size="1" variant="soft" type="button" onClick={clearFilter}>
                Clear filter
              </Button>
            </Stack>
          )}
        </LiveRegion>
      </Stack>
    </nav>
  );
}
