import { merge, snow as applySnow } from '../ops'
import { setup, trunk, foliageBlob, facetShade } from '../build'
import { scatterOnSphere } from '../core/scatter'
import { pickRandom } from '../color'
import { UberNoise } from '../noise'
import type { Mesh } from '../core/mesh'
import type { OptionSchema, OptionInput } from '../core/schema'

export const treeSchema = {
  seed:           { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed' },
  height:         { type: 'range',       default: 2.5,  min: 0.5,  max: 6,    step: 0.1,  label: 'Height' },
  trunkRadius:    { type: 'range',       default: 0.12, min: 0.03, max: 0.4,  step: 0.01, label: 'Trunk Radius' },
  trunkRatio:     { type: 'range',       default: 0.45, min: 0.2,  max: 0.7,  step: 0.01, label: 'Trunk Ratio' },
  trunkTaper:     { type: 'range',       default: 2,    min: 0.5,  max: 5,    step: 0.1,  label: 'Root Flare' },
  trunkTopScale:  { type: 'range',       default: 0.5,  min: 0.02, max: 1,    step: 0.02, label: 'Trunk Top Scale' },
  lean:           { type: 'range',       default: 0.4,  min: 0,    max: 1.5,  step: 0.05, label: 'Lean' },
  showCanopy:     { type: 'boolean',     default: true, label: 'Show Canopy' },
  canopyRadius:   { type: 'range',       default: 0.8,  min: 0.2,  max: 2,    step: 0.05, label: 'Canopy Size' },
  canopySquash:   { type: 'range',       default: 0.8,  min: 0.3,  max: 1,    step: 0.05, label: 'Canopy Squash' },
  canopyNoise:    { type: 'range',       default: 0.5,  min: 0,    max: 1.5,  step: 0.05, label: 'Canopy Noise' },
  canopyDetail:   { type: 'range',       default: 0.45, min: 0.15, max: 1,    step: 0.05, label: 'Canopy Detail' },
  canopyBumps:    { type: 'integer',     default: 3,    min: 0,    max: 8,    label: 'Canopy Bumps' },
  bumpSize:       { type: 'range',       default: 0.4,  min: 0.1,  max: 0.8,  step: 0.05, label: 'Bump Size' },
  canopyOffset:   { type: 'range',       default: 0.6,  min: 0,    max: 1.2,  step: 0.05, label: 'Canopy Offset' },
  jitter:         { type: 'range',       default: 0.04, min: 0,    max: 0.15, step: 0.005, label: 'Jitter' },
  snowColors:     { type: 'color-array', default: [], min: 0, max: 6, label: 'Snow Colors' },
  snowAngle:      { type: 'range',       default: 30, min: 0, max: 80, step: 5, label: 'Snow Min Angle (°)' },
  snowDepth:      { type: 'range',       default: 0,  min: 0, max: 0.3, step: 0.01, label: 'Snow Depth' },
  trunkColors:    { type: 'color-array', default: ['#1a0f06', '#4a2815', '#5a3520'], min: 2, max: 6, label: 'Trunk Colors' },
  canopyColors:   { type: 'color-array', default: ['#1e6b10', '#2a7518', '#238020', '#2d8a1e'], min: 1, max: 8, label: 'Canopy Colors' },
} satisfies OptionSchema

export type TreeOptions = Partial<OptionInput<typeof treeSchema>> & { preset?: string }

export const treePresets: Record<string, Partial<TreeOptions>> = {
  default: {},
  autumn: {
    canopyColors: ['#c44422', '#d48825', '#bf6b1a', '#a83a15', '#dba030'],
  },
  winter: {
    canopyColors: ['#1a5a10', '#1e4a15', '#224d18'],
    snowColors: ['#e8e8f0', '#dddde8', '#f0f0f5'],
    snowAngle: 15,
    trunkColors: ['#1a1510', '#2a2018', '#3a2a1a'],
  },
  cherry: {
    canopyColors: ['#d45a8a', '#e87aa0', '#c44a75', '#f09ab5'],
  },
  dead: {
    showCanopy: false,
  },
}

export function tree(options: TreeOptions = {}): Mesh {
  const { o, rng } = setup(treeSchema, options, treePresets)

  // Independent streams per concern: drawing from one never perturbs another,
  // so toggling (e.g.) snow can't shift the trunk or canopy randomness.
  const trunkRng = rng.stream('trunk')
  const canopyRng = rng.stream('canopy')
  const colorRng = rng.stream('color')
  const snowRng = rng.stream('snow')

  // Trunk radii — randomized within range
  const baseRadius = o.trunkRadius * (1.6 + trunkRng() * 0.8)
  const topRadius = o.trunkRadius * o.trunkTopScale

  // Bigger trunk → bigger canopy
  const canopyScale = baseRadius / (o.trunkRadius * 2)
  const actualCanopyRadius = o.canopyRadius * canopyScale

  // Trunk
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
    noiseScale: 8,
    noiseAmount: 0.3,
    segments: 5,
    heightSegments: 4,
    colors: o.trunkColors,
  })

  // Trunk top position after lean
  const topOffsetX = leanX
  const topOffsetZ = leanZ

  if (!o.showCanopy) return trunkMesh

  // Canopy
  const canopyParts: Mesh[] = []
  const canopyY = trunkHeight + actualCanopyRadius * o.canopyOffset
  const mainR = actualCanopyRadius
  const edgeLen = o.canopyRadius * o.canopyDetail

  const colorNoiseSeed = colorRng.seed()

  function canopyBlob(r: number): Mesh {
    return foliageBlob({
      radius: r,
      detail: edgeLen,
      noiseSeed: canopyRng.seed(),
      noiseScale: 0.5,
      noiseOctaves: 3,
      noiseAmount: o.canopyNoise,
      jitter: r * o.jitter,
      jitterSeed: canopyRng.seed(),
    })
  }

  // Face coloring
  const colorNoise = new UberNoise({ seed: colorNoiseSeed, scale: 1.5 })

  const hasSnow = o.snowColors.length > 0
  // When snowDepth > 0 we build a real snow layer (geometry) at the end instead of
  // painting snow onto faces. Depth 0 keeps the cheap painted-snow path.
  const useGeoSnow = hasSnow && o.snowDepth > 0
  const snowNoise = hasSnow ? new UberNoise({ seed: snowRng.seed(), scale: 2 }) : null
  const snowThreshold = Math.sin(o.snowAngle * Math.PI / 180)

  function blobFaceColor() {
    // Pick colors upfront so we don't draw inside the per-face loop. Each draw comes
    // from its own stream, so snow being on/off never shifts the base canopy color.
    const base = pickRandom(o.canopyColors, colorRng)
    const snowCol = (hasSnow && !useGeoSnow) ? pickRandom(o.snowColors, snowRng) : null
    return facetShade({
      base,
      noise: colorNoise,
      ambient: 0.65,
      range: 0.35,
      noiseAmount: 0.15,
      snow: snowCol && snowNoise
        ? { color: snowCol, noise: snowNoise, threshold: snowThreshold, noiseAmount: 0.15 }
        : undefined,
    })
  }

  // Main sphere
  const main = canopyBlob(mainR)
    .scale(1, o.canopySquash, 1)
    .translate(topOffsetX, canopyY, topOffsetZ)
    .faceColor(blobFaceColor())
  canopyParts.push(main)

  // Sub-blobs
  const blobCount = o.canopyBumps
  if (blobCount > 0) {
    const blobPositions = scatterOnSphere(blobCount, canopyRng.seed(), {
      radius: mainR * 0.9,
      polarMin: Math.PI * 0.3,
      polarMax: Math.PI * 0.7,
    })

    for (let i = 0; i < blobCount; i++) {
      const [bx, by, bz] = blobPositions[i]
      const r = mainR * (o.bumpSize + canopyRng() * 0.15)

      const blob = canopyBlob(r)
        .scale(1, o.canopySquash, 1)
        .translate(bx + topOffsetX, by * o.canopySquash + canopyY, bz + topOffsetZ)
        .faceColor(blobFaceColor())
      canopyParts.push(blob)
    }
  }

  const result = merge(trunkMesh, ...canopyParts)
  if (!useGeoSnow) return result

  return applySnow(result, {
    depth: o.snowDepth,
    minAngle: 90 - o.snowAngle,
    color: pickRandom(o.snowColors, snowRng),
    seed: snowRng.seed(),
  })
}
