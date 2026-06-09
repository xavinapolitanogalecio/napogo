// Run with: node generate-icons.mjs
// Generates simple PNG icons for the PWA manifest

import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#3b82f6'
  const r = size * 0.2
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  // Box icon
  ctx.fillStyle = 'white'
  const pad = size * 0.2
  const w = size - pad * 2
  const boxY = size * 0.35
  const boxH = size * 0.42
  const lidH = size * 0.12

  // Box body
  ctx.fillRect(pad, boxY + lidH, w, boxH - lidH)
  // Lid
  ctx.fillStyle = '#bfdbfe'
  ctx.fillRect(pad - size * 0.02, boxY, w + size * 0.04, lidH)
  // Center line
  ctx.fillStyle = '#3b82f6'
  ctx.fillRect(size / 2 - size * 0.015, boxY + lidH, size * 0.03, boxH - lidH)

  return canvas.toBuffer('image/png')
}

try {
  writeFileSync('./public/icons/icon-192.png', generateIcon(192))
  writeFileSync('./public/icons/icon-512.png', generateIcon(512))
  console.log('Icons generated successfully!')
} catch (e) {
  console.log('canvas package not available — place your own icons in public/icons/')
}
