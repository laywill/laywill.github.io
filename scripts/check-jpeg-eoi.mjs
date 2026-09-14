#!/usr/bin/env node
// Rejects a JPEG that has bytes after its end-of-image (FFD9) marker. Every
// decoder stops reading at EOI, so trailing bytes are invisible until someone
// measures file size - which is exactly how 18 gallery thumbnails ended up
// carrying ~70MB of a full-resolution original that had been overwritten in
// place but never truncated (#101). Takes a mix of files and directories;
// directories are walked recursively for .jpg/.jpeg.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const JPEG_EXTENSIONS = new Set(['.jpg', '.jpeg'])

// Markers with no payload: SOI, EOI, TEM, and the RSTn restart markers.
const STANDALONE = new Set([0xD8, 0xD9, 0x01])
for (let i = 0xD0; i <= 0xD7; i++) STANDALONE.add(i)

// Walks the marker segments of a JPEG buffer to find where the real EOI
// marker ends. Distinguishes a genuine marker from a stuffed 0x00 or a
// restart marker inside entropy-coded scan data, so it can't be fooled by an
// 0xFFD9-looking byte pair that is actually image data.
function findEoiEnd (buf) {
  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) {
    return { eoiEnd: null, error: 'not a JPEG (bad SOI)' }
  }
  let pos = 2
  while (pos < buf.length) {
    if (buf[pos] !== 0xFF) {
      return { eoiEnd: null, error: `expected marker at offset ${pos}, got 0x${buf[pos].toString(16)}` }
    }
    let markerPos = pos + 1
    while (markerPos < buf.length && buf[markerPos] === 0xFF) markerPos++
    if (markerPos >= buf.length) return { eoiEnd: null, error: 'truncated before marker code' }
    const marker = buf[markerPos]
    pos = markerPos + 1

    if (marker === 0xD9) return { eoiEnd: pos, error: null }
    if (STANDALONE.has(marker)) continue

    if (marker === 0xDA) {
      // Start of Scan: a length-prefixed header, then entropy-coded data
      // that runs until the next marker that isn't a stuffed byte or RSTn.
      if (pos + 2 > buf.length) return { eoiEnd: null, error: 'truncated SOS header' }
      pos += buf.readUInt16BE(pos)
      while (pos < buf.length) {
        if (buf[pos] === 0xFF) {
          if (pos + 1 >= buf.length) return { eoiEnd: null, error: 'truncated in scan data' }
          const next = buf[pos + 1]
          if (next === 0x00 || (next >= 0xD0 && next <= 0xD7)) { pos += 2; continue }
          if (next === 0xFF) { pos += 1; continue } // fill byte
          break // real marker, resume outer loop
        }
        pos += 1
      }
      continue
    }

    // Generic length-prefixed segment (APPn, COM, DQT, DHT, SOF, DRI, ...).
    if (pos + 2 > buf.length) return { eoiEnd: null, error: 'truncated segment header' }
    pos += buf.readUInt16BE(pos)
  }
  return { eoiEnd: null, error: 'no EOI marker found' }
}

async function collectFiles (targets) {
  const files = []
  async function walk (p) {
    const entries = await readdir(p, { withFileTypes: true }).catch(() => null)
    if (entries === null) {
      if (JPEG_EXTENSIONS.has(path.extname(p).toLowerCase())) files.push(p)
      return
    }
    for (const entry of entries) {
      const full = path.join(p, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (JPEG_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(full)
    }
  }
  for (const target of targets) await walk(target)
  return files
}

async function main () {
  const targets = process.argv.slice(2)
  if (targets.length === 0) {
    console.error('Usage: node scripts/check-jpeg-eoi.mjs <file-or-directory>...')
    process.exit(1)
  }

  const files = await collectFiles(targets)
  let failures = 0

  for (const file of files) {
    const buf = await readFile(file)
    const { eoiEnd, error } = findEoiEnd(buf)
    if (error) {
      console.error(`FAIL ${file}: ${error}`)
      failures++
    } else if (eoiEnd < buf.length) {
      const trailing = buf.length - eoiEnd
      console.error(`FAIL ${file}: ${trailing} byte(s) after the EOI marker (file is ${buf.length}, image ends at ${eoiEnd})`)
      failures++
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} of ${files.length} JPEG(s) have data after their EOI marker.`)
    console.error('Truncate at EOI - decoded pixels are unaffected, only the trailing bytes go.')
    process.exit(1)
  }

  console.log(`${files.length} JPEG(s) checked, none carry trailing bytes after EOI.`)
}

main()
