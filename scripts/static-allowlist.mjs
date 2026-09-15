// The `cp ... _site/` allowlist in .github/workflows/static.yml is the one
// list of pages the site serves. check-canonicals.mjs and check-render.mjs
// both derive from it, and until #162 each carried its own parser. They had
// already drifted: the render check's regex read only the first `cp ... _site/`
// and threw when it matched none, so a page added in a later cp command would
// deploy but never be rendered. One parser, one set of exceptions, here.
//
// A module, not an entry point.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Deployed on purpose but absent from sitemap.xml, sitemap.html and llms.txt,
// so they carry no rel=canonical either. See "Adding, renaming or removing a
// page" in CLAUDE.md.
export const UNINDEXED = new Set(['under_construction.html', 'google519c92453ea72bf0.html'])

// Named .html but not a page: a site-verification stub that is deliberately
// invalid HTML, so there is nothing to render or lint. Matched by name rather
// than by a `google*.html` pattern, so that adding a second stub fails the
// checks that need to know about it instead of being skipped silently.
export const NOT_A_PAGE = new Set(['google519c92453ea72bf0.html'])

// The .html operands of every `cp ... _site/` in the workflow, in the order
// they appear. Backslash continuations are joined first so a multi-line cp
// reads as one command, and a leading `run:` is dropped so a single-line step
// counts too.
export function parseAllowlist (workflow) {
  const pages = new Set()
  const joined = workflow.replace(/\\\r?\n/g, ' ')
  for (const line of joined.split(/\r?\n/)) {
    const words = line.trim().replace(/^(?:-\s+)?run:\s*/, '').split(/\s+/)
    if (words[0] !== 'cp' || words.at(-1) !== '_site/') continue
    for (const word of words.slice(1, -1)) {
      if (word.endsWith('.html')) pages.add(word)
    }
  }
  return [...pages]
}

// Finding nothing means static.yml has changed shape, not that the site
// serves no pages: an empty list would quietly pass every check that reads it.
export async function deployedPages () {
  const file = '.github/workflows/static.yml'
  const pages = parseAllowlist(await readFile(path.join(ROOT, file), 'utf8'))
  if (pages.length === 0) {
    throw new Error(`no .html files found in a \`cp ... _site/\` command in ${file}`)
  }
  return pages
}
