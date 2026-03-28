import { icosphere, cylinder, merge, createRng, scatterOnSphere, resolveOptions } from '../../src'
import { paletteGradient, pickRandom, type Palette } from '../../src/color'
import { UberNoise } from '../../src/noise'
import type { Mesh, OptionSchema } from '../../src'

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
  trunkColors:    { type: 'color-array', default: ['#1a0f06', '#4a2815', '#5a3520'], min: 2, max: 6, label: 'Trunk Colors' },
  canopyColors:   { type: 'color-array', default: ['#1e6b10', '#2a7518', '#238020', '#2d8a1e'], min: 1, max: 8, label: 'Canopy Colors' },
} satisfies OptionSchema

export type TreeOptions = {
  [K in keyof typeof treeSchema]?: typeof treeSchema[K]['default']
} & { preset?: string }

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
  // Create rand from seed before resolving (needed for [min,max] ranges)
  const seed = options.seed ?? treeSchema.seed.default
  const rand = createRng(seed)
  const o = resolveOptions(treeSchema, options, treePresets, rand)

  // Derive all sub-seeds from the main rand so everything chains deterministically
  function subSeed() { return Math.floor(rand() * 2147483647) }

  // Trunk radii — randomized within range
  const baseRadius = o.trunkRadius * (1.6 + rand() * 0.8)
  const topRadius = o.trunkRadius * o.trunkTopScale

  // Bigger trunk → bigger canopy
  const canopyScale = baseRadius / (o.trunkRadius * 2)
  const actualCanopyRadius = o.canopyRadius * canopyScale

  // Trunk
  const trunkHeight = o.height * o.trunkRatio
  const leanX = (rand() - 0.5) * o.lean
  const leanZ = (rand() - 0.5) * o.lean
  const trunkGrad = paletteGradient(o.trunkColors)
  const taperExp = o.trunkTaper

  const trunkNoise = new UberNoise({ seed: subSeed(), scale: 8 })
  const trunk = cylinder({ radius: 1, radiusTop: 1, height: trunkHeight, segments: 5, heightSegments: 4 })
    .translate(0, trunkHeight / 2, 0)
    .warp((pos) => {
      const t = Math.max(0, Math.min(1, pos[1] / trunkHeight))
      const radius = topRadius + (baseRadius - topRadius) * Math.pow(1 - t, taperExp)
      // Noise-based displacement scaled by local radius (thin top = less displacement)
      const jitterAmount = radius * 0.3
      const nx = trunkNoise.get(pos[0] * 100, pos[1], pos[2] * 100) * jitterAmount
      const nz = trunkNoise.get(pos[0] * 100 + 500, pos[1] + 500, pos[2] * 100) * jitterAmount
      return [
        pos[0] * radius + leanX * t * t + nx,
        pos[1],
        pos[2] * radius + leanZ * t * t + nz,
      ]
    })
    .vertexColor((pos) => {
      const t = Math.max(0, Math.min(1, pos[1] / trunkHeight))
      return trunkGrad(t)
    })

  // Trunk top position after lean
  const topOffsetX = leanX
  const topOffsetZ = leanZ

  if (!o.showCanopy) return trunk

  // Canopy
  const canopyParts: Mesh[] = []
  const canopyY = trunkHeight + actualCanopyRadius * o.canopyOffset
  const mainR = actualCanopyRadius
  const edgeLen = o.canopyRadius * o.canopyDetail

  const colorNoiseSeed = subSeed()

  function canopyBlob(r: number): Mesh {
    const noiseSeed = subSeed()
    const jitterSeed = subSeed()
    const noise = new UberNoise({ seed: noiseSeed, scale: 0.5, octaves: 3 })
    let blob = icosphere({ radius: r, subdivisions: 0 })
      .subdivideAdaptive(edgeLen)
      .warp((pos) => {
        const len = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]) || 1
        const nx = pos[0] / len, ny = pos[1] / len, nz = pos[2] / len
        const d = r + noise.get(pos[0], pos[1], pos[2]) * r * o.canopyNoise
        return [nx * d, ny * d, nz * d]
      })
      .jitter(r * o.jitter, { seed: jitterSeed })

    return blob
  }

  // Face coloring
  const colorNoise = new UberNoise({ seed: colorNoiseSeed, scale: 1.5 })

  const hasSnow = o.snowColors.length > 0
  const snowNoiseSeed = subSeed() // always consume to keep sequence stable
  const snowNoise = hasSnow ? new UberNoise({ seed: snowNoiseSeed, scale: 2 }) : null
  const snowThreshold = Math.sin(o.snowAngle * Math.PI / 180)

  function blobFaceColor(): (centroid: [number, number, number], normal: [number, number, number], faceIndex: number) => [number, number, number] {
    // Pick colors upfront so we don't consume rand() calls inside the per-face loop
    const base = pickRandom(o.canopyColors, rand)
    // Always consume the rand() call to keep sequence stable regardless of snow setting
    const snowPick = pickRandom(hasSnow ? o.snowColors : o.canopyColors, rand)
    const snow = hasSnow ? snowPick : null
    return (centroid, normal) => {
      const top = normal[1] * 0.5 + 0.5

      // Snow on upward-facing faces
      if (snow && snowNoise) {
        const n = snowNoise.get(centroid[0], centroid[1], centroid[2]) * 0.15
        if (normal[1] + n > snowThreshold) {
          return snow
        }
      }

      const n = colorNoise.get(centroid[0], centroid[1], centroid[2]) * 0.15
      const darken = 0.65 + top * 0.35 + n
      return [base[0] * darken, base[1] * darken, base[2] * darken]
    }
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
    const blobPositions = scatterOnSphere(blobCount, subSeed(), {
      radius: mainR * 0.9,
      polarMin: Math.PI * 0.3,
      polarMax: Math.PI * 0.7,
    })

    for (let i = 0; i < blobCount; i++) {
      const [bx, by, bz] = blobPositions[i]
      const r = mainR * (o.bumpSize + rand() * 0.15)

      const blob = canopyBlob(r)
        .scale(1, o.canopySquash, 1)
        .translate(bx + topOffsetX, by * o.canopySquash + canopyY, bz + topOffsetZ)
        .faceColor(blobFaceColor())
      canopyParts.push(blob)
    }
  }

  return merge(trunk, ...canopyParts)
}
