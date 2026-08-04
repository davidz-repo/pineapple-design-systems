---
"@pineappleui/theme": patch
---

Correct where the README says to inline the first-paint script.

Nothing about `getFoucScript()` changes — the published `dist/` is byte-identical. What changes
is that the README stops contradicting itself, and stops giving the one instruction that makes
the snippet do nothing.

It said to inline the string in `<head>`, before any stylesheet or module tag, and then admitted
two rows later that the script returns silently there because the mount point has not been
parsed yet. Both cannot be true, and it is the second one that holds: the script looks `#root`
up by id and returns if it is absent, so a `<head>` placement is a permanent no-op — it throws
nothing, logs nothing, and leaves the consumer the flash they inlined it to remove, having
followed the documentation exactly.

The README now states the placement the script actually requires, in all three places it comes
up: at the END of `<body>`, after the root element, which is still ahead of the deferred module
script that mounts React. It is what this repo's own reference site has always done
(`apps/site/vite.config.ts` injects with `injectTo: 'body'`).
