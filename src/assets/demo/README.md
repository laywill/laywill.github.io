# Demo images

Generated placeholders, not photography. They exist so `Gallery.astro` and
`ResponsiveImage.astro` have something to render in the `/components/` preview
harness, and so CI's `astro build` actually exercises the `astro:assets`
pipeline (`srcset` generation, WebP/AVIF, enforced dimensions) rather than
type-checking a component nothing ever calls.

Each is a flat 2000×1333 JPEG built from palette colours — deliberately large
enough that the gallery's two renditions (grid thumbnail and full-size lightbox)
are visibly different transforms of one source.

They are replaced by William's curated photography in
[#31](https://github.com/laywill/laywill.github.io/issues/31) (image pipeline)
and [#30](https://github.com/laywill/laywill.github.io/issues/30) (Interests
page). Delete this directory at that point — nothing outside the preview harness
imports it.
