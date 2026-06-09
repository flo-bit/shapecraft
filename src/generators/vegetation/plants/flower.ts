import { sphere } from '../../../primitives'
import { merge } from '../../../ops'
import { setup, trunk, blade } from '../../../build'
import type { Mesh } from '../../../core/mesh'
import type { Vec3 } from '../../../core/types'
import type { OptionSchema, OptionInput } from '../../../core/schema'

export const flowerSchema = {
  seed:        { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed' },
  height:      { type: 'range',       default: 0.5,  min: 0.15, max: 1.2,  step: 0.05, label: 'Stem Height' },
  stemRadius:  { type: 'range',       default: 0.012,min: 0.004,max: 0.03, step: 0.002, label: 'Stem Radius' },
  lean:        { type: 'range',       default: 0.12, min: 0,    max: 0.4,  step: 0.02, label: 'Lean' },
  petals:      { type: 'integer',     default: 9,    min: 3,    max: 18,   label: 'Petals' },
  petalLength: { type: 'range',       default: 0.13, min: 0.05, max: 0.3,  step: 0.01, label: 'Petal Length' },
  petalWidth:  { type: 'range',       default: 0.06, min: 0.02, max: 0.14, step: 0.005, label: 'Petal Width' },
  petalLift:   { type: 'range',       default: 0.45, min: 0,    max: 1.2,  step: 0.05, label: 'Petal Lift' },
  centerSize:  { type: 'range',       default: 0.045,min: 0.02, max: 0.1,  step: 0.005, label: 'Center Size' },
  leaves:      { type: 'integer',     default: 2,    min: 0,    max: 4,    label: 'Leaves' },
  leafLength:  { type: 'range',       default: 0.16, min: 0.05, max: 0.35, step: 0.01, label: 'Leaf Length' },
  petalColor:  { type: 'color',       default: '#e0556b', label: 'Petal Color' },
  centerColor: { type: 'color',       default: '#f0c040', label: 'Center Color' },
  stemColors:  { type: 'color-array', default: ['#2f6a1e', '#3f8526'], min: 1, max: 4, label: 'Stem Colors' },
} satisfies OptionSchema

export type FlowerOptions = Partial<OptionInput<typeof flowerSchema>> & { preset?: string }

export const flowerPresets: Record<string, Partial<FlowerOptions>> = {
  default: {},
  daisy: { petals: 14, petalColor: '#f3f0ee', centerColor: '#f0b830', petalWidth: 0.04, petalLength: 0.16 },
  tulip: { petals: 6, petalLift: 1.0, petalColor: '#d23a52', petalWidth: 0.1, petalLength: 0.18, centerSize: 0.03 },
  poppy: { petals: 5, petalColor: '#d8392b', petalWidth: 0.12, petalLift: 0.6 },
  dandelion: { petals: 18, petalColor: '#f2cf33', petalWidth: 0.025, petalLength: 0.1, petalLift: 0.7 },
}

function norm(x: number, y: number, z: number): Vec3 {
  const l = Math.hypot(x, y, z) || 1
  return [x / l, y / l, z / l]
}

export function flower(options: FlowerOptions = {}): Mesh {
  const { o, rng } = setup(flowerSchema, options, flowerPresets)
  const shapeRng = rng.stream('shape')

  const leanAngle = shapeRng() * Math.PI * 2
  const leanX = Math.cos(leanAngle) * o.lean
  const leanZ = Math.sin(leanAngle) * o.lean

  const parts: Mesh[] = []

  // Stem.
  parts.push(trunk({
    height: o.height,
    baseRadius: o.stemRadius,
    topRadius: o.stemRadius * 0.7,
    taper: 1,
    lean: [leanX, leanZ],
    noiseSeed: shapeRng.seed(),
    noiseScale: 6,
    noiseAmount: 0.06,
    segments: 5,
    heightSegments: 4,
    colors: o.stemColors,
  }))

  const head: Vec3 = [leanX, o.height, leanZ]

  // Flower center.
  parts.push(
    sphere({ radius: o.centerSize, widthSegments: 6, heightSegments: 4 })
      .scale(1, 0.6, 1)
      .translate(head[0], head[1], head[2])
      .vertexColor(o.centerColor),
  )

  // Petals arranged in a ring, lifting up into a cup.
  for (let i = 0; i < o.petals; i++) {
    const angle = (i / o.petals) * Math.PI * 2 + (shapeRng() - 0.5) * 0.15
    const ca = Math.cos(angle), sa = Math.sin(angle)
    const dir = norm(ca, o.petalLift * 1.4, sa)
    const start: Vec3 = [head[0] + ca * o.centerSize, head[1], head[2] + sa * o.centerSize]
    const segs = 3
    const path: Vec3[] = []
    for (let j = 0; j <= segs; j++) {
      const t = j / segs
      path.push([
        start[0] + dir[0] * o.petalLength * t,
        start[1] + dir[1] * o.petalLength * t,
        start[2] + dir[2] * o.petalLength * t,
      ])
    }
    parts.push(
      blade(path, { width: (t) => o.petalWidth * Math.sin(Math.min(1, t) * Math.PI) })
        .vertexColor(o.petalColor),
    )
  }

  // Leaves partway up the stem.
  for (let i = 0; i < o.leaves; i++) {
    const t0 = 0.3 + (i / Math.max(1, o.leaves)) * 0.4
    const angle = shapeRng() * Math.PI * 2
    const ca = Math.cos(angle), sa = Math.sin(angle)
    const dir = norm(ca, 0.35, sa)
    const base: Vec3 = [leanX * t0 * t0, o.height * t0, leanZ * t0 * t0]
    const segs = 3
    const path: Vec3[] = []
    for (let j = 0; j <= segs; j++) {
      const t = j / segs
      const droop = 0.25 * o.leafLength * t * t
      path.push([
        base[0] + dir[0] * o.leafLength * t,
        base[1] + dir[1] * o.leafLength * t - droop,
        base[2] + dir[2] * o.leafLength * t,
      ])
    }
    parts.push(
      blade(path, { width: (t) => o.leafLength * 0.3 * Math.sin(Math.min(1, t) * Math.PI) })
        .vertexColor(o.stemColors[o.stemColors.length - 1]),
    )
  }

  return merge(...parts)
}
