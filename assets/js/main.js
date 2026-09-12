/*
  Story by HTML5 UP
  html5up.net | @ajlkn
  Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

/* global skel */
(function ($) {
  skel.breakpoints({
    xlarge: '(max-width: 1680px)',
    large: '(max-width: 1280px)',
    medium: '(max-width: 980px)',
    small: '(max-width: 736px)',
    xsmall: '(max-width: 480px)',
    xxsmall: '(max-width: 360px)'
  })

  $(function () {
    const $window = $(window)
    const $body = $('body')
    const $wrapper = $('#wrapper')

    // body.is-loading disables animations/transitions and hides the banner's
    // load-in targets. It is applied by an inline script at the top of every
    // page's <body>, before the banner is parsed, so the banner is never painted
    // visible. Adding it here instead ran after the first paint, so the banner
    // flashed up, snapped to hidden, then faded in (#85). Leaving it to the
    // markup also means that with JavaScript unavailable the class is never
    // added, so the banner stays visible rather than being hidden for good by
    // CSS that nothing will ever remove.

    // jquery.scrollex evaluates an element on 'scroll', and once more from a
    // synthetic scroll it fires in its own window 'load' handler. Nothing
    // re-measures when the layout settles after that. Since each registration
    // below adds is-inactive in its initialize callback, and the handler only
    // touches the class when the computed state changes, a section that
    // measures as out of view during that single evaluation stays hidden until
    // a real scroll happens.
    //
    // At the top of a page that is invisible - everything below the fold is
    // meant to be inactive, and the first scroll corrects it. Reload part-way
    // down and the sections being looked at never come back (#87).
    //
    // Two ways the single evaluation misses: scrollex binds its 'load' handler
    // when its own script runs, while registration happens in this async ready
    // callback, so the synthetic scroll can fire against an empty registry;
    // and loading="lazy" images do not block 'load', so sections holding them
    // can still be mid-reflow when it does fire.
    const refreshScrollex = function () {
      // body.is-loading suppresses every transition on the page, so revealing
      // a section while it is still set snaps that section into place instead
      // of fading it. Hold off until the class is gone; clearLoading runs this
      // again at that point, and scrollex re-measures from scratch each time.
      if ($body.hasClass('is-loading')) { return }

      $window.trigger('scroll')
    }

    const clearLoading = function () {
      window.setTimeout(function () {
        $body.removeClass('is-loading')

        // Only now can scroll-triggered sections be revealed with their fade
        // intact, so this is where the first real evaluation happens. It also
        // re-measures after any reflow that is not an image - late webfonts,
        // restored scroll position. scrollex defers its own handler by the
        // configured delay, so the class removal above lands in an earlier
        // style recalc than the reveal and the transition is live for it.
        refreshScrollex()
      }, 100)
    }

    // jQuery 3 resolves .ready() asynchronously, so on a warm cache the window
    // 'load' event can fire before this handler is bound - and jQuery does not
    // replay an event that has already fired. Left unhandled, body.is-loading
    // is never removed, and the stylesheet's
    // `body.is-loading .banner.onload-image-fade-in .image img { opacity: 0 }`
    // keeps the hero image invisible for good.
    if (document.readyState === 'complete') {
      clearLoading()
    } else {
      $window.on('load', clearLoading)
    }

    // Fix: Placeholder polyfill.
    $('form').placeholder()

    // Prioritize "important" elements on medium.
    skel.on('+medium -medium', function () {
      $.prioritize(
        '.important\\28 medium\\29',
        skel.breakpoint('medium').active
      )
    })

    // Browser fixes.

    // IE: Flexbox min-height bug.
    if (skel.vars.browser === 'ie') {
      (function () {
        let flexboxFixTimeoutId

        $window.on('resize.flexbox-fix', function () {
          const $x = $('.fullscreen')

          clearTimeout(flexboxFixTimeoutId)

          flexboxFixTimeoutId = setTimeout(function () {
            if ($x.prop('scrollHeight') > $window.height()) { $x.css('height', 'auto') } else { $x.css('height', '100vh') }
          }, 250)
        }).triggerHandler('resize.flexbox-fix')
      })()
    }

    // Object fit workaround.
    if (!skel.canUse('object-fit')) {
      (function () {
        $('.banner .image, .spotlight .image').each(function () {
          const $this = $(this)
          const $img = $this.children('img')
          const positionClass = $this.parent().attr('class').match(/image-position-([a-z]+)/)

          // Set image.
          $this
            .css('background-image', 'url("' + $img.attr('src') + '")')
            .css('background-repeat', 'no-repeat')
            .css('background-size', 'cover')

          // Set position.
          switch (positionClass.length > 1 ? positionClass[1] : '') {
            case 'left':
              $this.css('background-position', 'left')
              break

            case 'right':
              $this.css('background-position', 'right')
              break

            case 'center':
            default:
              $this.css('background-position', 'center')
              break
          }

          // Hide original.
          $img.css('opacity', '0')
        })
      })()
    }

    // Smooth scroll.
    $('.smooth-scroll').scrolly()
    $('.smooth-scroll-middle').scrolly({ anchor: 'middle' })

    // Wrapper.
    $wrapper.children()
      .scrollex({
        top: '30vh',
        bottom: '30vh',
        initialize: function () {
          $(this).addClass('is-inactive')
        },
        terminate: function () {
          $(this).removeClass('is-inactive')
        },
        enter: function () {
          $(this).removeClass('is-inactive')
        },
        leave: function () {
          const $this = $(this)

          if ($this.hasClass('onscroll-bidirectional')) { $this.addClass('is-inactive') }
        }
      })

    // Items.
    $('.items')
      .scrollex({
        top: '30vh',
        bottom: '30vh',
        delay: 50,
        initialize: function () {
          $(this).addClass('is-inactive')
        },
        terminate: function () {
          $(this).removeClass('is-inactive')
        },
        enter: function () {
          $(this).removeClass('is-inactive')
        },
        leave: function () {
          const $this = $(this)

          if ($this.hasClass('onscroll-bidirectional')) { $this.addClass('is-inactive') }
        }
      })
      .children()
      .wrapInner('<div class="inner"></div>')

    // Gallery.
    $('.gallery')
      .wrapInner('<div class="inner"></div>')
      .prepend(skel.vars.mobile ? '' : '<div class="forward"></div><div class="backward"></div>')
      .scrollex({
        top: '30vh',
        bottom: '30vh',
        delay: 50,
        initialize: function () {
          $(this).addClass('is-inactive')
        },
        terminate: function () {
          $(this).removeClass('is-inactive')
        },
        enter: function () {
          $(this).removeClass('is-inactive')
        },
        leave: function () {
          const $this = $(this)

          if ($this.hasClass('onscroll-bidirectional')) { $this.addClass('is-inactive') }
        }
      })
      .children('.inner')
      .css('overflow-y', skel.vars.mobile ? 'visible' : 'hidden')
      .css('overflow-x', skel.vars.mobile ? 'scroll' : 'hidden')
      .scrollLeft(0)

    // Re-measure as each image settles the layout it is measured against,
    // rather than trusting scrollex's one synthetic scroll. No evaluation is
    // kicked off here: body.is-loading is still set for everything registered
    // above, so refreshScrollex would decline anyway. Images already in the
    // cache are complete before this binds and need no handler.
    $('img').each(function () {
      if (!this.complete) { $(this).one('load error', refreshScrollex) }
    })

    $('.gallery')
      .on('wheel', '.inner', function (event) {
        const $this = $(this)
        let delta = (event.originalEvent.deltaX * 10)

        // Cap delta.
        if (delta > 0) { delta = Math.min(25, delta) } else if (delta < 0) { delta = Math.max(-25, delta) }

        // Scroll.
        $this.scrollLeft($this.scrollLeft() + delta)
      })
      .on('mouseenter', '.forward, .backward', function (event) {
        const $this = $(this)
        const $inner = $this.siblings('.inner')
        const direction = ($this.hasClass('forward') ? 1 : -1)

        // Clear move interval.
        clearInterval(this._gallery_moveIntervalId)

        // Start interval.
        this._gallery_moveIntervalId = setInterval(function () {
          $inner.scrollLeft($inner.scrollLeft() + (5 * direction))
        }, 10)
      })
      .on('mouseleave', '.forward, .backward', function (event) {
        // Clear move interval.
        clearInterval(this._gallery_moveIntervalId)
      })

    // Lightbox.
    $('.gallery.lightbox')
      .on('click', 'a', function (event) {
        const $a = $(this)
        const $gallery = $a.parents('.gallery')
        const $modal = $gallery.children('.modal')
        const $modalImg = $modal.find('img')
        const href = $a.attr('href')

        // Not an image? Bail.
        // Case-sensitive matching would silently degrade a .JPG into a plain
        // navigation away from the page instead of opening the lightbox.
        if (!href.match(/\.(jpg|jpeg|gif|png|mp4)$/i)) { return }

        // Prevent default.
        event.preventDefault()
        event.stopPropagation()

        // Locked? Bail.
        if ($modal[0]._locked) { return }

        // Lock.
        $modal[0]._locked = true

        // Set src, alt (copied from the triggering thumbnail so the
        // lightbox image isn't left with no accessible name).
        $modalImg.attr('src', href)
        $modalImg.attr('alt', $a.find('img').attr('alt') || '')

        // Set visible.
        $modal.addClass('visible')

        // Focus.
        $modal.focus()

        // Delay.
        setTimeout(function () {
          // Unlock.
          $modal[0]._locked = false
        }, 600)
      })
      .on('click', '.modal', function (event) {
        const $modal = $(this)
        const $modalImg = $modal.find('img')

        // Locked? Bail.
        if ($modal[0]._locked) { return }

        // Already hidden? Bail.
        if (!$modal.hasClass('visible')) { return }

        // Lock.
        $modal[0]._locked = true

        // Clear visible, loaded.
        $modal
          .removeClass('loaded')

        // Delay.
        setTimeout(function () {
          $modal
            .removeClass('visible')

          setTimeout(function () {
            // Clear src, alt.
            $modalImg.attr('src', '')
            $modalImg.attr('alt', '')

            // Unlock.
            $modal[0]._locked = false

            // Focus.
            $body.focus()
          }, 475)
        }, 125)
      })
      .on('keypress', '.modal', function (event) {
        const $modal = $(this)

        // Escape? Hide modal.
        if (event.keyCode === 27) { $modal.trigger('click') }
      })
      .prepend('<div class="modal" tabIndex="-1"><div class="inner"><img src="" alt="" /></div></div>')
      .find('img')
      .on('load', function (event) {
        const $modalImg = $(this)
        const $modal = $modalImg.parents('.modal')

        setTimeout(function () {
          // No longer visible? Bail.
          if (!$modal.hasClass('visible')) { return }

          // Set loaded.
          $modal.addClass('loaded')
        }, 275)
      })
  })
})(window.jQuery)
