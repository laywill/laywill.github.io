# Component Library

The reusable Astro components implementing design direction `2a`
([#27](https://github.com/laywill/laywill.github.io/issues/27)). This document is
the contract: what each component is for, what it takes, and the rules every one
of them obeys. [design-direction.md](design-direction.md) says *what the page
looks like*; this says *what the parts are called and how they behave*.

It also resolves the two refinements that `design-direction.md` explicitly
deferred here: the gloss vocabulary, and the narrow-viewport form of the
navigation.

## Rules every component obeys

1. **Tokens only.** No hard-coded hex value, font stack, spacing value, radius,
   duration or z-index anywhere outside `src/styles/tokens.css`. If a value is
   missing, add a token — do not inline it.
2. **Scoped styles.** Astro's default scoped `<style>`, not global CSS. The only
   global styles are the token file and the small reset in `BaseLayout.astro`.
3. **Zero client JS unless earned.** Exactly one component ships script: the
   gallery lightbox. Everything else is static HTML and CSS, including the
   narrow-viewport navigation.
4. **Colour is never the only cue.** Every distinction carried by a syntax
   accent is also carried by text, a glyph, or a fill — see the accessibility
   corrections in [design-direction.md](design-direction.md).
5. **Decorative chrome is hidden from assistive technology.** Anything that is
   set dressing rather than content or navigation takes `aria-hidden="true"` and
   is not focusable.
6. **Visible focus, always.** Interactive elements use
   `:focus-visible { outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset); }`.
   Never `outline: none` without a replacement of at least equal contrast.
7. **No horizontal scroll at 360px.** Non-negotiable, from the brief.
8. **14px is the floor for any text a visitor reads.** `--font-size-sm` is
   pinned at `0.875rem` rather than the `0.8rem` the 1.25 ratio would give,
   precisely so the smallest token in the scale is still legal. Accessibility
   correction 2 in [design-direction.md](design-direction.md) allows anything
   smaller only if it is hidden from assistive tech, and no component should
   have to reason about that to pick a size. Body copy remains ≥ 16px.

## Decision: the gloss vocabulary

`design-direction.md` recorded William's steer — *"terminal theming but a glossy
scrollable design"* — and deferred to this issue both what "glossier" means and
whether the flat-colour rule in [colour-scheme.md](colour-scheme.md) survives.

**The flat-colour rule stands. It is not amended.** No gradient fills, of any
colour, anywhere.

Gloss is bought with three things instead, all of them tokenised:

| Lever      | Tokens                                    | Where it is spent                                                                                         |
|------------|-------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| **Depth**  | `--elevation-1/2/3`, `--sheen`            | Panes and the terminal card sit at elevation 1; hover raises interactive surfaces to 2; the lightbox is 3 |
| **State**  | `--bg-highlight`, `--bg-active`           | Hover and active states are a background change, not a glow                                               |
| **Motion** | `--duration-fast/base`, `--ease-standard` | Colour and background changes at 120ms; transform, opacity and elevation at 180ms                         |

`--sheen` is a 1px inset top highlight at 4% white. It is an inset shadow, not a
fill, so it does not breach the flat-colour rule — it reads as a lit top edge on
a raised surface, which is the part of "glossier than the artboard" that flat
colour genuinely cannot supply.

Explicitly still banned, and not reopened by this decision: glow effects,
purple/violet gradients, and drop-shadowed centred card grids. Elevation here is
a hairline of depth on panes that already exist in the layout, not a card
aesthetic.

Reduced motion is handled centrally: `tokens.css` collapses both duration tokens
to `1ms` under `prefers-reduced-motion: reduce`, so no component needs its own
media query for a token-driven transition. Anything that animates *on its own* —
the terminal cursor, the lightbox entry — must still opt out explicitly, because
zeroing a duration is not the same as not running an animation.

## Decision: narrow viewports and the navigation

The explorer sidebar is a desktop form. Below the `md` breakpoint it is replaced
by **a horizontally scrolling editor-tab bar** pinned to the top of the page —
the `1a` motif that `design-direction.md` named as the obvious candidate.

The important part is that this is *one* navigation, rendered twice by CSS, not
two navigations. `Nav.astro` emits a single `<nav>` containing a single list of
the routes in `src/data/nav.ts`; the sidebar and tab-bar forms are
alternate presentations of that same markup, switched at `900px`. There is no
duplicate DOM, so a screen reader never meets the site's navigation twice, and
no JavaScript is involved in the switch.

Consequences, all deliberate:

- **The Outline is desktop-only.** An in-page table of contents that duplicates
  the headings below it earns its space on a wide screen and does not on a
  phone. It is `display: none` below `900px` — removed from the accessibility
  tree with it, since the headings themselves remain reachable.
- **The breadcrumb bar is hidden below `900px`** and is `aria-hidden` at every
  width. It restates sidebar state, which is exactly the case
  `design-direction.md` says may be hidden from assistive technology.
- **The split panes stack, career before toolbox.** Ordered in the DOM that way,
  so the stacking order is the reading order and no `order` property is needed.

## Breakpoints

Custom properties cannot be used in media-query conditions, so breakpoints are
literal `px` values written at each call site. They are documented here once and
must not be varied component by component.

| Name    | Min-width | What changes                                                               |
|---------|-----------|----------------------------------------------------------------------------|
| *floor* | `360px`   | The narrowest supported viewport. No horizontal scroll, ever               |
| `sm`    | `640px`   | Tag rows gain their category-label column; certification badges go to 3-up |
| `md`    | `900px`   | Tab bar becomes the sidebar rail; breadcrumb appears; hero goes two-column |
| `lg`    | `1200px`  | Split panes go side-by-side; gallery grid goes to 3-up                     |

Vertical monitors (typically ≥ `1080px` wide) therefore get the full sidebar
layout, which is the intent.

## Inventory

Paths are under `src/components/`.

### Navigation — `nav/`

| Component          | Purpose                                                                                      |
|--------------------|----------------------------------------------------------------------------------------------|
| `Nav.astro`        | The single site navigation. Renders as an explorer sidebar at `md`+, an editor-tab bar below |
| `Outline.astro`    | In-page table of contents mirroring the current page's headings. Desktop only                |
| `Breadcrumb.astro` | The mono `william-lay › about.md › ## About` line. Decorative, `aria-hidden`                 |

Nav rows come from `src/data/nav.ts` — a typed array of `{ id, file, glyph, accent, href, label }`.
A row whose route does not exist yet is marked `pending: true` and renders as
plain text, not a link: `design-direction.md` requires that `writing/` and
`contact.sh` never ship as dead links.

### Chrome — `chrome/`

| Component         | Purpose                                                                    |
|-------------------|----------------------------------------------------------------------------|
| `StatusBar.astro` | The `--statusbar-blue` footer band, full width including under the sidebar |

Real links and real status are content; `Ln 1, Col 1`, `UTF-8` and the problem
counts are set dressing and are `aria-hidden`. The band's text is fixed at
`--font-size-base`: `#FFFFFF` on `#007ACC` is 4.51:1, clearing AA by 0.01, and
must not be shrunk.

### Layout — `layout/`

| Component          | Purpose                                                                         |
|--------------------|---------------------------------------------------------------------------------|
| `AppShell.astro`   | The page frame: nav rail/tab bar, breadcrumb, content column, status bar        |
| `Section.astro`    | A titled content band with consistent vertical rhythm and a real heading level  |
| `Pane.astro`       | A bordered panel under a `--bg-sidebar` tab header carrying a filename + status |
| `SplitPanes.astro` | The two-column pane arrangement, stacking below `lg`                            |

### UI primitives — `ui/`

| Component        | Purpose                                                                              |
|------------------|--------------------------------------------------------------------------------------|
| `Button.astro`   | CTA pair. `variant="primary"` is a `--statusbar-blue` fill; `"secondary"` an outline |
| `Tag.astro`      | Mono tag pill, coloured by domain, with the domain also named by its row label       |
| `Callout.astro`  | Obsidian-flavoured callout: 3px accent left border over an 8% tint of that accent    |
| `Terminal.astro` | The hero's terminal card: title bar, mono body, static-by-default block cursor       |

The callout tint is derived, not tokenised:
`color-mix(in srgb, var(--accent-teal) 8%, transparent)` — one recipe per
colour-scheme.md, so the tint stays correct if an accent value moves.

`Callout` accepts only `info` (teal) and `tip` (yellow) — the two types the
semantic colour map actually assigns. **Open question for
[#33](https://github.com/laywill/laywill.github.io/issues/33) (Notes):** the
obvious further types have no accent. `warning` in particular has nowhere to
go — orange means "strings and human content", and `--accent-purple` is
deliberately held unassigned. Widening the union is a colour-map decision
first and a component change second, so it is not made here.

### Content components — `content/`

| Component           | Purpose                                                                          |
|---------------------|----------------------------------------------------------------------------------|
| `IconGrid.astro`    | The lokkal-style "toolbox": category rows of icon + label tiles, from typed data |
| `CertBadges.astro`  | Wrapping grid of certification badges on `--bg-sidebar`                          |
| `CareerGraph.astro` | The `git log --graph` career timeline: node gutter, commit line, role, employer  |

Data lives in `src/data/` as typed TypeScript, not in the components:
`toolbox.ts`, `certifications.ts`, `career.ts`. Every entry is placeholder
content until [#28](https://github.com/laywill/laywill.github.io/issues/28)
sources the real thing from the CV.

### Media — `media/`

| Component               | Purpose                                                                      |
|-------------------------|------------------------------------------------------------------------------|
| `ResponsiveImage.astro` | `astro:assets` wrapper: enforced dimensions, required `alt`, `srcset`, lazy  |
| `Gallery.astro`         | Grid of thumbnails; opens a high-resolution rendition in a lightbox on click |

`alt` is a required prop with no default. An image that is genuinely decorative
passes `alt=""` explicitly, which is a deliberate act rather than an omission —
the v1 site shipped no alt text at all and that is the defect being fixed.

The gallery generates two renditions per image from one source: a grid
rendition, and a larger one referenced only by `data-full` and fetched when the
lightbox opens. The high-resolution rendition is never in the initial payload.

## Client JavaScript

One script ships: `src/scripts/lightbox.ts`, loaded by `Gallery.astro`. It is
TypeScript, type-checked by `astro check` like everything else.

Requirements it meets:

- The grid item is a real `<a href>` pointing at the full rendition, not a
  `<button>`. A button that does nothing without JavaScript is a dead control;
  a link degrades to a working navigation. The script upgrades those links into
  lightbox openers, so the lightbox is an enhancement rather than the mechanism.
- The dialog is a native `<dialog>` opened with `showModal()`, which gives focus
  trapping, `Esc` to close and inertness of the rest of the page for free.
- Focus returns to the invoking link on close.
- The full-resolution `src` is assigned on open, so nothing large is fetched
  until a visitor asks for it. Until then the URL exists only in `href` and a
  `data-` attribute — never in an `<img src>`, a preload, or a hidden image.

## Accessibility checking

`npm run a11y` builds nothing itself; it runs
[axe-core](https://github.com/dequelabs/axe-core) over the already-built HTML in
`dist/` using jsdom, and fails on any violation. CI runs it after the build.

Its limits are worth stating plainly, because "passes axe" is easy to overstate:

- jsdom does no layout and no painting, so the `color-contrast` rule cannot run.
  Contrast is instead governed by the computed ratios in
  [colour-scheme.md](colour-scheme.md), which are checked by hand against the
  WCAG formula whenever a token moves.
- Automated checks catch a minority of real accessibility defects in any case.
  They are a regression guard on structure, naming and ARIA, not a substitute
  for keyboard-testing a change.
- Responsive behaviour — the 360px floor, vertical monitors — is not covered.
  It is verified by hand at 360, 640, 900 and 1200px.

## Preview harness

`/components/` renders every component with placeholder content, at every
variant. It exists so the library can be reviewed, and so CI's build and link
check exercise all of it rather than only whatever the landing page happens to
use.

It is marked `noindex, nofollow`. **Open decision for
[#36](https://github.com/laywill/laywill.github.io/issues/36) (cutover): keep it
as living documentation, or delete the route at launch.** It is one file plus
one data import, so either is cheap.
