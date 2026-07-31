---
"@pineappleui/icons": minor
---

`@pineappleui/icons` now exports `ICON_NAMES` and `ICON_SIZES` — the glyph names and the size
tokens as runtime values (`readonly IconName[]` / `readonly IconSize[]`), for consumers building
an icon picker, a gallery or a `<select>`. A type cannot be iterated, so `IconName` alone left
every such UI hand-typing the set. Both are derived from the internal `ICONS` and `SIZES` maps,
which stay the single definition site: adding a glyph adds it to everything built on them, with
no second list to keep in step. The package's own story gallery now maps over the exports rather
than the private copies it used to carry.
