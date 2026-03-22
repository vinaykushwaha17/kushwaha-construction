#!/usr/bin/env node
// Run this script to generate PWA icons: node scripts/generate-icons.js
// Requires: npm install canvas

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const iconsDir = path.join(__dirname, '../public/icons')

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

sizes.forEach(size => {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#2563eb'
  ctx.fillRect(0, 0, size, size)

  // Hard hat icon (simplified)
  const center = size / 2
  const scale = size / 192

  // Draw "KC" text
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.35}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('KC', center, center)

  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), buffer)
  console.log(`Generated icon-${size}x${size}.png`)
})

console.log('Icons generated successfully!')
