import { merge } from '../../../ops'
import { setup, blade, heightShade } from '../../../build'
import type { Mesh } from '../../../core/mesh'
import type { Vec3 } from '../../../core/types'
import type { OptionSchema, OptionInput } from '../../../core/schema'

export const grassSchema = {
  seed:        { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed', group: 'General' },
  blades:      { type: 'integer',     default: 16,   min: 3,    max: 60,   label: 'Blades', group: 'Shape' },
  height:      { type: 'range',       default: 0.6,  min: 0.15, max: 1.6,  step: 0.05, label: 'Height', group: 'Shape' },
  bladeWidth:  { type: 'range',       default: 0.035,min: 0.01, max: 0.1,  step: 0.005, label: 'Blade Width', group: 'Shape' },
  spread:      { type: 'range',       default: 0.1,  min: 0,    max: 0.4,  step: 0.01, label: 'Base Spread', group: 'Shape' },
  fan:         { type: 'range',       default: 0.25, min: 0,    max: 0.6,  step: 0.02, label: 'Tip Fan', group: 'Shape' },
  curve:       { type: 'range',       default: 0.8,  min: 0,    max: 1.5,  step: 0.05, label: 'Curve', group: 'Shape' },
  segments:    { type: 'integer',     default: 4,    min: 2,    max: 8,    label: 'Segments', group: 'Shape' },
  colors:      { type: 'color-array', default: ['#3a6a1e', '#4e8a28', '#7ab33e'], min: 1, max: 6, label: 'Colors', group: 'Colors' },
} satisfies OptionSchema

export type GrassOptions = Partial<OptionInput<typeof grassSchema>> & { preset?: string }

export const grassPresets: Record<string, Partial<GrassOptions>> = {
  default: {},
  tall: { height: 1.2, blades: 22, curve: 0.5 },
  dry: { colors: ['#7a6a28', '#9a8a3a', '#b7a64a'], curve: 1.0 },
  lush: { blades: 30, colors: ['#2f6a1e', '#3f8a26', '#62ad36'] },
}

export function grass(options: GrassOptions = {}): Mesh {
  const { o, rng } = setup(grassSchema, options, grassPresets)
  const shapeRng = rng.stream('shape')

  const blades: Mesh[] = []
  for (let i = 0; i < o.blades; i++) {
    // Base position within a small disc.
    const baseAngle = shapeRng() * Math.PI * 2
    const baseDist = Math.sqrt(shapeRng()) * o.spread
    const bx = Math.cos(baseAngle) * baseDist
    const bz = Math.sin(baseAngle) * baseDist

    // Each blade arcs over in a random direction, biased outward from the clump.
    const outAngle = baseDist > 1e-4 ? baseAngle : shapeRng() * Math.PI * 2
    const leanAngle = outAngle + (shapeRng() - 0.5) * Math.PI * o.fan
    const ldx = Math.cos(leanAngle)
    const ldz = Math.sin(leanAngle)

    const h = o.height * (0.7 + shapeRng() * 0.5)
    const phiMax = Math.max(0.001, o.curve * (0.6 + shapeRng() * 0.8))
    const R = h / phiMax
    const w = o.bladeWidth * (0.7 + shapeRng() * 0.5)

    const segs = o.segments
    const path: Vec3[] = []
    for (let j = 0; j <= segs; j++) {
      const t = j / segs
      const phi = phiMax * t
      const y = R * Math.sin(phi)
      const hd = R * (1 - Math.cos(phi))
      path.push([bx + ldx * hd, y, bz + ldz * hd])
    }

    blades.push(blade(path, { width: w }).vertexColor(heightShade(o.colors, h)))
  }

  return merge(...blades)
}
