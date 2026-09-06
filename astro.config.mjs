// @ts-check
import { defineConfig, fontProviders } from "astro/config";

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
   * The faces are still self-hosted: the `google` provider resolves and
   * downloads the WOFF2 files at *build* time, then emits them fingerprinted
   * into /_astro/fonts/ and serves them from our own origin. The shipped
   * pages contain no fonts.googleapis.com/fonts.gstatic.com reference, so a
   * visitor never talks to a third-party font host — which is the part the
   * old site's render-blocking @import got wrong. The binaries deliberately
   * are not vendored in git: the provider fetches exactly the weights and
   * subsets requested below, and Astro caches them between builds.
   *
   * Per-family licences ship at public/fonts/LICENSE-*.txt. Not vendoring
   * the binaries doesn't end that obligation — the built site redistributes
   * these faces, and the SIL Open Font Licence requires the licence to
   * travel with them.
   *
   * `subsets: ["latin"]` makes the provider emit the Latin unicode-range for
   * us, so a page whose glyphs fall outside it skips the download entirely.
   *
   * Semantic tokens (--font-display / --font-body / --font-mono) alias these
   * variables in src/styles/tokens.css; components reference the semantic
   * names only, so swapping a face is a change here plus one alias there.
   */
  fonts: [
    // Display / the hero name. Chosen by the design study (issue #26); see
    // docs/overhaul/typography.md.
    {
      provider: fontProviders.google(),
      name: "Public Sans",
      cssVariable: "--font-public-sans",
      fallbacks: ["Segoe UI", "sans-serif"],
      weights: [700],
      styles: ["normal"],
      subsets: ["latin"],
    },
    // Body. 700 carries the role titles in the career timeline.
    {
      provider: fontProviders.google(),
      name: "Lato",
      cssVariable: "--font-lato",
      fallbacks: ["Segoe UI", "sans-serif"],
      weights: [400, 700],
      styles: ["normal"],
      subsets: ["latin"],
    },
    // Code / IDE motifs. 500 carries the callout labels.
    {
      provider: fontProviders.google(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains-mono",
      fallbacks: ["Cascadia Code", "Consolas", "monospace"],
      weights: [400, 500],
      styles: ["normal"],
      subsets: ["latin"],
    },
    /*
     * Retained deliberately, and currently unused: the design study replaced
     * Raleway with Public Sans for the name, but Raleway is the CV's heading
     * face, so it stays a live candidate for headings as the design iterates
     * past MVP. Nothing in tokens.css aliases it, so no CSS rule references
     * it and no visitor downloads it — it costs a build-time fetch and a few
     * bytes of @font-face declaration. Drop this entry if a post-MVP pass
     * settles on something else.
     */
    {
      provider: fontProviders.google(),
      name: "Raleway",
      cssVariable: "--font-raleway",
      fallbacks: ["Segoe UI", "sans-serif"],
      weights: [700],
      styles: ["normal"],
      subsets: ["latin"],
    },
  ],
});
