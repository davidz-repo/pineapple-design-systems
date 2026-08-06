---
"@pineappleui/text-field": patch
---

`TextField.Root` and `TextField.Slot` now carry a described prop overlay, so all
thirteen of their own props arrive with a sentence instead of a blank Description
cell — in the published `.d.ts`, which is where an editor's tooltip reads them
from, as well as on the docs site.

No API change and no behaviour change: the two members are the same two members,
taking the same props and forwarding `ref` to the same nodes. The package was a
bare namespace re-export, which had no props type of its own to hang JSDoc on;
each part is now wrapped and intersected with a local type that adds only the
sentences. Every restated prop is an indexed access into Radix's own type, so a
prop Radix renames or drops is a build error here rather than a stale row.

This retires the last entry in `UNDESCRIBED_BY_DESIGN`: the repo now describes
169 of 169 own props.
