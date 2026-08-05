---
---

No release for `@pineappleui/box`, `@pineappleui/stack` or `@pineappleui/inline`,
deliberately: the only change in all three is their `*.stories.tsx`, and a story
is not in the published package. Each manifest ships `files: ["dist"]` and tsup's
entry is `src/index.ts`, which never imports the stories — they are read from
SOURCE by the docs site and the gallery, both of which alias the workspace.
Publishing would push three byte-identical `dist` directories under new versions.

What changed is that the demo items were `var(--gray-3)` and the canvas they sit
on is also `--gray-3` in light appearance, so the examples were invisible on a
white site — identical colour on identical colour. They are `var(--accent-a3)`
now, which reads on both canvases: measured on the built site, the item
composites to `#f4ecb6` over light's `#f1f0ef` and to `#4b2d07` over dark's
`#302008`. Dark was the appearance at risk here, since the accent is pinned to
amber and dark's canvas is `--amber-3` — amber over amber — so it was checked
rather than assumed.

Written down rather than left to inference, because the gate cannot tell:
`changeset status --since=origin/main` fails only when NO changeset exists at
all, so once any one is present a second changed package rides through
uncovered and CI stays green. This file is the record that all three were
considered and consciously not released.
