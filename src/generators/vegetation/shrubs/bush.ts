import { sphere } from '../../../primitives'
import { merge, snow as applySnow } from '../../../ops'
import { setup, foliageBlob, facetShade, scatterOnSurface } from '../../../build'
import { pickRandom } from '../../../color'
import { UberNoise } from '../../../noise'
import type { Mesh } from '../../../core/mesh'
import type { OptionSchema, OptionInput } from '../../../core/schema'

export const bushSchema = {
  seed:            { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed' },
  size:            { type: 'range',       default: 0.6,  min: 0.2,  max: 1.5,  step: 0.05, label: 'Size' },
  squash:          { type: 'range',       default: 0.75, min: 0.3,  max: 1.1,  step: 0.05, label: 'Squash' },
  clumps:          { type: 'integer',     default: 6,    min: 1,    max: 14,   label: 'Clumps' },
  spread:          { type: 'range',       default: 0.6,  min: 0.1,  max: 1.2,  step: 0.05, label: 'Spread' },
  clumpSize:       { type: 'range',       default: 0.55, min: 0.3,  max: 0.9,  step: 0.05, label: 'Clump Size' },
  detail:          { type: 'range',       default: 0.35, min: 0.15, max: 0.8,  step: 0.05, label: 'Detail' },
  noise:           { type: 'range',       default: 0.5,  min: 0,    max: 1.2,  step: 0.05, label: 'Surface Noise' },
  jitter:          { type: 'range',       default: 0.04, min: 0,    max: 0.15, step: 0.005, label: 'Jitter' },
  colorNoiseScale: { type: 'range',       default: 1.5,  min: 0.3,  max: 5,    step: 0.1,  label: 'Color Noise Scale' },
  berries:         { type: 'integer',     default: 0,    min: 0,    max: 30,   label: 'Berries' },
  berrySize:       { type: 'range',       default: 0.04, min: 0.02, max: 0.1,  step: 0.005, label: 'Berry Size' },
  berryColor:      { type: 'color',       default: '#c0303a', label: 'Berry Color' },
  snowColors:      { type: 'color-array', default: [],   min: 0,    max: 6,    label: 'Snow Colors' },
  snowAngle:       { type: 'range',       default: 35,   min: 0,    max: 80,   step: 5,    label: 'Snow Min Angle (°)' },
  snowDepth:       { type: 'range',       default: 0,    min: 0,    max: 0.3,  step: 0.01, label: 'Snow Depth' },
  foliageColors:   { type: 'color-array', default: ['#2a6018', '#327020', '#3a7d24', '#286a1c'], min: 1, max: 8, label: 'Foliage Colors' },
} satisfies OptionSchema

export type BushOptions = Partial<OptionInput<typeof bushSchema>> & { preset?: string }

export const bushPresets: Record<string, Partial<BushOptions>> = {
  default: {},
  berry: {
    berries: 14,
    berryColor: '#bf2f3a',
  },
  flowering: {
    berries: 18,
    berrySize: 0.05,
    berryColor: '#e7c93f',
    foliageColors: ['#2f6a1e', '#367622', '#3f8228'],
  },
  autumn: {
    foliageColors: ['#b5641f', '#c47e26', '#9c4f18', '#a86a20'],
  },
  winter: {
    foliageColors: ['#1f5215', '#235a18', '#1a4a12'],
    snowColors: ['#eef0f5', '#e4e8f0', '#f4f6fb'],
    snowDepth: 0.05,
    snowAngle: 25,
  },
  boxwood: {
    squash: 0.9,
    spread: 0.4,
    noise: 0.25,
    clumps: 9,
    foliageColors: ['#2c5a1c', '#316420', '#356a22'],
  },
}

export function bush(options: BushOptions = {}): Mesh {
  const { o, rng } = setup(bushSchema, options, bushPresets)

  const shapeRng = rng.stream('shape')
  const colorRng = rng.stream('color')
  const snowRng = rng.stream('snow')
  const berryRng = rng.stream('berry')

  const detail = o.size * o.detail
  const colorNoise = new UberNoise({ seed: colorRng.seed(), scale: o.colorNoiseScale })

  const hasSnow = o.snowColors.length > 0
  const useGeoSnow = hasSnow && o.snowDepth > 0
  const snowNoise = hasSnow ? new UberNoise({ seed: snowRng.seed(), scale: 2 }) : null
  const snowThreshold = Math.sin((o.snowAngle * Math.PI) / 180)

  function shade() {
    const base = pickRandom(o.foliageColors, colorRng)
    const snowCol = (hasSnow && !useGeoSnow) ? pickRandom(o.snowColors, snowRng) : null
    return facetShade({
      base,
      noise: colorNoise,
      ambient: 0.55,
      range: 0.45,
      noiseAmount: 0.15,
      snow: snowCol && snowNoise
        ? { color: snowCol, noise: snowNoise, threshold: snowThreshold, noiseAmount: 0.15 }
        : undefined,
    })
  }

  function clump(radius: number, x: number, y: number, z: number): Mesh {
    return foliageBlob({
      radius,
      detail,
      noiseSeed: shapeRng.seed(),
      noiseAmount: o.noise,
      jitter: radius * o.jitter,
      jitterSeed: shapeRng.seed(),
    })
      .scale(1, o.squash, 1)
      .translate(x, y, z)
      .faceColor(shade())
  }

  const foliageParts: Mesh[] = []

  // Central core blob, sitting low so the bush hugs the ground.
  const coreR = o.size * 0.85
  foliageParts.push(clump(coreR, 0, coreR * o.squash * 0.6, 0))

  // Surrounding clumps scattered in a disc, at varying heights → rounded dome.
  for (let i = 0; i < o.clumps; i++) {
    const angle = shapeRng() * Math.PI * 2
    const dist = Math.sqrt(shapeRng()) * o.size * o.spread
    const r = o.size * o.clumpSize * (0.75 + shapeRng() * 0.4)
    const y = o.size * o.squash * (0.35 + shapeRng() * 0.55)
    foliageParts.push(clump(r, Math.cos(angle) * dist, y, Math.sin(angle) * dist))
  }

  const foliage = merge(...foliageParts)
  const parts: Mesh[] = [foliage]

  // Optional berries/flowers: sample real points on the upper foliage surface so they
  // sit on the leaves, then nestle each slightly into the surface along its normal.
  if (o.berries > 0) {
    const points = scatterOnSurface(foliage, o.berries, { rng: berryRng, minNormalY: 0.25 })
    for (const { position, normal } of points) {
      const s = o.berrySize * (0.7 + berryRng() * 0.6)
      parts.push(
        sphere({ radius: s, widthSegments: 4, heightSegments: 3 })
          .translate(
            position[0] + normal[0] * s * 0.4,
            position[1] + normal[1] * s * 0.4,
            position[2] + normal[2] * s * 0.4,
          )
          .vertexColor(o.berryColor),
      )
    }
  }

  const result = parts.length > 1 ? merge(...parts) : foliage
  if (!useGeoSnow) return result

  return applySnow(result, {
    depth: o.snowDepth,
    minAngle: 90 - o.snowAngle,
    color: pickRandom(o.snowColors, snowRng),
    seed: snowRng.seed(),
  })
}
