# Content Audit — v1 (master) → v2 (main)

Inventory date: 2026-09-04. The v1 site is preserved on `master` (tag `v1.0.0`).

## What dies

| Item                                                                            | Reason                                                                                                                                                                                                                                              |
|---------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `index-demo.html`, `assets/js/demo.js`                                          | HTML5 UP template demo, accidentally deployed                                                                                                                                                                                                       |
| `under_construction.html`                                                       | Dead-end stub linked from three homepage cards                                                                                                                                                                                                      |
| `prod_tech.html`                                                                | Production Technician is no longer a professional identity; salvage a short "past life" mention + a few images for Interests                                                                                                                        |
| `photographer.html`                                                             | Photography becomes an interest, not a profession; curated best shots move to Interests                                                                                                                                                             |
| `engineer.html`                                                                 | Content (firmware/DSP/microelectronics) describes a previous career phase; superseded by software/DevOps/leadership focus                                                                                                                           |
| jQuery 1.11.3, skel.js, scrollex, scrolly, Font Awesome 4.6.3 + 900 KB webfonts | Dead 2015-era stack; Astro rebuild replaces wholesale                                                                                                                                                                                               |
| `docs/CV_William_Lay.pdf`                                                       | Replaced by link to latest release: `https://github.com/laywill/CV/releases/latest/download/<asset>.pdf` (fallback: the [latest release page](https://github.com/laywill/CV/releases/latest)). Confirm the asset filename is stable across releases |
| UA analytics `UA-106572147-1`                                                   | Dead since July 2023; replaced by GoatCounter                                                                                                                                                                                                       |
| `.htaccess`                                                                     | Apache-only, inert on GitHub Pages                                                                                                                                                                                                                  |
| ~1,000-char keyword-stuffed `<meta name="keywords">`                            | Ignored by search engines, reads as spam                                                                                                                                                                                                            |
| `terms-and-conditions.html`                                                     | Credits covered stock imagery being deleted; new stock (Pexels/Unsplash) gets a fresh, minimal credits note                                                                                                                                         |
| html5up.net attribution links (×8)                                              | CC-BY obligation dies with the template code                                                                                                                                                                                                        |
| 213 MB image tree with fake thumbnails                                          | Curated + optimised replacements only; originals stay out of git                                                                                                                                                                                    |

## What migrates

- **Curated photography**: ~10–15 best shots across event / landscape / portrait work, chosen by William (`needs-william`), resized ≤ 2560px and optimised before commit. Candidates include the strongest of `images/gallery/photographer/` and `images/gallery/lighting/`.
- **A few production-tech images** if the Interests "past life" note wants them.
- **Social links** (GitHub, LinkedIn) — verify and update.
- **Google Search Console verification** (`google519c92453ea72bf0.html`) — carry over or re-verify via DNS at cutover.
- **CNAME** — becomes `www.williamlay.co.uk` in the Astro `public/` dir (see architecture.md).

## New sitemap

```text
/                  Landing: hero (name, professional one-liner), LinkedIn CTA,
                   proof strip, toolbox icon grid, brief interests teaser, footer
/professional/     Depth: engineering, DevOps, agile coaching, leadership;
                   diagrams/timeline over prose; CV link
/interests/        Photography gallery (curated), production tech "past life",
                   bell ringing, homelab/projects
/notes/            Markdown content collection listing (many subjects, no cadence)
/notes/<slug>/     Individual note
/404               Styled 404
```

Old URLs (`/engineer.html`, `/photographer.html`, `/prod_tech.html`) get meta-refresh redirect stubs to their nearest new equivalent — GitHub Pages has no server-side redirects.

## Copy sources

- CV content (laywill/cv `body.tex`, both variants) is the canonical record of roles/skills — mine it for landing/professional copy rather than inventing.
- GitHub profile and pinned repos as proof elements.
