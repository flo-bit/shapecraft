import { createRng } from '../core/rng'
import type { Mesh } from '../core/mesh'
import type { Vec3 } from '../core/types'

export interface SurfacePoint {
  /** Point on the mesh surface. */
  position: Vec3
  /** Face normal at that point. */
  normal: Vec3
}

export interface ScatterOnSurfaceOptions {
  /** RNG to draw from — pass a generator's seeded stream for determinism. Falls back to `seed`. */
  rng?: () => number
  /** Seed used when no `rng` is given. Default 0. */
  seed?: number
  /** Keep only faces whose (normalized) normal.y ≥ this. e.g. 0.2 → roughly upward faces. */
  minNormalY?: number
  /** Arbitrary face filter; return false to exclude a face. Receives centroid, normal, area. */
  filter?: (centroid: Vec3, normal: Vec3, area: number) => boolean
}

/**
 * Scatter `count` points uniformly over a mesh's surface, area-weighted so density is
 * even regardless of triangle size. Each point comes with its face normal, so callers
 * can sit objects on the surface (berries, flowers, moss, mushrooms, …) and orient them.
 *
 * Faces can be filtered by orientation (`minNormalY`) or an arbitrary predicate.
 */
export function scatterOnSurface(
  mesh: Mesh,
  count: number,
  options: ScatterOnSurfaceOptions = {},
): SurfacePoint[] {
  const rng = options.rng ?? createRng(options.seed ?? 0)
  const geo = mesh.geometry
  const posAttr = geo.getAttribute('position')
  const index = geo.getIndex()
  const triCount = index ? index.count / 3 : posAttr.count / 3
  const minNY = options.minNormalY
  const filter = options.filter

  const vid = (f: number, k: number) => (index ? index.getX(f * 3 + k) : f * 3 + k)

  // Pass 1: gather eligible faces with cumulative area and precomputed normals.
  const faces: number[] = []
  const cum: number[] = []
  const normals: Vec3[] = []
  let total = 0

  for (let f = 0; f < triCount; f++) {
    const i0 = vid(f, 0), i1 = vid(f, 1), i2 = vid(f, 2)
    const ax = posAttr.getX(i0), ay = posAttr.getY(i0), az = posAttr.getZ(i0)
    const bx = posAttr.getX(i1), by = posAttr.getY(i1), bz = posAttr.getZ(i1)
    const cx = posAttr.getX(i2), cy = posAttr.getY(i2), cz = posAttr.getZ(i2)

    const e1x = bx - ax, e1y = by - ay, e1z = bz - az
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az
    let nx = e1y * e2z - e1z * e2y
    let ny = e1z * e2x - e1x * e2z
    let nz = e1x * e2y - e1y * e2x
    const len = Math.hypot(nx, ny, nz)
    if (len <= 0) continue
    const area = len * 0.5
    nx /= len; ny /= len; nz /= len

    if (minNY !== undefined && ny < minNY) continue
    if (filter) {
      const centroid: Vec3 = [(ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3]
      if (!filter(centroid, [nx, ny, nz], area)) continue
    }

    total += area
    faces.push(f)
    cum.push(total)
    normals.push([nx, ny, nz])
  }

  const out: SurfacePoint[] = []
  if (faces.length === 0 || total <= 0) return out

  for (let n = 0; n < count; n++) {
    // Area-weighted face pick via binary search over cumulative areas.
    const target = rng() * total
    let lo = 0
    let hi = cum.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < target) lo = mid + 1
      else hi = mid
    }
    const f = faces[lo]
    const i0 = vid(f, 0), i1 = vid(f, 1), i2 = vid(f, 2)
    const ax = posAttr.getX(i0), ay = posAttr.getY(i0), az = posAttr.getZ(i0)
    const bx = posAttr.getX(i1), by = posAttr.getY(i1), bz = posAttr.getZ(i1)
    const cx = posAttr.getX(i2), cy = posAttr.getY(i2), cz = posAttr.getZ(i2)

    // Uniform barycentric sample (reflect into the triangle if outside).
    let r1 = rng()
    let r2 = rng()
    if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2 }

    out.push({
      position: [
        ax + (bx - ax) * r1 + (cx - ax) * r2,
        ay + (by - ay) * r1 + (cy - ay) * r2,
        az + (bz - az) * r1 + (cz - az) * r2,
      ],
      normal: normals[lo],
    })
  }

  return out
}
