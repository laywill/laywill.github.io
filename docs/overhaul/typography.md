# Typography

## Typefaces

| Role                                | Face               | Rationale                                                                                                                                        |
|-------------------------------------|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| Display / William's name / headings | **Raleway**        | Matches the CV (Deedy-Resume-derived template in [laywill/cv](https://github.com/laywill/cv)); name treatment should visually echo the CV header |
| Body                                | **Lato**           | Matches the CV body; warm, readable, not part of the Inter/Roboto default-stack cliché                                                           |
| Code / IDE motifs                   | **JetBrains Mono** | Authentic IDE typeface; carries the developer-dark theme; used for terminal/status-bar/tag elements                                              |

These are a deliberate default, not a sacred one — the E3 design study may argue for changes, but any replacement must (a) keep the name treatment consistent with the CV, and (b) avoid the generic system-sans look.

## CV name treatment

The CV is built from a customised Deedy-Resume class (`deedy-resume-openfont-wjl.cls`) with fonts vendored in the repo's `fonts/` directory. **Before building the hero, check the actual class file** for the exact faces/weights/case used for "William Lay" (likely a light/thin weight with a heavier surname or small-caps treatment) and mirror it on the site. Track this in the E3 design-study issue.

## Loading rules

- **Self-host** all fonts as WOFF2 in the repo (the old site's render-blocking Google Fonts `@import` is exactly what we're removing).
- Loading is owned by [Astro's Fonts API](https://docs.astro.build/en/guides/fonts/), configured in `astro.config.mjs`, using the `local` provider against WOFF2 files vendored in `src/assets/fonts/`. Astro emits the `@font-face` rules, fingerprints each file into `/_astro/fonts/` (immutably cacheable) and exposes each family as a CSS variable. `src/styles/tokens.css` maps those onto the semantic `--font-display` / `--font-body` / `--font-mono` roles; components use the semantic names only.
  - The `local` provider, not `google`/`fontsource`: builds stay hermetic (no build-time fetch from a font CDN) and the vendored files are auditable in-repo. Per-family SIL Open Font Licence texts ship at `public/fonts/LICENSE-*.txt`, since the built site redistributes the faces.
- Subset to Latin; only load the weights actually used (target: ≤ 2 weights per family + italic where needed). Declare the subset's `unicodeRange` in the font config so the browser can skip downloads for out-of-range content.
- `font-display: swap` (Astro's default) plus real fallback stacks. Ending each `fallbacks` array with a generic family lets Astro generate metric-adjusted fallback faces automatically, which is what actually removes the layout shift on swap.
- Preload the body face on every page and the display face only on pages with a hero above the fold (`preloadDisplay` on `BaseLayout`).

## Scale

Define a modular type scale as CSS custom properties alongside the colour tokens (single tokens file). Exact scale is a design-study output; constraints:

- Body ≥ 16px on mobile.
- Strong size contrast between display and body (Gestalt hierarchy through form, not labels).
- Line length capped ~70ch for prose (Notes pages).
