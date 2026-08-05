---
"@pineappleui/badge": patch
"@pineappleui/box": patch
"@pineappleui/button": patch
"@pineappleui/card": patch
"@pineappleui/heading": patch
"@pineappleui/icon-button": patch
"@pineappleui/icons": patch
"@pineappleui/text": patch
"@pineappleui/text-area": patch
"@pineappleui/text-field": patch
---

Point each README at the generated props table instead of denying one exists.

No code changes — the published `dist/` is byte-identical for all ten. What changes is one
paragraph in each README, which is a file npm renders on the package page.

Each of them said "The prop set is deliberately not reproduced here" (icons: "The glyph list
is"), and the docs site now reproduces it: every package page generates a full props table from
the package's own TypeScript types, one section below the README it is quoting. On the site the
two paragraphs sit a screen apart contradicting each other, and icons' Props table prints all
twelve glyph names as `Icon.name`'s type.

The reason behind the sentence still holds and is kept: the type is authoritative, your editor
completes from it, and a hand-written second copy in prose is a copy that goes stale without
failing. What is dropped is the claim that no copy exists anywhere. The generated one cannot go
stale — it is built from the same types on every deploy — so the paragraph now names it and
links the page.
