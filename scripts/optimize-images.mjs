#!/usr/bin/env node
// Resizes and recompresses images under a directory in place, applying
// path-based rules so gallery thumbs/fulls and hero/content images each get
// dimensions and quality appropriate to how large they're ever displayed.
// Run at deploy time against _site/images (see .github/workflows/static.yml)
// so the full-resolution masters committed to the repo stay untouched.

import { readdir, rename, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png'])
const SKIP_BASENAMES = new Set(['favicon.png', 'favicon.svg'])
const SMALL_FILE_THRESHOLD_BYTES = 20 * 1024

const RULES = [
  { test: (p) => /(^|[\\/])gallery[\\/].*[\\/]thumbs[\\/]/.test(p), maxDimension: 600, quality: 78 },
  { test: (p) => /(^|[\\/])gallery[\\/].*[\\/]fulls[\\/]/.test(p), maxDimension: 2000, quality: 82 },
  { test: () => true, maxDimension: 1600, quality: 80 }
]

function ruleFor (relativePath) {
  return RULES.find((rule) => rule.test(relativePath))
}

async function collectImageFiles (dir, baseDir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectImageFiles(fullPath, baseDir, files)
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }
  return files
}

async function optimizeFile (filePath, baseDir) {
  const relativePath = path.relative(baseDir, filePath)
  const basename = path.basename(filePath)

  if (SKIP_BASENAMES.has(basename)) {
    return null
  }

  const { size: beforeBytes } = await stat(filePath)
  if (beforeBytes < SMALL_FILE_THRESHOLD_BYTES) {
    return null
  }

  const rule = ruleFor(relativePath)
  const ext = path.extname(filePath).toLowerCase()

  let pipeline = sharp(filePath)
    .rotate()
    .resize({ width: rule.maxDimension, height: rule.maxDimension, fit: 'inside', withoutEnlargement: true })

  pipeline = ext === '.png' ? pipeline.png({ quality: rule.quality }) : pipeline.jpeg({ quality: rule.quality })

  const optimizedBuffer = await pipeline.toBuffer()
  if (optimizedBuffer.length < beforeBytes) {
    // Write to a temp file and rename over the original rather than
    // overwriting filePath directly - sharp/libvips can still hold the
    // source file's read handle open, and writing to the same path it just
    // read from fails on Windows.
    const tempPath = `${filePath}.tmp`
    await sharp(optimizedBuffer).toFile(tempPath)
    await rename(tempPath, filePath)
    return { relativePath, beforeBytes, afterBytes: optimizedBuffer.length }
  }

  return { relativePath, beforeBytes, afterBytes: beforeBytes }
}

async function main () {
  const targetDir = process.argv[2]
  if (targetDir === undefined || targetDir === '') {
    console.error('Usage: node scripts/optimize-images.mjs <directory>')
    process.exit(1)
  }

  const baseDir = path.resolve(targetDir)
  const files = await collectImageFiles(baseDir, baseDir)

  let totalBefore = 0
  let totalAfter = 0
  let processedCount = 0

  for (const filePath of files) {
    const result = await optimizeFile(filePath, baseDir)
    if (result === null) {
      continue
    }
    processedCount += 1
    totalBefore += result.beforeBytes
    totalAfter += result.afterBytes
  }

  const savedBytes = totalBefore - totalAfter
  const savedPercent = totalBefore > 0 ? ((savedBytes / totalBefore) * 100).toFixed(1) : '0.0'

  console.log(`Processed ${processedCount} of ${files.length} image(s) under ${baseDir}`)
  console.log(`Before: ${(totalBefore / 1024 / 1024).toFixed(2)} MiB`)
  console.log(`After:  ${(totalAfter / 1024 / 1024).toFixed(2)} MiB`)
  console.log(`Saved:  ${(savedBytes / 1024 / 1024).toFixed(2)} MiB (${savedPercent}%)`)
}

main()
