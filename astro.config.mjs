// @ts-check
import { defineConfig, fontProviders } from "astro/config";

/*
 * The Latin subset range shared by all three families below. The WOFF2 files
 * in src/assets/fonts/ are Latin-subset builds, so declaring the range lets
 * the browser skip the download entirely for a page whose glyphs all fall
 * outside it, and keeps per-glyph fallback correct rather than rendering
 * tofu for a character the file never contained.
 */
const LATIN_SUBSET = /** @type {[string, ...string[]]} */ ([
  "U+0000-00FF",
  "U+0131",
  "U+0152-0153",
  "U+02BB-02BC",
  "U+02C6",
  "U+02DA",
  "U+02DC",
  "U+0304",
  "U+0308",
  "U+0329",
  "U+2000-206F",
  "U+20AC",
  "U+2122",
  "U+2191",
  "U+2193",
  "U+2212",
  "U+2215",
  "U+FEFF",
  "U+FFFD",
]);

// https://astro.build/config
export default defineConfig({
  site: "https://williamlay.co.uk",

  /*
   * Fonts are declared here rather than as hand-rolled @font-face rules so
   * Astro owns the whole pipeline: it emits the @font-face CSS, hashes and
   * fingerprints each file into the build output, exposes the resulting
   * family stack as the cssVariable below, and generates metric-adjusted
   * fallback faces (optimizedFallbacks, on by default) to cut layout shift
   * while the real face loads. font-display defaults to swap.
   *
   * The `local` provider keeps the WOFF2 binaries vendored in the repo
   * (src/assets/fonts/), so builds stay hermetic — no build-time fetch from
   * Google/Fontsource, and no runtime request to a third-party font host.
   * Per-family licences ship at public/fonts/LICENSE-*.txt: the built site
   * redistributes these faces, and the SIL Open Font Licence requires the
   * licence to travel with them.
   *
   * Semantic tokens (--font-display / --font-body / --font-mono) alias these
   * variables in src/styles/tokens.css; components reference the semantic
   * names only, so swapping a face is a change here plus one alias there.
   */
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Raleway",
      cssVariable: "--font-raleway",
      fallbacks: ["Segoe UI", "sans-serif"],
      unicodeRange: LATIN_SUBSET,
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/raleway-700.woff2"],
            weight: 700,
            style: "normal",
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Lato",
      cssVariable: "--font-lato",
      fallbacks: ["Segoe UI", "sans-serif"],
      unicodeRange: LATIN_SUBSET,
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/lato-400.woff2"],
            weight: 400,
            style: "normal",
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains-mono",
      fallbacks: ["Cascadia Code", "Consolas", "monospace"],
      unicodeRange: LATIN_SUBSET,
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/jetbrains-mono-400.woff2"],
            weight: 400,
            style: "normal",
          },
        ],
      },
    },
  ],
});
