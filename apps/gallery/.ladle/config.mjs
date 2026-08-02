// Ladle host config. The Vite alias chain that resolves `@pineappleui/*` to
// source lives in `../vite.config.ts`, between the `@pineappleui-aliases`
// marker comments.
//
// Stories are discovered by globbing every package — so adding a new
// `@pineappleui/<thing>` package and dropping a `*.stories.tsx` next to its
// source file is enough for the gallery to pick it up. There is nothing to
// register here per package, and nothing to move when a package is added.

/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: [
    // Component stories live next to each package's source, never here: a story
    // is written and typechecked by the package that owns the component.
    '../../packages/*/src/**/*.stories.{ts,tsx}',
  ],
  // Within each component group, surface its interactive Playground story first;
  // every other story keeps Ladle's default alphabetical order. `stories` arrives
  // already alpha-sorted, so grouping by the `<component>--` prefix preserves the
  // component order while only hoisting the `--playground` entry to the top.
  storyOrder: (stories) => {
    const groups = new Map();
    for (const id of stories) {
      const group = id.split('--')[0];
      if (!groups.has(group))
        groups.set(group, []);
      groups.get(group).push(id);
    }
    return [...groups.values()].flatMap(ids => [
      ...ids.filter(id => id.endsWith('--playground')),
      ...ids.filter(id => !id.endsWith('--playground')),
    ]);
  },
  port: 6006,
  viteConfig: './vite.config.ts',
};
