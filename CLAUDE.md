# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role & Communication Style

You are a senior software engineer collaborating with a peer. Prioritize thorough planning and alignment before implementation. Approach conversations as technical discussions, not as an assistant serving requests.

- **Plan first**: discuss the approach, surface the implementation choices, present options with trade-offs, confirm alignment, *then* write code.
- If you discover an unforeseen issue mid-implementation, stop and discuss.
- Push back on flawed logic. Don't open with praise, don't validate every decision as "absolutely right", don't agree just to be agreeable.
- When a change is purely stylistic or preferential, say so ("Sure, I'll use that approach") rather than dressing it as an objective improvement.
- Assume common programming concepts are understood. Be direct with feedback rather than couching it in niceties.

## Critical context: this repo contains two different websites

| Branch   | What it is                                                                                                                                     |
|----------|------------------------------------------------------------------------------------------------------------------------------------------------|
| `master` | Frozen v1 (2017 HTML5 UP static site), tagged `v1.0.0`. **Still serving the live site** until cutover. Also still the repo's *default* branch. |
| `main`   | The v2 Astro rebuild. **Orphan branch — shares no history with `master`.** All current work happens here.                                      |

Everything below describes `main`. Branch off `main` and PR back into `main` — **not** into `master`, despite it being the repo default. A `no-commit-to-branch` pre-commit hook blocks direct commits to both.

Conventions: branches `<type>/<issue-number>-<slug>` (e.g. `feat/42-landing-hero`), every piece of work traces to a GitHub issue. Commits and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/) using only the spec's standard types, and the branch uses the same `<type>`. Issues take whichever repo labels fit best. Labels and commit types are separate: `content`, `design` and `infra` are labels, not commit types.

## Commands

Node 22 (`.nvmrc`).

```sh
npm run dev       # astro dev
npm run build     # astro build -> dist/
npm run check     # astro check — the strict-TypeScript gate
npm run preview   # serve dist/ on :4321
npm run a11y      # axe-core over dist/ — REQUIRES a build first, builds nothing itself
```

There is no unit-test framework. The two checks that exist are `npm run a11y` and the hand-run viewport check; treat them as the test suite.

### Viewport check (hand-run, deliberately not in CI)

`scripts/viewport-check.mjs` drives real headless Chrome over the DevTools Protocol to assert no route scrolls horizontally at any breakpoint. Run it before any layout change lands:

```sh
npm run build
npm run preview
chrome --headless=new --disable-gpu --remote-debugging-port=9222 --user-data-dir=/tmp/viewport-check about:blank
node scripts/viewport-check.mjs
```

**Adding a route means adding it to `ROUTES` in that script** — an unlisted route is a route nobody has checked. Three horizontal-scroll defects shipped past `astro check`, `astro build` *and* axe, because none of them lays out a page.

### Lint hooks

Pre-commit runs from a **project-local** `.venv/`, never a global install:

```sh
uv venv && uv pip install pre-commit && pre-commit install
pre-commit run --all-files          # or .venv\Scripts\pre-commit on Windows
```

Full linting is MegaLinter in CI; the hooks are the fast local subset plus gitleaks.

## Architecture

Astro + strict TypeScript, static output, zero runtime dependencies on third parties.

- **`src/styles/tokens.css` is the single source of truth** for every colour, font role, size, duration, radius and z-index. No file outside it may hard-code a hex value or a font stack. If a value is missing, add a token.
- **`astro.config.mjs` owns the fonts.** Google faces are resolved and downloaded *at build time* via Astro's Fonts API, emitted fingerprinted into the build and served from our own origin — the shipped pages contain no `fonts.gstatic.com` reference. `tokens.css` only aliases them onto semantic roles (`--font-display` / `--font-body` / `--font-mono`); nothing else references the per-family variables.
- **Icons** are Iconify sets (`@iconify-json/lucide`, `@iconify-json/simple-icons`) inlined as SVG at build time by `astro-icon`. No icon font, no runtime fetch. A new set is a new npm dependency.
- **`src/data/*.ts`** holds typed content (`nav.ts`, `career.ts`, `toolbox.ts`, `certifications.ts`) — components take data, they don't embed it. All current entries are placeholder pending issue #28.
- **`src/lib/accents.ts`** is a closed union of the six semantic syntax accents. `--accent-purple` is deliberately excluded so a component can't reach for it without reopening the colour-map decision. Pick an accent by *meaning*, not appearance.
- **`src/components/`** is grouped by role: `nav/`, `chrome/`, `layout/`, `ui/`, `content/`, `media/`.
- **One script ships**: `src/scripts/lightbox.ts`, loaded by `Gallery.astro`. Grid items are real `<a href>`s upgraded into lightbox openers, so they degrade to working navigation; the dialog is a native `<dialog>` + `showModal()`.
- `src/pages/index.astro` is still the pre-component-library scaffold and does **not** use `AppShell`. The component library is currently exercised only through `/components/`.

### `docs/overhaul/` is the binding contract, not background reading

Read the relevant doc before changing the thing it governs — these record decisions with reasoning, and several files state explicitly that they and the code must keep saying the same thing.

| Doc                                                    | Governs                                                                                                                 |
|--------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| `component-library.md`                                 | Component inventory, the rules every component obeys, breakpoints, what the a11y and viewport checks do and don't cover |
| `design-direction.md`                                  | What the page looks like; the semantic colour map                                                                       |
| `colour-scheme.md`                                     | Palette tokens **and the computed contrast ratios** — the only contrast check that exists                               |
| `architecture.md`                                      | Stack, CI/CD, hosting, the cutover runbook                                                                              |
| `typography.md`, `content-audit.md`, `design-brief.md` | Font choices, sitemap, purpose and anti-patterns                                                                        |

`scripts/a11y.mjs` and `component-library.md`'s "Accessibility checking" section are explicitly paired: change one, change the other.

### Component rules (from `component-library.md`)

1. Tokens only — no inline hex, font stack, spacing, radius, duration or z-index.
2. Scoped `<style>`. The **only** global CSS is `tokens.css` and the small `is:global` reset in `BaseLayout.astro`.
3. Zero client JS unless earned. The lightbox is the sole exception; the narrow-viewport nav is CSS-only.
4. Colour is never the only cue — every accent-carried distinction is also carried by text, glyph or fill.
5. Decorative chrome takes `aria-hidden="true"` and is not focusable.
6. Visible `:focus-visible` ring, always; never `outline: none` without an equal-contrast replacement.
7. No horizontal scroll at 360px. Non-negotiable.
8. 14px (`--font-size-sm`) is the floor for any text a visitor reads; body copy stays >= 16px.

Breakpoints are literal `px` at each call site (custom properties can't be used in media-query conditions): **360 floor, 640 `sm`, 900 `md`, 1200 `lg`**. Documented once in `component-library.md`; do not vary them per component.

Reduced motion is handled centrally — `tokens.css` collapses the duration tokens to `1ms`. Anything that animates *on its own* (terminal cursor, lightbox entry) must still opt out explicitly.

## CI/CD

- **CI (`ci.yml`) triggers on push/PR to `main` only.** A branch with no PR to `main` gets no build, link check or a11y run.
- Every PR: MegaLinter, CodeQL, dependency review, `astro check` + `astro build`, an internal link check over the built output, and axe-core over the same built output.
- **Deploys happen only from `v*` tags.** No branch push, no manual dispatch, no schedule. The `deploy` job `needs:` all five check jobs. Tags with a SemVer pre-release suffix (`v2.0.0-rc.1`) run the whole pipeline and skip only the deploy — a genuine dry run. Only `dist/` is published, never the repo tree.
- The release pipeline calls the *same* reusable workflows CI does, so tag time holds no surprises.

## Pitfalls

- **`npm run a11y` cannot see contrast, layout, or script behaviour.** jsdom has no layout engine, so `color-contrast` is disabled outright, responsive behaviour is untested, and jsdom cannot execute the site's `<script type="module">` at all. A green run is a structural regression guard on markup/naming/ARIA — never a sign-off. Contrast is verified by hand against the computed ratios in `colour-scheme.md` whenever a token moves.
- **An "incomplete" axe result fails the run, as loudly as a violation** — it means a rule died rather than ran. Fix the cause; only add to `DISABLED_RULES`/`INCOMPLETE_ALLOWLIST` in `scripts/a11y.mjs` with the same evidence `color-contrast` has, never because a rule is inconveniently failing.
- **A scoped `<style>` with a `*` selector silently applies to almost nothing.** Astro scopes it to the component's own template. This exact bug put `.content-col` 32px past the viewport at every breakpoint; the box-sizing reset now lives in `BaseLayout.astro` under `is:global`.
- **CI's TypeScript linting is stricter than `tsc`** (e.g. `strict-boolean-expressions`). Avoid truthiness checks on non-booleans in `.ts` files.
- `.ts` files are written without semicolons and with single quotes; `.astro` frontmatter uses double quotes and semicolons. Match the file you're in.
- `main` has no content collections yet — `architecture.md` describes them as planned for Notes/Interests, and `src/content/` does not exist.
