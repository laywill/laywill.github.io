#!/usr/bin/env node
// Lays out every deployed page in headless Chrome and fails on what static
// linting can't see (#118): an <img> whose width/height attributes, or whose
// stretched (object-fit: fill) box, disagree with the image's own aspect
// ratio (#105), a broken image, or a body.is-loading gate that never clears.
//
// Zero dependencies: Node 22's global WebSocket drives Chrome over CDP, and a
// node:http server serves the repo root. Chrome is found on PATH or at its
// usual install location; set CHROME_PATH to override.
//
// Ratios, not absolute sizes: the attributes describe the images as served,
// after optimize-images.mjs has resized them, not the full-size repo masters.

/* global WebSocket */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'phone', width: 375, height: 812, mobile: true }
]

// clearLoading removes is-loading at load + 100ms.
const LOADING_MARGIN_MS = 1000
const PAGE_TIMEOUT_MS = 30000

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml'
}

// The deploy allowlist is the one list of served pages, so read it rather
// than keep a second copy. The Google verification stub isn't a page.
async function listPages () {
  const workflow = await readFile(path.join(ROOT, '.github/workflows/static.yml'), 'utf8')
  const cp = workflow.match(/\bcp ((?:[^\n]*\\\r?\n)*[^\n]*?) _site\/\r?\n/)
  if (!cp) throw new Error('could not find the page allowlist in static.yml')
  return cp[1].split(/[\s\\]+/)
    .filter(f => f.endsWith('.html') && !/^google[0-9a-f]+\.html$/.test(f))
}

function serve () {
  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const file = path.join(ROOT, urlPath)
    if (!file.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end()
      return
    }
    try {
      const body = await readFile(file)
      res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end()
    }
  })
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

function findChrome () {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const candidates = []
  if (process.platform === 'win32') {
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]) {
      if (base) candidates.push(path.join(base, 'Google/Chrome/Application/chrome.exe'))
    }
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  } else {
    for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
      for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
        candidates.push(path.join(dir, name))
      }
    }
  }
  const found = candidates.find(c => existsSync(c))
  if (!found) throw new Error('Chrome not found; set CHROME_PATH')
  return found
}

async function launchChrome (userDataDir) {
  const chrome = spawn(findChrome(), [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  const wsUrl = await new Promise((resolve, reject) => {
    let stderr = ''
    const timer = setTimeout(() => reject(new Error(`Chrome printed no DevTools URL:\n${stderr}`)), PAGE_TIMEOUT_MS)
    chrome.stderr.on('data', chunk => {
      stderr += chunk
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
      if (match) {
        clearTimeout(timer)
        resolve(match[1])
      }
    })
    chrome.on('exit', code => reject(new Error(`Chrome exited (${code}):\n${stderr}`)))
  })
  chrome.stderr.resume()
  return { chrome, wsUrl }
}

// Minimal CDP client over one browser-level socket, with flattened sessions.
async function connect (wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  let nextId = 0
  const pending = new Map()
  const waiters = new Set()

  ws.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data)
    if (msg.id !== undefined) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`))
      else resolve(msg.result)
      return
    }
    for (const w of waiters) {
      if (w.method === msg.method && w.sessionId === msg.sessionId) {
        waiters.delete(w)
        w.resolve(msg.params)
      }
    }
  })

  return {
    send (method, params = {}, sessionId) {
      const id = nextId++
      ws.send(JSON.stringify({ id, method, params, sessionId }))
      return withTimeout(new Promise((resolve, reject) => pending.set(id, { resolve, reject })), method)
    },
    waitFor (method, sessionId) {
      return withTimeout(new Promise(resolve => waiters.add({ method, sessionId, resolve })), method)
    },
    close () { ws.close() }
  }
}

function withTimeout (promise, what) {
  let timer
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out waiting for ${what}`)), PAGE_TIMEOUT_MS)
    })
  ]).finally(() => clearTimeout(timer))
}

// Lazy images below the fold would never load in an unscrolled headless
// capture and so would be silently skipped. Flip them eager as the parser
// inserts them, then sweep again after load for any it missed.
const FORCE_EAGER = `
  new MutationObserver(records => {
    for (const r of records) for (const n of r.addedNodes) {
      if (n.tagName === 'IMG' && n.loading === 'lazy') n.loading = 'eager'
    }
  }).observe(document, { childList: true, subtree: true })
`

// An empty src is the gallery lightbox's placeholder, filled in on click.
const MEASURE = `(async () => {
  const imgs = [...document.images].filter(img => img.getAttribute('src'))
  for (const img of imgs) if (img.loading === 'lazy') img.loading = 'eager'
  await Promise.all(imgs.map(img => img.complete ? null : new Promise(resolve => {
    img.addEventListener('load', resolve, { once: true })
    img.addEventListener('error', resolve, { once: true })
  })))
  await new Promise(resolve => setTimeout(resolve, ${LOADING_MARGIN_MS}))
  return {
    innerWidth,
    isLoading: document.body.classList.contains('is-loading'),
    images: imgs.map(img => {
      const box = img.getBoundingClientRect()
      return {
        src: img.getAttribute('src'),
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        attrWidth: img.getAttribute('width'),
        attrHeight: img.getAttribute('height'),
        boxWidth: box.width,
        boxHeight: box.height,
        objectFit: getComputedStyle(img).objectFit
      }
    })
  }
})()`

// Heights predicted from a width and the natural ratio. The tolerances absorb
// resize rounding (1700x1000 served as 1600x941) and sub-pixel layout.
const ratioMismatch = (width, height, img, slackPx, slackFraction) => {
  const expected = width * img.naturalHeight / img.naturalWidth
  return Math.abs(height - expected) > Math.max(slackPx, expected * slackFraction) ? expected : null
}

async function checkPage (cdp, origin, page, viewport) {
  const failures = []
  const fail = (src, message) => failures.push(`FAIL ${page} @ ${viewport.name}${src ? ` ${src}` : ''}: ${message}`)

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  try {
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile
    }, sessionId)
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: FORCE_EAGER }, sessionId)

    const loaded = cdp.waitFor('Page.loadEventFired', sessionId)
    const nav = await cdp.send('Page.navigate', { url: `${origin}/${page}` }, sessionId)
    if (nav.errorText) {
      fail(null, `navigation failed: ${nav.errorText}`)
      return failures
    }
    await loaded

    const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
      expression: MEASURE,
      awaitPromise: true,
      returnByValue: true
    }, sessionId)
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
    const m = result.value

    if (m.innerWidth !== viewport.width) {
      fail(null, `viewport not applied (expected innerWidth ${viewport.width}, actual ${m.innerWidth})`)
    }
    if (m.isLoading) {
      fail(null, `body.is-loading still set ${LOADING_MARGIN_MS}ms after load`)
    }

    for (const img of m.images) {
      if (!img.complete || img.naturalWidth === 0) {
        fail(img.src, 'image did not load')
        continue
      }
      const natural = `${img.naturalWidth}x${img.naturalHeight}`

      if (img.attrWidth !== null && img.attrHeight !== null) {
        const w = Number(img.attrWidth)
        const h = Number(img.attrHeight)
        const expected = ratioMismatch(w, h, img, 1, 0.005)
        if (expected !== null) {
          fail(img.src, `width/height attributes ${w}x${h} don't match natural ratio ${natural} (expected height ~${expected.toFixed(1)} for width ${w})`)
        }
      }

      if (img.objectFit === 'fill' && img.boxWidth > 0 && img.boxHeight > 0) {
        const expected = ratioMismatch(img.boxWidth, img.boxHeight, img, 2, 0.02)
        if (expected !== null) {
          fail(img.src, `displayed ${img.boxWidth.toFixed(1)}x${img.boxHeight.toFixed(1)} with object-fit: fill distorts natural ratio ${natural} (expected height ~${expected.toFixed(1)})`)
        }
      }
    }
  } catch (err) {
    fail(null, err.message)
  } finally {
    await cdp.send('Target.closeTarget', { targetId })
  }
  return failures
}

async function main () {
  const pages = await listPages()
  const server = await serve()
  const origin = `http://127.0.0.1:${server.address().port}`
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'check-render-'))
  let chrome
  let failures = []

  try {
    const launched = await launchChrome(userDataDir)
    chrome = launched.chrome
    const cdp = await connect(launched.wsUrl)
    for (const page of pages) {
      for (const viewport of VIEWPORTS) {
        failures = failures.concat(await checkPage(cdp, origin, page, viewport))
      }
    }
    cdp.close()
  } finally {
    chrome?.kill()
    server.close()
    await rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {})
  }

  for (const f of failures) console.error(f)
  const checked = `${pages.length} page(s) at ${VIEWPORTS.map(v => `${v.width}px`).join(' and ')}`
  if (failures.length > 0) {
    console.error(`\n${failures.length} render failure(s) across ${checked}.`)
    process.exit(1)
  }
  console.log(`${checked} rendered: images load, keep their aspect ratio, and is-loading clears.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
