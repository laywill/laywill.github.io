# Colour Scheme — VS Code Dark+ Palette

The site is dark-first, built from the VS Code Dark+ (default dark) theme. These are the source tokens; the design study has mapped them to site semantics — see [design-direction.md](design-direction.md).

## Base tokens

| Token           | Hex       | VS Code role                                                                                                                                                        |
|-----------------|-----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `bg-editor`     | `#1E1E1E` | Editor background — primary page background                                                                                                                         |
| `bg-sidebar`    | `#252526` | Sidebar background — alternate section / panel background                                                                                                           |
| `bg-highlight`  | `#2A2D2E` | Line highlight — hover states, subtle emphasis                                                                                                                      |
| `bg-active`     | `#37373D` | List active-selection background — the current row in the explorer sidebar                                                                                          |
| `border`        | `#3C3C3C` | Panel borders, dividers                                                                                                                                             |
| `border-subtle` | `#2A2A2A` | N/A (not a VS Code role) — the quieter hairline under the breadcrumb bar, where a full `border` would over-divide                                                   |
| `fg`            | `#D4D4D4` | Editor foreground — body text                                                                                                                                       |
| `fg-secondary`  | `#A0A0A0` | N/A (not a VS Code role) — secondary text that must stay legible on panel surfaces; see the contrast notes for why `fg-muted` cannot do this job                    |
| `fg-muted`      | `#858585` | Line numbers — de-emphasised text **on `bg-editor` only**                                                                                                           |
| `fg-on-accent`  | `#FFFFFF` | N/A (not a VS Code role) — text on accent-coloured surfaces, e.g. the status-bar footer                                                                             |
| `fg-display`    | `#D4D4D4` | N/A (not a VS Code role) — the hero name. Option `2a` sets it in plain foreground, not blue; the token stays as the single seam should a future iteration colour it |

## Syntax accent tokens

Use **semantically** (consistent meaning per colour), never decoratively. Meanings below are settled by option `2a`; [design-direction.md](design-direction.md) records where each one lands on the page.

| Token              | Hex       | VS Code role          | Site meaning                                                                                      |
|--------------------|-----------|-----------------------|---------------------------------------------------------------------------------------------------|
| `accent-blue`      | `#569CD6` | Keywords              | Interactive — links, secondary CTA outline, terminal `$`, git-graph spine                         |
| `accent-lightblue` | `#9CDCFE` | Variables, attributes | Metadata and names of things — role titles, current outline heading, breadcrumb tail              |
| `accent-teal`      | `#4EC9B0` | Types, classes        | Types and categories — toolbox category labels, cloud/infra tags, `[!info]` callouts              |
| `accent-yellow`    | `#DCDCAA` | Functions             | Functions and actions — commit hashes, JSON file glyphs, delivery tooling, `[!tip]` callouts      |
| `accent-orange`    | `#CE9178` | Strings               | Strings and human content — employer names, quoted practice tags                                  |
| `accent-green`     | `#6A9955` | Comments              | Asides — git refs, date ranges, terminal `~`                                                      |
| `accent-purple`    | `#C586C0` | Control keywords      | **No meaning assigned.** Unused in `2a`; retained as a token. Do not press it into service ad hoc |
| `statusbar-blue`   | `#007ACC` | Status bar            | Chrome and primary action — status-bar footer, primary CTA fill, active sidebar-row marker        |

## Contrast notes (WCAG AA = 4.5:1 body, 3:1 large text and non-text)

Computed from the WCAG 2.x sRGB relative-luminance formula, not estimated. Earlier revisions of this file carried hand-waved figures that were wrong in both directions; these supersede them.

### Against `#1E1E1E` (`bg-editor`)

| Foreground               | Ratio     | Verdict                                                                                     |
|--------------------------|-----------|---------------------------------------------------------------------------------------------|
| `#D4D4D4` `fg`           | **11.25** | Body text, unrestricted                                                                     |
| `#A0A0A0` `fg-secondary` | **6.38**  | Body text, unrestricted                                                                     |
| `#858585` `fg-muted`     | **4.52**  | Passes by 0.02 — 14px floor, `bg-editor` only                                               |
| `#9CDCFE` lightblue      | **11.18** | Pass                                                                                        |
| `#DCDCAA` yellow         | **11.80** | Pass                                                                                        |
| `#4EC9B0` teal           | **8.18**  | Pass                                                                                        |
| `#CE9178` orange         | **6.31**  | Pass                                                                                        |
| `#C586C0` purple         | **5.99**  | Pass (unused)                                                                               |
| `#569CD6` blue           | **5.65**  | Pass                                                                                        |
| `#6A9955` green          | **5.00**  | Pass — comfortably, contrary to the previous estimate                                       |
| `#3C3C3C` `border`       | **1.51**  | **Fails 1.4.11.** Decorative only — never the sole carrier of a control's boundary or state |

### Against `#252526` (`bg-sidebar`) and other panel surfaces

The sidebar, panel headers, terminal card and certification badges all sit on `#252526`, and the accent tokens keep passing there. One base token does not:

- `#A0A0A0` `fg-secondary` — **5.86:1**, passes.
- `#858585` `fg-muted` — **4.15:1**, **fails AA for normal text.**

`fg-muted` is therefore restricted to `bg-editor`. Anywhere a panel surface needs de-emphasised text — the sidebar's site label and Outline rows, panel header status notes, badge captions — use `fg-secondary`. The mockup gets this wrong; see the accessibility corrections in [design-direction.md](design-direction.md).

### On accent surfaces

- `#D4D4D4` on `#37373D` (`bg-active`, the current sidebar row) — **7.98:1**, pass.
- `#FFFFFF` on `#007ACC` — **4.51:1**, clearing the 4.5:1 threshold by 0.01. Borderline. Treat as fixed at `--font-size-base` (16px) or larger; do not shrink it, and re-measure before nudging either colour.

Re-run these before locking components if any token value changes.

## Rules

- Every colour lives as a CSS custom property in one tokens file; components never hard-code hex values.
- No gradients built from these tokens (flat colour only) — and never violet/purple gradients. The design study did **not** argue for one. It did ask for the shipped page to read "glossier" than the flat mockup, but deferred what that means to the component library ([#27](https://github.com/laywill/laywill.github.io/issues/27)); until that issue amends this rule, flat colour stands.
- **Derive tints, don't add tokens for them.** The callout blocks tint their background with 8 % of their own accent. Express that as `color-mix(in srgb, var(--accent-teal) 8%, transparent)` rather than adding a hex token per accent — one recipe, and the tint stays correct if an accent value ever moves.
- The old site's cyan `#47D3E5` is retired.
- If a light-mode variant is ever added, it is a separate token set; do not auto-derive.
