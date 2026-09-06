/**
 * The syntax accents, as a closed set.
 *
 * `--accent-purple` is deliberately absent: docs/overhaul/colour-scheme.md
 * retains the token but assigns it no meaning in direction `2a`, and says not
 * to press it into service ad hoc. Keeping it out of this union means a
 * component cannot reach for it without that decision being reopened here.
 *
 * The meanings are fixed — see the semantic colour map in
 * docs/overhaul/design-direction.md — so pick by meaning, not by appearance:
 *
 *   blue       interactive: links, secondary CTA outline, terminal `$`
 *   lightblue  metadata and names of things: role titles, breadcrumb tail
 *   teal       types and categories: toolbox categories, cloud/infra, [!info]
 *   yellow     functions and actions: commit hashes, delivery tooling, [!tip]
 *   orange     strings and human content: employers, quoted practice tags
 *   green      asides: git refs, date ranges, terminal `~`
 */
export const ACCENTS = [
  "blue",
  "lightblue",
  "teal",
  "yellow",
  "orange",
  "green",
] as const;

export type Accent = (typeof ACCENTS)[number];

/**
 * The CSS custom property for an accent, for use in an inline `style`
 * binding. Components set a local custom property from this rather than
 * branching in CSS, which keeps one rule per element instead of one per
 * accent:
 *
 *   <span style={`--tag-accent: ${accentVar(accent)}`}>
 *
 * This is not a hard-coded colour: it resolves to a token defined in
 * src/styles/tokens.css, which stays the single source of truth.
 */
export function accentVar(accent: Accent): string {
  return `var(--accent-${accent})`;
}
