import { icosphere } from '../primitives'
import { UberNoise } from '../noise'
import type { Mesh } from '../core/mesh'

export interface FoliageBlobOptions {
  /** Base radius of the blob. */
  radius: number
  /** Target max edge length for adaptive subdivision — lower = denser/rounder. */
  detail: number
  /** Seed for the surface-displacement noise. */
  noiseSeed: number
  /** Noise scale. Default 0.5. */
  noiseScale?: number
  /** Noise octaves. Default 3. */
  noiseOctaves?: number
  /** Displacement amount as a fraction of radius. */
  noiseAmount: number
  /** Optional low-poly jitter (absolute amount). */
  jitter?: number
  /** Seed for the jitter. */
  jitterSeed?: number
}

/**
 * A rounded, noise-warped blob — the workhorse for foliage canopies, bushes, rocks,
 * and mushroom caps. Starts from an icosphere, subdivides to the requested detail, and
 * pushes vertices radially by noise.
 */
export function foliageBlob(opts: FoliageBlobOptions): Mesh {
  const r = opts.radius
  const noise = new UberNoise({
    seed: opts.noiseSeed,
    scale: opts.noiseScale ?? 0.5,
    octaves: opts.noiseOctaves ?? 3,
  })

  let blob = icosphere({ radius: r, subdivisions: 0 })
    .subdivideAdaptive(opts.detail)
    .warp((pos) => {
      const len = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]) || 1
      const nx = pos[0] / len, ny = pos[1] / len, nz = pos[2] / len
      const d = r + noise.get(pos[0], pos[1], pos[2]) * r * opts.noiseAmount
      return [nx * d, ny * d, nz * d]
    })

  if (opts.jitter) {
    blob = blob.jitter(opts.jitter, { seed: opts.jitterSeed ?? 0 })
  }

  return blob
}
