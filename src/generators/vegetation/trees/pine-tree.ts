import { cone } from '../../../primitives'
import { merge, snow as applySnow } from '../../../ops'
import { setup, trunk, facetShade } from '../../../build'
import { paletteGradient, pickRandom } from '../../../color'
import { UberNoise } from '../../../noise'
import { group, part, Asset } from '../../../core/asset'
import { VERTEX_COLOR_MATERIAL } from '../../../core/material'
import type { Mesh } from '../../../core/mesh'
import type { WarpFn } from '../../../core/types'
import type { OptionSchema, OptionInput } from '../../../core/schema'

export const pineSchema = {
  seed:           { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed', group: 'General' },
  height:         { type: 'range',       default: 13.5, min: 4.5,  max: 30,   step: 0.5,  label: 'Height', group: 'Trunk' },
  trunkRadius:    { type: 'range',       default: 0.36, min: 0.1,  max: 1.1,  step: 0.02, label: 'Trunk Radius', group: 'Trunk' },
  trunkRatio:     { type: 'range',       default: 0.3,  min: 0.1,  max: 0.5,  step: 0.05, label: 'Trunk Ratio', group: 'Trunk' },
  trunkTaper:     { type: 'range',       default: 1.5,  min: 0.5,  max: 4,    step: 0.1,  label: 'Root Flare', group: 'Trunk' },
  trunkTopScale:  { type: 'range',       default: 0.4,  min: 0.1,  max: 0.8,  step: 0.05, label: 'Trunk Top Scale', group: 'Trunk' },
  lean:           { type: 'range',       default: 0.7,  min: 0,    max: 3.6,  step: 0.1,  label: 'Lean', group: 'Trunk' },
  layers:         { type: 'integer',     default: 5,    min: 2,    max: 10,   label: 'Layers', group: 'Canopy' },
  layerOverlap:   { type: 'range',       default: 0.4,  min: 0,    max: 0.8,  step: 0.05, label: 'Layer Overlap', group: 'Canopy' },
  layerShrink:    { type: 'range',       default: 0.75, min: 0.4,  max: 0.95, step: 0.05, label: 'Layer Shrink', group: 'Canopy' },
  coneRadius:     { type: 'range',       default: 3.2,  min: 0.9,  max: 6.8,  step: 0.1,  label: 'Cone Radius', group: 'Canopy' },
  coneHeight:     { type: 'range',       default: 1.2,  min: 0.4,  max: 3,    step: 0.1,  label: 'Cone Height', group: 'Canopy' },
  coneSides:      { type: 'integer',     default: 8,    min: 3,    max: 12,   label: 'Cone Sides', group: 'Canopy' },
  coneCurve:      { type: 'range',       default: 1.5,  min: 1,    max: 4,    step: 0.1,  label: 'Cone Curve', group: 'Canopy' },
  coneTilt:       { type: 'range',       default: [0.1, 0.4],  min: 0,    max: 0.6,  step: 0.02, label: 'Cone Tilt', group: 'Canopy' },
  jitter:         { type: 'range',       default: 0.03, min: 0,    max: 0.15, step: 0.005, label: 'Jitter', group: 'General' },
  swayScale:      { type: 'range',       default: 0.18, min: 0.05, max: 1.1,  step: 0.01, label: 'Sway Scale', group: 'Sway' },
  swayAmount:     { type: 'range',       default: [0.7, 2.7],  min: 0,    max: 4.5,  step: 0.1,  label: 'Sway Amount', group: 'Sway' },
  trunkNoiseScale:{ type: 'range',       default: 1.8,  min: 0.2,  max: 4.5,  step: 0.1,  label: 'Trunk Noise Scale', group: 'Trunk' },
  trunkNoiseAmt:  { type: 'range',       default: 0.25, min: 0,    max: 0.5,  step: 0.05, label: 'Trunk Noise Amount', group: 'Trunk' },
  colorNoiseScale:{ type: 'range',       default: 0.35, min: 0.07, max: 1.1,  step: 0.02, label: 'Color Noise Scale', group: 'Colors' },
  snowColors:     { type: 'color-array', default: [], min: 0, max: 6, label: 'Snow Colors', group: 'Snow' },
  snowAngle:      { type: 'range',       default: 20,   min: 0,    max: 80,   step: 5,    label: 'Snow Min Angle (°)', group: 'Snow' },
  snowDepth:      { type: 'range',       default: 0,    min: 0,    max: 1,    step: 0.05, label: 'Snow Depth', group: 'Snow' },
  trunkColors:    { type: 'color-array', default: ['#1a0f06', '#3d2210', '#4a2a15'], min: 2, max: 6, label: 'Trunk Colors', group: 'Colors' },
  canopyColors:   { type: 'color-array', default: ['#0a2e12', '#0e3a18', '#144a22', '#1a5a2c'], min: 1, max: 8, label: 'Canopy Colors', group: 'Colors' },
} satisfies OptionSchema

export type PineOptions = Partial<OptionInput<typeof pineSchema>> & { preset?: string }

export const pinePresets: Record<string, Partial<PineOptions>> = {
  default: {},
  tall: {
    height: 22,
    layers: 7,
    trunkRatio: 0.25,
    coneRadius: 2.2,
  },
  winter: {
    canopyColors: ['#0d3d06', '#124a0a', '#0a3505'],
    snowColors: ['#e8e8f0', '#dddde8', '#f0f0f5'],
    snowAngle: 10,
    trunkColors: ['#1a1510', '#2a2018', '#3a2a1a'],
  },
  autumn: {
    canopyColors: ['#8a6a20', '#6a5a18', '#9a7a28', '#5a4a10'],
  },
}

export function pine(options: PineOptions = {}): Asset {
  const { o, rng } = setup(pineSchema, options, pinePresets)

  // Independent streams per concern (see common-tree for rationale).
  const trunkRng = rng.stream('trunk')
  const canopyRng = rng.stream('canopy')
  const colorRng = rng.stream('color')
  const snowRng = rng.stream('snow')
  const swayRng = rng.stream('sway')

  // Trunk
  const baseRadius = o.trunkRadius * (1.4 + trunkRng() * 0.4)
  const topRadius = o.trunkRadius * o.trunkTopScale
  const trunkHeight = o.height * o.trunkRatio
  const leanX = (trunkRng() - 0.5) * o.lean
  const leanZ = (trunkRng() - 0.5) * o.lean

  const trunkMesh = trunk({
    height: trunkHeight,
    baseRadius,
    topRadius,
    taper: o.trunkTaper,
    lean: [leanX, leanZ],
    noiseSeed: trunkRng.seed(),
    noiseScale: o.trunkNoiseScale,
    noiseAmount: o.trunkNoiseAmt,
    segments: 5,
    heightSegments: 3,
    colors: o.trunkColors,
  })

  // Canopy — stacked pyramid cones
  const canopyParts: Mesh[] = []
  const canopyStart = trunkHeight * 0.6
  const layerCount = o.layers

  // Per-layer jitter seeds from the canopy stream
  const layerJitterSeeds = Array.from({ length: layerCount }, () => canopyRng.seed())

  const canopyGrad = paletteGradient(o.canopyColors)
  const colorNoise = new UberNoise({ seed: colorRng.seed(), scale: o.colorNoiseScale })
  const hasSnow = o.snowColors.length > 0
  const useGeoSnow = hasSnow && o.snowDepth > 0
  const snowNoise = hasSnow ? new UberNoise({ seed: snowRng.seed(), scale: 0.45 }) : null
  const snowThreshold = Math.sin(o.snowAngle * Math.PI / 180)

  // Pre-compute layer sizes so we can stack proportionally
  const layerRadii: number[] = []
  const layerHeights: number[] = []
  for (let i = 0; i < layerCount; i++) {
    const r = o.coneRadius * Math.pow(o.layerShrink, i) * (0.9 + canopyRng() * 0.2)
    layerRadii.push(r)
    layerHeights.push(r * o.coneHeight)
  }

  // Stack layers: each layer's base sits at overlap fraction of the previous layer's height
  const layerYPositions: number[] = []
  let curY = canopyStart
  for (let i = 0; i < layerCount; i++) {
    layerYPositions.push(curY)
    curY += layerHeights[i] * (1 - o.layerOverlap)
  }

  for (let i = 0; i < layerCount; i++) {
    const t = i / Math.max(1, layerCount - 1)
    const layerRadius = layerRadii[i]
    const layerH = layerHeights[i]
    const layerY = layerYPositions[i]

    // Lean at this height
    const lt = layerY / o.height
    const lx = leanX * lt * lt
    const lz = leanZ * lt * lt

    // Pyramid cone with height segments, quadratic curve, random tilt
    const rotY = canopyRng() * Math.PI * 2
    const tiltX = (canopyRng() - 0.5) * o.coneTilt
    const tiltZ = (canopyRng() - 0.5) * o.coneTilt
    let layer = cone({ radius: 1, height: layerH, segments: o.coneSides, heightSegments: 3 })
      .warp((pos) => {
        // Quadratic curve: wider at the base than a straight cone
        const nt = (pos[1] + layerH / 2) / layerH // 0 at bottom, 1 at top
        const curvedRadius = layerRadius * Math.pow(Math.max(0.01, 1 - nt), 1 / o.coneCurve)
        return [pos[0] * curvedRadius, pos[1], pos[2] * curvedRadius]
      })
      .rotateY(rotY)
      .rotateX(tiltX)
      .rotateZ(tiltZ)
      .jitter(layerRadius * o.jitter, { seed: layerJitterSeeds[i] })
      .translate(lx, layerY + layerH * 0.3, lz)

    // Face color
    const base = canopyGrad(t)
    const snowCol = (hasSnow && !useGeoSnow) ? pickRandom(o.snowColors, snowRng) : null

    layer = layer.faceColor(facetShade({
      base,
      noise: colorNoise,
      ambient: 0.6,
      range: 0.4,
      noiseAmount: 0.15,
      snow: snowCol && snowNoise
        ? { color: snowCol, noise: snowNoise, threshold: snowThreshold, noiseAmount: 0.15 }
        : undefined,
    }))

    canopyParts.push(layer)
  }

  // Noise-based sway: shift X/Z based on Y height for organic lean
  const swayNoiseX = new UberNoise({ seed: swayRng.seed(), scale: o.swayScale })
  const swayNoiseZ = new UberNoise({ seed: swayRng.seed(), scale: o.swayScale })

  // Noise sway is a pure function of position, so applying it per-part is identical to
  // applying it to the merged tree.
  const sway: WarpFn = (pos) => {
    const t = pos[1] / o.height
    const s = t * t * o.swayAmount
    return [pos[0] + swayNoiseX.get(0, pos[1]) * s, pos[1], pos[2] + swayNoiseZ.get(0, pos[1]) * s]
  }
  const trunkPart = trunkMesh.warp(sway)
  const canopy = merge(...canopyParts).warp(sway)

  const asset = group('pine', [
    part('trunk', trunkPart, VERTEX_COLOR_MATERIAL),
    part('canopy', canopy, VERTEX_COLOR_MATERIAL),
  ])
  if (!useGeoSnow) return asset

  const snowShell = applySnow(canopy, {
    depth: o.snowDepth,
    minAngle: 90 - o.snowAngle,
    color: pickRandom(o.snowColors, snowRng),
    seed: snowRng.seed(),
    merge: false,
  })
  return asset.add(part('snow', snowShell, VERTEX_COLOR_MATERIAL))
}
