# William Lay's website (v1)

The site served at [williamlay.co.uk](https://williamlay.co.uk): a 2017
HTML5 UP "Story" template, hand-edited since. This branch, `master`, is
what's live.

The [`main` branch](https://github.com/laywill/laywill.github.io/tree/main)
holds a v2 rebuild of the site on Astro. It's an orphan branch, sharing no
history with `master`, and has its own tooling and conventions.

## Building locally

Requires Node 22.

```sh
npm ci
npm run css
```

`npm run css` compiles `assets/sass/main.scss` to `assets/css/main.css`.
Edit the Sass, never `main.css` directly, which is generated and committed.

There is no dev server or bundler: pages are static HTML, served as
authored. Open the files directly, or serve the repository root with any
static file server.

Deploys run only from `v*` tags (see
[`.github/workflows/static.yml`](.github/workflows/static.yml)); a push to
`master` publishes nothing on its own.

## Licensing

Site content, meaning written text, photographs and other creative works,
is Copyright (c) William Lay and is not licensed for reuse. The HTML5 UP
template beneath it and the bundled third-party assets carry their own
licences. [`LICENSE.txt`](LICENSE.txt) is authoritative for all of them.

## Contributing

Every change traces to a GitHub issue, uses [Conventional
Commits](https://www.conventionalcommits.org/), and branches off `master`
as `<type>/<issue-number>-<slug>`. See [`CLAUDE.md`](CLAUDE.md) for the
full conventions and pitfalls.
