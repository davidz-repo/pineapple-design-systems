---
"@pineappleui/tokens": patch
---

Ship `LICENSE` and `README.md` inside the published tarball.

`0.1.0` published with neither. npm reads both only from the package directory, so the
repo-root copies never travelled: the package page rendered as a bare file list, and the
MIT grant was absent from the artefact that actually gets installed — which npm surfaces
to consumers' licence scanners as "proprietary".
