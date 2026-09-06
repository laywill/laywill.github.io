# Colour Scheme — VS Code Dark+ Palette

The site is dark-first, built from the VS Code Dark+ (default dark) theme. These are the source tokens; the design study maps them to site semantics.

## Base tokens

| Token          | Hex       | VS Code role                                                                                                                                                            |
|----------------|-----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `bg-editor`    | `#1E1E1E` | Editor background — primary page background                                                                                                                             |
| `bg-sidebar`   | `#252526` | Sidebar background — alternate section / panel background                                                                                                               |
| `bg-highlight` | `#2A2D2E` | Line highlight — hover states, subtle emphasis                                                                                                                          |
| `border`       | `#3C3C3C` | Panel borders, dividers                                                                                                                                                 |
| `fg`           | `#D4D4D4` | Editor foreground — body text                                                                                                                                           |
| `fg-muted`     | `#858585` | Line numbers — secondary text                                                                                                                                           |
| `fg-on-accent` | `#FFFFFF` | N/A (not a VS Code role) — text on accent-coloured surfaces, e.g. the status-bar footer                                                                                 |
| `fg-display`   | `#569CD6` | N/A (not a VS Code role) — decorative hero/display-name colour; deliberately separate from `accent-blue` so "blue means clickable" stays true for the interactive token |

## Syntax accent tokens

Use **semantically** (consistent meaning per colour), never decoratively.

| Token              | Hex       | VS Code role          | Candidate site meaning                                                                                               |
|--------------------|-----------|-----------------------|----------------------------------------------------------------------------------------------------------------------|
| `accent-blue`      | `#569CD6` | Keywords              | Primary links / interactive                                                                                          |
| `accent-lightblue` | `#9CDCFE` | Variables, attributes | Secondary links, metadata                                                                                            |
| `accent-teal`      | `#4EC9B0` | Types, classes        | Skills / technology tags                                                                                             |
| `accent-yellow`    | `#DCDCAA` | Functions             | Actions, highlights                                                                                                  |
| `accent-orange`    | `#CE9178` | Strings               | Quotes, human/narrative content                                                                                      |
| `accent-green`     | `#6A9955` | Comments              | Asides, timestamps, de-emphasis                                                                                      |
| `accent-purple`    | `#C586C0` | Control keywords      | Use sparingly — see anti-patterns (no purple *gradients*; flat token use is acceptable if the design study keeps it) |
| `statusbar-blue`   | `#007ACC` | Status bar            | Footer / status-bar motif, primary CTA candidate                                                                     |

## Contrast notes (against `#1E1E1E`, WCAG AA = 4.5:1 body, 3:1 large text)

- `#D4D4D4` ≈ 11.9:1 — fine for body text.
- `#858585` ≈ 4.6:1 — passes body AA, but only just; don't shrink it below 14px.
- `#569CD6` ≈ 5.8:1, `#9CDCFE` ≈ 9.9:1, `#4EC9B0` ≈ 8.6:1, `#DCDCAA` ≈ 10.5:1, `#CE9178` ≈ 6.4:1 — all pass for text.
- `#6A9955` ≈ 4.5:1 — borderline; treat as large-text/decoration only, or lighten when used for small text.
- White text on `#007ACC` measured at **4.51:1** — clears AA's 4.5:1 normal-text threshold by 0.01, i.e. it is borderline. Treat as fixed at `--font-size-base` (16px) or larger, matching the 14px floor this doc already sets for `#858585`; do not shrink it further, and re-measure before nudging either colour.

Ratios above are approximate — re-verify programmatically in the design-tokens issue before locking components.

## Rules

- Every colour lives as a CSS custom property in one tokens file; components never hard-code hex values.
- No gradients built from these tokens (flat colour only) unless the design study explicitly argues for one — and never violet/purple gradients.
- The old site's cyan `#47D3E5` is retired.
- If a light-mode variant is ever added, it is a separate token set; do not auto-derive.
