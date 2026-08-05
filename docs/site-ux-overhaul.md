# Site UX overhaul — orchestration record

**Closed 2026-08-05.** This is the *process* record of the three-wave UX overhaul of
`apps/site` and its follow-on descriptions stream: which PR did what, which review caught
what, and which decisions were taken and why. The *architecture* it produced is recorded in
[`plan.md` § The reference site (`apps/site`)](./plan.md) — that file is the one to read to
understand how the site works today; this one is why it got that way.

Every checkbox below is merged. Two sections are still live and nothing else here is
actionable:

- [Follow-up streams filed](#follow-up-streams-filed) — five, none started.
- [Open for the user](#open-for-the-user) — product calls surfaced deliberately undecided,
  plus four judgement items that need a human at a real browser.

The original was a working checklist kept untracked beside the work; it is preserved below
close to verbatim, so it reads as notes-to-self rather than as documentation.

---

Orchestrator: main session. Source: design-agent UX audit 2026-08-04 + 5 user decisions.
Merge authority granted by user ("feel free to merge the PRs"). All PRs base `main`, merge
in completion order; on conflict the later branch rebases and re-runs gates before merge.

## User decisions (locked)

1. Props reference: GENERATE real props tables from package types at build time (+ keep Radix deep links).
2. Landing: yes to proof rows + honest "0.x, API can move" maturity line.
3. Syntax highlighting: yes, full (tsx/ts/bash/json grammars, Radix-token theme).
4. Examples tab MERGES INTO Overview (tabs become Overview / Playground / Changelog).
5. Playground state in URL: yes — options-based controls only in v1.

## Wave 1 — parallel, all branch off origin/main (0034ac6)

- [x] PR-1 `fix/site-docs-content` — PR #37 MERGED as fc99c25 (2026-08-04). Also fixed getFoucScript.ts + test comments (scope widened). Review: clean (5 reviewers, no issues). CI verify: pass.
- [x] PR-2 `feat/site-shell` — PR #43 MERGED as 9269ea9. Review found+fixed 2 real bugs (back/forward menu reopen; same-page-click focus drop), both mutation-tested. Also: per-tab titles, filter count announcements, header GitHub link dropped <860px (design rec adopted), `--site-header-h` per-breakpoint override for size-2 trigger. FLAKE FIXED: app.test.tsx suspense waits now use 10s timeouts; root cause recorded — React Router navigates in startTransition, suspenseful routes don't commit on click, post-navigation assertions MUST waitFor (first-round tests passed against the previous page). Icon appearance-cycler deferred (no sun/moon in ICON_NAMES — DS vocabulary decision for user).
- [x] PR-4 `feat/site-code-blocks` — PR #40 MERGED as 12a5a06. First CI run FLAKED (app.test.tsx package-page test: Playground tab link not found in 1.7s — suspense timing on CI runner; rerun passed untouched). Watch for recurrence. TRAP recorded: eslint --fix rewrites ReactNode-typed useMemo callbacks to async (ts/promise-function-async) → renders nothing; type ReactElement|undefined instead.
- [x] PR-5 `feat/site-playground` — PR #41 MERGED as fcd3cb6. Fix commit e8e70da: conditional copy-link announcement, helper copy rewrite, pane headers aligned, chevron-down Icon caret, basename fix via useHref (+regression test). Verify green, 24 tests. Parked: free-text args in URL (v2); tab links drop query string (pre-existing); docs/plan.md consolidated pass after streams merge (2 patterns to record: registry-derived snippet imports, option-args-as-URL-state).
- [x] PR-6 `feat/site-landing` — PR #39 MERGED as 6e895b4. Design verify pass: all 8 Resolved, APPROVE. Carried forward (non-blocking): focus ring on full grid cosmetic residue; NEXT_STEPS could link Inline playground now the example uses Inline.
- [x] PR-8 `feat/site-meta` — PR #38 MERGED as 874456b. Review clean (4 lenses). Deferred by agent: apple-touch-icon (needs plated variant), theme-color meta, per-page cards (SPA constraint).
- [x] Architect scoping for PR-7 — DONE. Key: TS compiler API directly (no new deps; rdt/typedoc/ts-morph rejected with reasons), artifact gitignored at `apps/site/generated/props/` (committed artifact would trip check-token-drift — no allowlist), separate turbo `props` task w/ dependsOn ^build + outputs, guard check-props-coverage.mjs (derived required set, refuse-on-empty), PropsSection own Suspense reusing cachedLoader, order Examples→README→Props (adopted), NO README rewording this stream (adopted), ref/children carve-out (accepted). Spike text-field extraction FIRST.
- **WAVE 1 COMPLETE (2026-08-04).** All 6 PRs merged: #37 fc99c25, #38 874456b, #39 6e895b4, #40 12a5a06, #41 fcd3cb6, #43 9269ea9. Stream worktrees + branches removed. Deploys green through fcd3cb6; 9269ea9 deploy was in_progress at last check. PR #42 (Version Packages bot) left for user. NEXT SESSION: wave 2 = PR-3 spec below (+ fold in: `.home-components` 57px → `var(--site-header-h)`; GettingStarted/PackagePage CodeBlocks pass language prop; tab-switch title/announcement gap design flagged; NEXT_STEPS could add Inline playground link; docs/plan.md consolidated pass recording registry-derived snippet imports + option-args-as-URL-state + wave-2 patterns). Wave 3 = PR-7 per architect spec above.

## Wave 2 — after wave-1 merges (branches off updated main)

- [x] PR-3 `feat/site-package-page` — PR #44 MERGED as 297f95a (2026-08-04). All 13 scope items + wave-1 fold-ins landed. Review loop: code-review clean (4 lenses); design REQUEST CHANGES → 1 blocker (storySource slice ended at next `export`, leaking a non-exported interface + next story's comment into 12 panels — invisible because only Button declares Playground first) + 10 findings, all fixed and verified Resolved; 2 residuals (h3 two-sizes, redirect under story-chunk Suspense) fixed in-PR too; QA PASS (forced-cold 76/76 tasks) → added 4 guards it asked for: `key={slug}` boundary-reset test (deleting the key left 88 tests green), AppCrash render + useHref basename test, visually-hidden assertions, all-story-files sweep (14 files/39 exports, refuse-on-empty). Suite 65→93. ADOPTED design recs (reversible, user may override): Changelog dropped from link row (+"opens in a new tab" hidden text); `/components/:slug/versions` → Navigate replace to `/changelog` (announces "X changelog" — ruled correct, not a silence violation); README h2s demoted to h3 under site-authored h2 "README" via MarkdownView headingOffset — outline is h1 name → h2 Examples (h3 stories, size 4) → h2 README → future h2 Props. Theme Radix link stays (verified lands right). PENDING BROWSER LOOK: sticky tab strip (jsdom can't verify stickiness; structural test only).
- PR #42 "Version Packages" MERGED BY USER 2026-08-04 21:38 as 93a072d (theme@0.2.1 tagged) — 11 min before #44's merge, so #44's CI ran on the pre-bump base; post-merge verify on merged main run in the wave-3 worktree (see below).
- PARALLEL SESSION: locked worktree on branch feat/site-pineapple-polish (b70a3d1) appeared 2026-08-04 — another session's site stream; do not touch; expect possible rebase when it or wave 3 merges.

## Wave 3 — after PR-3

- [x] PR-7 `feat/site-props-tables` — PR #48 MERGED as fbb8c99 (2026-08-05). 28 commits, suite 93→139. Deploy green INCLUDING the first-ever run of the new deploy-site.yml guard step. Built to the architect spec unchanged: TS compiler API (zero deps), gitignored artifact, site-scoped turbo `props` task (dependsOn ^build + outputs), check-props-coverage.mjs derived required set, PropsSection own Suspense via cachedLoader (which gained an optional `findLoader` — sync contract preserved). 277 props across 16 packages, 179 layout props behind a per-component disclosure.
  - Session had crashed mid-build: 4 unpushed commits, no PR. Recovered from the worktree. FIRST GATE RUN WAS A FALSE GREEN — `verify | tail` returns the pager's exit code; verify was actually failing check-token-drift (fixture reused real ACCENT_COLORS names → renamed to invented ones). Every gate since redirects to a file and echoes `$?`.
  - Review loop: code-review 4/5 lenses (2 issues ≥80 posted: WCAG label-in-name 100, alpha-grey chips 95; forwardRef-default-drop 68 and constant duplication 50 below threshold — forwardRef fixed anyway, duplication skipped). Design REQUEST CHANGES → 3 blockers (markdown rendered literally in 197/209 descriptions; Type column had no min-width so it collapsed to ~4 chars on a phone; WCAG) + 11 findings → all Resolved, then APPROVE. Architect NO blockers, verified cache invalidation by probing an upstream package. QA PASS — caught that the first verify was a 77/77 cache replay of a STALE log, forced a cold run, and proved every coverage claim by mutation.
  - QA's best catch: stripping every explicit `role=` from PropsSection left the suite 131/131 GREEN — jsdom supplies those roles implicitly, so the assertions proved nothing. Now pinned with getAttribute. Same shape one level up: check-ci-invariants hard-coded ci.yml, so the new deploy guard step could be deleted silently — now invariant 4, bounds found by content not step name.
  - USER DECISIONS taken this wave: attribute Radix's prose (one count-free sentence, written by KIND of prop so the JSDoc stream won't invalidate it); build the stacked mobile layout NOW (below 600px, both `.props-table` and `.markdown` table; roles declared explicitly + thead hidden-not-removed since restyling a table drops its implicit semantics; `::before` uses the spec'd `attr(data-label) / ""` alt-text pair per design's third option); WRITE THE JSDOC for the ~68 undescribed wrapper props → OWN STREAM, next.
- CARRY-FORWARD (non-blocking, needs a human at a real browser — no browser tool in these sessions):
  - sticky tab strip (wave 2), jsdom can't assert stickiness.
  - stacked mobile layout at 390px: nothing automated can assert it (jsdom evaluates no media queries); design traced the CSS declaration-by-declaration and QA ruled it acceptable to merge on. Four judgement items: Box's 41 expanded layout props ≈ 8000px/20 screens; the newly bordered code chips (120+ rectangles in a 41-row table — one-line fix `.props-table code { border-color: transparent }` if heavy); the `::before` label ramp is 12px-over-14px carried mostly by colour; the 601–676px band where a described table still scrolls ~75px.
  - Deep links return HTTP 404 by design — GitHub Pages SPA fallback serves a byte-identical copy of index.html (verified: same sha256 as `/` and `/404.html`). Not a defect; don't "fix" it.

## Follow-on stream — props descriptions (not part of the original 3 waves)

- [x] `docs/props-jsdoc` — PR #52 MERGED as 9b56a04 (2026-08-05). CI + deploy + release all green. Fills the Description column PR #48 shipped empty: 55 new JSDoc blocks; own props described 30/98 → 85/98. NOTE the honest number — only 64 of those 85 are the packages' OWN words; 21 (box ×3, inline ×9, stack ×9) are still Radix's, which the page now says explicitly. The 13 blanks are all text-field's.
  - PATTERN INTRODUCED (read before touching these packages): seven wrappers declared their whole surface as `export type XProps = ComponentPropsWithRef<typeof RadixX>`, so there was nowhere to hang JSDoc. They now carry an INTERSECTION overlay — `RadixXProps & { /** … */ p?: RadixXProps['p'] }`. It must be an intersection, NOT `Omit`-and-replace: extract-props.mjs's `propDefDefault` iterates every declaration of the symbol, so Radix's declaration surviving beside the overlay is what keeps the Default column populated. The indexed access is also the safety property — a Radix rename/removal is a TS2339 at build time. A *retype* follows silently and stays correct; only the prose can go stale.
  - BLOCKER CAUGHT BY ARCHITECT, would have shipped to npm: packages/icons used `interface extends Omit<…>` instead, and an interface member REPLACES rather than intersects — TS2430 out of our published .d.ts for consumers on the DEFAULT `skipLibCheck: false`, and a silently relaxed type for those on `true`. Invisible here because packages/tsconfig/base.json sets skipLibCheck true and no EOPT. Fixed to the intersection form; NEW GUARD scripts/check-dts-strict.mjs now compiles every published `dist/index.d.ts` under a consumer's options. QA confirmed the repo's own `typecheck` stays green over all 36 tasks on the broken state — the guard is the only thing that sees it.
  - Also fixed: extract-props now prefers the LOCAL JSDoc over the node_modules one (upstream + local were CONCATENATED, upstream first); union sorting extended into preserved aliases via typeToTypeNode (128 type cells) and then made NUMERIC where every member parses as a number (the space scale had gone `"-1"…"-9"|"0"…"9"`); description-coverage and max-default-length (11 chars) assertions; check-ref-tests marker widened for the new intersection form.

## Follow-up streams filed

None started.

- **Sidebar breakpoint 860px → 1030px.** THE LAYOUT CLIFF: at 860px the sidebar is absent and 828px is available; at 861px it returns and 549px is — the content column loses 279px when the window gains one pixel. Tables need 719px described, so 861–1030px scrolls sideways (15 of 16 pages now, was 7). Design killed the other three levers by arithmetic: column floors can't absorb 170px without recreating the failures they exist to prevent; a table breakpoint would stack blocks for a desktop reader; the 880px page cap only binds above a 1192px viewport. OWN PR because `--site-header-h` is redefined inside that same media query (`apps/site/src/site.css`) and three sticky offsets read it — needs a browser.
- **`scripts/*.test.mjs` harness.** QA's residual: guards are proven by running them, not by anything repeatable. `check-props-coverage` reduced to `if (false)` would print its green line over a repo with zero descriptions and every gate would stay green. Needs its own CI wiring, which `scripts/check-ci-invariants.mjs` would then have to learn.
- **`Union<…>` flattening** (129 of 277 type strings expose an internal alias a reader cannot type) — needs a balanced-angle-bracket parse of the printed type (a regex mis-splits on nested commas) plus a rendering decision.
- **`Required` badge hue** — soft amber on an amber canvas, and it fires exactly once site-wide. Needs a contrast measurement, and it interacts with PackagePage's sibling version badge, so recolouring only one trades contrast for inconsistency.
- **Props-section paragraph subtitle spacing** — structurally blocked by the h2-out-of-Suspense hoist; would need the layout restructured.

## Open for the user

Surfaced deliberately, not decided.

- **text-field's 13 props stay undescribed.** It is the only package whose tables drop the Description column, and the page now says so explicitly. The architect BUILT and verified the alternative — `export namespace TextField` with Root/Slot annotated to a local intersection keeps `TextField.RootProps`/`TextField.SlotProps` resolving for consumers and yields a byte-identical prop set plus descriptions — at the cost of `packages/text-field/dist/index.mjs` no longer being a pure re-export (a value namespace emits an IIFE). Product call.
- **Whether the site should republish Radix's prose at all.** 21 of 85 described props still carry Radix's words; the page discloses this. Options framed: attribute (chosen, done), stay silent, or show only pineapple-authored descriptions.
- **The four phone/tablet-width judgement calls** listed under wave 3's carry-forward, plus wave 2's sticky tab strip — no automated check can reach them and these sessions have no browser.
- **Whether sun/moon/monitor glyphs should join `@pineappleui/icons`** so the mobile appearance toggle can be an icon rather than a cycling text word (deliberate as-is).
- **Free-text playground args in the URL** — parked v2 idea.

## Review loop per PR (before merge)

- /code-review --comment on every PR; design reviewer on PR-2/3/5/6; architect reviewer on PR-7; qa gate (verify + CI) on all. Review → Address (fix agent) → Verify (same reviewers) until sign-off.

## Deferred / skipped (from audit, agreed scope)

- N7 playground badges on cards (needs eager story metadata — rejected), N8 URL scheme churn, P5 number-clear (latent, no numeric args), F8 humanize acronyms (latent).

## Cleanup — done

All PRs merged and branches deleted, every stream worktree removed, `deploy-site.yml` green
and https://designpineapple.com serving the new build. The last stream worktree (`feat/site-ux`,
which held this file untracked) went away with the commit that added it here.
