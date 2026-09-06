#!/usr/bin/env node
/**
 * Accessibility regression guard for the built site.
 *
 * `npm run a11y` (wired by the coordinator) runs this after `astro build`. It
 * builds nothing itself: it walks the already-built HTML in dist/, loads
 * each page into jsdom, and runs axe-core against it. See
 * docs/overhaul/component-library.md, "Accessibility checking", for what
 * this is and — just as importantly — what it deliberately does not cover.
 * That section and this file must keep saying the same thing; if you change
 * one, change the other.
 *
 * WHAT THIS DOES NOT COVER (read this before trusting a green run):
 *   - Colour contrast. jsdom has no layout or paint engine, so there is no
 *     rendered pixel for axe's colour-contrast rule to sample — it is
 *     disabled below, not left to fail. Contrast is instead governed by the
 *     computed ratios in docs/overhaul/colour-scheme.md, checked by hand
 *     against the WCAG formula whenever a token moves.
 *   - Responsive behaviour. jsdom has no viewport to resize, so the 360px
 *     floor and other breakpoint-dependent behaviour is untested here. It is
 *     verified by hand at 360, 640, 900 and 1200px.
 *   - Everything automated tooling structurally cannot see: sensible reading
 *     order, whether alt text is actually *useful*, whether a keyboard user
 *     can operate a custom widget, whether focus goes somewhere sane. Axe's
 *     own position (and ours) is that automated checks catch a minority of
 *     real accessibility defects. This is a regression guard on structure,
 *     naming and ARIA — not a substitute for keyboard-testing a change.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import axeSource from "axe-core";

const DIST_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "dist",
);

/*
 * The site's stated accessibility floor (see docs/overhaul/component-library.md
 * and the a11y section of the design docs) is WCAG 2.1 AA. best-practice is
 * included too: it is Deque's non-normative "you'll regret this" bucket
 * (things like empty headings, duplicate landmarks) and axe ships it
 * specifically so consumers can opt in independently of the WCAG tags.
 */
const RUN_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

/*
 * Rules explicitly disabled, and why. This list must only ever grow for
 * "cannot produce a meaningful result under jsdom" reasons — never because a
 * rule is currently failing and disabling it is easier than fixing the page.
 *
 * - color-contrast: needs an actual rendered pixel (composited backgrounds,
 *   gradients, images-behind-text) to sample, which requires layout and
 *   paint. jsdom has neither, and axe-core's own README says as much:
 *   "Currently the `color-contrast` rule is known not to work with JSDOM."
 *   Confirmed empirically here too — under jsdom it reports "incomplete"
 *   (an error inside the check, not a considered pass) rather than a real
 *   result. Contrast is covered instead by the computed ratios in
 *   docs/overhaul/colour-scheme.md.
 */
const DISABLED_RULES = {
  "color-contrast": { enabled: false },
};

/*
 * jsdom implements no hit-testing at all — document.elementFromPoint and
 * elementsFromPoint are simply absent (not stubbed, not returning null:
 * `undefined` is not a function). A chunk of axe's rule set (landmark
 * checks, page-has-heading-one, and anything else that shares the
 * "is this content behind an open modal dialog?" utility) calls
 * elementsFromPoint to do that hit-testing, and throws when it isn't there.
 * Without this polyfill those rules don't fail meaningfully — they die with
 * a TypeError and axe reports them "incomplete", which is exactly the kind
 * of silent-degradation noise this script exists to avoid.
 *
 * Polyfilling both to report "nothing is at this point" is the correct
 * answer for a layout-less DOM: there is no stacking context to hit-test in
 * the first place, so "nothing on top" is not a guess, it is simply true
 * here. This is the standard workaround for running axe-core under jsdom
 * (tracked upstream as a jsdom/axe-core interop gap, not an axe bug) and it
 * only affects the "is this obscured by a modal" heuristic — it does not
 * suppress or soften any actual violation.
 */
function polyfillHitTesting(window) {
  window.document.elementFromPoint = () => null;
  window.document.elementsFromPoint = () => [];
}

/*
 * jsdom's own diagnostic channel distinguishes exactly the two things we
 * need to tell apart, via `.type` on the emitted Error (see
 * jsdom/lib/jsdom/{browser/not-implemented,browser/resources/per-document-
 * resource-loader,living/css/helpers/stylesheets,living/helpers/runtime-
 * script-errors}.js):
 *
 *   - "not-implemented": a DOM feature jsdom doesn't implement was touched
 *     (e.g. HTMLCanvasElement#getContext, which axe's own colour sampling
 *     pokes at even though we've disabled the rule that needs it).
 *   - "resource-loading": a subresource — the woff2 fonts, favicon.svg —
 *     couldn't be fetched. Expected: the build's root-absolute URLs don't
 *     resolve against jsdom's synthetic http://localhost/ base, on purpose
 *     (see the JSDOM options below), so there is nothing to load.
 *   - "css-parsing": jsdom's CSS parser is stricter/older than a browser's;
 *     harmless for a structural a11y pass.
 *   - "unhandled-exception": the page's *own* script threw. This is the one
 *     case that must not be swallowed — a component's client-side JS
 *     breaking is a real bug, not an artefact of running outside a browser.
 *
 * The first three are exactly "resource loading errors" and "things jsdom
 * doesn't implement" — noise this script promises not to fail on or print.
 * The fourth is a real script error, and is left to propagate.
 */
const EXPECTED_NOISE_TYPES = new Set(["not-implemented", "resource-loading", "css-parsing"]);

function buildVirtualConsole(filePath, onRealError) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => {
    if (EXPECTED_NOISE_TYPES.has(error.type)) {
      return;
    }
    onRealError(new Error(`${filePath}: unhandled error while running the page's own script`, { cause: error }));
  });
  return virtualConsole;
}

/**
 * Loads one built HTML file into jsdom and returns a live `window` with the
 * page's own scripts run and axe-core injected, ready to scan.
 */
async function loadPage(filePath) {
  const html = await readFile(filePath, "utf8");

  let realScriptError = null;
  const virtualConsole = buildVirtualConsole(filePath, (error) => {
    realScriptError = error;
  });

  const dom = new JSDOM(html, {
    /*
     * Components may ship client-side JS (a nav toggle, a lightbox) that
     * sets ARIA state on load or on first interaction. Running it — rather
     * than leaving <script> inert — is what lets axe see the DOM a real
     * visitor gets rather than the pre-hydration markup. This is our own
     * build output, not third-party content, so executing it is a
     * reasonable trust boundary.
     */
    runScripts: "dangerously",
    /*
     * Several DOM APIs (matchMedia, requestAnimationFrame, getComputedStyle
     * returning something other than defaults) are only defined at all in
     * jsdom's "visual" mode. Components that branch on them need it to
     * behave like a browser rather than throw on a missing API.
     */
    pretendToBeVisual: true,
    /*
     * Lets jsdom attempt to fetch subresources (fonts, the favicon) rather
     * than ignoring them outright, so a real fetch failure is what produces
     * the "resource-loading" diagnostic filtered out above — a considered
     * decision, not just silence.
     */
    resources: "usable",
    /*
     * The build emits root-absolute URLs (href="/favicon.svg"). A
     * non-routable, nothing-listening base keeps every resulting fetch a
     * fast local connection refusal instead of either resolving relative to
     * the filesystem root or, worse, reaching out to the real production
     * site over the network from a build check.
     */
    url: "http://localhost/",
    virtualConsole,
  });

  polyfillHitTesting(dom.window);

  // Let synchronous parsing/script-running settle before scanning. Real
  // browsers fire `load` once the document and its subresources are
  // accounted for (successfully or not); jsdom does the same. A short
  // timeout stands in for "or don't", so a resource that never settles
  // can't hang the whole check.
  await Promise.race([
    new Promise((resolve) => {
      if (dom.window.document.readyState === "complete") {
        resolve();
        return;
      }
      dom.window.addEventListener("load", () => resolve(), { once: true });
    }),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);

  if (realScriptError) {
    dom.window.close();
    throw realScriptError;
  }

  // axe-core ships as a self-executing bundle (it attaches `axe` to
  // whatever global it runs in) rather than an ES module, so injecting the
  // source into the jsdom window is the supported way to run it against a
  // foreign document — this is the documented pattern for using axe-core
  // outside a browser extension/page context.
  dom.window.eval(axeSource.source);

  return dom;
}

/** Trims an HTML snippet for terminal output without cutting mid-tag where avoidable. */
function snippet(html, max = 300) {
  if (html.length <= max) {
    return html;
  }
  return `${html.slice(0, max)}…`;
}

/**
 * Runs axe against one loaded page and returns its violations, or throws if
 * axe itself errors out (as opposed to reporting inapplicable/incomplete
 * results, which are not violations and are not treated as failures here).
 */
async function scanPage(dom) {
  const results = await dom.window.axe.run(dom.window.document, {
    runOnly: { type: "tag", values: RUN_TAGS },
    rules: DISABLED_RULES,
  });
  return results.violations;
}

function printViolations(filePath, violations) {
  console.error(`\nFAIL ${filePath}`);
  for (const violation of violations) {
    console.error(`  ${violation.id} (${violation.impact ?? "unknown"} impact)`);
    console.error(`    ${violation.help}`);
    console.error(`    ${violation.helpUrl}`);
    violation.nodes.forEach((node, index) => {
      const selector = node.target.join(" ");
      console.error(`    ${index + 1}) ${selector}`);
      console.error(`       ${snippet(node.html)}`);
    });
  }
}

async function main() {
  let htmlFiles;
  try {
    const entries = await readdir(DIST_DIR, { withFileTypes: true, recursive: true });
    htmlFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
      .map((entry) => path.join(entry.parentPath, entry.name));
  } catch (error) {
    console.error(`a11y: could not read ${DIST_DIR} — run "npm run build" first.`);
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  /*
   * A silent pass over zero files is the failure mode actually worth
   * guarding against: a build that regresses to emitting nothing, or a path
   * typo in this script, would otherwise report a clean run for having
   * checked nothing at all. The link-check workflow's failIfEmpty makes the
   * identical point about its own glob (.github/workflows/link-check.yml)
   * — same reasoning, applied here to this script's own walk of dist/.
   */
  if (htmlFiles.length === 0) {
    console.error(`a11y: found no *.html files under ${DIST_DIR} — refusing to report a pass over nothing.`);
    process.exitCode = 1;
    return;
  }

  let violationCount = 0;
  let filesWithViolations = 0;
  let hadScriptError = false;

  for (const filePath of htmlFiles) {
    const relativePath = path.relative(process.cwd(), filePath);
    let dom;
    try {
      dom = await loadPage(filePath);
      const violations = await scanPage(dom);
      if (violations.length > 0) {
        filesWithViolations += 1;
        violationCount += violations.length;
        printViolations(relativePath, violations);
      }
    } catch (error) {
      // A real script error (see buildVirtualConsole above) or an axe
      // internal failure. Either way this is not a violation to tally — it
      // means the page couldn't be scanned at all, which is worse, so it's
      // reported distinctly and still fails the run.
      hadScriptError = true;
      console.error(`\nERROR ${relativePath}`);
      console.error(`  ${error.message}`);
      if (error.cause) {
        console.error(`  caused by: ${error.cause.message ?? error.cause}`);
      }
    } finally {
      dom?.window.close();
    }
  }

  console.error(
    "\na11y: does not check colour contrast (see docs/overhaul/colour-scheme.md) or responsive " +
      "behaviour, and automated checks catch only a minority of real accessibility defects — " +
      "this is a structural regression guard, not a sign-off.",
  );

  if (violationCount > 0 || hadScriptError) {
    if (violationCount > 0) {
      console.error(
        `\na11y: ${violationCount} violation(s) across ${filesWithViolations}/${htmlFiles.length} file(s).`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`a11y: clean — ${htmlFiles.length} file(s) checked, 0 violations.`);
}

await main();
