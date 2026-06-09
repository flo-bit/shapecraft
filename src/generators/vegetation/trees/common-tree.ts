import { merge, weld, snow as applySnow } from '../../../ops'
import { setup, trunk, foliageBlob, facetShade } from '../../../build'
import { scatterOnSphere } from '../../../core/scatter'
import { pickRandom } from '../../../color'
import { UberNoise } from '../../../noise'
import { group, part, Asset } from '../../../core/asset'
import { smooth } from '../../../modifiers/smooth'
import { styleMaterial, type StyleInput } from '../../../style/profile'
import type { Mesh } from '../../../core/mesh'
import type { OptionSchema, OptionInput } from '../../../core/schema'

export const treeSchema = {
  seed:           { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed', group: 'General' },
  height:         { type: 'range',       default: 7.5,  min: 1.5,  max: 18,   step: 0.2,  label: 'Height', group: 'Trunk' },
  trunkRadius:    { type: 'range',       default: 0.35, min: 0.1,  max: 1.2,  step: 0.02, label: 'Trunk Radius', group: 'Trunk' },
  trunkRatio:     { type: 'range',       default: 0.45, min: 0.2,  max: 0.7,  step: 0.01, label: 'Trunk Ratio', group: 'Trunk' },
  trunkTaper:     { type: 'range',       default: 2,    min: 0.5,  max: 5,    step: 0.1,  label: 'Root Flare', group: 'Trunk' },
  trunkTopScale:  { type: 'range',       default: 0.5,  min: 0.02, max: 1,    step: 0.02, label: 'Trunk Top Scale', group: 'Trunk' },
  lean:           { type: 'range',       default: 1.2,  min: 0,    max: 4.5,  step: 0.1,  label: 'Lean', group: 'Trunk' },
  showCanopy:     { type: 'boolean',     default: true, label: 'Show Canopy', group: 'Canopy' },
  canopyRadius:   { type: 'range',       default: 2.4,  min: 0.6,  max: 6,    step: 0.1,  label: 'Canopy Size', group: 'Canopy' },
  canopySquash:   { type: 'range',       default: 0.8,  min: 0.3,  max: 1,    step: 0.05, label: 'Canopy Squash', group: 'Canopy' },
  canopyNoise:    { type: 'range',       default: 0.5,  min: 0,    max: 1.5,  step: 0.05, label: 'Canopy Noise', group: 'Canopy' },
  canopyDetail:   { type: 'range',       default: 0.45, min: 0.15, max: 1,    step: 0.05, label: 'Canopy Detail', group: 'Canopy' },
  canopyBumps:    { type: 'integer',     default: 3,    min: 0,    max: 8,    label: 'Canopy Bumps', group: 'Canopy' },
  bumpSize:       { type: 'range',       default: 0.4,  min: 0.1,  max: 0.8,  step: 0.05, label: 'Bump Size', group: 'Canopy' },
  canopyOffset:   { type: 'range',       default: 0.6,  min: 0,    max: 1.2,  step: 0.05, label: 'Canopy Offset', group: 'Canopy' },
  jitter:         { type: 'range',       default: 0.04, min: 0,    max: 0.15, step: 0.005, label: 'Jitter', group: 'General' },
  snowColors:     { type: 'color-array', default: [], min: 0, max: 6, label: 'Snow Colors', group: 'Snow' },
  // Note: snowColors deliberately has no `role` — snow is opt-in (empty default
  // = no snow), so a style supplying it would turn snow on for every tree.
  snowAngle:      { type: 'range',       default: 30, min: 0, max: 80, step: 5, label: 'Snow Min Angle (°)', group: 'Snow' },
  snowDepth:      { type: 'range',       default: 0,  min: 0, max: 0.9, step: 0.03, label: 'Snow Depth', group: 'Snow' },
  trunkColors:    { type: 'color-array', default: ['#1a0f06', '#4a2815', '#5a3520'], min: 2, max: 6, label: 'Trunk Colors', group: 'Colors', role: 'bark' },
  canopyColors:   { type: 'color-array', default: ['#1e6b10', '#2a7518', '#238020', '#2d8a1e'], min: 1, max: 8, label: 'Canopy Colors', group: 'Colors', role: 'leaf' },
} satisfies OptionSchema

export type TreeOptions = Partial<OptionInput<typeof treeSchema>> & { preset?: string; style?: StyleInput }

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

export function tree(options: TreeOptions = {}): Asset {
  const { o, rng, style } = setup(treeSchema, options, treePresets)
  const partMaterial = styleMaterial(style)

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
    noiseScale: 2.7,
    noiseAmount: 0.3,
    segments: 5,
    heightSegments: 4,
    colors: o.trunkColors,
  })

  // Trunk top position after lean
  const topOffsetX = leanX
  const topOffsetZ = leanZ

  if (!o.showCanopy) {
    return group('tree', [part('trunk', trunkMesh, partMaterial)])
  }

  // Canopy — style scales the facet size, jitter crunch, and smoothing
  const canopyParts: Mesh[] = []
  const canopyY = trunkHeight + actualCanopyRadius * o.canopyOffset
  const mainR = actualCanopyRadius
  const edgeLen = o.canopyRadius * o.canopyDetail * style.geometry.detail

  const colorNoiseSeed = colorRng.seed()

  function canopyBlob(r: number): Mesh {
    let blob = foliageBlob({
      radius: r,
      detail: edgeLen,
      noiseSeed: canopyRng.seed(),
      noiseScale: 0.17,
      noiseOctaves: 3,
      noiseAmount: o.canopyNoise,
      jitter: r * o.jitter * style.geometry.jitter,
      jitterSeed: canopyRng.seed(),
    })
    // Gradient styles need welded (indexed) geometry: Laplacian smoothing and
    // smooth vertex normals are both meaningless on the non-indexed facet soup.
    if (style.shading === 'gradient') blob = weld(blob)
    if (style.geometry.smoothing > 0) blob = smooth(blob, style.geometry.smoothing)
    return blob
  }

  // Face coloring
  const colorNoise = new UberNoise({ seed: colorNoiseSeed, scale: 0.5 })

  const hasSnow = o.snowColors.length > 0
  // When snowDepth > 0 we build a real snow layer (geometry) at the end instead of
  // painting snow onto faces. Depth 0 keeps the cheap painted-snow path.
  const useGeoSnow = hasSnow && o.snowDepth > 0
  const snowNoise = hasSnow ? new UberNoise({ seed: snowRng.seed(), scale: 0.7 }) : null
  const snowThreshold = Math.sin(o.snowAngle * Math.PI / 180)

  // Shade a positioned blob according to the style: faceted random facets
  // (un-indexes for per-face color) or a smooth vertical vertex gradient
  // (stays indexed so smooth normals survive for non-flat shading).
  // Painted-snow only exists in the faceted path; gradient styles get snow
  // as geometry (snowDepth > 0).
  function shadeBlob(blob: Mesh, r: number, centerY: number): Mesh {
    const base = pickRandom(o.canopyColors, colorRng)
    if (style.shading === 'faceted') {
      const snowCol = (hasSnow && !useGeoSnow) ? pickRandom(o.snowColors, snowRng) : null
      return blob.faceColor(facetShade({
        base,
        noise: colorNoise,
        ambient: 0.65,
        range: 0.35,
        noiseAmount: 0.15,
        snow: snowCol && snowNoise
          ? { color: snowCol, noise: snowNoise, threshold: snowThreshold, noiseAmount: 0.15 }
          : undefined,
      }))
    }
    const span = r * o.canopySquash * 1.3
    return blob.vertexColor((pos) => {
      const t = Math.max(0, Math.min(1, ((pos[1] - centerY) / span + 1) / 2))
      const k = 0.62 + t * 0.52 + colorNoise.get(pos[0], pos[1], pos[2]) * 0.1
      return [Math.min(1, base[0] * k), Math.min(1, base[1] * k), Math.min(1, base[2] * k)]
    })
  }

  // Main sphere
  const main = shadeBlob(
    canopyBlob(mainR)
      .scale(1, o.canopySquash, 1)
      .translate(topOffsetX, canopyY, topOffsetZ),
    mainR, canopyY,
  )
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

      const blobY = by * o.canopySquash + canopyY
      const blob = shadeBlob(
        canopyBlob(r)
          .scale(1, o.canopySquash, 1)
          .translate(bx + topOffsetX, blobY, bz + topOffsetZ),
        r, blobY,
      )
      canopyParts.push(blob)
    }
  }

  const canopy = merge(...canopyParts)
  const treeAsset = group('tree', [
    part('trunk', trunkMesh, partMaterial),
    part('canopy', canopy, partMaterial),
  ])
  if (!useGeoSnow) return treeAsset

  // Snow as its own part, computed from the canopy only (it settles on leaves, not bark).
  const snowShell = applySnow(canopy, {
    depth: o.snowDepth,
    minAngle: 90 - o.snowAngle,
    color: pickRandom(o.snowColors, snowRng),
    seed: snowRng.seed(),
    merge: false,
  })
  return treeAsset.add(part('snow', snowShell, partMaterial))
}
