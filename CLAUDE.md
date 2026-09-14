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

| Branch   | What it is                                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `master` | **This branch.** The v1 site — a 2017 HTML5 UP "Story" template, hand-edited since. Serves the live site at williamlay.co.uk.     |
| `main`   | The v2 Astro rebuild. **Orphan branch — shares no history with `master`.** Different stack, different tooling, its own CLAUDE.md. |

Everything below describes `master`. Branch off `master` and PR back into `master`. A `no-commit-to-branch` pre-commit hook blocks direct commits to both `master` and `main`.

`main` is developed from this same working directory, which is why `.gitignore` carries `node_modules/`, `dist/` and `.astro/` and `.mega-linter.yml` excludes them — v2 build artefacts must never be committed here or published by the Pages deploy.

Conventions: branches `<type>/<issue-number>-<slug>` (e.g. `fix/71-footer-layout-consistency`), [Conventional Commits](https://www.conventionalcommits.org/), every piece of work traces to a GitHub issue.

## Commands

Node 22 (matching the workflows; there is no `.nvmrc` on this branch).

```sh
npm ci                      # sass + sharp, the only two dependencies
npm run css                 # compile assets/sass/ -> assets/css/main.css
npm run css:check           # rebuild, then fail if the result differs from what's committed
npm run optimize-images -- <dir>   # resize/recompress in place; deploy runs it on _site/images
```

There is no dev server, no bundler and no test framework. Open the HTML files directly, or serve the repo root with any static server — the pages are served exactly as authored.

### Lint hooks

Pre-commit runs from a **project-local** `.venv/`, never a global install:

```sh
uv venv && uv pip install pre-commit && pre-commit install
pre-commit run --all-files          # or .venv\Scripts\pre-commit on Windows
```

The hooks are the fast local subset (`standard` for JS, the CSS rebuild, whitespace/YAML checks); full linting is MegaLinter in CI.

## Architecture

Static HTML served as authored. Two build-time transforms exist, and neither runs on the files you edit:

- **Sass → CSS.** `assets/sass/main.scss` compiles to `assets/css/main.css`, which is the file the pages load. **The generated CSS is committed.** Edit the Sass, never `main.css`. The pre-commit hook rebuilds it so the reviewed commit already contains the right output, and `css.yml` is the backstop for commits made with `--no-verify` or through the web UI.
- **Image optimisation.** `scripts/optimize-images.mjs` resizes and recompresses in place, with path-based rules (gallery `thumbs/` → 600px, gallery `fulls/` → 2000px, everything else → 1600px). It runs **at deploy time against `_site/images`**, so the full-resolution masters committed to the repo stay untouched. Never run it against the repo tree.

`assets/sass/libs/` is skel.io's own Sass library plus HTML5 UP's mixins and variables, including an inlined normalize.css. It is vendored source — not ours to reformat, and excluded from stylelint. `_vars.scss` holds the palette, sizes and durations; `libs/_skel.scss` supplies the breakpoint and layout mixins. Breakpoints are declared twice and must agree: `assets/sass/main.scss` (`skel-breakpoints`) and `assets/js/main.js` (`skel.breakpoints`) — **xlarge 1680, large 1280, medium 980, small 736, xsmall 480, xxsmall 360**, all `max-width`.

JavaScript is jQuery-era and loaded as plain `<script>` tags in a fixed order: jQuery, scrollex, scrolly, skel, util, main. Only `assets/js/main.js` and `assets/js/util.js` are ours; the rest are third-party bundles shipped as published and deliberately excluded from both the `standard` hook and MegaLinter, so a version bump stays a clean file swap rather than a swap plus a reformat.

### Page structure

Every page is standalone — there is no templating, no includes, no shared header/footer partial. **A change to the footer or the social links is a 15-file edit**, and the pages are expected to stay byte-identical in those regions. The same holds for the two script regions — the inline pre-paint gate at the top of `<body>` and the `<!-- Scripts -->` block at the bottom — which are coupled to each other and to `assets/js/main.js`; see below.

The skeleton every page follows:

```html
<main id="wrapper" class="divided">   <!-- sections -->   </main>
<footer class="wrapper style1 align-center" id="footer">  ...  </footer>
```

The footer is a **sibling** of `#wrapper`, not a child. `assets/sass/layout/_wrapper.scss` gives `#wrapper > *` the 1px inset rule that separates sections, which the footer therefore misses; it is restored by a `~ footer` rule — keyed on the tag rather than `#footer` so it survives an id change, and using `~` rather than `+` so inserting anything between the two doesn't silently drop it.

The `.items` grid carries a structural rule of its own: **every `<section>` inside a `.items` block must contain a `<div class="inner">` wrapping its whole body.** `main.js` used to build that wrapper with `wrapInner` inside its ready callback, so it did not exist at first paint and the CSS gating the fade had nothing to match — the grid painted at full opacity, blanked when the JS ran, then faded (#103). It is now authored into the markup, which means nothing generates it and nothing in CI checks for it. A section missing its wrapper is visible while its siblings are still hidden, and loses its `:last-child` margin reset at the `xsmall` breakpoint.

HTML is 2-space indented. djlint runs with `profile: html` and ignores `H021` (inline styles — the Pexels/Unsplash credit badges carry them) and `H023` (entity references).

#### The `is-loading` gate couples every page to `main.js`

A parser-blocking inline script at the top of each `<body>`, before the banner is parsed, asserts the hidden state at first paint:

```html
<script>document.body.classList.add('is-loading')</script>
```

`body.is-loading` is not cosmetic. The Sass hangs the load-in and scroll-in selectors off it across banner, spotlight and gallery, so while the class is set most of the page's content sits at `opacity: 0`. Nothing in the CSS ever takes it off again — `clearLoading` in `assets/js/main.js` does, at `load` + 100ms. The gate is therefore a hard runtime dependency: **if `main.js` never runs, the page stays blank, permanently.**

The recovery is an `onerror` on each script whose failure would leave the class set:

```html
<script src="assets/js/jquery.min.js" onerror="document.body.classList.remove('is-loading')"></script>
<script src="assets/js/skel.min.js" onerror="document.body.classList.remove('is-loading')"></script>
<script src="assets/js/main.js" onerror="document.body.classList.remove('is-loading')"></script>
```

Three of the six, not one, and which three follows from `main.js`'s own shape. It is `(function ($) { skel.breakpoints(…); $(function () { … }) })(window.jQuery)`, and the `load` handler that runs `clearLoading` is bound early inside that ready callback — before the `scrollex`, `scrolly` and `placeholder` calls that need the remaining plugins:

| Missing script | What happens | Blanks the page? |
| --- | --- | --- |
| `jquery.min.js` | `$` is `undefined`, so `$(function () { … })` throws and the ready callback is never registered | yes |
| `skel.min.js` | `skel.breakpoints` throws at the top of the IIFE, before the same registration | yes |
| `main.js` | nothing runs at all | yes |
| `jquery.scrollex.min.js`, `jquery.scrolly.min.js`, `util.js` | throws, but only after `clearLoading` is already bound to `load` | no, the page still reveals |

`onerror` fires when the request for the script fails — 404, network error, blocked by an extension — and reveals the content immediately. The reveal snaps rather than fades, deliberately: `main.js` is the transition machinery, so in this path there is nothing left to fade with, and content on screen beats content styled on its way in.

`onerror` does **not** fire when a script arrives and then fails at execution — a parse error, or a jQuery served successfully but too old for the calls `main.js` makes. Those remain uncovered. There is no watchdog timeout and deliberately so: a timeout generous enough not to fire on a slow connection is also slow enough to leave the page blank for a long time, and removing `is-loading` in a single style recalc reveals content with a snap, which is exactly what `clearLoading`'s 100ms delay exists to avoid (#86, #94).

So, before editing here:

- A new Sass rule keyed on `body.is-loading` widens what a script failure blanks. That is the cost of adding one.
- None of the three tagged scripts can be renamed, moved, or given `async`/`defer` without the inline gate and its `onerror` moving too.
- Reordering the `<!-- Scripts -->` block can change *which* scripts need the attribute. The rule is not "these three files" but "every script whose absence stops `clearLoading` from being bound".
- Anything that makes `clearLoading` unreachable once the scripts have loaded brings the blank page back, and `onerror` will not catch it.

### Adding, renaming or removing a page

A page exists in five places. Miss one and either the deploy drops it or the link check fails:

1. The `.html` file itself.
2. **`.github/workflows/static.yml`** — the `cp` allowlist in "Assemble site artifact". The deploy publishes an explicit list, not the tree; an unlisted page simply doesn't ship.
3. **`sitemap.xml`** — the machine sitemap.
4. **`sitemap.html`** — the human site map, linked from every footer.
5. **`llms.txt`** — the LLM-facing index.

`under_construction.html` is the one deliberate exception: deployed, but linked from nothing and absent from all three indexes. `google519c92453ea72bf0.html` is a site-verification stub, intentionally not valid HTML, and excluded from linting.

## CI/CD

- **`css.yml`** (push/PR to `master`): rebuilds `main.css` from the Sass and fails if it differs from the commit.
- **`mega-linter.yml`, `codeql.yml`, `dependency-review.yml`, `scorecard.yml`**: the rest of the gate. MegaLinter runs actionlint/zizmor, stylelint, HTML linting, `standard`, JSON/YAML, secret scanning, cspell and lychee.
- **`static.yml` deploys only from `v*` tags** (plus manual dispatch). A push to `master` runs the checks and publishes nothing, matching `main`'s tag-gated release. The deploy job copies an allowlist into `_site/`, then strips `images/will/JPEGs/` and `images/gallery/photographer/product/` — full-resolution originals kept in the repo for reference but never served.
- The deploy job deliberately disables setup-node's package-manager cache (`package-manager-cache: false`, not just omitting `cache: npm` — v7 enables it heuristically). It builds the production artefact; a poisoned cache would poison the artefact. Caching is fine in the CI-only workflows.

## Pitfalls

- **`devDependencies.sass` in `package.json` and `additional_dependencies` in `.pre-commit-config.yaml` must name the exact same version**, both pinned without a caret. Different sass versions emit different CSS for identical input (1.104.0 writes `-0rem` where 1.83.0 wrote `0rem`), so a mismatch makes the hook and `css.yml` disagree about correct output and CI fails on a file that was just rebuilt. Bump both together.
- **`FILTER_REGEX_EXCLUDE` in `.mega-linter.yml` must stay on one line.** A YAML folded scalar joins lines with spaces, which silently breaks a regex alternation — every branch after the first starts with a space and matches nothing. That is how `font-awesome.min.css` and the Google verification stub ended up being linted.
- **lychee failures block the build.** Domains that blanket-reject bots (`unsplash.com`, `pexels.com`) are skipped via `.lycheeignore` rather than accepted globally, because `--accept` has no per-domain form and a blanket accept would mask a real break. LinkedIn's HTTP 999 is the one globally accepted code, justified in the config. `429` is deliberately *not* accepted — it means the link was never checked; a throttled run fails fast and names the URL, so re-run it.
- **Don't put counts in comments.** A "six pages" comment in `.mega-linter.yml` went stale at 15 (#82). Describe the thing, not its cardinality.
- `.ts`/`.mjs` files follow `standard`: no semicolons, single quotes. `standard` runs with `--fix --no-ignore`, so vendor bundles are excluded by path — keep that exclude list in step with MegaLinter's.
- `_site/` is gitignored (Jekyll-era rule) and is what the deploy assembles; don't create one locally and expect it to be authoritative.
