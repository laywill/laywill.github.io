#!/usr/bin/env node
// Builds images/og-card.jpg, the one Open Graph image every page points at
// (#130). The card is laid out as HTML and screenshotted in headless Chrome
// rather than composited directly, so the type is set in the site's own
// self-hosted Source Sans Pro and its own accent colour instead of a
// hand-measured approximation of them.
//
// Not part of CI, and nothing checks the committed JPEG still matches this
// source: run it by hand after changing the headshot or the wording, and
// commit the result alongside. `npm run og-card`.
//
// The master it crops is in images/will/JPEGs/, which static.yml strips from
// the deploy - those are full-resolution originals kept for reference. The
// card written here is what ships.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'

import sharp from 'sharp'

import { ROOT } from './static-allowlist.mjs'

/* global WebSocket */

// The source is pre-cropped to the card's own proportions, with the subject
// held left so the studio backdrop carries the type. Recrop the master rather
// than moving the text if that balance ever changes.
const SOURCE = 'images/will/JPEGs/2026_Headshot_1200x630_offset_left.jpg'
const OUTPUT = 'images/og-card.jpg'

// Facebook's and LinkedIn's crawlers both read 1.91:1; this is that ratio at
// the size LinkedIn renders without upscaling.
const WIDTH = 1200
const HEIGHT = 630

const PAGE_TIMEOUT_MS = 30000

// Captured at 2x and resized down, because Chrome's text rasterisation at
// 1200px wide is visibly coarser than a supersampled one.
const CAPTURE_SCALE = 2

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2'
}

// The card's copy. Everything here is duplicated from the site rather than
// derived from it - there is no page this card belongs to - so it has to be
// changed here and rebuilt when the site's self-description changes.
const NAME = 'William Lay'
const DOMAIN = 'williamlay.co.uk'
// Split by hand: left to wrap, the first line ends on a separator.
const ROLES = 'Engineer &middot; Leader &middot; Photographer<br />Production Technician &middot; Sound Engineer'

const CARD = `<!DOCTYPE html>
<html lang="en-GB">

<head>
  <meta charset="utf-8" />
  <style>
    /* Weight 300 and 400 with the headings' -0.05em kerning, as assets/sass/libs/_vars.scss sets them. */
    @font-face {
      font-family: "Source Sans Pro";
      font-style: normal;
      font-weight: 300;
      font-display: block;
      src: url("assets/fonts/source-sans-pro-latin-300.woff2") format("woff2");
    }

    @font-face {
      font-family: "Source Sans Pro";
      font-style: normal;
      font-weight: 400;
      font-display: block;
      src: url("assets/fonts/source-sans-pro-latin-400.woff2") format("woff2");
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }

    body { font-family: "Source Sans Pro", Helvetica, sans-serif; font-weight: 300; }

    .card { width: ${WIDTH}px; height: ${HEIGHT}px; position: relative; overflow: hidden; }

    .photo { position: absolute; inset: 0; width: ${WIDTH}px; height: ${HEIGHT}px; display: block; }

    /* Ranged off the midline, clear of the subject, in the photograph's own
       backdrop - no panel or scrim over the image. */
    .text {
      position: absolute;
      left: 600px;
      right: 64px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 22px;
      color: #16181c;
    }

    .domain { font-weight: 400; font-size: 19px; letter-spacing: 0.125em; text-transform: uppercase; }

    h1 { font-weight: 300; font-size: 78px; line-height: 1.02; letter-spacing: -0.05em; }

    .rule { width: 64px; height: 4px; background: #47D3E5; }

    .roles { font-size: 25px; line-height: 1.5; letter-spacing: -0.01em; color: rgba(0, 0, 0, 0.72); }
  </style>
</head>

<body>
  <div class="card">
    <img class="photo" src="${SOURCE}" alt="" />
    <div class="text">
      <div class="domain">${DOMAIN}</div>
      <h1>${NAME}</h1>
      <div class="rule"></div>
      <div class="roles">${ROLES}</div>
    </div>
  </div>
</body>

</html>`

// Serves the repo tree, plus the card itself at /og-card.html so that the
// photo and the fonts resolve as ordinary relative paths.
function serve () {
  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (urlPath === '/og-card.html') {
      res.writeHead(200, { 'Content-Type': CONTENT_TYPES['.html'] })
      res.end(CARD)
      return
    }
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

// Chrome discovery, launch and the CDP client below mirror check-render.mjs.
// They are copied rather than shared because extracting them means touching
// the render check, which is a different change from this one; #171 tracks it.
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

function withTimeout (promise, what) {
  let timer
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out waiting for ${what}`)), PAGE_TIMEOUT_MS)
    })
  ]).finally(() => clearTimeout(timer))
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

  let stderr = ''
  const wsUrl = await withTimeout(new Promise((resolve, reject) => {
    chrome.stderr.on('data', chunk => {
      stderr += chunk
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
      if (match) resolve(match[1])
    })
    chrome.on('error', reject)
    chrome.on('exit', code => reject(new Error(`Chrome exited (${code}):\n${stderr}`)))
  }), 'the DevTools URL').catch(async err => {
    await stopChrome(chrome)
    throw err
  })
  chrome.stderr.resume()
  return { chrome, wsUrl }
}

// Wait for the exit, not just the signal: on Windows the user-data-dir stays
// locked until Chrome has gone, so removing it straight after kill() fails.
async function stopChrome (chrome) {
  if (chrome.exitCode !== null || chrome.signalCode !== null || !chrome.pid) return
  const exited = new Promise(resolve => chrome.once('exit', resolve))
  chrome.kill()
  await withTimeout(exited, 'Chrome to exit').catch(() => chrome.kill('SIGKILL'))
}

async function connect (wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  let nextId = 0
  const pending = new Map()
  let closed = null

  ws.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data)
    if (msg.id === undefined) return
    const call = pending.get(msg.id)
    if (!call) return
    pending.delete(msg.id)
    if (msg.error) call.reject(new Error(`${msg.error.message} (${msg.error.code})`))
    else call.resolve(msg.result)
  })

  ws.addEventListener('close', () => {
    closed = new Error('lost the DevTools connection to Chrome')
    for (const call of pending.values()) call.reject(closed)
    pending.clear()
  })

  return {
    send (method, params = {}, sessionId) {
      if (closed) return Promise.reject(closed)
      const id = nextId++
      ws.send(JSON.stringify({ id, method, params, sessionId }))
      return withTimeout(new Promise((resolve, reject) => pending.set(id, { resolve, reject })), method)
        .finally(() => pending.delete(id))
    },
    close () { ws.close() }
  }
}

async function main () {
  const server = await serve()
  const { port } = server.address()
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'og-card-'))
  let chrome

  try {
    const launched = await launchChrome(userDataDir)
    chrome = launched.chrome
    const cdp = await connect(launched.wsUrl)

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: WIDTH, height: HEIGHT, deviceScaleFactor: CAPTURE_SCALE, mobile: false }, sessionId)
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/og-card.html` }, sessionId)

    // The faces are font-display: block, so without waiting on document.fonts
    // the capture can land on the fallback and nothing about the result says
    // so. The photo is waited on for the same reason.
    const { result } = await cdp.send('Runtime.evaluate', {
      expression: `(async () => {
        await document.fonts.ready
        const photo = document.querySelector('.photo')
        if (!photo.complete) {
          await new Promise(resolve => {
            photo.addEventListener('load', resolve, { once: true })
            photo.addEventListener('error', resolve, { once: true })
          })
        }
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        return {
          photoWidth: photo.naturalWidth,
          // Waiting on document.fonts.ready is not the same as checking it
          // worked: it resolves once the faces have settled, loaded or errored
          // alike, so a 404 on a woff2 would otherwise write a card silently
          // set in Helvetica. The card uses both declared weights, so every
          // face in the set is expected to have loaded.
          unloadedFaces: [...document.fonts]
            .filter(face => face.status !== 'loaded')
            .map(face => face.family + ' ' + face.weight + ' (' + face.status + ')')
        }
      })()`,
      awaitPromise: true,
      returnByValue: true
    }, sessionId)

    if (!result.value.photoWidth) throw new Error(`${SOURCE} did not load`)
    if (result.value.unloadedFaces.length > 0) {
      throw new Error(`font face(s) did not load: ${result.value.unloadedFaces.join(', ')}`)
    }

    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: CAPTURE_SCALE },
      captureBeyondViewport: true
    }, sessionId)

    const jpeg = await sharp(Buffer.from(data, 'base64'))
      .resize(WIDTH, HEIGHT, { fit: 'fill', kernel: 'lanczos3' })
      .jpeg({ quality: 88, progressive: true, mozjpeg: true })
      .toBuffer()

    await writeFile(path.join(ROOT, OUTPUT), jpeg)
    cdp.close()
    console.log(`${OUTPUT}: ${WIDTH}x${HEIGHT}, ${(jpeg.length / 1024).toFixed(0)} KB`)
  } finally {
    if (chrome) await stopChrome(chrome)
    server.close()
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {})
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
