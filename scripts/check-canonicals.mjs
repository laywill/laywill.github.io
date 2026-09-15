#!/usr/bin/env node
// Keeps three lists in agreement (#146): the .html files static.yml deploys,
// the <loc>s in sitemap.xml, and each page's rel=canonical. A missing or stale
// canonical is otherwise invisible pre-deploy: lychee can't tell a new page's
// 404 from the sitemap's. Always checks the whole tree, so it takes no
// arguments.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Deployed but deliberately unindexed; see CLAUDE.md.
const EXCEPTIONS = new Set(['under_construction.html', 'google519c92453ea72bf0.html'])

const read = (file) => readFile(path.join(ROOT, file), 'utf8')

// The .html operands of every `cp ... _site/` in static.yml. Backslash
// continuations are joined first so a multi-line cp reads as one command.
function deployedPages (workflow) {
  const pages = new Set()
  const joined = workflow.replace(/\\\r?\n/g, ' ')
  for (const line of joined.split(/\r?\n/)) {
    const words = line.trim().split(/\s+/)
    if (words[0] !== 'cp' || words.at(-1) !== '_site/') continue
    for (const word of words.slice(1, -1)) {
      if (word.endsWith('.html')) pages.add(word)
    }
  }
  return pages
}

// rel=canonical hrefs in a page, ignoring anything inside an HTML comment.
function canonicals (html) {
  const hrefs = []
  const uncommented = html.replace(/<!--[\s\S]*?-->/g, '')
  for (const [tag] of uncommented.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = {}
    for (const m of tag.matchAll(/([^\s=/<>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g)) {
      attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4]
    }
    const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/)
    if (rel.includes('canonical')) hrefs.push(attrs.href)
  }
  return hrefs
}

async function main () {
  const failures = []
  const fail = (file, message) => failures.push(`FAIL ${file}: ${message}`)

  const base = `https://${(await read('CNAME')).trim()}/`
  const deployed = deployedPages(await read('.github/workflows/static.yml'))
  if (deployed.size === 0) fail('.github/workflows/static.yml', 'no .html files found in a `cp ... _site/` command')

  // sitemap <loc> -> the file it names. The root URL is index.html.
  const expected = new Map()
  const sitemap = await read('sitemap.xml')
  for (const [, loc] of sitemap.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/g)) {
    if (!loc.startsWith(base)) {
      fail('sitemap.xml', `<loc>${loc}</loc> is not under ${base}`)
      continue
    }
    const file = loc === base ? 'index.html' : loc.slice(base.length)
    if (expected.has(file)) fail('sitemap.xml', `<loc>${loc}</loc> is listed more than once`)
    expected.set(file, loc)
  }

  for (const file of deployed) {
    if (!EXCEPTIONS.has(file) && !expected.has(file)) {
      fail(file, 'deployed by static.yml but has no <loc> in sitemap.xml')
    }
  }
  for (const [file, loc] of expected) {
    if (EXCEPTIONS.has(file)) fail(file, `is a documented exception but sitemap.xml lists ${loc}`)
    else if (!deployed.has(file)) fail(file, `in sitemap.xml as ${loc} but not deployed by static.yml`)
  }

  for (const [file, loc] of expected) {
    if (EXCEPTIONS.has(file)) continue
    const html = await read(file).catch(() => null)
    if (html === null) {
      fail(file, `in sitemap.xml as ${loc} but the file does not exist`)
      continue
    }
    const hrefs = canonicals(html)
    if (hrefs.length !== 1) {
      fail(file, `expected exactly one rel="canonical", found ${hrefs.length}`)
    } else if (hrefs[0] !== loc) {
      fail(file, `canonical href "${hrefs[0]}" does not match sitemap <loc> "${loc}"`)
    }
  }

  for (const file of EXCEPTIONS) {
    const html = await read(file).catch(() => null)
    if (html !== null && canonicals(html).length > 0) {
      fail(file, 'is deliberately unindexed and must not carry a rel="canonical"')
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(failure)
    console.error('\nstatic.yml\'s cp allowlist, sitemap.xml and each page\'s canonical must agree.')
    console.error('See "Adding, renaming or removing a page" in CLAUDE.md.')
    process.exit(1)
  }

  console.log(`${expected.size} indexed page(s) checked: allowlist, sitemap.xml and canonicals agree.`)
}

main()
