#!/usr/bin/env node
// Keeps three lists in agreement (#146): the .html files static.yml deploys,
// the <loc>s in sitemap.xml, and each page's rel=canonical. A missing or stale
// canonical is otherwise invisible pre-deploy: lychee can't tell a new page's
// 404 from the sitemap's. Always checks the whole tree, so it takes no
// arguments.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ROOT, UNINDEXED, deployedPages } from './static-allowlist.mjs'

const read = (file) => readFile(path.join(ROOT, file), 'utf8')

// rel=canonical hrefs in a page, ignoring anything inside an HTML comment.
function canonicals (html) {
  const hrefs = []
  // Comments are matched alongside tags, not stripped first, so a <link>
  // inside one is consumed by the comment match and skipped.
  for (const [tag] of html.matchAll(/<!--[\s\S]*?(?:-->|$)|<link\b[^>]*>/gi)) {
    if (tag.startsWith('<!--')) continue
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
  const deployed = new Set(await deployedPages())

  // sitemap <loc> -> the file it names. The root URL is index.html. Comments
  // are matched and skipped, as in canonicals().
  const expected = new Map()
  const sitemap = await read('sitemap.xml')
  for (const [match, loc] of sitemap.matchAll(/<!--[\s\S]*?(?:-->|$)|<loc>\s*([^<]*?)\s*<\/loc>/g)) {
    if (match.startsWith('<!--')) continue
    if (!loc.startsWith(base)) {
      fail('sitemap.xml', `<loc>${loc}</loc> is not under ${base}`)
      continue
    }
    const file = loc === base ? 'index.html' : loc.slice(base.length)
    if (expected.has(file)) fail('sitemap.xml', `<loc>${loc}</loc> is listed more than once`)
    expected.set(file, loc)
  }

  for (const file of deployed) {
    if (!UNINDEXED.has(file) && !expected.has(file)) {
      fail(file, 'deployed by static.yml but has no <loc> in sitemap.xml')
    }
  }
  for (const [file, loc] of expected) {
    if (UNINDEXED.has(file)) fail(file, `is a documented exception but sitemap.xml lists ${loc}`)
    else if (!deployed.has(file)) fail(file, `in sitemap.xml as ${loc} but not deployed by static.yml`)
  }

  for (const [file, loc] of expected) {
    if (UNINDEXED.has(file)) continue
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

  for (const file of UNINDEXED) {
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

main().catch(err => {
  console.error(err)
  process.exit(1)
})
