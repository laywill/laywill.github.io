/**
 * nav.ts — the single source of truth for the site's navigation rows
 * (docs/overhaul/design-direction.md, "1. Explorer sidebar"; the table
 * under docs/overhaul/component-library.md, "Navigation — nav/").
 *
 * Nav.astro renders this list twice by CSS (sidebar at >=900px, editor-tab
 * bar below it) but reads it once — see the "narrow viewports" decision in
 * component-library.md for why there is exactly one <nav> and one array.
 */
import type { Accent } from "../lib/accents";

export interface NavEntry {
  /** Stable key used to mark the active row. */
  id: string;
  /** The filename shown in the row, e.g. "about.md". */
  file: string;
  /** File-type glyph, e.g. "≡", "TS", "{}", "\"", "$". */
  glyph: string;
  /** Glyph colour, semantic per the colour map. */
  accent: Accent;
  href: string;
  /** Accessible name for the destination, e.g. "About". */
  label: string;
  /** Route does not exist yet: render as plain text, never a dead link. */
  pending?: boolean;
}

export const NAV: readonly NavEntry[] = [
  {
    id: "about",
    file: "about.md",
    glyph: "≡",
    accent: "blue",
    href: "/",
    label: "About",
  },
  {
    id: "experience",
    file: "experience.ts",
    glyph: "TS",
    accent: "teal",
    href: "/professional/",
    label: "Experience",
    // The professional page is issue #29 and does not exist yet.
    pending: true,
  },
  {
    id: "toolbox",
    file: "toolbox.json",
    glyph: "{}",
    accent: "yellow",
    href: "#toolbox",
    label: "Toolbox",
  },
  {
    id: "certs",
    file: "certs.json",
    glyph: "{}",
    accent: "yellow",
    href: "#certifications",
    label: "Certifications",
  },
  {
    id: "writing",
    file: "writing/",
    glyph: '"',
    accent: "orange",
    href: "/notes/",
    label: "Writing",
    // Notes is issue #32 and does not exist yet.
    pending: true,
  },
  {
    id: "contact",
    file: "contact.sh",
    glyph: "$",
    accent: "orange",
    href: "#contact",
    label: "Contact",
    // No contact route has been built yet (no dedicated issue at time of
    // writing — see design-direction.md "Open refinements").
    pending: true,
  },
];

/** Muted label at the top of the sidebar — the site identity. */
export const SITE_LABEL = "williamlay.co.uk";

/** The non-interactive root row beneath the site label. */
export const ROOT_LABEL = "william-lay";
