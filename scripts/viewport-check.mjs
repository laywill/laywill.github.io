#!/usr/bin/env node
/**
 * Horizontal-overflow check across the documented breakpoints.
 *
 * Why this exists as a separate tool rather than another CI job: it needs a
 * real browser with a real layout engine, which is exactly what the axe run
 * (scripts/a11y.mjs, jsdom) cannot give. Every horizontal-scroll defect found
 * on this branch was invisible to `astro check`, to `astro build` and to axe,
 * because none of them lay out a page:
 *
 *   - ResponsiveImage had no max-width, so a 2000px source set the document's
 *     scroll width to 2000px at every viewport.
 *   - The box-sizing reset lived in a *scoped* <style>, so it applied to the
 *     layout's own elements and to nothing else; .content-col was 32px wider
 *     than the viewport everywhere.
 *   - A 1px .visually-hidden span, absolutely positioned with no positioned
 *     ancestor, escaped the nav's scroll container and dragged the document's
 *     scroll width to 596px at the 360px floor.
 *
 * The brief calls "no horizontal scroll, ever" non-negotiable and issue #27
 * makes 360px and vertical monitors acceptance criteria, so "we read the CSS
 * carefully" is not a good enough answer. This makes the check reproducible.
 *
 * It is deliberately NOT wired into CI: that would mean provisioning a browser
 * in the workflow, and the check is cheap to run by hand before a layout
 * change lands. See docs/overhaul/component-library.md, "Viewport checking".
 *
 * Usage (three terminals' worth of setup, then one command):
 *
 *   npm run build
 *   npm run preview
 *   "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
 *     --disable-gpu --remote-debugging-port=9222 \
 *     --user-data-dir=/tmp/viewport-check about:blank
 *   node scripts/viewport-check.mjs
 *
 * Exits non-zero if any route scrolls horizontally at any viewport.
 */

const CDP_HTTP = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const BASE = process.env.PREVIEW_URL ?? "http://localhost:4321";

/**
 * Every route the site serves. Add new ones here — a page that is not listed
 * is a page nobody has checked.
 */
const ROUTES = ["/", "/components/"];

/**
 * The documented breakpoints from component-library.md, plus the two shapes
 * the acceptance criteria call out by name. 1080x1920 is the vertical monitor
 * the issue asks about; 1024x600 is the short-and-wide case that strands a
 * sticky rail taller than the viewport.
 */
const VIEWPORTS = [
  { name: "floor 360", width: 360, height: 800 },
  { name: "sm 640", width: 640, height: 900 },
  { name: "md 900", width: 900, height: 900 },
  { name: "lg 1200", width: 1200, height: 900 },
  { name: "vertical 1080x1920", width: 1080, height: 1920 },
  { name: "short-wide 1024x600", width: 1024, height: 600 },
];

/*
 * Reports the document's scroll width against its client width, plus any
 * element sticking out past the right edge. Elements inside a scroll
 * container are skipped: a strip that scrolls sideways on purpose (the
 * narrow-viewport nav) is containing its own overflow, which is the intended
 * behaviour rather than a defect.
 */
const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const offenders = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right <= vw + 1) continue;
    let contained = false;
    let p = el.parentElement;
    while (p) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden") { contained = true; break; }
      p = p.parentElement;
    }
    if (contained) continue;
    const cls = typeof el.className === "string" ? el.className.trim() : "";
    offenders.push(el.tagName.toLowerCase() + (cls ? "." + cls.split(" ").join(".") : "") +
      " right=" + Math.round(r.right) + " w=" + Math.round(r.width));
  }
  return { scrollWidth: document.documentElement.scrollWidth, clientWidth: vw, offenders: offenders.slice(0, 8) };
})()`;

const targets = await (await fetch(`${CDP_HTTP}/json/list`)).json();
const target = targets.find((t) => t.type === "page");
if (!target) {
  console.error("No page target on the DevTools endpoint. Is headless Chrome running with --remote-debugging-port=9222?");
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

let nextId = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
  else entry.resolve(message.result);
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");

let failures = 0;
for (const route of ROUTES) {
  console.log(`\n${route}`);
  for (const vp of VIEWPORTS) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false,
    });
    await send("Page.navigate", { url: BASE + route });
    // Fonts and images settle after load; a fixed pause is crude but this is
    // a hand-run check, not a hot loop.
    await new Promise((r) => setTimeout(r, 900));
    const { result } = await send("Runtime.evaluate", { expression: PROBE, returnByValue: true });
    const { scrollWidth, clientWidth, offenders } = result.value;
    const overflow = scrollWidth - clientWidth;
    if (overflow > 0) {
      failures += 1;
      console.log(`  ${vp.name.padEnd(20)} FAIL  scrolls ${overflow}px (scrollWidth ${scrollWidth} vs clientWidth ${clientWidth})`);
      for (const o of offenders) console.log(`      ${o}`);
    } else {
      console.log(`  ${vp.name.padEnd(20)} ok    ${scrollWidth}px`);
    }
  }
}

ws.close();
if (failures > 0) {
  console.error(`\n${failures} viewport/route combination(s) scroll horizontally.`);
  process.exit(1);
}
console.log(`\nNo horizontal scroll on ${ROUTES.length} route(s) across ${VIEWPORTS.length} viewports.`);
