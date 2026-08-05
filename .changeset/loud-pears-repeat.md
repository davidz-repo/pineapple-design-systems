---
---

No release for `@pineappleui/button`, deliberately: its only change here is
`Button.stories.tsx`, and the story is not in the published package. The
manifest ships `files: ["dist"]` and tsup's entry is `src/index.ts`, which
never imports the stories — they are read from SOURCE by the docs site and the
gallery, both of which alias the workspace. Publishing would push a
byte-identical `dist` under a new version.

Written down rather than left to inference, because the gate cannot tell:
`changeset status --since=origin/main` fails only when NO changeset exists at
all, so once any one is present a second changed package rides through
uncovered and CI stays green. This file is the record that button was
considered and consciously not released.
