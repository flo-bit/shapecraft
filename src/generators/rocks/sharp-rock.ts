import { setup, facetShade } from '../../build'
import { pickRandom } from '../../color'
import { UberNoise } from '../../noise'
import { cone } from '../../primitives'
import { merge, snow as applySnow } from '../../ops'
import { part, Asset } from '../../core/asset'
import { VERTEX_COLOR_MATERIAL } from '../../core/material'
import type { Mesh } from '../../core/mesh'
import type { OptionSchema, OptionInput } from '../../core/schema'

export const sharpRockSchema = {
  seed:       { type: 'integer',     default: 1,    min: 1,   max: 100,  label: 'Seed', group: 'General' },
  size:       { type: 'range',       default: 1.0,  min: 0.3, max: 3,    step: 0.05,  label: 'Size', group: 'Shape' },
  shards:     { type: 'integer',     default: 5,    min: 1,   max: 12,   label: 'Shards', group: 'Shape' },
  width:      { type: 'range',       default: 0.3,  min: 0.1, max: 0.6,  step: 0.05,  label: 'Shard Width', group: 'Shape' },
  spread:     { type: 'range',       default: 0.45, min: 0,   max: 1,    step: 0.05,  label: 'Spread', group: 'Shape' },
  tilt:       { type: 'range',       default: 22,   min: 0,   max: 50,   step: 1,     label: 'Tilt (°)', group: 'Shape' },
  jitter:     { type: 'range',       default: 0.05, min: 0,   max: 0.15, step: 0.005, label: 'Jitter', group: 'General' },
  mossColors: { type: 'color-array', default: [],   min: 0,   max: 4,    label: 'Moss Colors', group: 'Moss' },
  mossAngle:  { type: 'range',       default: 35,   min: 0,   max: 80,   step: 5,     label: 'Moss Min Angle (°)', group: 'Moss' },
  snowColors: { type: 'color-array', default: [],   min: 0,   max: 6,    label: 'Snow Colors', group: 'Snow' },
  snowAngle:  { type: 'range',       default: 10,   min: 0,   max: 80,   step: 5,     label: 'Snow Min Angle (°)', group: 'Snow' },
  snowDepth:  { type: 'range',       default: 0,    min: 0,   max: 0.3,  step: 0.01,  label: 'Snow Depth', group: 'Snow' },
  colors:     { type: 'color-array', default: ['#5b5650', '#6e6862', '#7d766c'], min: 1, max: 6, label: 'Rock Colors', group: 'Colors' },
} satisfies OptionSchema

export type SharpRockOptions = Partial<OptionInput<typeof sharpRockSchema>> & { preset?: string }

export const sharpRockPresets: Record<string, Partial<SharpRockOptions>> = {
  default: {},
  spire: { shards: 3, width: 0.2, tilt: 8, spread: 0.25, size: 1.6 },
  shardfield: { shards: 9, spread: 0.85, tilt: 35, size: 0.8 },
  obsidian: { colors: ['#23262c', '#2e3138', '#3a3e47'], width: 0.25, tilt: 28 },
  mossy: { mossColors: ['#3f6a2a', '#4e7d33', '#5c8c3a'], mossAngle: 25 },
  snowy: { snowColors: ['#eef0f5', '#e4e8f0', '#f4f6fb'], snowDepth: 0.04, snowAngle: 12 },
}

export function sharpRock(options: SharpRockOptions = {}): Asset {
  const { o, rng } = setup(sharpRockSchema, options, sharpRockPresets)
  const shapeRng = rng.stream('shape')
  const colorRng = rng.stream('color')
  const mossRng = rng.stream('moss')
  const snowRng = rng.stream('snow')

  const colorNoise = new UberNoise({ seed: colorRng.seed(), scale: 2 })
  const hasMoss = o.mossColors.length > 0
  const mossNoise = hasMoss ? new UberNoise({ seed: mossRng.seed(), scale: 2.5 }) : null
  const mossThreshold = Math.sin((o.mossAngle * Math.PI) / 180)

  const hasSnow = o.snowColors.length > 0
  const useGeoSnow = hasSnow && o.snowDepth > 0
  const snowNoise = hasSnow && !useGeoSnow ? new UberNoise({ seed: snowRng.seed(), scale: 2 }) : null
  const snowThreshold = Math.sin((o.snowAngle * Math.PI) / 180)

  const shards: Mesh[] = []
  for (let i = 0; i < o.shards; i++) {
    // Tallest shard at the center, the rest descend and lean outward.
    const rank = i / Math.max(1, o.shards - 1)
    const height = o.size * (1 - 0.55 * rank) * shapeRng.float(0.85, 1.15)
    const radius = height * o.width * shapeRng.float(0.8, 1.25)
    const angle = shapeRng.float(0, Math.PI * 2)
    const dist = o.size * o.spread * rank
    const lean = (o.tilt * Math.PI) / 180 * rank * shapeRng.float(0.5, 1)
    const segments = shapeRng.int(4, 6)
    const jitterSeed = shapeRng.seed()

    // Leaning lifts one side of the base — sink the shard so it stays grounded.
    const sink = height * 0.05 + radius * Math.sin(lean) * 0.6

    let shard = cone({ radius, height, segments })
      .subdivide(1)
      .jitter(height * o.jitter, { seed: jitterSeed })
      .translate(0, height / 2, 0)
      .rotate([Math.sin(angle), 0, -Math.cos(angle)], lean)
      .translate(Math.cos(angle) * dist, -sink, Math.sin(angle) * dist)

    const base = pickRandom(o.colors, colorRng)
    const moss = hasMoss ? pickRandom(o.mossColors, mossRng) : null
    // Painted overlay: snow sits on top of moss, so it wins the slot when both are set.
    const overlay = snowNoise
      ? { color: pickRandom(o.snowColors, snowRng), noise: snowNoise, threshold: snowThreshold, noiseAmount: 0.2 }
      : moss && mossNoise
        ? { color: moss, noise: mossNoise, threshold: mossThreshold, noiseAmount: 0.25 }
        : undefined
    shard = shard.faceColor(facetShade({
      base,
      noise: colorNoise,
      ambient: 0.5,
      range: 0.5,
      noiseAmount: 0.12,
      snow: overlay,
    }))
    shards.push(shard)
  }

  const rockMesh = merge(...shards)
  const asset = part('rock', rockMesh, VERTEX_COLOR_MATERIAL)
  if (!useGeoSnow) return asset

  const snowShell = applySnow(rockMesh, {
    depth: o.snowDepth,
    minAngle: 90 - o.snowAngle,
    color: pickRandom(o.snowColors, snowRng),
    seed: snowRng.seed(),
    merge: false,
  })
  return asset.add(part('snow', snowShell, VERTEX_COLOR_MATERIAL))
}
