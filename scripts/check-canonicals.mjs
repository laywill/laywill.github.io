#!/usr/bin/env node
// Keeps the places a page has to exist in agreement (#146, #165): the .html
// files static.yml deploys, the <loc>s in sitemap.xml, each page's
// rel=canonical, and the two hand-written indexes, sitemap.html and llms.txt.
// A missing or stale canonical is otherwise invisible pre-deploy: lychee can't
// tell a new page's 404 from the sitemap's, and it can only check the links an
// index already carries, never the page it forgot. Always checks the whole
// tree, so it takes no arguments.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ROOT, UNINDEXED, deployedPages } from './static-allowlist.mjs'

const read = (file) => readFile(path.join(ROOT, file), 'utf8')

// The attributes of one already-matched tag, lowercased names, either quoting
// style or none.
function attributes (tag) {
  const attrs = {}
  for (const m of tag.matchAll(/([^\s=/<>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4]
  }
  return attrs
}

// The named tags in a page, ignoring anything inside an HTML comment.
// Comments are matched alongside tags, not stripped first, so a tag inside one
// is consumed by the comment match and skipped.
function * tags (html, name) {
  const pattern = new RegExp(`<!--[\\s\\S]*?(?:-->|$)|<${name}\\b[^>]*>`, 'gi')
  for (const [tag] of html.matchAll(pattern)) {
    if (!tag.startsWith('<!--')) yield attributes(tag)
  }
}

function canonicals (html) {
  const hrefs = []
  for (const attrs of tags(html, 'link')) {
    const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/)
    if (rel.includes('canonical')) hrefs.push(attrs.href)
  }
  return hrefs
}

function anchorHrefs (html) {
  const hrefs = []
  for (const attrs of tags(html, 'a')) {
    if (attrs.href !== undefined) hrefs.push(attrs.href)
  }
  return hrefs
}

// Link targets in llms.txt. It is markdown-shaped prose, so a page can be
// linked either as a markdown destination or as a bare URL; both count.
function linkTargets (text) {
  return [
    ...[...text.matchAll(/\]\(\s*([^)\s]+)/g)].map(m => m[1]),
    ...[...text.matchAll(/https?:\/\/[^\s)<>"']+/g)].map(m => m[0])
  ]
}

// The page file a link target names, or null if it names anything else - an
// external site, a mailto:, an asset, or a spot on the page the link sits in.
// An absolute link to the site names the same page as the relative one, so the
// site's own origin is stripped first and its root is index.html, as in
// sitemap.xml. Query and fragment address a spot on a page, not another page.
function linkedPage (href, base) {
  const origin = base.replace(/\/+$/, '')
  let target = href.trim()
  if (target === origin) target = '/'
  else if (target.startsWith(origin + '/')) target = target.slice(origin.length)
  else if (target.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(target)) return null
  const [file] = target.split(/[?#]/)
  if (file === '') return null
  if (file === '/') return 'index.html'
  return file.endsWith('.html') ? file.replace(/^\//, '') : null
}

async function main () {
  const failures = []
  const fail = (file, message) => failures.push(`FAIL ${file}: ${message}`)

  // Every failing exit goes through here, so the pointer to the five-places
  // list is always in reach - it is the one thing someone hitting this needs.
  const report = () => {
    for (const failure of failures) console.error(failure)
    console.error('\nstatic.yml\'s cp allowlist, sitemap.xml, each page\'s canonical, sitemap.html and llms.txt must agree.')
    console.error('See "Adding, renaming or removing a page" in CLAUDE.md.')
    process.exit(1)
  }

  const base = `https://${(await read('CNAME')).trim()}/`

  // An unreadable or unparseable allowlist leaves nothing to reconcile
  // against, so report it and stop: carrying on with an empty set blames every
  // <loc> in sitemap.xml for being undeployed, one cause dressed as fourteen
  // failures.
  let deployed
  try {
    deployed = new Set(await deployedPages())
  } catch (err) {
    fail('.github/workflows/static.yml', err.message)
    report()
  }

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

  // The indexes are prose a human keeps by hand, so they drift in both
  // directions: a new page nobody added, and a link to a page that has since
  // been renamed or deliberately unindexed. Both are matched on the target
  // alone, since neither file has a position or wording to key off.
  const indexed = [...deployed].filter(file => !UNINDEXED.has(file))
  const indexes = [
    ['sitemap.html', anchorHrefs(await read('sitemap.html'))],
    ['llms.txt', linkTargets(await read('llms.txt'))]
  ]
  for (const [index, hrefs] of indexes) {
    const linked = new Set()
    for (const href of hrefs) {
      const page = linkedPage(href, base)
      if (page !== null) linked.add(page)
    }
    for (const file of indexed) {
      if (!linked.has(file)) fail(index, `does not link ${file}, which static.yml deploys`)
    }
    for (const file of linked) {
      if (UNINDEXED.has(file)) fail(index, `links ${file}, which is deliberately unindexed`)
      else if (!deployed.has(file)) fail(index, `links ${file}, which static.yml does not deploy`)
    }
  }

  if (failures.length > 0) report()

  console.log(`${indexed.length} indexed page(s) checked: allowlist, sitemap.xml, canonicals, sitemap.html and llms.txt agree.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
