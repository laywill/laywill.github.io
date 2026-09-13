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
 *   - Client-side script behaviour. The one script the site ships (the
 *     gallery lightbox, component-library.md rule 3) is emitted by Astro as
 *     `<script type="module">`, and jsdom cannot execute module scripts at
 *     all — not under any `runScripts` setting; see the JSDOM options below
 *     for how this was confirmed rather than assumed. So this check always
 *     scans pre-interaction markup, never "the DOM after the lightbox ran".
 *     Whether the lightbox actually works is a keyboard/manual check, not
 *     something this tool can speak to at any settings.
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
 * These two lists are one policy, split in two only because axe offers two
 * different levers for it — read them together:
 *
 *   - DISABLED_RULES: a rule that CANNOT run under jsdom at all, so it is
 *     switched off outright. It will never appear in violations, passes, OR
 *     incomplete, because axe never attempts it.
 *   - INCOMPLETE_ALLOWLIST (below the hit-testing polyfill, once the reason
 *     for it has been explained): a rule that CAN mostly run under jsdom,
 *     but is allowed to land in axe's "incomplete" bucket — an "I couldn't
 *     tell" result, not a violation — for cases jsdom structurally cannot
 *     resolve, without failing the run.
 *
 * Both lists must only ever grow for "cannot produce a meaningful result
 * under jsdom" reasons — never because a rule is currently failing and
 * disabling/allowlisting it is easier than fixing the page. And a rule
 * should only ever be in ONE of the two: something unresolvable often
 * enough to disable outright (color-contrast, below) has no business also
 * sitting in the allowlist "just in case" — that would be the same bug this
 * pair of lists exists to prevent, hiding behind a second name.
 *
 * - color-contrast: needs an actual rendered pixel (composited backgrounds,
 *   gradients, images-behind-text) to sample, which requires layout and
 *   paint. jsdom has neither, and axe-core's own README says as much:
 *   "Currently the `color-contrast` rule is known not to work with JSDOM."
 *   Confirmed empirically here too — under jsdom it reports "incomplete"
 *   (an error inside the check, not a considered pass) rather than a real
 *   result. Contrast is covered instead by the computed ratios in
 *   docs/overhaul/colour-scheme.md. Disabled outright rather than
 *   allowlisted below: it doesn't fail sometimes and pass others depending
 *   on the page, it is unresolvable under jsdom every time, so there is
 *   nothing for axe to usefully attempt.
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
 * The other half of the DISABLED_RULES policy above: rules allowed to land
 * in axe's "incomplete" bucket without failing the run, because jsdom made
 * THIS rule specifically unable to reach a verdict — the same "cannot
 * produce a meaningful result under jsdom" bar as DISABLED_RULES, just for
 * a rule still worth running for the cases jsdom *can* resolve, rather than
 * switched off wholesale.
 *
 * Empty today, and that emptiness is load-bearing, not an oversight:
 * color-contrast is the one rule known to be unresolvable under jsdom, and
 * it is disabled outright above instead — axe never gets far enough to
 * report it "incomplete" because it never runs at all. If color-contrast
 * (or any other rule) ever turns up in the unexpected-incomplete report
 * below, the fix is almost certainly to move it into DISABLED_RULES with
 * the same evidence color-contrast has, not to add it here — allowlisting
 * silences the exact silent-degradation signal this pair of lists exists to
 * surface, elsewhere in this same file, of a rule dying into "incomplete"
 * and reporting a false pass (see polyfillHitTesting above).
 */
const INCOMPLETE_ALLOWLIST = new Set([]);

/*
 * jsdom's own diagnostic channel distinguishes exactly the things we need
 * to tell apart, via `.type` on the emitted Error (see
 * jsdom/lib/jsdom/{browser/not-implemented,browser/resources/per-document-
 * resource-loader,living/css/helpers/stylesheets,living/helpers/runtime-
 * script-errors}.js):
 *
 *   - "not-implemented": a DOM feature jsdom doesn't implement was touched
 *     (e.g. HTMLCanvasElement#getContext, which axe's own colour sampling
 *     pokes at even though we've disabled the rule that needs it).
 *   - "resource-loading": a subresource couldn't be fetched. Not currently
 *     expected to fire at all — see the JSDOM options below on why this
 *     script doesn't ask jsdom to fetch anything in the first place — but
 *     kept in the filtered set because it names the same "not a real bug"
 *     category if it ever does (e.g. from something axe-core itself tries
 *     to load), same reasoning as "not-implemented" above.
 *   - "css-parsing": jsdom's CSS parser is stricter/older than a browser's;
 *     harmless for a structural a11y pass.
 *   - "unhandled-exception": something running live in the jsdom window
 *     threw. Once meant "the page's own <script> threw" — it no longer can
 *     mean that (see loadPage below: no page-authored script executes
 *     here, of either kind jsdom can or can't run). What it can still catch
 *     is a genuine error inside axe-core's own machinery once injected —
 *     event listeners, MutationObservers and rAF/timer callbacks it sets
 *     up on this window all still route through jsdom's normal exception
 *     reporting regardless of the runScripts setting. That is a real bug in
 *     this check's own operation, not an artefact of running outside a
 *     browser, so it is the one type left to propagate rather than filter.
 *
 * The first three are noise this script promises not to fail on or print.
 * The fourth is left to propagate.
 */
const EXPECTED_NOISE_TYPES = new Set(["not-implemented", "resource-loading", "css-parsing"]);

function buildVirtualConsole(filePath, onRealError) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => {
    if (EXPECTED_NOISE_TYPES.has(error.type)) {
      return;
    }
    onRealError(new Error(`${filePath}: unhandled error while scanning (see "unhandled-exception" above)`, { cause: error }));
  });
  return virtualConsole;
}

/**
 * Loads one built HTML file into jsdom and returns a live `window` with
 * axe-core injected, ready to scan. Does NOT run the page's own scripts —
 * see the `runScripts` option below for why that line was removed rather
 * than fixed, and the file-level "WHAT THIS DOES NOT COVER" note above for
 * the consequence.
 */
async function loadPage(filePath) {
  const html = await readFile(filePath, "utf8");

  let realScriptError = null;
  const virtualConsole = buildVirtualConsole(filePath, (error) => {
    realScriptError = error;
  });

  const dom = new JSDOM(html, {
    /*
     * This file used to set "dangerously" here, on the theory that running
     * the page's own client-side JS (a nav toggle, a lightbox) is what lets
     * axe see the DOM a real visitor gets, and that a script throwing would
     * surface via the "unhandled-exception" case above. That was wrong, and
     * verified wrong rather than merely suspected:
     *
     *   - jsdom does not execute `<script type="module">` at all, under any
     *     runScripts setting — a long-standing jsdom/module-script gap
     *     (jsdom/jsdom#2475), not something this project's setup can work
     *     around. Confirmed empirically: a module script assigning to a
     *     global, and separately one that throws synchronously, produced no
     *     effect and no jsdomError under "dangerously" — jsdom silently
     *     never runs it, it doesn't fail loudly.
     *   - Astro emits this site's one script (the gallery lightbox,
     *     component-library.md rule 3) as exactly that: an inline
     *     `<script type="module">`. There is no classic script anywhere in
     *     the build for "dangerously" to have been doing anything for.
     *
     * So "dangerously" bought this check nothing — the "unhandled-exception"
     * guard could never have fired for the one script that ships — while
     * running arbitrary embedded script (including inline event-handler
     * attributes, javascript: URLs, etc.) is a wider execution surface than
     * this tool needs.
     *
     * "outside-only" is the minimum jsdom actually requires of us: it is
     * what makes `window.eval` work below, which is how axe-core (a
     * self-executing, non-module bundle) gets injected into the page — see
     * that call for why eval is the supported way to do it. Per jsdom's own
     * docs, "outside-only" provides exactly that "run script from the
     * outside" capability without running any `<script>` element or inline
     * event-handler attribute found IN the page. Confirmed empirically
     * against this repo's own built output: axe still injects and runs
     * (0 violations, 0 incomplete on a clean build) with no jsdomError of
     * any kind, using "outside-only" and without "resources" below.
     */
    runScripts: "outside-only",
    /*
     * Several DOM APIs (matchMedia, requestAnimationFrame, getComputedStyle
     * returning something other than defaults) are only defined at all in
     * jsdom's "visual" mode. axe-core itself, once injected, branches on
     * some of these — it needs to behave like a browser rather than throw
     * on a missing API, independently of whether any page script runs.
     */
    pretendToBeVisual: true,
    /*
     * No `resources` option is set, deliberately — this check doesn't fetch
     * subresources (fonts, the favicon) at all, rather than attempting the
     * fetch and filtering the resulting "resource-loading" failure as
     * before. Once running-scripts stopped being the goal, there was
     * nothing left that needed a fetch to happen: axe evaluates DOM
     * structure and ARIA, not painted output, so a font or favicon loading
     * has no effect on what it reports. Confirmed empirically: omitting
     * this option against the real build produces zero jsdomErrors of any
     * type, where the previous `resources: "usable"` setting existed
     * specifically to produce (and then filter) "resource-loading" ones.
     */
    /*
     * The build emits root-absolute URLs (href="/favicon.svg"). A
     * non-routable, nothing-listening base is still worth keeping even with
     * no fetches attempted: it is what `window.location` and any
     * relative-URL resolution axe-core does resolve against, and keeps this
     * a fast, offline, deterministic check rather than one that could
     * reach out to the real production site if that ever changed.
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
 * Runs axe against one loaded page. Returns `violations` (confirmed
 * failures) and `unexpectedIncomplete` (results axe could not reach a
 * verdict on, filtered to exclude INCOMPLETE_ALLOWLIST). Throws if axe
 * itself errors out — as opposed to reporting inapplicable/incomplete
 * results, which are not violations and are not, on their own, treated as
 * failures here (see `unexpectedIncomplete`, which is).
 *
 * `incomplete` is not a soft "probably fine": it is axe's way of saying a
 * rule could not decide, which under jsdom usually means the rule died
 * partway through (see polyfillHitTesting above — this is precisely the
 * failure mode that polyfill exists to prevent for hit-testing, and the
 * same class of silent-degradation risk applies to every other rule too).
 * A version bump to jsdom or axe-core could reopen that gap for a rule this
 * polyfill doesn't cover, and without this check the run would report
 * clean for having quietly stopped checking something, not for having
 * checked it and found it fine. Discarding `results.incomplete` entirely,
 * as this function used to, made that failure mode invisible by design.
 */
async function scanPage(dom) {
  const results = await dom.window.axe.run(dom.window.document, {
    runOnly: { type: "tag", values: RUN_TAGS },
    rules: DISABLED_RULES,
  });
  const unexpectedIncomplete = results.incomplete.filter(
    (result) => !INCOMPLETE_ALLOWLIST.has(result.id),
  );
  return { violations: results.violations, unexpectedIncomplete };
}

function printResultGroup(filePath, label, results) {
  console.error(`\n${label} ${filePath}`);
  for (const result of results) {
    console.error(`  ${result.id} (${result.impact ?? "unknown"} impact)`);
    console.error(`    ${result.help}`);
    console.error(`    ${result.helpUrl}`);
    result.nodes.forEach((node, index) => {
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
  let incompleteCount = 0;
  let filesWithIncomplete = 0;
  let hadScriptError = false;

  for (const filePath of htmlFiles) {
    const relativePath = path.relative(process.cwd(), filePath);
    let dom;
    try {
      dom = await loadPage(filePath);
      const { violations, unexpectedIncomplete } = await scanPage(dom);
      if (violations.length > 0) {
        filesWithViolations += 1;
        violationCount += violations.length;
        printResultGroup(relativePath, "FAIL", violations);
      }
      if (unexpectedIncomplete.length > 0) {
        filesWithIncomplete += 1;
        incompleteCount += unexpectedIncomplete.length;
        // Deliberately as loud as a violation, not a quieter aside: an
        // unexpected "incomplete" means a rule died rather than ran, which
        // is the exact silent-degradation this check exists to catch (see
        // scanPage above) — it must be at least as visible as a confirmed
        // failure, or it will be ignored like one that matters less.
        printResultGroup(relativePath, "INCOMPLETE", unexpectedIncomplete);
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
    "\na11y: does not check colour contrast (see docs/overhaul/colour-scheme.md), responsive " +
      "behaviour, or client-side script behaviour (jsdom cannot execute this site's module " +
      "script — see the file-level comment), and automated checks catch only a minority of " +
      "real accessibility defects — this is a structural regression guard, not a sign-off.",
  );

  if (violationCount > 0 || incompleteCount > 0 || hadScriptError) {
    if (violationCount > 0) {
      console.error(
        `\na11y: ${violationCount} violation(s) across ${filesWithViolations}/${htmlFiles.length} file(s).`,
      );
    }
    if (incompleteCount > 0) {
      console.error(
        `\na11y: ${incompleteCount} unexpected incomplete result(s) across ${filesWithIncomplete}/${htmlFiles.length} ` +
          "file(s) — a rule could not reach a verdict. Either fix the underlying cause, or if it is " +
          "genuinely unresolvable under jsdom, move it from an ad-hoc pass into DISABLED_RULES or " +
          "INCOMPLETE_ALLOWLIST in scripts/a11y.mjs with the same evidence color-contrast has.",
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`a11y: clean — ${htmlFiles.length} file(s) checked, 0 violations, 0 unexpected incomplete results.`);
}

await main();
