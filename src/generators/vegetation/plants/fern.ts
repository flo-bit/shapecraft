import { merge } from '../../../ops'
import { setup, blade, heightShade } from '../../../build'
import { part, Asset } from '../../../core/asset'
import { VERTEX_COLOR_MATERIAL } from '../../../core/material'
import type { Mesh } from '../../../core/mesh'
import type { Vec3 } from '../../../core/types'
import type { OptionSchema, OptionInput } from '../../../core/schema'

export const fernSchema = {
  seed:          { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed', group: 'General' },
  fronds:        { type: 'integer',     default: 6,    min: 2,    max: 12,   label: 'Fronds', group: 'Fronds' },
  length:        { type: 'range',       default: 1.0,  min: 0.4,  max: 2.2,  step: 0.05, label: 'Frond Length', group: 'Fronds' },
  arch:          { type: 'range',       default: 0.6,  min: 0.1,  max: 1.4,  step: 0.05, label: 'Arch', group: 'Fronds' },
  leaflets:      { type: 'integer',     default: 14,   min: 5,    max: 28,   label: 'Leaflets / side', group: 'Leaflets' },
  leafletLength: { type: 'range',       default: 0.32, min: 0.1,  max: 0.6,  step: 0.02, label: 'Leaflet Length', group: 'Leaflets' },
  leafletAngle:  { type: 'range',       default: 0.55, min: 0,    max: 1,    step: 0.05, label: 'Leaflet Forward', group: 'Leaflets' },
  leafletDroop:  { type: 'range',       default: 0.3,  min: 0,    max: 1,    step: 0.05, label: 'Leaflet Droop', group: 'Leaflets' },
  rachisWidth:   { type: 'range',       default: 0.02, min: 0.005,max: 0.05, step: 0.005, label: 'Rachis Width', group: 'Fronds' },
  segments:      { type: 'integer',     default: 12,   min: 6,    max: 20,   label: 'Rachis Smoothness', group: 'Fronds' },
  colors:        { type: 'color-array', default: ['#1f5216', '#2f6e1f', '#4e9a2e'], min: 1, max: 6, label: 'Colors', group: 'Colors' },
} satisfies OptionSchema

export type FernOptions = Partial<OptionInput<typeof fernSchema>> & { preset?: string }

export const fernPresets: Record<string, Partial<FernOptions>> = {
  default: {},
  upright: { arch: 0.25, fronds: 7, length: 1.3 },
  spreading: { arch: 1.1, fronds: 9, leafletLength: 0.4 },
  autumn: { colors: ['#6a5a1e', '#8a7322', '#a8902e'] },
}

function norm(x: number, y: number, z: number): Vec3 {
  const l = Math.hypot(x, y, z) || 1
  return [x / l, y / l, z / l]
}

export function fern(options: FernOptions = {}): Asset {
  const { o, rng } = setup(fernSchema, options, fernPresets)
  const shapeRng = rng.stream('shape')

  const fronds: Mesh[] = []

  for (let f = 0; f < o.fronds; f++) {
    const azimuth = (f / o.fronds) * Math.PI * 2 + (shapeRng() - 0.5) * 0.5
    const dx = Math.cos(azimuth)
    const dz = Math.sin(azimuth)
    const L = o.length * (0.8 + shapeRng() * 0.4)
    const phiMax = Math.max(0.05, o.arch * 1.4 * (0.8 + shapeRng() * 0.4))
    const R = L / phiMax

    // Analytic arc rachis in the vertical plane along (dx,dz).
    const rachisPoint = (u: number): Vec3 => {
      const phi = phiMax * u
      const hd = R * (1 - Math.cos(phi))
      return [dx * hd, R * Math.sin(phi), dz * hd]
    }
    const rachisTangent = (u: number): Vec3 => {
      const phi = phiMax * u
      return norm(dx * Math.sin(phi), Math.cos(phi), dz * Math.sin(phi))
    }

    const parts: Mesh[] = []
    let maxY = 0

    // Rachis (thin tapering stalk).
    const rachisPts: Vec3[] = []
    for (let i = 0; i <= o.segments; i++) {
      const p = rachisPoint(i / o.segments)
      rachisPts.push(p)
      if (p[1] > maxY) maxY = p[1]
    }
    parts.push(blade(rachisPts, { width: o.rachisWidth, thickness: o.rachisWidth * 0.6 }))

    // Leaflets down both sides, longest in the lower third, shrinking to the tip.
    for (let k = 0; k < o.leaflets; k++) {
      const u = (k + 0.5) / o.leaflets
      const profile = Math.pow(Math.sin(Math.min(1, u * 1.05) * Math.PI), 0.7)
      const ll = o.leafletLength * L * profile
      if (ll < 1e-3) continue

      const base = rachisPoint(u)
      const T = rachisTangent(u)
      const side = norm(T[1] * 0 - T[2] * 1, T[2] * 0 - T[0] * 0, T[0] * 1 - T[1] * 0) // T × up

      for (const s of [-1, 1]) {
        const dir = norm(
          side[0] * s + T[0] * o.leafletAngle * 0.9,
          side[1] * s + T[1] * o.leafletAngle * 0.9 + 0.18,
          side[2] * s + T[2] * o.leafletAngle * 0.9,
        )
        const segs = 3
        const leafPts: Vec3[] = []
        for (let j = 0; j <= segs; j++) {
          const t = j / segs
          const droop = o.leafletDroop * ll * t * t
          leafPts.push([
            base[0] + dir[0] * ll * t,
            base[1] + dir[1] * ll * t - droop,
            base[2] + dir[2] * ll * t,
          ])
        }
        parts.push(blade(leafPts, { width: ll * 0.3, thickness: ll * 0.035 }))
      }
    }

    fronds.push(merge(...parts).vertexColor(heightShade(o.colors, maxY * 0.9 || L)))
  }

  return part('fern', merge(...fronds), VERTEX_COLOR_MATERIAL)
}
