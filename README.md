# williamlay.co.uk

Personal website of William Lay — software engineering, DevOps, agile coaching, engineering leadership.

**This branch (`main`) is the v2 rebuild**, started fresh with no parent history. The original 2017 HTML5 UP site lives on the `master` branch, tagged [`v1.0.0`](../../releases/tag/v1.0.0), and continues to serve the live site until cutover.

## Status

Under construction. Work is organised as GitHub issues grouped under epic issues — see the [Website Overhaul project board](../../issues?q=is%3Aissue+label%3Aepic).

## Stack (planned)

- [Astro](https://astro.build/) with strict TypeScript
- Markdown content collections for Notes and Interests
- GitHub Pages via tag-gated GitHub Actions deploys (`v*` tags only, after lint + SAST + build pass)
- Canonical host: `https://www.williamlay.co.uk`

## Reference material

Design and architecture decisions live in [`docs/overhaul/`](docs/overhaul/):

| File | Contents |
| --- | --- |
| [design-brief.md](docs/overhaul/design-brief.md) | Purpose, audience, CTA hierarchy, design principles and anti-patterns |
| [colour-scheme.md](docs/overhaul/colour-scheme.md) | VS Code Dark+ palette tokens and semantic mapping |
| [typography.md](docs/overhaul/typography.md) | Font choices and CV-matching name treatment |
| [content-audit.md](docs/overhaul/content-audit.md) | What dies, what migrates, the new sitemap |
| [architecture.md](docs/overhaul/architecture.md) | Technical architecture and cutover runbook |

## Contributing conventions

- Branches: `<type>/<issue-number>-<slug>` (e.g. `feat/42-landing-hero`), PRs into `main`
- Commits: [Conventional Commits](https://www.conventionalcommits.org/)
- Every piece of work traces to an issue

## License

This repository uses a split licence:

- **Code** (Astro components, TypeScript, configuration, build tooling, and all other source code) is licensed under the [MIT License](LICENSE).
- **Site content** — written text, photographs, and other creative works published on the site — is © William Lay 2026, All Rights Reserved, and is not licensed for reuse.
