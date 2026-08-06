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

/**
 * The Radix Themes documentation for the component a package wraps — the one
 * fact about a wrapper that nothing else in the repo records. `@radix-ui/themes`
 * in peerDependencies says a package wraps SOMETHING; only this says what, and
 * the mapping is not the slug (Stack and Inline are both Flex, and Theme is
 * documented as a section rather than a component).
 *
 * `path` is relative to Radix's docs root and is never a full URL — the URL is
 * built in packageLinks.ts, so the host appears once in this repo.
 * registry.test.ts fails when a package peers on Radix Themes without this.
 */
export interface RadixReference {
  /** What Radix calls it, for the link's label. */
  name: string;
  /** Path under `https://www.radix-ui.com/themes/docs/`. */
  path: string;
}

export interface RegistryEntry {
  /** Directory name under packages/ — also the route segment. */
  slug: string;
  /** Display name; for component packages, the exported component's name. */
  name: string;
  category: Category;
  /** One home-card / sidebar sentence. */
  blurb: string;
  snippet?: (args: Record<string, unknown>) => string;
  radix?: RadixReference;
}

export const REGISTRY: readonly RegistryEntry[] = [
  {
    slug: 'theme',
    name: 'Theme',
    category: 'Foundation',
    blurb: 'Theme providers, the stylesheet, and the first-paint script.',
    // A section of Radix's docs rather than a component page: what this package
    // wraps is the <Theme> the whole appearance/accent system is configured on.
    radix: { name: 'Theme', path: 'theme/overview' },
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
    radix: { name: 'Box', path: 'components/box' },
  },
  {
    slug: 'stack',
    name: 'Stack',
    category: 'Layout',
    blurb: 'Vertical layout: a flex column with a gap scale.',
    snippet: args => jsxSnippet('Stack', args, '{/* items */}'),
    radix: { name: 'Flex', path: 'components/flex' },
  },
  {
    slug: 'inline',
    name: 'Inline',
    category: 'Layout',
    blurb: 'Horizontal layout: a wrapping flex row with a gap scale.',
    snippet: args => jsxSnippet('Inline', args, '{/* items */}'),
    radix: { name: 'Flex', path: 'components/flex' },
  },
  {
    slug: 'card',
    name: 'Card',
    category: 'Layout',
    blurb: 'A padded surface for grouping related content.',
    snippet: ({ content, ...rest }) => jsxSnippet('Card', rest, String(content ?? '')),
    radix: { name: 'Card', path: 'components/card' },
  },
  {
    slug: 'heading',
    name: 'Heading',
    category: 'Typography',
    blurb: 'Section headings, size defaulted per level.',
    snippet: ({ text, ...rest }) => jsxSnippet('Heading', rest, String(text ?? '')),
    radix: { name: 'Heading', path: 'components/heading' },
  },
  {
    slug: 'text',
    name: 'Text',
    category: 'Typography',
    blurb: 'Body copy with size, weight and color props.',
    snippet: ({ text, ...rest }) => jsxSnippet('Text', rest, String(text ?? '')),
    radix: { name: 'Text', path: 'components/text' },
  },
  {
    slug: 'button',
    name: 'Button',
    category: 'Forms & actions',
    blurb: 'The action trigger, in six variants.',
    snippet: ({ label, ...rest }) => jsxSnippet('Button', rest, String(label ?? '')),
    radix: { name: 'Button', path: 'components/button' },
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
    radix: { name: 'IconButton', path: 'components/icon-button' },
  },
  {
    slug: 'dropdown-menu',
    name: 'DropdownMenu',
    category: 'Forms & actions',
    // "commands", not "options" — that one word is the whole boundary against
    // the future Select, which holds a value and whose items are nouns.
    blurb: 'A trigger that discloses a list of commands — the menu-button pattern.',
    // The whole tree, not just the part the args land on: every playground arg
    // is a `Content` prop, and a snippet showing `Content` alone is a fragment
    // that does not compile — a menu is three elements or it is nothing.
    snippet: args => jsxSnippet(
      'DropdownMenu.Root',
      {},
      [
        '<DropdownMenu.Trigger>',
        '  <Button variant="soft">Actions</Button>',
        '</DropdownMenu.Trigger>',
        jsxSnippet('DropdownMenu.Content', args, '{/* DropdownMenu.Item children */}'),
      ].join('\n'),
    ),
    radix: { name: 'DropdownMenu', path: 'components/dropdown-menu' },
  },
  {
    slug: 'text-field',
    name: 'TextField',
    category: 'Forms & actions',
    blurb: 'Single-line input: a Root with optional Slots.',
    snippet: args => jsxSnippet('TextField.Root', args),
    radix: { name: 'TextField', path: 'components/text-field' },
  },
  {
    slug: 'text-area',
    name: 'TextArea',
    category: 'Forms & actions',
    blurb: 'Multi-line text input.',
    snippet: args => jsxSnippet('TextArea', args),
    radix: { name: 'TextArea', path: 'components/text-area' },
  },
  {
    slug: 'badge',
    name: 'Badge',
    category: 'Feedback',
    blurb: 'An inline label for statuses and counts.',
    snippet: ({ label, ...rest }) => jsxSnippet('Badge', rest, String(label ?? '')),
    radix: { name: 'Badge', path: 'components/badge' },
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
