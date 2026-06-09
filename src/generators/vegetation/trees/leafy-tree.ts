import { merge, snow as applySnow } from '../../../ops'
import { setup, branches, foliageBlob, facetShade, heightShade, metaballs, type MetaBall } from '../../../build'
import { pickRandom } from '../../../color'
import { UberNoise } from '../../../noise'
import type { Mesh } from '../../../core/mesh'
import type { OptionSchema, OptionInput } from '../../../core/schema'

export const leafyTreeSchema = {
  seed:         { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed' },
  height:       { type: 'range',       default: 2.5,  min: 1.2,  max: 5,    step: 0.1,  label: 'Trunk Length' },
  trunkRadius:  { type: 'range',       default: 0.13, min: 0.05, max: 0.35, step: 0.01, label: 'Trunk Radius' },
  levels:       { type: 'integer',     default: 3,    min: 2,    max: 5,    label: 'Branch Levels' },
  branches:     { type: 'integer',     default: 3,    min: 2,    max: 4,    label: 'Splits' },
  spread:       { type: 'range',       default: 0.7,  min: 0.3,  max: 1.1,  step: 0.05, label: 'Spread' },
  upBias:       { type: 'range',       default: 0.35, min: 0,    max: 0.6,  step: 0.02, label: 'Upward Bias' },
  wander:       { type: 'range',       default: 0.4,  min: 0,    max: 1,    step: 0.05, label: 'Gnarl' },
  taper:        { type: 'range',       default: 0.5,  min: 0.3,  max: 1.2,  step: 0.05, label: 'Taper' },
  leafSize:     { type: 'range',       default: 0.55, min: 0.2,  max: 1.2,  step: 0.05, label: 'Leaf Cluster Size' },
  blobCanopy:   { type: 'boolean',     default: false, label: 'Merge Canopy' },
  canopyNoise:  { type: 'range',       default: 0.5,  min: 0,    max: 1.2,  step: 0.05, label: 'Canopy Noise' },
  jitter:       { type: 'range',       default: 0.05, min: 0,    max: 0.15, step: 0.005, label: 'Jitter' },
  snowColors:   { type: 'color-array', default: [],   min: 0,    max: 6,    label: 'Snow Colors' },
  snowAngle:    { type: 'range',       default: 30,   min: 0,    max: 80,   step: 5,    label: 'Snow Min Angle (°)' },
  snowDepth:    { type: 'range',       default: 0,    min: 0,    max: 0.3,  step: 0.01, label: 'Snow Depth' },
  trunkColors:  { type: 'color-array', default: ['#241a0f', '#3f2c1a', '#574028'], min: 2, max: 6, label: 'Trunk Colors' },
  leafColors:   { type: 'color-array', default: ['#2f6a1e', '#3a7d24', '#46902c', '#2a6a20'], min: 1, max: 8, label: 'Leaf Colors' },
} satisfies OptionSchema

export type LeafyTreeOptions = Partial<OptionInput<typeof leafyTreeSchema>> & { preset?: string }

export const leafyTreePresets: Record<string, Partial<LeafyTreeOptions>> = {
  default: {},
  autumn: { leafColors: ['#c4641e', '#d4882a', '#b5471a', '#a8651e', '#d9a531'] },
  cherry: { leafColors: ['#e58fb0', '#ec9fbb', '#d97a9e', '#f2b3c8'] },
  oak: { height: 2.0, spread: 0.9, leafSize: 0.7, branches: 4, levels: 4 },
  poplar: { height: 4, spread: 0.4, upBias: 0.55, leafSize: 0.45 },
  blob: { blobCanopy: true, leafSize: 0.55, canopyNoise: 0.7 },
  winter: {
    leafColors: ['#2a5a1e', '#1f5018'],
    snowColors: ['#eef0f5', '#e4e8f0', '#f4f6fb'],
    snowDepth: 0.05,
    snowAngle: 25,
  },
}

export function leafyTree(options: LeafyTreeOptions = {}): Mesh {
  const { o, rng } = setup(leafyTreeSchema, options, leafyTreePresets)
  const leafRng = rng.stream('leaf')
  const colorRng = rng.stream('color')
  const snowRng = rng.stream('snow')

  // Bare branch skeleton.
  const { mesh: limbMesh, tips } = branches({
    rng: rng.stream('branch'),
    length: o.height,
    radius: o.trunkRadius,
    depth: o.levels,
    children: o.branches,
    spread: o.spread,
    upBias: o.upBias,
    wander: o.wander,
    taper: o.taper,
  })
  const treeTop = limbMesh.boundingBox.max.y || o.height
  const trunk = limbMesh.vertexColor(heightShade(o.trunkColors, treeTop))

  // Canopy: a foliage cluster at each branch tip.
  const colorNoise = new UberNoise({ seed: colorRng.seed(), scale: 1.5 })
  const hasSnow = o.snowColors.length > 0
  const useGeoSnow = hasSnow && o.snowDepth > 0
  const snowNoise = hasSnow ? new UberNoise({ seed: snowRng.seed(), scale: 2 }) : null
  const snowThreshold = Math.sin((o.snowAngle * Math.PI) / 180)

  const snowOpt = (hasSnow && !useGeoSnow && snowNoise)
    ? { noise: snowNoise, threshold: snowThreshold, noiseAmount: 0.15 }
    : null
  const shadeFor = (b: [number, number, number]) => facetShade({
    base: b,
    noise: colorNoise,
    ambient: 0.6,
    range: 0.4,
    noiseAmount: 0.15,
    snow: snowOpt ? { color: pickRandom(o.snowColors, snowRng), ...snowOpt } : undefined,
  })

  const parts: Mesh[] = [trunk]

  if (o.blobCanopy) {
    // Merge all leaf clusters into one melted-blob canopy via a metaball isosurface.
    const balls: MetaBall[] = tips.map((tip) => ({
      center: tip.position,
      radius: o.leafSize * (0.7 + leafRng() * 0.6),
    }))
    parts.push(
      metaballs(balls, { resolution: 26, isolevel: 0.5, support: 2.0 })
        .jitter(o.leafSize * o.jitter, { seed: leafRng.seed() })
        .faceColor(shadeFor(pickRandom(o.leafColors, colorRng))),
    )
  } else {
    // A separate foliage cluster at each branch tip.
    for (const tip of tips) {
      const r = o.leafSize * (0.7 + leafRng() * 0.6)
      parts.push(
        foliageBlob({
          radius: r,
          detail: r * 0.7,
          noiseSeed: leafRng.seed(),
          noiseAmount: o.canopyNoise,
          jitter: r * o.jitter,
          jitterSeed: leafRng.seed(),
        })
          .translate(tip.position[0], tip.position[1], tip.position[2])
          .faceColor(shadeFor(pickRandom(o.leafColors, colorRng))),
      )
    }
  }

  const result = merge(...parts)
  if (!useGeoSnow) return result

  return applySnow(result, {
    depth: o.snowDepth,
    minAngle: 90 - o.snowAngle,
    color: pickRandom(o.snowColors, snowRng),
    seed: snowRng.seed(),
  })
}
