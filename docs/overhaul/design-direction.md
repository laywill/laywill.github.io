# Design Direction — Option 2a

## Status

**Chosen.** William selected option `2a` from the landing-page design study ([#26](https://github.com/laywill/laywill.github.io/issues/26)), confirmed in [this comment](https://github.com/laywill/laywill.github.io/issues/26#issuecomment-5562538859):

> Idea 2a is the winner so far, with terminal theming but a glossy scrollable design. We may need to continue to refine, but this is what I want to build to begin with.

The mockup artefact (a Claude Design canvas, `William Lay Landing Options.dc.html`) is attached to that comment rather than committed here — it needs a 69 kB vendored runtime to render, which buys nothing the decisions recorded below don't already carry.

This document is the decision record. Where it disagrees with the mockup, this document wins; where it is silent, the mockup is the reference. The mockup's *content* is placeholder throughout — `[Company A]`, invented metrics, made-up certifications. **None of it is real copy.** Copy is [#28](https://github.com/laywill/laywill.github.io/issues/28), sourced from [laywill/cv](https://github.com/laywill/cv) `body.tex`.

## Why 2a

The study ran three layout strategies, then combined the strongest part of each:

- **Explorer sidebar** from `1b` — persistent structure and wayfinding without a labelled nav bar.
- **Two-column hero with a terminal** from `1a` — the name and CTA get the left column; the terminal earns its place by carrying the positioning statement in a second voice.
- **Split panes** from `1c` — career and toolbox side by side rather than stacked, so the proof is visible without scrolling past the fold twice.

Layout does the work here, not decoration: the sidebar *is* the navigation, the git graph *is* the career narrative, the tag rows *are* the toolbox. That satisfies the diagram-first principle in [design-brief.md](design-brief.md) without a single labelled section header.

## Page structure

Six bands, top to bottom. Proportions are given as ratios, because the mockup artboard is a fixed 1280 px canvas and is not the shipped type scale — see [Accessibility corrections](#accessibility-corrections-to-the-mockup).

### 1. Explorer sidebar

Fixed-width left rail on `--bg-sidebar`, separated by a `--border` hairline, set in `--font-mono`.

- Site identity (`williamlay.co.uk`) as a muted label at the top.
- A collapsible root row (`william-lay`), then the file list, each row prefixed by a syntax-coloured file-type glyph:

  | Row             | Glyph | Glyph colour      | Destination                                                                       |
  |-----------------|-------|-------------------|-----------------------------------------------------------------------------------|
  | `about.md`      | `≡`   | `--accent-blue`   | Landing page (active)                                                             |
  | `experience.ts` | `TS`  | `--accent-teal`   | Professional page ([#29](https://github.com/laywill/laywill.github.io/issues/29)) |
  | `toolbox.json`  | `{}`  | `--accent-yellow` | Toolbox section                                                                   |
  | `certs.json`    | `{}`  | `--accent-yellow` | Certifications section                                                            |
  | `writing/`      | `"`   | `--accent-orange` | Notes ([#32](https://github.com/laywill/laywill.github.io/issues/32))             |
  | `contact.sh`    | `$`   | `--accent-orange` | Contact                                                                           |

- The active row takes a `--bg-active` fill **and** a 2 px `--statusbar-blue` left marker — two cues, not one.
- Below a divider, an **Outline** group mirrors the current page's headings (`## About`, `### Career`, `### Toolbox`, `### Certifications`, `### Open to`), current heading in `--accent-lightblue`, the rest muted.

The file list is real navigation and must be marked up as such. The Outline is a real in-page table of contents. Neither is decoration.

### 2. Breadcrumb bar

A single mono line above the content — `william-lay › about.md › ## About` — with the trailing segment in `--accent-lightblue`, the current file in `--fg`, separators and ancestors muted, closed by a `--border-subtle` hairline. It reflects sidebar state, so if it merely repeats the same links it may be hidden from assistive tech.

### 3. Hero

Two columns, roughly `1.1fr / 1fr`, generously padded.

**Left column:**

- The name, set on two lines, in `--font-display` — see [typography.md](typography.md) for the full treatment and the open question about echoing the CV.
- A lead paragraph one step above body size, with the role nouns syntax-coloured semantically: DevOps practitioner in `--accent-teal` (a type), agile coach in `--accent-yellow` (a function), engineering leader in `--accent-lightblue` (a variable).
- The CTA pair, side by side: **Connect on LinkedIn** as a solid `--statusbar-blue` button with `--fg-on-accent` text; **Download CV** as a `--accent-blue` outline button. Each carries a small mono glyph. Primary and secondary are distinguished by fill versus outline, not by colour alone.

**Right column — the terminal card.** `--bg-sidebar` on a `--border` frame, with a title bar (three neutral `--border` dots — deliberately *not* traffic-light colours — plus `bash — ~/william`) and a mono body at relaxed line height:

```text
~ $ whoami
william.lay

~ $ cat roles.txt
engineer → devops → coach → "leader"

~ $ uptime
16 years in production

~ $ █
```

Prompt `~` in `--accent-green`, `$` in `--accent-blue`; the roles line runs lightblue → teal → yellow → orange, with `"leader"` quoted as a string because it is the one title that is a claim rather than a fact. The block cursor is static, or animates only outside `prefers-reduced-motion`.

The terminal restates the positioning in a second register. It must never be the *only* place a fact appears.

### 4. Split panes

Two panes side by side, roughly `1.15fr / 1fr`, each under a short `--bg-sidebar` tab header carrying a filename and a right-aligned status note.

**Left — `experience.ts`, headed `git log --graph`.** Career as a commit graph: a gutter of coloured nodes joined by an `--accent-blue` spine, newest at top. Each entry is

- a mono line — short hash in `--accent-yellow`, then ref and date range in `--accent-green`: `(HEAD → main, 2023–present)`, `(merge: coaching → management, 2019–2023)`, `(branch: devops, 2015–2019)`, `(initial commit, 2010–2015)`;
- the role in `--font-body` bold, `--accent-lightblue`;
- the employer in `--accent-orange`;
- one outcome line in `--fg-secondary`.

The git metaphor carries real information — a merge for the coaching-into-management transition, a branch for the move into DevOps — rather than being applied uniformly. Keep it that way or drop it.

**Right — `toolbox.json` above `certs.json`.** Two stacked panes sharing a column.

- Toolbox: category label in `--accent-teal` on the left, tag pills wrapping on the right. Pills are bordered and mono, coloured by domain — languages `--accent-blue`, cloud and infrastructure `--accent-teal`, delivery tooling `--accent-yellow`, practices `--accent-orange` and rendered in quotes as strings. Category is carried by the row label as well as by colour, so nothing depends on colour alone.
- Certifications: a wrapping grid of square badges on `--bg-sidebar`, each a short mono abbreviation over a caption. Real badge artwork is [#28](https://github.com/laywill/laywill.github.io/issues/28) / [#30](https://github.com/laywill/laywill.github.io/issues/30); the mockup's are placeholders.

### 5. Callout row

Obsidian-flavoured callouts at roughly `2fr / 1fr`, each a 3 px accent left border over an 8 % tint of the same accent:

- `[!info] Currently` in `--accent-teal` — current role plus what William is open to.
- `[!tip] Fast path` in `--accent-yellow` — the CV download, restated for anyone who skipped the hero.

Label in `--font-mono` at medium weight, body in `--font-body`. This is the same callout vocabulary the Notes pages will use ([#33](https://github.com/laywill/laywill.github.io/issues/33)) — define it once.

### 6. Status-bar footer

A short `--statusbar-blue` band spanning the full width, *including under the sidebar*, in `--fg-on-accent` mono: branch, sync, problem counts, then right-aligned `Ln 1, Col 1`, `UTF-8`, `Markdown`, `williamlay.co.uk`, theme glyph.

Anything here that is not a real link or a real status is decorative and hidden from assistive tech.

## Semantic colour map

Settled by 2a. The full token table lives in [colour-scheme.md](colour-scheme.md).

| Token                | Meaning in 2a                                                                            |
|----------------------|------------------------------------------------------------------------------------------|
| `--accent-blue`      | Interactive: links, secondary CTA outline, terminal `$`, git-graph spine, `.md` glyph    |
| `--accent-lightblue` | Metadata and names of things: role titles, current outline heading, breadcrumb tail      |
| `--accent-teal`      | Types and categories: toolbox category labels, cloud/infra tags, `.ts` glyph, `[!info]`  |
| `--accent-yellow`    | Functions and actions: commit hashes, `{}` glyphs, delivery tooling, `[!tip]`            |
| `--accent-orange`    | Strings and human content: employer names, quoted practices, `writing/` and `.sh` glyphs |
| `--accent-green`     | Comments and asides: git refs, date ranges, terminal `~`                                 |
| `--statusbar-blue`   | Chrome and primary action: status bar, primary CTA fill, active-row marker               |
| `--accent-purple`    | **Unused in 2a.** Token retained, no meaning assigned. Do not introduce one ad hoc.      |

## Motifs: in and out

This resolves the candidate list in [design-brief.md](design-brief.md).

**In:** status-bar footer; explorer sidebar and breadcrumb as navigation; syntax-coloured tags; the terminal card; Obsidian callouts; the git-graph timeline.

**Out for the landing page:** editor tabs as primary navigation — the sidebar replaced them, though they may return as the narrow-viewport form (see below); `[[wikilink]]` styling and the graph view, which belong to Notes ([#33](https://github.com/laywill/laywill.github.io/issues/33)).

## Glossy and scrollable, not an IDE emulator

William's steer on the chosen direction: *"terminal theming but a glossy scrollable design."* Two constraints follow, and both are binding.

**The chrome is a motif, not an application.** The page scrolls as a normal document. The sidebar, breadcrumb and status bar are framing that reads as an IDE; they do not emulate one. No fake panes with independent scroll, no resizable splitters, no tab management, no interaction that only makes sense inside a real editor. If a visitor cannot tell what a control does without knowing VS Code, it does not ship.

**The shipped page should carry more polish than the artboard,** which is deliberately austere. But what "glossier" means concretely is *not settled*, and is deferred to the component library ([#27](https://github.com/laywill/laywill.github.io/issues/27)). That issue needs to define the depth, elevation and transition vocabulary, and to decide whether the flat-colour rule in [colour-scheme.md](colour-scheme.md) is amended or upheld. Until it does, that rule stands. The anti-patterns in [design-brief.md](design-brief.md) are not up for renegotiation under the heading of gloss: no glow, no purple or violet gradients, no drop-shadowed centered card grids.

## Accessibility corrections to the mockup

The mockup is a visual study, not an accessible artefact. These defects must not be carried into the build. Ratios are recomputed against the WCAG 2.x sRGB formula — see [colour-scheme.md](colour-scheme.md).

1. **`--fg-muted` (`#858585`) fails AA on `--bg-sidebar`** at 4.15:1, below the 4.5:1 normal-text threshold. The mockup uses it there for the site label and the Outline rows. Use `--fg-secondary` (`#A0A0A0`, 5.86:1 on `#252526`) for small text on sidebar and panel surfaces, and keep `--fg-muted` to `--bg-editor`, where it manages 4.52:1.
2. **The mockup's mono sizes (11.5–12.5 px) sit below both floors** — the 14 px minimum colour-scheme.md sets for muted text, and the 16 px body minimum in [typography.md](typography.md). The artboard is a fixed 1280 px canvas, so these are not literally the shipped scale; the component library must scale them up, or confine anything that small to genuinely decorative content that is hidden from assistive tech.
3. **`--border` (`#3C3C3C`) is 1.51:1 against `--bg-editor`**, far below the 3:1 non-text minimum (WCAG 1.4.11). A border may never be the sole indicator of a control or of its state. The active sidebar row is compliant because it also carries a fill and an accent marker; tag pills are compliant because their text carries the meaning.
4. **The terminal cursor must not blink** unless the animation is disabled under `prefers-reduced-motion`.
5. **Decorative chrome is hidden from assistive tech.** `Ln 1, Col 1`, `UTF-8` and the problem counts are set dressing. A screen-reader user should reach navigation, hero, career, toolbox, certifications, callouts and footer — not a recitation of a fake editor's state.
6. **Never rely on the syntax colours alone.** Every category distinction in the toolbox and the git graph is also carried by a text label. Keep that invariant as the content changes.

## Open refinements

Carried into [#27](https://github.com/laywill/laywill.github.io/issues/27) (components) and [#28](https://github.com/laywill/laywill.github.io/issues/28) (copy and build).

- **Hero name versus the CV.** 2a sets the name in mixed case with tight tracking; the CV sets it in caps with wide tracking. Worth trying a CV-echoing variant during the build — see [typography.md](typography.md).
- **Gloss vocabulary.** As above: depth, elevation, transitions, and the fate of the flat-colour rule. [#27](https://github.com/laywill/laywill.github.io/issues/27).
- **Narrow viewports.** The mockup is desktop-only. The sidebar has to become something else below the medium breakpoint — collapsing to editor tabs (option `1a`'s motif) is the obvious candidate, but it is undecided. The split panes stack, and the stacking order matters: career before toolbox. Non-negotiable: no horizontal scroll at 360 px.
- **Above-the-fold budget.** The brief requires the LinkedIn CTA visible without scrolling on mobile. A sidebar, a breadcrumb, a two-line name and a lead paragraph is a lot of vertical space to spend before reaching it.
- **Sidebar entries that do not exist yet.** `writing/` needs Notes ([#32](https://github.com/laywill/laywill.github.io/issues/32)); `contact.sh` needs a contact route. Neither ships as a dead link.
- **Terminal copy.** `uptime` claims 16 years — verify against the CV before it ships. [#28](https://github.com/laywill/laywill.github.io/issues/28).
