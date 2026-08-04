import { jsxSnippet } from './jsx-snippet';

// One entry per public package. The sidebar, home grid and routes are all
// derived from this list; src/registry.test.ts asserts it matches the
// packages/ directory on disk in both directions, so a new package fails the
// site's test task until it gets an entry here.
//
// `snippet` maps the Playground story's args to the JSX that story actually
// renders (e.g. Button's `label` arg becomes children, `color: ''` means "not
// passed"). Absent => the generic `<Name {...args} />` fallback, which is only
// honest when every arg is a real prop. Written against each story's render
// fn — see the matching *.stories.tsx before editing one.

export type Category
  = | 'Layout'
    | 'Typography'
    | 'Forms & actions'
    | 'Feedback'
    | 'Icons'
    | 'Foundation'
    | 'Hooks';

// Presentation order of the sidebar groups.
export const CATEGORIES: readonly Category[] = [
  'Foundation',
  'Layout',
  'Typography',
  'Forms & actions',
  'Feedback',
  'Icons',
  'Hooks',
];

export interface RegistryEntry {
  /** Directory name under packages/ — also the route segment. */
  slug: string;
  /** Display name; for component packages, the exported component's name. */
  name: string;
  category: Category;
  /** One home-card / sidebar sentence. */
  blurb: string;
  snippet?: (args: Record<string, unknown>) => string;
}

export const REGISTRY: readonly RegistryEntry[] = [
  {
    slug: 'theme',
    name: 'Theme',
    category: 'Foundation',
    blurb: 'Theme providers, the stylesheet, and the first-paint script.',
  },
  {
    slug: 'tokens',
    name: 'Tokens',
    category: 'Foundation',
    blurb: 'Accent colors and theme types — the vocabulary every other package shares.',
  },
  {
    slug: 'box',
    name: 'Box',
    category: 'Layout',
    blurb: 'The primitive container, with padding and sizing props.',
    snippet: ({ content, ...rest }) => jsxSnippet('Box', rest, String(content ?? '')),
  },
  {
    slug: 'stack',
    name: 'Stack',
    category: 'Layout',
    blurb: 'Vertical layout: a flex column with a gap scale.',
    snippet: args => jsxSnippet('Stack', args, '{/* items */}'),
  },
  {
    slug: 'inline',
    name: 'Inline',
    category: 'Layout',
    blurb: 'Horizontal layout: a wrapping flex row with a gap scale.',
    snippet: args => jsxSnippet('Inline', args, '{/* items */}'),
  },
  {
    slug: 'card',
    name: 'Card',
    category: 'Layout',
    blurb: 'A padded surface for grouping related content.',
    snippet: ({ content, ...rest }) => jsxSnippet('Card', rest, String(content ?? '')),
  },
  {
    slug: 'heading',
    name: 'Heading',
    category: 'Typography',
    blurb: 'Section headings, size defaulted per level.',
    snippet: ({ text, ...rest }) => jsxSnippet('Heading', rest, String(text ?? '')),
  },
  {
    slug: 'text',
    name: 'Text',
    category: 'Typography',
    blurb: 'Body copy with size, weight and color props.',
    snippet: ({ text, ...rest }) => jsxSnippet('Text', rest, String(text ?? '')),
  },
  {
    slug: 'button',
    name: 'Button',
    category: 'Forms & actions',
    blurb: 'The action trigger, in six variants.',
    snippet: ({ label, ...rest }) => jsxSnippet('Button', rest, String(label ?? '')),
  },
  {
    slug: 'icon-button',
    name: 'IconButton',
    category: 'Forms & actions',
    blurb: 'A square button holding exactly one glyph.',
    snippet: args => jsxSnippet(
      'IconButton',
      { 'aria-label': 'Copy', ...args },
      '<Icon name="copy" />',
    ),
  },
  {
    slug: 'text-field',
    name: 'TextField',
    category: 'Forms & actions',
    blurb: 'Single-line input: a Root with optional Slots.',
    snippet: args => jsxSnippet('TextField.Root', args),
  },
  {
    slug: 'text-area',
    name: 'TextArea',
    category: 'Forms & actions',
    blurb: 'Multi-line text input.',
    snippet: args => jsxSnippet('TextArea', args),
  },
  {
    slug: 'badge',
    name: 'Badge',
    category: 'Feedback',
    blurb: 'An inline label for statuses and counts.',
    snippet: ({ label, ...rest }) => jsxSnippet('Badge', rest, String(label ?? '')),
  },
  {
    slug: 'live-region',
    name: 'LiveRegion',
    category: 'Feedback',
    blurb: 'Screen-reader announcements through an audited aria-live wrapper.',
  },
  {
    slug: 'icons',
    name: 'Icon',
    category: 'Icons',
    // The story's `color` arg styles a wrapper element, not the Icon itself —
    // the snippet reflects that instead of inventing a prop.
    blurb: 'Lucide glyphs behind one component, with size tokens and a11y defaults.',
    snippet: ({ color, ...rest }) => {
      const icon = jsxSnippet('Icon', rest);
      return typeof color === 'string' && color !== ''
        ? `<span style={{ color: '${color}' }}>\n  ${icon}\n</span>`
        : icon;
    },
  },
  {
    slug: 'use-local-storage',
    name: 'useLocalStorage',
    category: 'Hooks',
    blurb: 'React state persisted to localStorage.',
  },
];

export const bySlug: ReadonlyMap<string, RegistryEntry>
  = new Map(REGISTRY.map(entry => [entry.slug, entry]));
