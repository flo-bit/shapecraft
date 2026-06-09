import * as THREE from 'three'
import { sphere } from '../../../primitives'
import { merge } from '../../../ops'
import { setup, trunk, blade } from '../../../build'
import { group, part, Asset } from '../../../core/asset'
import { VERTEX_COLOR_MATERIAL } from '../../../core/material'
import type { Mesh } from '../../../core/mesh'
import type { Vec3 } from '../../../core/types'
import type { OptionSchema, OptionInput } from '../../../core/schema'

export const flowerSchema = {
  seed:        { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed', group: 'General' },
  height:      { type: 'range',       default: 0.5,  min: 0.15, max: 1.2,  step: 0.05, label: 'Stem Height', group: 'Stem' },
  stemRadius:  { type: 'range',       default: 0.012,min: 0.004,max: 0.03, step: 0.002, label: 'Stem Radius', group: 'Stem' },
  lean:        { type: 'range',       default: 0.12, min: 0,    max: 0.4,  step: 0.02, label: 'Lean', group: 'Stem' },
  petals:      { type: 'integer',     default: 9,    min: 3,    max: 18,   label: 'Petals', group: 'Petals' },
  petalLength: { type: 'range',       default: 0.13, min: 0.05, max: 0.3,  step: 0.01, label: 'Petal Length', group: 'Petals' },
  petalWidth:  { type: 'range',       default: 0.06, min: 0.02, max: 0.14, step: 0.005, label: 'Petal Width', group: 'Petals' },
  petalLift:   { type: 'range',       default: 0.45, min: 0,    max: 1.2,  step: 0.05, label: 'Petal Lift', group: 'Petals' },
  centerSize:  { type: 'range',       default: 0.045,min: 0.02, max: 0.1,  step: 0.005, label: 'Center Size', group: 'Petals' },
  leaves:      { type: 'integer',     default: 2,    min: 0,    max: 4,    label: 'Leaves', group: 'Leaves' },
  leafLength:  { type: 'range',       default: 0.16, min: 0.05, max: 0.35, step: 0.01, label: 'Leaf Length', group: 'Leaves' },
  petalColor:  { type: 'color',       default: '#e0556b', label: 'Petal Color', group: 'Colors' },
  centerColor: { type: 'color',       default: '#f0c040', label: 'Center Color', group: 'Colors' },
  stemColors:  { type: 'color-array', default: ['#2f6a1e', '#3f8526'], min: 1, max: 4, label: 'Stem Colors', group: 'Colors' },
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

export function flower(options: FlowerOptions = {}): Asset {
  const { o, rng } = setup(flowerSchema, options, flowerPresets)
  const shapeRng = rng.stream('shape')

  const leanAngle = shapeRng() * Math.PI * 2
  const leanX = Math.cos(leanAngle) * o.lean
  const leanZ = Math.sin(leanAngle) * o.lean

  // Stem.
  const stemMesh = trunk({
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
  })

  const head: Vec3 = [leanX, o.height, leanZ]

  // The bloom follows the stem: the lean curve is `lean·t²`, so the tip tangent is
  // (2·leanX, height, 2·leanZ). A small random nod keeps even upright flowers from
  // pointing perfectly skyward.
  const nodAngle = shapeRng() * Math.PI * 2
  const nodAmount = (0.05 + shapeRng() * 0.15) * o.height
  const tipDir = norm(
    2 * leanX + Math.cos(nodAngle) * nodAmount,
    o.height,
    2 * leanZ + Math.sin(nodAngle) * nodAmount,
  )
  const headTransform = new THREE.Matrix4().compose(
    new THREE.Vector3(head[0], head[1], head[2]),
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(tipDir[0], tipDir[1], tipDir[2]),
    ),
    new THREE.Vector3(1, 1, 1),
  )

  // Flower head: center disc + petals, built around the origin facing +Y and then
  // tilted/translated onto the stem tip as one piece.
  const headParts: Mesh[] = [
    sphere({ radius: o.centerSize, widthSegments: 6, heightSegments: 4 })
      .scale(1, 0.6, 1)
      .vertexColor(o.centerColor),
  ]
  const leafParts: Mesh[] = []

  // Petals arranged in a ring, lifting up into a cup.
  for (let i = 0; i < o.petals; i++) {
    const angle = (i / o.petals) * Math.PI * 2 + (shapeRng() - 0.5) * 0.15
    const ca = Math.cos(angle), sa = Math.sin(angle)
    const dir = norm(ca, o.petalLift * 1.4, sa)
    // Petals root well inside the center disc and slightly below its equator,
    // so they wrap under the center with no gap at the base.
    const inset = o.centerSize * 0.4
    const start: Vec3 = [ca * inset, -o.centerSize * 0.25, sa * inset]
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
    headParts.push(
      blade(path, {
        width: (t) => o.petalWidth * Math.sin(Math.min(1, t) * Math.PI),
        thickness: o.petalWidth * 0.15,
      }).vertexColor(o.petalColor),
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
    leafParts.push(
      blade(path, {
        width: (t) => o.leafLength * 0.3 * Math.sin(Math.min(1, t) * Math.PI),
        thickness: o.leafLength * 0.035,
      }).vertexColor(o.stemColors[o.stemColors.length - 1]),
    )
  }

  const children = [
    part('stem', stemMesh, VERTEX_COLOR_MATERIAL),
    part('head', merge(...headParts).transform(headTransform), VERTEX_COLOR_MATERIAL),
  ]
  if (leafParts.length > 0) children.push(part('leaves', merge(...leafParts), VERTEX_COLOR_MATERIAL))
  return group('flower', children)
}
