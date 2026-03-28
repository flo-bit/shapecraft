import { sphere } from '../primitives'
import { merge, tube, loft, thicken } from '../ops'
import { createRng } from '../core/rng'
import { resolveOptions } from '../core/schema'
import { paletteGradient, pickRandom } from '../color'
import { UberNoise } from '../noise'
import type { Mesh } from '../core/mesh'
import type { Vec3 } from '../core/types'
import type { OptionSchema } from '../core/schema'

export const palmSchema = {
  seed:            { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed' },
  height:          { type: 'range',       default: 3.5,  min: 1.5,  max: 7,    step: 0.1,  label: 'Height' },
  trunkRadius:     { type: 'range',       default: 0.07, min: 0.03, max: 0.2,  step: 0.01, label: 'Trunk Radius' },
  trunkTaper:      { type: 'range',       default: 0.65, min: 0.1,  max: 0.9,  step: 0.05, label: 'Trunk Taper' },
  trunkCurve:      { type: 'range',       default: [0.3, 0.8], min: 0, max: 1.5, step: 0.05, label: 'Trunk Curve' },
  trunkSegments:   { type: 'integer',     default: 5,    min: 4,    max: 8,    label: 'Trunk Sides' },
  trunkPathPoints: { type: 'integer',     default: 20,   min: 4,    max: 40,   label: 'Trunk Smoothness' },
  fronds:          { type: 'integer',     default: [6, 9], min: 3, max: 14, label: 'Fronds' },
  frondLength:     { type: 'range',       default: 1.2,  min: 0.4,  max: 2.5,  step: 0.1,  label: 'Frond Length' },
  frondDroop:      { type: 'range',       default: [0.9, 1.4], min: 0.1, max: 2, step: 0.05, label: 'Frond Droop' },
  frondWidth:      { type: 'range',       default: [0.15, 0.35], min: 0.05, max: 0.6,  step: 0.02, label: 'Frond Width' },
  frondThickness:  { type: 'range',       default: 0.015, min: 0.005, max: 0.05, step: 0.005, label: 'Frond Thickness' },
  frondSegments:   { type: 'integer',     default: 5,    min: 3,    max: 10,   label: 'Frond Segments' },
  frondCurveUp:    { type: 'range',       default: 0.3,  min: 0,    max: 0.8,  step: 0.05, label: 'Frond Curve Up' },
  coconuts:        { type: 'integer',     default: [0, 4], min: 0, max: 6, label: 'Coconuts' },
  coconutSize:     { type: 'range',       default: [0.05, 0.09], min: 0.02, max: 0.12, step: 0.005, label: 'Coconut Size' },
  jitter:          { type: 'range',       default: 0.02, min: 0,    max: 0.08, step: 0.005, label: 'Jitter' },
  snowColors:      { type: 'color-array', default: [], min: 0, max: 6, label: 'Snow Colors' },
  snowAngle:       { type: 'range',       default: 20,   min: 0,    max: 80,   step: 5,    label: 'Snow Min Angle (°)' },
  trunkColors:     { type: 'color-array', default: ['#3a2a15', '#5a4025', '#6a5030'], min: 2, max: 6, label: 'Trunk Colors' },
  frondColors:     { type: 'color-array', default: ['#1a4a12', '#224e18', '#2a5520', '#1e4015'], min: 1, max: 8, label: 'Frond Colors' },
  coconutColor:    { type: 'color',       default: '#3a2810', label: 'Coconut Color' },
} satisfies OptionSchema

export type PalmOptions = {
  [K in keyof typeof palmSchema]?: typeof palmSchema[K]['default']
} & { preset?: string }

export const palmPresets: Record<string, Partial<PalmOptions>> = {
  default: {},
  tall: {
    height: 6,
    trunkCurve: [0.1, 0.4],
    frondLength: 1.8,
    fronds: [8, 12],
  },
  short: {
    height: 2,
    trunkCurve: [0.5, 1],
    frondLength: 0.8,
    fronds: [5, 7],
  },
  winter: {
    frondColors: ['#1a4a15', '#154012'],
    snowColors: ['#e8e8f0', '#dddde8', '#f0f0f5'],
    snowAngle: 10,
    trunkColors: ['#2a2018', '#3a2a1a', '#4a3a2a'],
  },
}

export function palm(options: PalmOptions = {}): Mesh {
  const seed = options.seed ?? palmSchema.seed.default
  const rand = createRng(seed)
  const o = resolveOptions(palmSchema, options, palmPresets, rand)

  function subSeed() { return Math.floor(rand() * 2147483647) }

  // --- Trunk path: curved from base to top ---
  const trunkHeight = o.height * 0.75
  const baseRadius = o.trunkRadius * (1.3 + rand() * 0.4)
  const curveAngle = rand() * Math.PI * 2
  const curveAmount = o.trunkCurve
  const curveDirX = Math.cos(curveAngle)
  const curveDirZ = Math.sin(curveAngle)

  const trunkPath: Vec3[] = []
  for (let i = 0; i <= o.trunkPathPoints; i++) {
    const t = i / o.trunkPathPoints
    const y = t * trunkHeight
    // S-curve lean
    const offset = Math.sin(t * Math.PI * 0.8) * t * curveAmount
    trunkPath.push([
      curveDirX * offset,
      y,
      curveDirZ * offset,
    ])
  }

  // Trunk top position
  const topPt = trunkPath[trunkPath.length - 1]

  const trunkMesh = tube(
    trunkPath,
    (t) => {
      const taper = baseRadius * (1 - t * o.trunkTaper)
      const wave = 1 + Math.sin(t * Math.PI * 14) * 0.15
      return taper * wave
    },
    o.trunkSegments,
  )
    .jitter(baseRadius * 0.1, { seed: subSeed() })
    .vertexColor((pos) => {
      const t = Math.max(0, Math.min(1, pos[1] / trunkHeight))
      return paletteGradient(o.trunkColors)(t)
    })

  // --- Fronds: flat planes thickened, arcing outward and drooping ---
  const frondParts: Mesh[] = []
  const frondCount = o.fronds
  const frondGrad = paletteGradient(o.frondColors)

  // Pre-allocate seeds
  const maxFronds = 14
  const frondSeeds = Array.from({ length: maxFronds }, () => subSeed())
  const colorNoiseSeed = subSeed()
  const snowNoiseSeed = subSeed()

  const colorNoise = new UberNoise({ seed: colorNoiseSeed, scale: 1.5 })
  const hasSnow = o.snowColors.length > 0
  const snowNoise = hasSnow ? new UberNoise({ seed: snowNoiseSeed, scale: 2 }) : null
  const snowThreshold = Math.sin(o.snowAngle * Math.PI / 180)

  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2 + rand() * 0.5
    const frondLen = o.frondLength * (0.5 + rand() * 0.7)
    const droop = o.frondDroop * (0.3 + rand() * 1)
    const curveUp = o.frondCurveUp * (0.5 + rand() * 1.5)
    const width = o.frondWidth * (0.6 + rand() * 0.8)
    const startAngleUp = rand() * 0.6  // some fronds point more upward

    // Build frond path: starts at trunk top, arcs out and droops
    const frondPath: Vec3[] = []
    const segs = o.frondSegments
    const dirX = Math.cos(angle)
    const dirZ = Math.sin(angle)

    for (let j = 0; j <= segs; j++) {
      const t = j / segs
      const outward = t * frondLen
      // Initial upward angle + arc curve, then gravity droop
      const upStart = t * startAngleUp * frondLen
      const upCurve = Math.sin(t * Math.PI * 0.3) * curveUp * frondLen
      const droopCurve = t * t * droop * frondLen
      frondPath.push([
        topPt[0] + dirX * outward,
        topPt[1] + upStart + upCurve - droopCurve,
        topPt[2] + dirZ * outward,
      ])
    }

    // Frond: loft an open U-shape that tapers toward the tip
    const frondLoft = loft({
      path: frondPath,
      closedShape: false,
      closed: false,
      up: [0, 1, 0],
      shape: (t) => {
        // Narrow at root, widens, then tapers to tip
        const envelope = Math.sin(t * Math.PI) * (1 - t * 0.3)
        const w = width * Math.max(0.05, envelope)
        const h = w * 0.3
        // Reversed order so normals face up
        return [
          [w, -h * 0.3],
          [w * 0.7, h * 0.3],
          [w * 0.3, h * 0.7],
          [0, h],
          [-w * 0.3, h * 0.7],
          [-w * 0.7, h * 0.3],
          [-w, -h * 0.3],
        ]
      },
    })
    const frondMesh = thicken(frondLoft, o.frondThickness)
      .jitter(width * o.jitter, { seed: frondSeeds[i] })

    // Color
    const base = frondGrad(i / frondCount)
    const snow = pickRandom(hasSnow ? o.snowColors : o.frondColors, rand)
    rand() // consume for stability

    const colored = frondMesh.faceColor((centroid, normal) => {
      if (hasSnow && snowNoise) {
        const n = snowNoise.get(centroid[0], centroid[1], centroid[2]) * 0.15
        if (normal[1] + n > snowThreshold) return snow
      }
      const top = normal[1] * 0.5 + 0.5
      const n = colorNoise.get(centroid[0], centroid[1], centroid[2]) * 0.1
      const darken = 0.6 + top * 0.4 + n
      return [base[0] * darken, base[1] * darken, base[2] * darken]
    })

    frondParts.push(colored)
  }

  // --- Coconuts ---
  const coconutParts: Mesh[] = []
  const coconutCount = o.coconuts
  for (let i = 0; i < coconutCount; i++) {
    const angle = rand() * Math.PI * 2
    const topRadius = baseRadius * (1 - o.trunkTaper)
    const dist = topRadius * (1.5 + rand() * 1)
    const size = o.coconutSize * (0.7 + rand() * 0.6)
    const hangY = size * (0.3 + rand() * 0.8)
    const coconut = sphere({ radius: size, widthSegments: 4, heightSegments: 3 })
      .scale(0.9 + rand() * 0.2, 1 + rand() * 0.3, 0.9 + rand() * 0.2)
      .translate(
        topPt[0] + Math.cos(angle) * dist,
        topPt[1] - hangY,
        topPt[2] + Math.sin(angle) * dist,
      )
      .vertexColor(o.coconutColor)
    coconutParts.push(coconut)
  }

  return merge(trunkMesh, ...frondParts, ...coconutParts)
}
