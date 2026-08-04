import { act } from 'react';

import { DesignSystemProvider, ThemePreferencesProvider } from '@pineappleui/theme';

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { expect, it } from 'vitest';

import { bySlug } from '../../registry';
import { Playground } from './Playground';

import type { RegistryEntry } from '../../registry';
import type { StoryExport } from '../../stories';

// The preset's setup file registers the jest-dom matchers at runtime; this
// side-effect import is what puts their types on vitest's `Assertion`.
import '@testing-library/jest-dom/vitest';

// A stand-in for a package's own Playground story, shaped like the real ones:
// one arg with an option list (mirrored into the URL), one free-text arg and
// one boolean (both local). Fabricated rather than imported so these tests
// pin the playground's behaviour and not a story's current defaults —
// app.test.tsx already renders the real button story end to end.
const story: StoryExport = ({ label, variant }) => (
  <button type="button">{`${String(variant)}:${String(label)}`}</button>
);
story.args = { label: 'Click me', highContrast: false };
story.argTypes = {
  variant: {
    options: ['classic', 'solid', 'soft'],
    control: { type: 'select' },
    defaultValue: 'solid',
  },
};

// The real registry entry, so the snippet (and its import line) is the one the
// site ships: `label` becomes children, `highContrast: false` is not passed.
function registryEntry(slug: string): RegistryEntry {
  const found = bySlug.get(slug);
  if (found === undefined) {
    throw new Error(`registry entry \`${slug}\` is missing`);
  }
  return found;
}

const entry = registryEntry('button');

// Reads the router's search string out of the tree — the URL is the state
// under test, and MemoryRouter keeps it out of `window.location`.
function LocationProbe() {
  const { search } = useLocation();
  return <output aria-label="router search">{search}</output>;
}

async function renderPlayground(path: string) {
  await act(async () => {
    render(
      <ThemePreferencesProvider>
        <DesignSystemProvider>
          <MemoryRouter initialEntries={[path]}>
            <LocationProbe />
            <Playground story={story} entry={entry} />
          </MemoryRouter>
        </DesignSystemProvider>
      </ThemePreferencesProvider>,
    );
  });
}

const PATH = '/components/button/playground';

function routerSearch(): string {
  return screen.getByLabelText('router search').textContent ?? '';
}

// The <code> element: getByText matches on an element's own text children, so
// the <pre> around it does not also match.
function snippetText(): string {
  return screen.getByText(/<Button/).textContent ?? '';
}

async function changeControl(label: string, value: string) {
  await act(async () => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
}

async function clickButton(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

it('hydrates an option arg from the URL, imports and all', async () => {
  await renderPlayground(`${PATH}?variant=soft`);
  expect(screen.getByLabelText('variant')).toHaveValue('soft');
  expect(snippetText()).toBe(
    `import { Button } from '@pineappleui/button';\n\n<Button variant="soft">Click me</Button>`,
  );
});

it('falls back to the default for a value the story does not offer', async () => {
  await renderPlayground(`${PATH}?variant=nope`);
  expect(screen.getByLabelText('variant')).toHaveValue('solid');
  expect(snippetText()).toContain('<Button variant="solid">Click me</Button>');
});

it('mirrors a non-default option into the URL and drops it again at the default', async () => {
  await renderPlayground(PATH);
  expect(routerSearch()).toBe('');

  await changeControl('variant', 'soft');
  expect(routerSearch()).toBe('?variant=soft');
  expect(snippetText()).toContain('variant="soft"');

  // Back to the story's own default: the param goes, so a link nobody tuned
  // stays clean rather than carrying `?variant=solid`.
  await changeControl('variant', 'solid');
  expect(routerSearch()).toBe('');
});

it('keeps free-text args out of the URL', async () => {
  await renderPlayground(PATH);
  await changeControl('label', 'Save changes');
  expect(routerSearch()).toBe('');
  expect(snippetText()).toContain('<Button variant="solid">Save changes</Button>');
});

it('resets to the defaults, and offers nothing to reset until something changes', async () => {
  await renderPlayground(PATH);
  expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();

  await changeControl('variant', 'classic');
  await changeControl('label', 'Save changes');
  expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();

  await clickButton('Reset');
  expect(screen.getByLabelText('variant')).toHaveValue('solid');
  expect(screen.getByLabelText('label')).toHaveValue('Click me');
  expect(routerSearch()).toBe('');
  expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
});
