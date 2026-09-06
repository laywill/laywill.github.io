# Typography

## Typefaces

| Role                                | Face               | Weights  | Rationale                                                                                                                                                                                                                                                                             |
|-------------------------------------|--------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Display / William's name / headings | **Public Sans**    | 700      | Chosen in the design study ([#26](https://github.com/laywill/laywill.github.io/issues/26), candidate `3f`). Neutral grotesque with round dots and a plain `W`; separates the verticals of `William` by spacing rather than by a tail. A deliberate divergence from the CV — see below |
| Body                                | **Lato**           | 400, 700 | Matches the CV body; warm, readable, not part of the Inter/Roboto default-stack cliché. 700 carries role titles in the career timeline                                                                                                                                                |
| Code / IDE motifs                   | **JetBrains Mono** | 400, 500 | Authentic IDE typeface; carries the developer-dark theme in terminal, status-bar, breadcrumb and tag elements. 500 for callout labels                                                                                                                                                 |
| *(retained, unassigned)*            | **Raleway**        | 700      | No longer the display face, but declared in `astro.config.mjs` and kept available: Raleway is the CV's *heading* face, so it is a live candidate for headings as the design iterates past MVP. Nothing references it today                                                            |

The three assigned faces are settled by the design study. Raleway is deliberately inert: nothing aliases it in `tokens.css`, and `BaseLayout.astro` renders no `<Font>` for it, so the build emits no `@font-face` and copies no WOFF2 for it. It costs one provider metadata request at build time and nothing else. Reviving it means adding a `<Font cssVariable="--font-raleway" />` alongside an alias — a two-line change, which is the point of keeping the entry.

Note that a family's presence in `astro.config.mjs` is **not** what puts it on the page: the `<Font>` component in the layout is. Adding a family to the config without a matching `<Font>` leaves its CSS variable undefined and any rule referencing it silently falling back — with no build error.

## CV name treatment

Resolved during the design study. The CV is built from a customised Deedy-Resume class (`deedy-resume-openfont-wjl.cls`) with fonts vendored in that repo's `fonts/` directory, and the class file says something different from what this document previously assumed:

- **The name is Lato Black, not Raleway.** `\namesection` sets it in `Lato-Black` at 40 pt.
- **It is all caps and letterspaced.** `Content/Header.tex` calls it as `WILLIAM LAY`, tracked out with the OpenType `LetterSpace=8` feature (≈ 0.08 em) — as whole words, so PDF text extraction and ATS parsing still read two tokens.
- **It is centred, on one line, over a full-width rule**, in `#2b2b2b`.
- **Raleway's actual role in the CV is headings** — `Raleway-ExtraLight` as the sans face and for dates, `Raleway-Medium` for section headings, position descriptors and locations.

The chosen landing-page direction diverges from all of it:

| Attribute | CV                 | Landing page (option `2a`) |
|-----------|--------------------|----------------------------|
| Face      | Lato Black         | Public Sans 700            |
| Case      | `WILLIAM LAY`      | `William` / `Lay`          |
| Tracking  | ≈ +0.08 em         | −0.02 em                   |
| Alignment | Centred, one line  | Left, two lines            |
| Colour    | `#2b2b2b` on white | `--fg` on `--bg-editor`    |
| Size      | 40 pt              | Top of the display scale   |

William accepted this divergence knowingly when choosing `2a`. It is a deliberate break, not an oversight, and it is wider than the face swap it was originally described as.

**Open for the build ([#28](https://github.com/laywill/laywill.github.io/issues/28)):** whether the hero should echo the CV's caps-and-letterspacing after all. A recruiter often has the CV open beside the site, and a shared name treatment is the cheapest cross-document recognition available. Worth prototyping as a variant — `WILLIAM LAY` in Public Sans 700 at +0.08 em — before the hero is finalised. Note that the brief's ban on uppercase eyebrow labels is about *labels above headings*; it does not forbid an uppercase display name.

## Loading rules

- **Self-host** all fonts as WOFF2 (the old site's render-blocking Google Fonts `@import` is exactly what we're removing). Self-hosting is about what the *visitor's browser* fetches, not about what git tracks — the shipped pages must contain no `fonts.googleapis.com` / `fonts.gstatic.com` reference.
- Loading is owned by [Astro's Fonts API](https://docs.astro.build/en/guides/fonts/), configured in `astro.config.mjs`. Astro emits the `@font-face` rules, fingerprints each file into `/_astro/fonts/` (immutably cacheable) and exposes each family as a CSS variable. `src/styles/tokens.css` maps those onto the semantic `--font-display` / `--font-body` / `--font-mono` roles; components use the semantic names only.
  - The `google` provider, resolved at **build** time: Astro downloads the requested weights/subsets during `astro build` and emits them into our own origin. The binaries are deliberately **not** vendored in git — tracking them buys nothing the provider doesn't already give, costs ~67 kB of repo weight, and has to be re-subset by hand whenever a weight changes. The provider's Latin subsets are also smaller than hand-rolled ones.
  - The build therefore needs network access, which it already does for `npm ci`. A font host outage fails the build loudly rather than degrading the site.
  - Per-family SIL Open Font Licence texts still ship at `public/fonts/LICENSE-*.txt`. Not vendoring the binaries doesn't end that obligation: the built site redistributes the faces, and the OFL requires the licence to travel with them.
- Subset to Latin; only load the weights actually used (target: ≤ 2 weights per family + italic where needed). `subsets: ["latin"]` makes the provider emit the matching `unicodeRange` automatically, so the browser can skip downloads for out-of-range content — don't hand-maintain that range.
- `font-display: swap` (Astro's default) plus real fallback stacks. Ending each `fallbacks` array with a generic family lets Astro generate metric-adjusted fallback faces automatically, which is what actually removes the layout shift on swap.
- Preload the body face on every page and the display face only on pages with a hero above the fold (`preloadDisplay` on `BaseLayout`).
  - `<Font preload>` preloads *every* weight of that family, not just the one a page paints. Lato at 400 and 700 therefore costs two preload requests on every page. That is the price of the bold role titles in the career timeline; if a page never paints bold body copy it is paying for a face it does not use, so revisit this if the weight count grows.

## Scale

Define a modular type scale as CSS custom properties alongside the colour tokens (single tokens file). Exact scale is a design-study output; constraints:

- Body ≥ 16px on mobile.
- Strong size contrast between display and body (Gestalt hierarchy through form, not labels).
- Line length capped ~70ch for prose (Notes pages).

### Hero name, as chosen

From option `2a` — see [design-direction.md](design-direction.md):

- Public Sans 700, set on two lines (`William` / `Lay`), left-aligned.
- `line-height: 0.95`, `letter-spacing: -0.02em`.
- Colour `--fg`, **not** an accent. The name is not a link, so it does not take link blue.
- The mockup sets it at 80px on a fixed 1280px artboard. That is the *proportion* to aim for at desktop width, not a literal token value — the display step in the scale must be set relative to the viewport, and the whole scale needs re-checking against the mockup's mono sizes, which fall below the floors above (see the accessibility corrections in [design-direction.md](design-direction.md)).
