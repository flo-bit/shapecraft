import { setup, facetShade } from '../../build'
import { pickRandom } from '../../color'
import { UberNoise } from '../../noise'
import { box } from '../../primitives'
import { merge, snow as applySnow } from '../../ops'
import type { Mesh } from '../../core/mesh'
import type { OptionSchema, OptionInput } from '../../core/schema'

export const blockRockSchema = {
  seed:         { type: 'integer',     default: 1,    min: 1,   max: 100,  label: 'Seed', group: 'General' },
  size:         { type: 'range',       default: 0.7,  min: 0.2, max: 2.5,  step: 0.05,  label: 'Size', group: 'Shape' },
  blocks:       { type: 'integer',     default: 3,    min: 1,   max: 10,   label: 'Blocks', group: 'Shape' },
  aspect:       { type: 'range',       default: 1.0,  min: 0.4, max: 2.5,  step: 0.05,  label: 'Aspect (Height)', group: 'Shape' },
  irregularity: { type: 'range',       default: 0.45, min: 0,   max: 0.8,  step: 0.05,  label: 'Irregularity', group: 'Shape' },
  spread:       { type: 'range',       default: 0.7,  min: 0.3, max: 1.2,  step: 0.05,  label: 'Spread', group: 'Shape' },
  tilt:         { type: 'range',       default: 15,   min: 0,   max: 35,   step: 1,     label: 'Tilt (°)', group: 'Shape' },
  noise:        { type: 'range',       default: 0.18, min: 0,   max: 0.5,  step: 0.02,  label: 'Lumpiness', group: 'Shape' },
  jitter:       { type: 'range',       default: 0.1,  min: 0,   max: 0.2,  step: 0.005, label: 'Jitter', group: 'General' },
  sink:         { type: 'range',       default: 0.15, min: 0,   max: 0.5,  step: 0.05,  label: 'Sink', group: 'Shape' },
  mossColors:   { type: 'color-array', default: [],   min: 0,   max: 4,    label: 'Moss Colors', group: 'Moss' },
  mossAngle:    { type: 'range',       default: 40,   min: 0,   max: 80,   step: 5,     label: 'Moss Min Angle (°)', group: 'Moss' },
  snowColors:   { type: 'color-array', default: [],   min: 0,   max: 6,    label: 'Snow Colors', group: 'Snow' },
  snowAngle:    { type: 'range',       default: 35,   min: 0,   max: 80,   step: 5,     label: 'Snow Min Angle (°)', group: 'Snow' },
  snowDepth:    { type: 'range',       default: 0,    min: 0,   max: 0.3,  step: 0.01,  label: 'Snow Depth', group: 'Snow' },
  colors:       { type: 'color-array', default: ['#56514b', '#6a645c', '#7e776d'], min: 1, max: 6, label: 'Rock Colors', group: 'Colors' },
} satisfies OptionSchema

export type BlockRockOptions = Partial<OptionInput<typeof blockRockSchema>> & { preset?: string }

export const blockRockPresets: Record<string, Partial<BlockRockOptions>> = {
  default: {},
  monolith: { blocks: 1, size: 1.4, aspect: 2.0, tilt: 5, spread: 0, irregularity: 0.2, noise: 0.12 },
  rubble: { blocks: 6, spread: 1.0, irregularity: 0.55, aspect: 0.7, tilt: 20 },
  sandstone: { colors: ['#a98a62', '#bb9b70', '#c9ad82'], aspect: 0.55, tilt: 6 },
  mossy: { mossColors: ['#3f6a2a', '#4e7d33', '#5c8c3a'], mossAngle: 35 },
  snowy: { snowColors: ['#eef0f5', '#e4e8f0', '#f4f6fb'], snowDepth: 0.06, snowAngle: 18 },
}

export function blockRock(options: BlockRockOptions = {}): Mesh {
  const { o, rng } = setup(blockRockSchema, options, blockRockPresets)
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

  const tiltMax = (o.tilt * Math.PI) / 180
  const blocks: Mesh[] = []
  let anchorR = 0
  for (let i = 0; i < o.blocks; i++) {
    // Biggest block at the center, smaller ones scattered around it.
    const rank = i / Math.max(1, o.blocks - 1)
    const s = o.size * (1 - 0.45 * rank) * shapeRng.float(0.85, 1.15)
    const w = s * (1 + o.irregularity * shapeRng.float(-1, 1))
    const h = s * o.aspect * (1 + o.irregularity * shapeRng.float(-1, 1))
    const d = s * (1 + o.irregularity * shapeRng.float(-1, 1))
    // Satellites sit a half-extent-aware distance from the central block, at evenly
    // distributed angles — close enough to embed, far enough that faces of two blocks
    // never sit nearly coplanar inside each other (which reads as z-fighting).
    const r = (w + d) / 4
    if (i === 0) anchorR = r
    const angle = ((i - 1) / Math.max(1, o.blocks - 1)) * Math.PI * 2 + shapeRng.float(-0.4, 0.4)
    const dist = i === 0 ? 0 : (anchorR + r) * o.spread * shapeRng.float(0.9, 1.1)
    const yaw = shapeRng.float(0, Math.PI * 2)
    const tiltX = tiltMax * shapeRng.float(-1, 1)
    const tiltZ = tiltMax * shapeRng.float(-1, 1)
    // Per-block noise: blocks are warped while centered at the origin, so a shared
    // noise field would give every block the same dents.
    const warpNoise = new UberNoise({ seed: shapeRng.seed(), scale: 1.5 / s, octaves: 2 })
    const jitterSeed = shapeRng.seed()

    let block = box({ size: [w, h, d] })
      .subdivide(1)
      .displaceNoise(warpNoise, s * o.noise, { direction: 'radial' })
      .jitter(s * o.jitter, { seed: jitterSeed })
      .rotateY(yaw)
      .rotateX(tiltX)
      .rotateZ(tiltZ)
      .translate(Math.cos(angle) * dist, h * (0.5 - o.sink), Math.sin(angle) * dist)

    const base = pickRandom(o.colors, colorRng)
    const moss = hasMoss ? pickRandom(o.mossColors, mossRng) : null
    // Painted overlay: snow sits on top of moss, so it wins the slot when both are set.
    const overlay = snowNoise
      ? { color: pickRandom(o.snowColors, snowRng), noise: snowNoise, threshold: snowThreshold, noiseAmount: 0.2 }
      : moss && mossNoise
        ? { color: moss, noise: mossNoise, threshold: mossThreshold, noiseAmount: 0.25 }
        : undefined
    block = block.faceColor(facetShade({
      base,
      noise: colorNoise,
      ambient: 0.5,
      range: 0.5,
      noiseAmount: 0.12,
      snow: overlay,
    }))
    blocks.push(block)
  }

  const result = merge(...blocks)
  if (!useGeoSnow) return result

  return applySnow(result, {
    depth: o.snowDepth,
    minAngle: 90 - o.snowAngle,
    color: pickRandom(o.snowColors, snowRng),
    seed: snowRng.seed(),
  })
}
