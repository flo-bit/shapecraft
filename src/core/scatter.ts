import type { Vec3 } from './types'
import { createRng } from './rng'

export interface ScatterOnSphereOptions {
  radius?: number
  polarMin?: number  // radians, default 0
  polarMax?: number  // radians, default PI
}

/**
 * Generate N random points on a sphere surface.
 * Returns array of [x, y, z] positions.
 */
export function scatterOnSphere(
  count: number,
  seed: number,
  options: ScatterOnSphereOptions = {}
): Vec3[] {
  const radius = options.radius ?? 1
  const polarMin = options.polarMin ?? 0
  const polarMax = options.polarMax ?? Math.PI
  const rand = createRng(seed)

  const points: Vec3[] = []
  for (let i = 0; i < count; i++) {
    const azimuth = rand() * Math.PI * 2
    const polar = polarMin + rand() * (polarMax - polarMin)
    const sp = Math.sin(polar)
    points.push([
      sp * Math.cos(azimuth) * radius,
      Math.cos(polar) * radius,
      sp * Math.sin(azimuth) * radius,
    ])
  }
  return points
}
