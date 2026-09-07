# Contributing

Thanks for taking the time to contribute.

`main` is the active development branch for the v2 rebuild of
williamlay.co.uk (Astro + strict TypeScript). It shares no history with
`master`, which is the frozen v1 site still serving GitHub Pages until
cutover — see [docs/overhaul/architecture.md](docs/overhaul/architecture.md)
for the full picture. All new work happens on branches cut from `main` and
PR'd back into `main`.

## Reporting bugs / requesting features

Please use the provided [issue templates](.github/ISSUE_TEMPLATE/) when
opening an issue. Every piece of work should trace to an issue.

## Local setup

Pre-commit hooks run from a **project-local Python virtual environment**
(`.venv/`, gitignored) rather than a global install, so hook versions stay
pinned per-checkout. Set it up with [uv](https://docs.astral.sh/uv/):

```sh
uv venv
uv pip install pre-commit
pre-commit install
```

`pre-commit install` registers the git hook so checks run automatically on
`git commit`. To run everything against the whole repo (recommended before
opening a PR, and required the first time since the hooks only run against
files touched by a commit):

```sh
pre-commit run --all-files
```

On Windows outside the devcontainer/WSL, invoke the venv's own binary
directly if `pre-commit` isn't on your `PATH`:
`.venv\Scripts\pre-commit run --all-files`.

The [devcontainer](.devcontainer/devcontainer.json) does this setup for you
automatically on container create.

## Branching and commits

- Branch names: `<type>/<issue-number>-<slug>` (e.g. `feat/42-landing-hero`,
  `chore/22-repo-hygiene-configs`).
- Commit messages: [Conventional Commits](https://www.conventionalcommits.org/).
- A `no-commit-to-branch` pre-commit hook blocks direct commits to `main` and
  `master` — work always happens on a branch, merged via PR.

## Submitting changes

1. Branch off `main` (see naming convention above) and make your changes.
2. Run `pre-commit run --all-files` before pushing — it catches most issues
   locally, faster than waiting for CI.
3. Open a pull request against `main` using the provided
   [PR template](.github/PULL_REQUEST_TEMPLATE.md).
4. CI runs on every PR: [MegaLinter](https://megalinter.io/), CodeQL,
   `astro check` + `astro build`, an internal link check over the built
   output, and an axe-core accessibility check over the same built output
   (`npm run a11y` — it checks structure, naming and ARIA, not contrast or
   responsive behaviour; see
   [docs/overhaul/component-library.md](docs/overhaul/component-library.md)).
   Fix any reported issues (or apply MegaLinter's auto-fixes).
5. A reviewer will be automatically requested per
   [CODEOWNERS](.github/CODEOWNERS).

## Releases and deploys

The v2 site is published **only** by pushing a `v*` tag — nothing on `main`
offers a branch-push, manual-dispatch or scheduled path to a deploy. See
[.github/workflows/release.yml](.github/workflows/release.yml). (The v1 site
still deploys on push to `master`; that path retires with the branch.)

A tag push runs lint (MegaLinter), SAST (CodeQL), build, the internal link
check over the built output, and the accessibility check. The deploy job
`needs:` all five, so a failure in any of them means no deploy. Only the built `dist/` is published,
never the repo tree.

Tags carrying a SemVer pre-release suffix (anything after a hyphen, e.g.
`v2.0.0-rc.1`) run the entire pipeline and skip **only** the deploy job — so
a release candidate is a genuine dry run of the release, not a rehearsal of
some other pipeline:

```sh
git tag v2.0.0-rc.1
git push origin v2.0.0-rc.1   # full pipeline, deploy skipped

git tag v2.0.0
git push origin v2.0.0        # full pipeline, then deploys
```

The build and link-check workflows the release gates on are the same
reusable workflows that run on every PR
([.github/workflows/ci.yml](.github/workflows/ci.yml)), so tag time should
hold no surprises.

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By
participating, you're expected to uphold it.
