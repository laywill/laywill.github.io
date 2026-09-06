/*
 * lightbox.ts — the one piece of client JavaScript on the whole site
 * (docs/overhaul/component-library.md, "Client JavaScript"; issue #27
 * acceptance criteria for Gallery.astro).
 *
 * Loading model: Gallery.astro imports this module from a bare `<script>`
 * tag (`<script>import "../../scripts/lightbox.ts";</script>`), which Astro
 * treats as a hoisted ES module. Two consequences drive the shape of this
 * file:
 *
 *   1. Module scripts are deferred by the HTML spec — they run after the
 *      document has been parsed — so by the time this file executes, every
 *      gallery's markup on the page already exists in the DOM. There is no
 *      need for a DOMContentLoaded listener; querying the document at
 *      top-level module scope is sufficient and simpler.
 *   2. Astro deduplicates identical hoisted/inline scripts by content
 *      across every usage of a component on one page. With N <Gallery>
 *      instances on a page this module is still emitted and executed
 *      exactly once — which is *why* the code below iterates over every
 *      `[data-lightbox-gallery]` root rather than assuming a single
 *      gallery, and is the mechanism (not a runtime feature-flag) behind
 *      the "must work for multiple galleries" requirement.
 *
 * Idempotency: the "runs once" guarantee above holds for a normal page
 * load, but not necessarily under dev-mode HMR, where Vite can
 * re-evaluate a module without the page reloading. Re-running the wiring
 * code would attach duplicate listeners to the same elements, so a
 * module-scoped WeakSet remembers which elements have already been wired
 * and skips them — cheap insurance for a case that would otherwise be a
 * silent, hard-to-notice bug (each click firing the handler twice).
 *
 * Reduced motion: there is deliberately nothing here to guard. The
 * lightbox's entry/exit transition is implemented entirely in Gallery.astro
 * as a CSS `@starting-style` transition on `opacity`/`transform` using the
 * `--duration-base`/`--ease-standard` tokens, so tokens.css's central
 * `prefers-reduced-motion` override (which collapses that duration to 1ms)
 * already handles it. This file only ever calls `showModal()` and
 * `close()` — it drives no animation of its own — so the caveat in the
 * component brief about the token collapse not being enough "for anything
 * the script drives itself" doesn't apply: nothing here is self-driven.
 */

// Every attribute this module reads or writes, named once so a markup
// change in Gallery.astro and a lookup here can't silently drift apart.
const GALLERY_SELECTOR = "[data-lightbox-gallery]";
const TRIGGER_SELECTOR = "[data-lightbox-trigger]";
const DIALOG_SELECTOR = "[data-lightbox-dialog]";
const CLOSE_SELECTOR = "[data-lightbox-close]";
const IMAGE_SELECTOR = "[data-lightbox-image]";
const CAPTION_SELECTOR = "[data-lightbox-caption]";

// See "Idempotency" above. Shared across every gallery root the module
// wires up, not one per gallery, since a WeakSet costs nothing extra to
// share and there is no case where an element needs re-wiring within a
// single page load.
const wired = new WeakSet<Element>();

/**
 * Wires up a single `[data-lightbox-gallery]` root: finds its one dialog
 * and every trigger inside it, and upgrades each trigger's plain
 * navigation into a showModal() call.
 *
 * Every lookup here is written to degrade rather than throw: this is
 * markup authored in an .astro file elsewhere, so by the time this module
 * runs it should always be well-formed, but "should always be" is not a
 * type guarantee once the DOM is involved, and a malformed gallery
 * shouldn't be able to take the rest of the page's lightboxes down with it.
 */
function initGallery(gallery: Element): void {
  const dialogOrNull = gallery.querySelector<HTMLDialogElement>(DIALOG_SELECTOR);
  if (!dialogOrNull) return;

  // TypeScript's control-flow narrowing above doesn't survive into the
  // closures below (open/close are ordinary nested functions, not
  // immediately-invoked expressions) — it re-widens `dialogOrNull` back to
  // `HTMLDialogElement | null` inside them even though the guard has
  // already run. Rebinding to a second, never-reassigned `const` gives the
  // closures a variable TypeScript can see is never null, without an
  // unchecked `!` assertion.
  const dialog: HTMLDialogElement = dialogOrNull;

  const image = dialog.querySelector<HTMLImageElement>(IMAGE_SELECTOR);
  const caption = dialog.querySelector<HTMLElement>(CAPTION_SELECTOR);
  const closeButton = dialog.querySelector<HTMLButtonElement>(CLOSE_SELECTOR);

  // The trigger that opened the dialog, so focus can be returned to it on
  // close (the acceptance criterion native <dialog> does not give you for
  // free — showModal() moves focus INTO the dialog, but close() doesn't
  // move it back anywhere in particular).
  let invoker: HTMLElement | null = null;

  function open(trigger: HTMLAnchorElement): void {
    const full = trigger.dataset.full;
    // No recorded full rendition: leave the click as a normal navigation
    // rather than opening an empty dialog. Written as explicit nullish and
    // empty-string checks rather than a truthiness test, because a dataset
    // read is `string | undefined` and ts-standard's
    // strict-boolean-expressions rule (rightly) refuses to let the two
    // cases collapse into one.
    if (full === undefined || full === "" || image === null) return;

    invoker = trigger;

    const alt = trigger.dataset.alt ?? "";
    const captionText = trigger.dataset.caption ?? "";

    image.src = full;
    image.alt = alt;
    const fullWidth = trigger.dataset.fullWidth;
    const fullHeight = trigger.dataset.fullHeight;
    if (fullWidth !== undefined && fullWidth !== "") image.width = Number(fullWidth);
    if (fullHeight !== undefined && fullHeight !== "") image.height = Number(fullHeight);

    if (caption !== null) {
      caption.textContent = captionText;
      caption.hidden = captionText.length === 0;
    }

    // The dialog's accessible name. A visible caption already gives a
    // screen reader something to announce as content, but the name is set
    // independently of whether a caption exists — falling back to the
    // image's alt text — so the dialog is always named even when there is
    // no caption to fall back on.
    // First non-empty of alt, caption, or a generic fallback. Spelled out
    // rather than chained with `||` so an empty string is handled as the
    // deliberate "no text here" case it is, not as an accident.
    const accessibleName =
      alt !== "" ? alt : captionText !== "" ? captionText : "Image preview";
    dialog.setAttribute("aria-label", accessibleName);

    dialog.showModal();
  }

  function close(): void {
    dialog.close();
  }

  gallery.querySelectorAll<HTMLAnchorElement>(TRIGGER_SELECTOR).forEach((trigger) => {
    if (wired.has(trigger)) return;
    wired.add(trigger);
    trigger.addEventListener("click", (event) => {
      // Prevent the default navigation only once we know we can actually
      // open the dialog in its place (see the early return in open()) —
      // otherwise a visitor would click a thumbnail and see nothing happen.
      const full = trigger.dataset.full;
      if (full === undefined || full === "" || image === null) return;
      event.preventDefault();
      open(trigger);
    });
  });

  if (closeButton && !wired.has(closeButton)) {
    wired.add(closeButton);
    closeButton.addEventListener("click", close);
  }

  if (!wired.has(dialog)) {
    wired.add(dialog);

    // Fires for every close path: the close button, Esc (native <dialog>
    // behaviour), and a future affordance that isn't part of this
    // component today. One handler covers all of them.
    dialog.addEventListener("close", () => {
      // Clearing `src` rather than leaving the last-opened rendition
      // loaded: a visitor who opens several full-resolution images in one
      // session shouldn't keep every one of them decoded in memory behind
      // a dialog that isn't even visible. Reopening the same image after
      // this re-requests it, but that request is served from the browser's
      // HTTP cache, not the network — a decode cost, not a fetch cost —
      // which is a reasonable trade against holding N large decoded
      // bitmaps for the lifetime of the page.
      image?.removeAttribute("src");
      if (image) image.alt = "";
      if (caption !== null) {
        caption.textContent = "";
        caption.hidden = true;
      }
      dialog.removeAttribute("aria-label");

      invoker?.focus();
      invoker = null;
    });
  }
}

document.querySelectorAll(GALLERY_SELECTOR).forEach(initGallery);
