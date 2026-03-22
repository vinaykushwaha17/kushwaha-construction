#!/usr/bin/env node
/**
 * Creates simple PNG icons for PWA without external dependencies.
 * Uses pure Node.js to write minimal valid PNG files.
 *
 * Run: node scripts/create-icons.js
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function createPNG(width, height, bgColor, textColor) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type: RGB
  ihdr[10] = 0  // compression method
  ihdr[11] = 0  // filter method
  ihdr[12] = 0  // interlace method

  // Create raw image data (RGB)
  const rawData = []
  for (let y = 0; y < height; y++) {
    rawData.push(0) // filter type for each row
    for (let x = 0; x < width; x++) {
      rawData.push(bgColor[0], bgColor[1], bgColor[2])
    }
  }

  const rawBuffer = Buffer.from(rawData)
  const compressed = zlib.deflateSync(rawBuffer, { level: 9 })

  function makeChunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const typeBuffer = Buffer.from(type, 'ascii')
    const crcInput = Buffer.concat([typeBuffer, data])
    const crc = computeCRC(crcInput)
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc >>> 0, 0)
    return Buffer.concat([len, typeBuffer, data, crcBuf])
  }

  function computeCRC(buf) {
    let crc = 0xFFFFFFFF
    const table = makeCRCTable()
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
    }
    return (crc ^ 0xFFFFFFFF)
  }

  function makeCRCTable() {
    const table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      }
      table[n] = c
    }
    return table
  }

  const ihdrChunk = makeChunk('IHDR', ihdr)
  const idatChunk = makeChunk('IDAT', compressed)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

const iconsDir = path.join(__dirname, '../public/icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
// Blue background: #2563eb = rgb(37, 99, 235)
const bgColor = [37, 99, 235]
const textColor = [255, 255, 255]

sizes.forEach(size => {
  const pngData = createPNG(size, size, bgColor, textColor)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), pngData)
  console.log(`✓ Created icon-${size}x${size}.png`)
})

console.log('\nIcons created! For better icons with text, install canvas: npm install canvas')
console.log('Then run: node scripts/generate-icons.js')
