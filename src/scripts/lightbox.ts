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
 * Idempotency: the "runs once" guarantee above is exact, not merely usual,
 * so nothing in this file guards against re-wiring an already-wired
 * element. (An earlier revision kept a module-scoped WeakSet for that
 * purpose; it was removed because it protected against the wrong thing.
 * Under dev-mode HMR, Vite re-evaluating this module creates a fresh
 * module scope and therefore a fresh WeakSet, so it could never have
 * deduped anything across HMR passes — and this module has no
 * `import.meta.hot.accept`, so Vite full-reloads the page on a change here
 * rather than re-evaluating it in place. Within a single evaluation,
 * `document.querySelectorAll(...).forEach(initGallery)`, and the
 * trigger/close-button lookups inside it, each visit every element exactly
 * once, so there was never a second wiring pass for the WeakSet to guard
 * against.)
 *
 * Reduced motion: mostly nothing here to guard, but not entirely. The
 * lightbox's entry/exit transition is implemented entirely in Gallery.astro
 * as a CSS `@starting-style` transition on `opacity`/`transform` using the
 * `--duration-base`/`--ease-standard` tokens, so tokens.css's central
 * `prefers-reduced-motion` override (which collapses that duration to 1ms)
 * already handles the animation itself — this file only ever calls
 * `showModal()` and `close()`, it drives no animation of its own. It does,
 * however, need to know roughly when that CSS-driven exit finishes, so it
 * can defer clearing the dialog's content until the fade-out is visually
 * done (see the 'close' listener below). Rather than hardcode a duration
 * that would need to track --duration-base by hand, it reads the exit
 * transition's own computed duration back off the dialog — which already
 * reflects the reduced-motion collapse, so there is no separate media query
 * to write here either.
 */

// Every attribute this module reads or writes, named once so a markup
// change in Gallery.astro and a lookup here can't silently drift apart.
const GALLERY_SELECTOR = '[data-lightbox-gallery]'
const TRIGGER_SELECTOR = '[data-lightbox-trigger]'
const DIALOG_SELECTOR = '[data-lightbox-dialog]'
const CLOSE_SELECTOR = '[data-lightbox-close]'
const IMAGE_SELECTOR = '[data-lightbox-image]'
const CAPTION_SELECTOR = '[data-lightbox-caption]'

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
function initGallery (gallery: Element): void {
  const dialogOrNull = gallery.querySelector<HTMLDialogElement>(DIALOG_SELECTOR)
  if (dialogOrNull == null) return

  // TypeScript's control-flow narrowing above doesn't survive into the
  // closures below (open/close are ordinary nested functions, not
  // immediately-invoked expressions) — it re-widens `dialogOrNull` back to
  // `HTMLDialogElement | null` inside them even though the guard has
  // already run. Rebinding to a second, never-reassigned `const` gives the
  // closures a variable TypeScript can see is never null, without an
  // unchecked `!` assertion.
  const dialog: HTMLDialogElement = dialogOrNull

  const image = dialog.querySelector<HTMLImageElement>(IMAGE_SELECTOR)
  const caption = dialog.querySelector<HTMLElement>(CAPTION_SELECTOR)
  const closeButton = dialog.querySelector<HTMLButtonElement>(CLOSE_SELECTOR)

  // The trigger that opened the dialog, so focus can be returned to it on
  // close (the acceptance criterion native <dialog> does not give you for
  // free — showModal() moves focus INTO the dialog, but close() doesn't
  // move it back anywhere in particular).
  let invoker: HTMLElement | null = null

  // Set only while a deferred teardown from a previous close is still
  // pending (see the 'close' listener below); calling it cancels that
  // teardown without running it. Needed because a visitor can reopen the
  // dialog before the exit transition — and therefore the deferred
  // teardown — has finished, and that stale teardown must not later wipe
  // out the newly-opened image's src/alt/caption.
  let pendingTeardownCancel: (() => void) | null = null

  // The one place src/alt/caption/aria-label actually get cleared. Pulled
  // out of the 'close' listener so both the normal deferred path and the
  // cancellation path below can be precise about when it does and doesn't
  // run.
  function teardownContent (): void {
    // Clearing `src` rather than leaving the last-opened rendition loaded:
    // a visitor who opens several full-resolution images in one session
    // shouldn't keep every one of them decoded in memory behind a dialog
    // that isn't even visible. Reopening the same image after this
    // re-requests it, but that request is served from the browser's HTTP
    // cache, not the network — a decode cost, not a fetch cost — which is
    // a reasonable trade against holding N large decoded bitmaps for the
    // lifetime of the page.
    image?.removeAttribute('src')
    if (image != null) image.alt = ''
    if (caption !== null) {
      caption.textContent = ''
      caption.hidden = true
    }
    dialog.removeAttribute('aria-label')
  }

  // How long to wait, at most, before tearing down anyway if no
  // 'transitionend' arrives (see the 'close' listener below). Read back
  // off the dialog's own computed style rather than a literal duration
  // here: the real value already lives in tokens.css as --duration-base,
  // and reading it keeps this file from needing a second copy of that
  // number that could drift, and picks up tokens.css's own
  // prefers-reduced-motion collapse to 1ms for free.
  function exitTransitionFallbackMs (): number {
    const raw = window.getComputedStyle(dialog).transitionDuration.split(',')[0]?.trim() ?? '0s'
    const value = Number.parseFloat(raw)
    if (Number.isNaN(value)) return 0
    return raw.endsWith('ms') ? value : value * 1000
  }

  function open (trigger: HTMLAnchorElement): void {
    const full = trigger.dataset.full
    // No recorded full rendition: leave the click as a normal navigation
    // rather than opening an empty dialog. Written as explicit nullish and
    // empty-string checks rather than a truthiness test, because a dataset
    // read is `string | undefined` and ts-standard's
    // strict-boolean-expressions rule (rightly) refuses to let the two
    // cases collapse into one.
    if (full === undefined || full === '' || image === null) return

    // Cancel (not run) any teardown still pending from a previous close —
    // the content it would have cleared is about to be overwritten below
    // anyway, and letting it fire later would clear the image being opened
    // right now instead of the one it was scheduled for.
    pendingTeardownCancel?.()
    pendingTeardownCancel = null

    invoker = trigger

    const alt = trigger.dataset.alt ?? ''
    const captionText = trigger.dataset.caption ?? ''

    image.src = full
    // Deliberately left empty rather than set to `alt` — see the
    // accessible-name comment below for why the dialog, not the image,
    // carries the name.
    image.alt = ''
    const fullWidth = trigger.dataset.fullWidth
    const fullHeight = trigger.dataset.fullHeight
    if (fullWidth !== undefined && fullWidth !== '') image.width = Number(fullWidth)
    if (fullHeight !== undefined && fullHeight !== '') image.height = Number(fullHeight)

    if (caption !== null) {
      caption.textContent = captionText
      caption.hidden = captionText.length === 0
    }

    // The dialog's accessible name — and, as of this revision, the ONLY
    // element that carries it. Giving both the dialog's aria-label and the
    // image's alt the same text made a screen reader announce it twice in
    // quick succession ("<name>, dialog … <name>, image"), because
    // showModal()'s focus lands on the close button, from where browsing
    // the dialog's content reaches the (otherwise unlabelled) image next.
    // The dialog is the one that must have a name — it's what a screen
    // reader announces on entry — so it keeps the text and the image is
    // emptied instead. The visible caption, when there is one, still gives
    // a screen reader real content to read as it browses past the image;
    // it just isn't a second, competing accessible name for the same
    // photo.
    // First non-empty of alt, caption, or a generic fallback. Spelled out
    // rather than chained with `||` so an empty string is handled as the
    // deliberate "no text here" case it is, not as an accident.
    const accessibleName =
      alt !== '' ? alt : captionText !== '' ? captionText : 'Image preview'
    dialog.setAttribute('aria-label', accessibleName)

    dialog.showModal()
  }

  function close (): void {
    dialog.close()
  }

  gallery.querySelectorAll<HTMLAnchorElement>(TRIGGER_SELECTOR).forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      // Modifier-clicks and middle-clicks are the visitor asking the
      // browser to open the link in a new tab or window rather than to
      // activate it in place — precisely the affordance a real <a href>
      // preserves over a <button> (this file's header, and
      // component-library.md's "Client JavaScript" section). Bailing out
      // here, before preventDefault() is ever called, leaves a modified
      // click as an ordinary navigation the browser handles itself.
      if (event.defaultPrevented) return
      if (event.button !== 0) return // Not the primary (left) button.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      // Prevent the default navigation only once we know we can actually
      // open the dialog in its place (see the early return in open()) —
      // otherwise a visitor would click a thumbnail and see nothing happen.
      const full = trigger.dataset.full
      if (full === undefined || full === '' || image === null) return
      event.preventDefault()
      open(trigger)
    })
  })

  if (closeButton != null) {
    closeButton.addEventListener('click', close)
  }

  // Backdrop-click-to-close: not part of the component brief, but the
  // near-universal expectation for an image lightbox. A click on the
  // ::backdrop pseudo-element is reported with the <dialog> itself as
  // event.target, because a pseudo-element has no DOM node of its own to
  // be a target — so this check closes on a backdrop (or dialog padding)
  // click while a click on the image or the caption, which each have their
  // own element as the target, never reaches it.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close()
  })

  // Fires for every close path: the close button, Esc (native <dialog>
  // behaviour), a backdrop click, and a future affordance that isn't part
  // of this component today. One handler covers all of them.
  dialog.addEventListener('close', () => {
    invoker?.focus()
    invoker = null

    // The dialog's own exit transition (`.lightbox`'s @starting-style
    // transition in Gallery.astro) keeps it visibly on screen for
    // --duration-base after this 'close' event has already fired — so
    // clearing content immediately would show an empty box fading out.
    // Defer it to whichever comes first:
    //   - 'transitionend' on the dialog, filtered to events that actually
    //     belong to the dialog's own transition rather than one bubbling
    //     up from a child (the close button has its own hover transition,
    //     which is unrelated and must not trigger teardown early).
    //   - a timeout mirroring the transition's own computed duration, as a
    //     backstop for the cases 'transitionend' can't be relied on for:
    //     reduced motion collapses the duration to 1ms but doesn't
    //     guarantee the event fires, and a browser without
    //     @starting-style support skips the transition — and therefore
    //     the event — entirely.
    // `settled` makes whichever fires second a no-op.
    let settled = false
    function settle (): void {
      if (settled) return
      settled = true
      dialog.removeEventListener('transitionend', onTransitionEnd)
      window.clearTimeout(fallbackId)
      pendingTeardownCancel = null
      teardownContent()
    }
    const onTransitionEnd = (event: TransitionEvent): void => {
      if (event.target !== dialog) return
      settle()
    }
    const fallbackId = window.setTimeout(settle, exitTransitionFallbackMs())
    dialog.addEventListener('transitionend', onTransitionEnd)
    pendingTeardownCancel = () => {
      settled = true
      dialog.removeEventListener('transitionend', onTransitionEnd)
      window.clearTimeout(fallbackId)
    }
  })
}

document.querySelectorAll(GALLERY_SELECTOR).forEach(initGallery)
