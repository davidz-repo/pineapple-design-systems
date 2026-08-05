import { act } from 'react';

import { getFoucScript } from '@pineappleui/theme';

import { afterEach, expect, it, vi } from 'vitest';

import { SITE_ACCENT_COLOR } from './site-accent';

import type { HtmlTagDescriptor, Plugin } from 'vite';

// The site pins one accent across TWO surfaces that paint independently: the
// boot script vite inlines (before React exists) and the provider main.tsx
// mounts (after). site-accent.ts explains why they must agree — a pair that
// disagrees is not an error anywhere, it is one frame of the wrong colour on
// the first paint of every visit.
//
// Nothing else in the repo holds that pair. The theme package proves the
// MECHANISM — getFoucScript.test.ts diffs the script's attributes against the
// provider's for every accent — but a surface that stopped passing
// SITE_ACCENT_COLOR would still agree with itself and pass there. These two
// tests are what makes dropping the pin on either side loud, and they read the
// constant rather than the literal 'amber' so repainting the site stays a
// one-line change in site-accent.ts.

afterEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
});

it('the boot script vite injects pins the site accent', async () => {
  const { default: config } = await import('../vite.config');

  // Flattened as unknown[]: vite's own PluginOption is recursive (a plugin may
  // be an array of plugins, or a promise of one), and asking tsc to compute
  // `.flat(Infinity)` over it exceeds its instantiation depth. `react()`
  // returns an array, so the list genuinely is nested.
  const plugins = ((config.plugins ?? []) as unknown[]).flat(Infinity) as Plugin[];
  const foucPlugin = plugins.find(plugin => plugin?.name === 'pineapple-fouc-script');
  if (foucPlugin?.transformIndexHtml === undefined) {
    throw new Error(
      'apps/site/vite.config.ts no longer registers a `pineapple-fouc-script` plugin with a '
      + 'transformIndexHtml hook — the first-paint script is not being injected at all',
    );
  }

  // The hook is registered in its function form here; the object form is the
  // other shape vite accepts, and reaching through `.handler` keeps this test
  // measuring the accent rather than the registration style.
  const hook = foucPlugin.transformIndexHtml;
  const emitted = await (typeof hook === 'function' ? hook : hook.handler).call(
    // The hook ignores every argument it is given, so the context and the html
    // are only here to satisfy the signature.
    {} as never,
    '',
    {} as never,
  );

  // vite lets the hook return the html, a tag list, or both; only the shapes
  // carrying tags can be carrying this script.
  const tags: HtmlTagDescriptor[] = Array.isArray(emitted)
    ? emitted
    : typeof emitted === 'object' && emitted !== null
      ? emitted.tags
      : [];
  const scripts = tags.filter(tag => tag.tag === 'script');
  expect(scripts).toHaveLength(1);

  // Exact, not a substring match: this is the same string getFoucScript builds
  // for the pinned accent, so passing a bare literal, the package default, or
  // any other accent in vite.config.ts fails here with a readable diff.
  expect(scripts[0]?.children).toBe(getFoucScript({ accentColor: SITE_ACCENT_COLOR }));
});

it('the app main.tsx mounts pins the same accent on #root', async () => {
  // A stale accent from before the picker was removed — the exact record the
  // pin exists to override. If the provider ever stops receiving the constant,
  // this is what the reader would get instead.
  window.localStorage.setItem(
    'pineappleui.theme.v1',
    JSON.stringify({ appearance: 'light', accentColor: 'indigo' }),
  );

  const root = document.createElement('div');
  root.id = 'root';
  document.body.append(root);

  // main.tsx mounts on import — there is no export to call.
  await act(async () => {
    await import('./main');
  });

  // Radix paints the theme onto the element <Theme> renders INSIDE #root, not
  // onto #root itself — #root carries the boot script's copy of the same
  // attributes, and that script is injected into index.html by vite, so it
  // does not run here. This is the React half of the pair; the test above is
  // the script half.
  const themed = root.querySelector('.radix-themes');
  if (themed === null) {
    throw new Error(
      'main.tsx mounted no `.radix-themes` element, so nothing is painting the theme. If '
      + 'Radix stopped emitting that class, update this selector — otherwise nothing is '
      + 'checking that the site pins its accent.',
    );
  }

  expect(themed.getAttribute('data-accent-color')).toBe(SITE_ACCENT_COLOR);
  // The appearance is NOT pinned: it is still a real preference, and the pin
  // must not swallow the stored one on its way past. 'light' was seeded above.
  expect(themed.classList.contains('light')).toBe(true);
  expect(themed.classList.contains('dark')).toBe(false);
});
