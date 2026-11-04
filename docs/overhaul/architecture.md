# Technical Architecture

## Stack

- **Astro** with **strict TypeScript** (`"extends": "astro/tsconfigs/strict"`). All custom scripting in TS; ship zero client JS unless a component earns it (lightbox, etc.).
- **Content collections** (`src/content/`) for Notes and Interests — authored in Markdown with typed frontmatter schemas (zod).
- **Images via `astro:assets`**: build-time responsive `srcset`, WebP/AVIF, lazy loading, enforced `width`/`height`. Committed source images ≤ 2560px longest edge; full-res originals never enter git. Gallery lightbox loads a larger rendition on click.
- **Icons**: Iconify sets via `astro-icon` — build-time inline SVG, no runtime icon font.
- **Styling**: plain CSS (or scoped Astro styles) built on a single design-tokens file of CSS custom properties from [colour-scheme.md](colour-scheme.md) and [typography.md](typography.md). No CSS framework unless a component issue justifies one.
- **Minification**: Astro minifies HTML/CSS/JS at build; no separate minifier step needed.

## Repo hygiene (ported from [laywill/github-template](https://github.com/laywill/github-template))

`.mega-linter.yml` (customised for Astro/TS/Markdown), `.pre-commit-config.yaml`, `.editorconfig`, `.cspell.json`, `.yamllint.yml`, `.gitattributes`, `.gitignore`, devcontainer, CONTRIBUTING/SECURITY community files. Dependabot: github-actions + **npm** ecosystems.

## CI/CD

### On every push / PR to `main`

- MegaLinter
- Astro build (`astro check` + `astro build`)
- Internal link check on the built output
- Accessibility check: axe-core over the built output (`npm run a11y`). Structure, naming and ARIA only — jsdom does no layout, so contrast is governed by the computed ratios in [colour-scheme.md](colour-scheme.md) instead. See [component-library.md](component-library.md)
- SAST: CodeQL (JS/TS), dependency review (PRs), OSSF Scorecard; secret scanning + push protection enabled in repo settings

### Deploys — tag-gated only

Deploys happen **only from `v*` tags**. The release workflow:

```text
tag push v* ──► lint ─┐                  ┌► link check ─┐
             ├► SAST ─┼──► build ────────┤              ├► deploy
             └► check ┘                  └► a11y ───────┘  (needs: all)
```

- The `deploy` job `needs:` every check job — no deployment can occur except from a tagged version that passed everything.
- `-rc` pre-release tags (e.g. `v2.0.0-rc.1`) run the full pipeline but **skip the deploy step** — used to prove the pipeline before launch.
- Optionally protect the `github-pages` environment to tag refs only.
- Artifact contains the built `dist/` output only — never the repo tree (v1 shipped its entire 213 MB working tree).

## Hosting and domains

- GitHub Pages, deployed via `actions/deploy-pages`.
- **Canonical host: `https://williamlay.co.uk`** (apex) — matches the live `CNAME` on `master`, so cutover requires no domain change. `astro.config.mjs`'s `site` and `public/CNAME` (added at cutover, per E6 below) both use the apex.
- DNS: apex `williamlay.co.uk` A/AAAA (or ALIAS) records → GitHub Pages IPs; `www` CNAME record → `laywill.github.io` so GitHub serves the www → apex redirect. Verify/add at the registrar (`needs-william`).
- All canonical URLs, sitemap entries and OG tags use the apex host.

## SEO / discovery

- `robots.txt`, `llms.txt` (AI-crawler guidance — the practical form of "agents.txt"), `@astrojs/sitemap`.
- Per-page `<title>`/description, Open Graph + Twitter Card meta, canonical URLs, favicon set.
- JSON-LD `Person` schema on the landing page (name, jobTitle, sameAs → LinkedIn/GitHub) — primary lever for AI-search/knowledge-panel results.
- RSS feed for Notes.

## Analytics

GoatCounter: free personal tier, privacy-friendly (no cookies, no consent banner), single ~3 KB script. Site code created by William (`needs-william`).

## Branching / release model

- `main` — the v2 site; default branch after cutover. Orphan branch: shares no history with `master`.
- `master` — frozen v1 site, tagged `v1.0.0`; keeps serving GitHub Pages until cutover, then its workflow is disabled and the branch is retained as an archive.
- Work branches: `<type>/<issue-number>-<slug>` off `main`, PR back into `main`, Conventional Commits.
- Releases: SemVer tags. `v2.0.0` = launch.

## Cutover runbook (E6)

1. Pre-flight: `v2.0.0-rc.N` tag green end-to-end (lint, SAST, build, link check, accessibility; deploy step skipped).
2. Confirm DNS: apex + `www` CNAME records in place; `public/CNAME` = `williamlay.co.uk`.
3. Flip repo default branch `master` → `main`.
4. Disable `master`'s `static.yml` workflow (delete on a tiny final master commit, or disable via Actions UI).
5. Push tag `v2.0.0` → pipeline deploys the new site.
6. Verify: `https://williamlay.co.uk` serves v2; www redirects to apex; HTTPS cert valid for both; old-URL redirect stubs work.
7. Re-verify Google Search Console; submit sitemap.
8. Lighthouse audit — Performance / Accessibility / SEO ≥ 95.
9. Delete stale remote branches (`graphic_redesign`, `development`, old dependabot branches).
10. Post-launch: LinkedIn announcement (`needs-william`); check GoatCounter is collecting.

Rollback: revert default branch to `master`, re-enable its workflow, push any commit to `master` to redeploy v1.
