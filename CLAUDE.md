# CLAUDE.md

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

`main` is developed from this same working directory, so `.gitignore` and `.mega-linter.yml` exclude `node_modules/`, `dist/` and `.astro/`. v2 build artefacts must never be committed here or deployed.

Conventions: branches `<type>/<issue-number>-<slug>` (e.g. `fix/71-footer-layout-consistency`), every piece of work traces to a GitHub issue. Commits and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/) using only the spec's standard types, and the branch uses the same `<type>`. Issues take whichever repo labels fit best. Labels and commit types are separate: `content`, `design` and `infra` are labels, not commit types.

## Pull requests: draft means unreviewed

Draft and ready-for-review mean different things here, so that the PR list shows William which PRs need his attention.

- **Draft**: posted for visibility. It may be incomplete and nobody has reviewed it. Agents open every PR as a draft (`gh pr create --draft`).
- **Ready for review**: an agent has worked through the checklist below, fixed what it found, and posted a summary, or the change is trivial as defined below. It is now waiting for William. Run `gh pr ready <n>` only at that point, never as part of opening the PR.

A PR that needs a decision from William before it can be finished stays in draft and gets the `needs-william` label.

The review is a separate pass, so that it doesn't share the author's blind spots: a fresh agent, `/code-review`, or a new session. A trivial change skips it and goes straight to ready once CI is green, with a one-line comment saying no agent review was done; William asks for one if he wants it. Trivial is defined by what the PR touches, not by the author's confidence in it: a copy fix confined to text, a dependency version bump, or a docs-only change that alters no page, style, script or workflow. Anything else gets the separate pass.

The review before marking ready:

1. **Scope against the issue.** Check every acceptance criterion in the linked issue against the whole branch tree, not only the diff. A criterion like "no page presents X as current" is usually broken in a file the PR never touched.
2. **Conventions.** The PR title uses a standard Conventional Commits type, since it becomes the squash commit on `master`. Also check the page-structure rules below: byte-identical shared regions, the `.items` `inner` wrapper, and the five places a page lives.
3. **CI** is green on the head commit, MegaLinter included.
4. **Rendering**, for anything that changes what a page looks like. `render.yml` already fails on distorted or broken images and a stuck `is-loading`; it doesn't judge how a page looks. Check at desktop and at phone width (375px). Headless Chrome will not size its window below roughly 500px, so a `--window-size=400,…` screenshot shows clipping that isn't real. Render the page inside a 375px `<iframe>` instead. The scroll-in fades leave off-screen content invisible in a headless capture, so render a throwaway copy with the scripts removed and `*{opacity:1!important}` injected. Only opacity changes, not layout.
5. **Fix what is mechanical; don't decide matters of judgement.** Wording, tone and design choices go to William as questions.
6. **Comment inline where a finding has a line.** A decision left for William goes as an inline review comment on the line it concerns, so it gets its own thread he can answer and resolve. Post it as a `COMMENT` review, since GitHub rejects approve and request-changes from a PR's own author. Inline comments can only target lines in the diff; anything outside it, like the untouched files in step 1, goes in the summary. Fixes already made need no inline comment, since the fix commit would mark it outdated straight away.
7. **Post a summary comment** on the PR covering what was checked, what changed and why (with commit refs), and a list of the decisions left for William, linking the inline threads. If there are none, say so.

## Commands

Node 22 (matching the workflows; there is no `.nvmrc` on this branch).

```sh
npm ci                      # sass + sharp, the only two dependencies
npm run css                 # compile assets/sass/ -> assets/css/main.css
npm run css:check           # rebuild, then fail if the result differs from what's committed
npm run optimize-images -- <dir>   # resize/recompress in place; deploy runs it on _site/images
npm run check-jpeg-eoi      # fail if any images/ JPEG has bytes after its EOI marker
npm run check-canonicals    # fail unless static.yml's allowlist, sitemap.xml and canonicals agree
npm run check-render        # render every page in headless Chrome (CHROME_PATH overrides)
```

No dev server, bundler or test framework. Open the HTML files directly or serve the repo root statically; pages are served as authored.

### Lint hooks

Pre-commit runs from a **project-local** `.venv/`, never a global install:

```sh
uv venv && uv pip install pre-commit && pre-commit install
pre-commit run --all-files          # or .venv\Scripts\pre-commit on Windows
```

The hooks are the fast local subset; full linting is MegaLinter in CI.

## Architecture

Static HTML served as authored. Build-time transforms, none of which runs on the files you edit:

- **Sass → CSS.** `assets/sass/main.scss` compiles to `assets/css/main.css`, which the pages load. **The generated CSS is committed: edit the Sass, never `main.css`.** The pre-commit hook rebuilds it; `css.yml` fails CI if the committed output is stale.
- **Image optimisation.** `scripts/optimize-images.mjs` resizes and recompresses in place (gallery `thumbs/` → 600px, gallery `fulls/` → 2000px, everything else → 1600px). It runs **at deploy time against `_site/images`**, so the full-resolution masters in the repo stay untouched. Never run it against the repo tree.
- **JPEG EOI check.** `scripts/check-jpeg-eoi.mjs` rejects any JPEG under `images/` with bytes after its `FFD9` end-of-image marker. Decoders stop at EOI, so a trailer is invisible except as file size (#101). Enforced by a pre-commit hook on staged files and by `jpeg-eoi.yml` across the whole tree.

`assets/sass/libs/` (skel.io's Sass library, HTML5 UP's mixins and variables, an inlined normalize.css) is vendored source: don't reformat it; it is excluded from stylelint. Breakpoints are declared twice and must agree, `skel-breakpoints` in `assets/sass/main.scss` and `skel.breakpoints` in `assets/js/main.js`: **xlarge 1680, large 1280, medium 980, small 736, xsmall 480, xxsmall 360**, all `max-width`.

JavaScript is jQuery-era, loaded as plain `<script>` tags in a fixed order: jQuery, scrollex, scrolly, skel, util, main. Only `assets/js/main.js` and `assets/js/util.js` are ours; the rest are third-party bundles excluded from `standard` and MegaLinter, so a version bump stays a clean file swap.

### Page structure

Every page is standalone, with no templating or shared partials. The footer, the social links, the inline gate at the top of `<body>` and the `<!-- Scripts -->` block are expected to stay **byte-identical across every page**, so changing any of them means editing every page.

```html
<main id="wrapper" class="divided">   <!-- sections -->   </main>
<footer class="wrapper style1 align-center" id="footer">  ...  </footer>
```

The footer is a **sibling** of `#wrapper`, not a child, so it misses the `#wrapper > *` section divider. `assets/sass/layout/_wrapper.scss` restores it with a deliberately loose `~ footer` rule; the comment there says why.

**Every `<section>` inside a `.items` block must contain a `<div class="inner">` wrapping its whole body.** It is authored into the markup, not generated by JS (#103), and nothing in CI checks for it. A section without it is visible at first paint while its siblings are hidden, and loses its `:last-child` margin reset at `xsmall`.

HTML is 2-space indented.

#### The `is-loading` gate couples every page to `main.js`

A parser-blocking inline script at the top of each `<body>` hides content from first paint:

```html
<script>document.body.classList.add('is-loading')</script>
```

The Sass keys the load-in and scroll-in states of banner, spotlight and gallery off `body.is-loading`, so while it is set most content sits at `opacity: 0`. Only `clearLoading` in `assets/js/main.js` removes it, at `load` + 100ms. **If `main.js` never gets as far as binding `clearLoading`, the page stays blank permanently.** Each script whose absence prevents that binding carries an `onerror` that removes the class:

```html
<script src="assets/js/jquery.min.js" onerror="document.body.classList.remove('is-loading')"></script>
<script src="assets/js/skel.min.js" onerror="document.body.classList.remove('is-loading')"></script>
<script src="assets/js/main.js" onerror="document.body.classList.remove('is-loading')"></script>
```

| Missing script | Effect | Blanks the page? |
| --- | --- | --- |
| `jquery.min.js` | `$(function () { … })` throws, so the ready callback that binds `clearLoading` is never registered | yes |
| `skel.min.js` | `skel.breakpoints` throws at the top of `main.js`, before that registration | yes |
| `main.js` | nothing runs | yes |
| `jquery.scrollex.min.js`, `jquery.scrolly.min.js`, `util.js` | throws only after `clearLoading` is bound | no |

`onerror` covers a failed request (404, network error, blocked by an extension) and reveals content without a fade. It does **not** cover a script that loads and then fails at execution, such as a parse error or an incompatible jQuery. There is deliberately no watchdog timeout (#86, #94): one long enough for slow connections leaves the page blank too long, and its snap reveal is what `clearLoading`'s delay exists to avoid.

Before editing here:

- A new Sass rule keyed on `body.is-loading` widens what a script failure blanks.
- The tagged scripts can't be renamed, moved, or given `async`/`defer` without the gate and `onerror` moving with them.
- Reordering the `<!-- Scripts -->` block can change *which* scripts need `onerror`. The rule is "every script whose absence stops `clearLoading` being bound", not "these three files".

### Adding, renaming or removing a page

A page exists in five places. Miss one and either the deploy drops it or the link check fails:

1. The `.html` file itself.
2. **`.github/workflows/static.yml`**: the `cp` allowlist in "Assemble site artifact". An unlisted page doesn't ship.
3. **`sitemap.xml`**
4. **`sitemap.html`**: the human site map, linked from every footer.
5. **`llms.txt`**

`under_construction.html` is the deliberate exception: deployed, but linked from nothing and absent from all three indexes. `google519c92453ea72bf0.html` is a site-verification stub, intentionally invalid HTML and excluded from linting.

`npm run check-canonicals` (pre-commit hook and `canonicals.yml`) fails unless the allowlist's pages, less those two, match `sitemap.xml`'s `<loc>`s and each page's `rel="canonical"` equals its `<loc>`.

## CI/CD

Besides `css.yml`, `jpeg-eoi.yml` and `canonicals.yml` above, the gate is `mega-linter.yml`, `codeql.yml`, `dependency-review.yml`, `scorecard.yml` and `render.yml`.

- **`render.yml`** runs `scripts/check-render.mjs`: every page in `static.yml`'s allowlist, in the runner's Chrome at desktop and 375px, fails on a broken image, an `<img>` whose attributes or `object-fit: fill` box break its aspect ratio (#105), or `is-loading` left set. It serves the repo tree, where images are unresized masters, so it compares ratios, never sizes.
- **`static.yml` deploys only from `v*` tags** (plus manual dispatch); a push to `master` publishes nothing. It copies an allowlist into `_site/`, then strips `images/will/JPEGs/` and `images/gallery/photographer/product/`: full-resolution originals kept for reference, never served.
- The deploy job disables setup-node's package-manager cache on purpose, because it builds the production artefact. Don't re-enable it. Caching is fine in the CI-only workflows.

## Pitfalls

- **`devDependencies.sass` in `package.json` and `additional_dependencies` in `.pre-commit-config.yaml` must name the exact same version**, both without a caret. Sass versions emit different CSS for identical input, so a mismatch makes the hook and `css.yml` disagree and CI fails on a freshly rebuilt file.
- **`FILTER_REGEX_EXCLUDE` in `.mega-linter.yml` must stay on one line.** A folded YAML scalar joins lines with spaces, so every alternation branch after the first starts with a space and silently matches nothing.
- **lychee failures block the build.** Domains that reject bots are skipped via `.lycheeignore` rather than a global `--accept`, which would mask real breaks. LinkedIn's 999 is the one globally accepted code. `429` is deliberately *not* accepted: the link was never checked, so re-run.
- **Don't put counts in comments** (#82). Describe the thing, not its cardinality.
- `.mjs` files follow `standard`: no semicolons, single quotes. It runs with `--fix --no-ignore`, so vendor bundles are excluded by path; keep that exclude list in step with MegaLinter's.
- `_site/` is gitignored and is what the deploy assembles; a local one isn't authoritative.
