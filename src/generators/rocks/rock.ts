import { setup, foliageBlob, facetShade } from '../../build'
import { snow as applySnow } from '../../ops'
import { pickRandom } from '../../color'
import { UberNoise } from '../../noise'
import { part, Asset } from '../../core/asset'
import { VERTEX_COLOR_MATERIAL } from '../../core/material'
import type { OptionSchema, OptionInput } from '../../core/schema'

export const rockSchema = {
  seed:        { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed', group: 'General' },
  size:        { type: 'range',       default: 0.6,  min: 0.2,  max: 2.5,  step: 0.05, label: 'Size', group: 'Shape' },
  detail:      { type: 'range',       default: 0.45, min: 0.2,  max: 0.9,  step: 0.05, label: 'Detail', group: 'Shape' },
  noise:       { type: 'range',       default: 0.45, min: 0.1,  max: 0.8,  step: 0.05, label: 'Lumpiness', group: 'Shape' },
  squash:      { type: 'range',       default: 0.7,  min: 0.3,  max: 1.2,  step: 0.05, label: 'Squash', group: 'Shape' },
  flatten:     { type: 'range',       default: 0.25, min: 0,    max: 0.5,  step: 0.05, label: 'Flat Base', group: 'Shape' },
  jitter:      { type: 'range',       default: 0.02, min: 0,    max: 0.1,  step: 0.005, label: 'Jitter', group: 'General' },
  mossColors:  { type: 'color-array', default: [],   min: 0,    max: 4,    label: 'Moss Colors', group: 'Moss' },
  mossAngle:   { type: 'range',       default: 40,   min: 0,    max: 80,   step: 5,    label: 'Moss Min Angle (°)', group: 'Moss' },
  snowColors:  { type: 'color-array', default: [],   min: 0,    max: 6,    label: 'Snow Colors', group: 'Snow' },
  snowAngle:   { type: 'range',       default: 35,   min: 0,    max: 80,   step: 5,    label: 'Snow Min Angle (°)', group: 'Snow' },
  snowDepth:   { type: 'range',       default: 0,    min: 0,    max: 0.3,  step: 0.01, label: 'Snow Depth', group: 'Snow' },
  colors:      { type: 'color-array', default: ['#56514b', '#6a645c', '#7e776d'], min: 1, max: 6, label: 'Rock Colors', group: 'Colors' },
} satisfies OptionSchema

export type RockOptions = Partial<OptionInput<typeof rockSchema>> & { preset?: string }

export const rockPresets: Record<string, Partial<RockOptions>> = {
  default: {},
  boulder: { size: 1.4, squash: 0.85, noise: 0.3, flatten: 0.3 },
  sharp: { noise: 0.7, detail: 0.3, squash: 1.0 },
  mossy: { mossColors: ['#3f6a2a', '#4e7d33', '#5c8c3a'], noise: 0.4 },
  slate: { squash: 0.45, flatten: 0.4, colors: ['#48504f', '#586160', '#6a7270'] },
  snowy: { snowColors: ['#eef0f5', '#e4e8f0', '#f4f6fb'], snowDepth: 0.06, snowAngle: 30 },
}

export function rock(options: RockOptions = {}): Asset {
  const { o, rng } = setup(rockSchema, options, rockPresets)
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

  // Lumpy faceted blob, flattened vertically.
  const blob = foliageBlob({
    radius: o.size,
    detail: o.size * o.detail,
    noiseSeed: shapeRng.seed(),
    noiseScale: 0.8,
    noiseOctaves: 2,
    noiseAmount: o.noise,
    jitter: o.size * o.jitter,
    jitterSeed: shapeRng.seed(),
  }).scale(1, o.squash, 1)

  // Cut a flat base and rest it on the ground (y = 0).
  const baseY = -o.size * o.squash * (1 - o.flatten)
  const base = pickRandom(o.colors, colorRng)
  const moss = hasMoss ? pickRandom(o.mossColors, mossRng) : null

  // Painted overlay: snow sits on top of moss, so it wins the slot when both are set.
  const overlay = snowNoise
    ? { color: pickRandom(o.snowColors, snowRng), noise: snowNoise, threshold: snowThreshold, noiseAmount: 0.2 }
    : moss && mossNoise
      ? { color: moss, noise: mossNoise, threshold: mossThreshold, noiseAmount: 0.25 }
      : undefined

  const rockMesh = blob
    .warp((p) => (p[1] < baseY ? [p[0], baseY, p[2]] : p))
    .translate(0, -baseY, 0)
    .faceColor(facetShade({
      base,
      noise: colorNoise,
      ambient: 0.5,
      range: 0.5,
      noiseAmount: 0.12,
      snow: overlay,
    }))
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
