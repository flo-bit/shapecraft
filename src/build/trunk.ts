import { cylinder } from '../primitives'
import { tube } from '../ops'
import { paletteGradient, type Palette } from '../color'
import { UberNoise } from '../noise'
import type { Mesh } from '../core/mesh'
import type { Vec3 } from '../core/types'

export interface TrunkOptions {
  /** Color palette, applied as a gradient from base (bottom) to tip (top). */
  colors: Palette

  // --- Straight mode (default) ---
  /** Trunk height. */
  height?: number
  /** Radius at the base. */
  baseRadius?: number
  /** Radius at the top. Defaults to half the base radius. */
  topRadius?: number
  /** Taper exponent — higher flares the base more. Default 1.5. */
  taper?: number
  /** [x, z] horizontal offset at the top, applied as `lean * t²` up the trunk. */
  lean?: [number, number]
  /** Seed for the surface-wobble noise. */
  noiseSeed?: number
  /** Wobble noise scale. Default 8. */
  noiseScale?: number
  /** Wobble amount as a fraction of local radius. Default 0.3. */
  noiseAmount?: number
  /** Radial sides. Default 5. */
  segments?: number
  /** Vertical segments. Default 4. */
  heightSegments?: number

  // --- Path mode (curved trunks/stems) ---
  /** If given, sweep the trunk along this path (e.g. a curved palm/willow trunk). */
  path?: Vec3[]
  /** Radius as a function of t∈[0,1] along the path. Defaults to a constant baseRadius. */
  radiusProfile?: (t: number) => number

  // --- Shared ---
  /** Optional low-poly jitter applied before coloring. */
  jitter?: number
  /** Seed for the jitter. */
  jitterSeed?: number
}

/**
 * Build a tapered trunk/stem — straight (a warped cylinder) or swept along a path.
 * Covers tree trunks, flower stems, cactus bodies, and curved palm/willow trunks.
 */
export function trunk(opts: TrunkOptions): Mesh {
  const segments = opts.segments ?? 5
  const grad = paletteGradient(opts.colors)

  let mesh: Mesh
  let bottom = 0
  let span = 1

  if (opts.path) {
    const profile = opts.radiusProfile ?? (() => opts.baseRadius ?? 0.1)
    mesh = tube(opts.path, profile, segments)
    bottom = opts.path[0][1]
    span = opts.path[opts.path.length - 1][1] - bottom || 1
  } else {
    const height = opts.height ?? 1
    const baseRadius = opts.baseRadius ?? 0.12
    const topRadius = opts.topRadius ?? baseRadius * 0.5
    const taper = opts.taper ?? 1.5
    const leanX = opts.lean?.[0] ?? 0
    const leanZ = opts.lean?.[1] ?? 0
    const noiseAmount = opts.noiseAmount ?? 0.3
    const heightSegments = opts.heightSegments ?? 4
    const noise = new UberNoise({ seed: opts.noiseSeed ?? 0, scale: opts.noiseScale ?? 8 })

    bottom = 0
    span = height

    mesh = cylinder({ radius: 1, radiusTop: 1, height, segments, heightSegments })
      .translate(0, height / 2, 0)
      .warp((pos) => {
        const t = Math.max(0, Math.min(1, pos[1] / height))
        const radius = topRadius + (baseRadius - topRadius) * Math.pow(1 - t, taper)
        const jitterAmt = radius * noiseAmount
        const nx = noise.get(pos[0] * 100, pos[1], pos[2] * 100) * jitterAmt
        const nz = noise.get(pos[0] * 100 + 500, pos[1] + 500, pos[2] * 100) * jitterAmt
        return [
          pos[0] * radius + leanX * t * t + nx,
          pos[1],
          pos[2] * radius + leanZ * t * t + nz,
        ]
      })
  }

  if (opts.jitter) {
    mesh = mesh.jitter(opts.jitter, { seed: opts.jitterSeed ?? 0 })
  }

  return mesh.vertexColor((pos) => grad(Math.max(0, Math.min(1, (pos[1] - bottom) / span))))
}
