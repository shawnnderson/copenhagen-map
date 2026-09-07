#!/usr/bin/env node
/**
 * Generates the PWA / home-screen icons into public/icons.
 * Zero dependencies: rasterises a map pin and encodes PNGs with node:zlib.
 * Re-run with `npm run icons` after changing BRAND.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons')

const BRAND = [22, 23, 26] // editorial ink, matching --color-ink
const GLYPH = [255, 255, 255]

/* ---------- PNG encoding ---------- */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------- shapes (unit space, 0..1) ---------- */

const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r

function inRoundRect(x, y, r) {
  if (x < 0 || x > 1 || y < 0 || y > 1) return false
  const cx = Math.min(Math.max(x, r), 1 - r)
  const cy = Math.min(Math.max(y, r), 1 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r || (x >= r && x <= 1 - r) || (y >= r && y <= 1 - r)
}

// Teardrop pin: a disc unioned with a tapering triangle, minus the inner hole.
function pinAlpha(x, y, scale, offsetY) {
  const cx = 0.5
  const cy = 0.42 * scale + offsetY
  const r = 0.23 * scale
  const tipY = cy + r * 2.45
  const shoulder = cy + r * 0.42

  const inDisc = inCircle(x, y, cx, cy, r)
  let inTail = false
  if (y >= shoulder && y <= tipY) {
    const t = (y - shoulder) / (tipY - shoulder)
    const halfWidth = r * 0.92 * (1 - t)
    inTail = Math.abs(x - cx) <= halfWidth
  }
  if (!inDisc && !inTail) return false
  return !inCircle(x, y, cx, cy, r * 0.4) // punch the hole
}

/* ---------- rasteriser (3x3 supersampled) ---------- */

function render(size, { maskable = false, opaque = false } = {}) {
  const buf = Buffer.alloc(size * size * 4)
  const radius = maskable ? 0 : 0.22
  const scale = maskable ? 0.78 : 1 // keep glyph inside the maskable safe zone
  const offsetY = maskable ? 0.09 : 0
  const S = 3

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bg = 0
      let fg = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const x = (px + (sx + 0.5) / S) / size
          const y = (py + (sy + 0.5) / S) / size
          const onPlate = opaque || maskable ? true : inRoundRect(x, y, radius)
          if (!onPlate) continue
          bg++
          if (pinAlpha(x, y, scale, offsetY)) fg++
        }
      }
      const total = S * S
      const plate = bg / total
      const glyph = fg / total
      const i = (py * size + px) * 4
      // Composite glyph over brand plate, then the whole thing over transparency.
      for (let c = 0; c < 3; c++) {
        const mixed = plate > 0 ? (BRAND[c] * (plate - glyph) + GLYPH[c] * glyph) / plate : 0
        buf[i + c] = Math.round(mixed)
      }
      buf[i + 3] = Math.round(plate * 255)
    }
  }
  return encodePng(size, size, buf)
}

const TARGETS = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { opaque: true }],
  ['favicon-64.png', 64, {}],
]

await mkdir(OUT, { recursive: true })
for (const [name, size, opts] of TARGETS) {
  const png = render(size, opts)
  await writeFile(resolve(OUT, name), png)
  console.log(`✓ ${name} — ${size}×${size}, ${(png.length / 1024).toFixed(1)} KB`)
}
