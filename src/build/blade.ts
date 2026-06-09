import * as THREE from 'three'
import { Mesh } from '../core/mesh'
import type { Vec3 } from '../core/types'

export interface BladeOptions {
  /** Full width across the blade at parameter t∈[0,1]. A number means `W·(1−t)` (tapers to a point). */
  width: number | ((t: number) => number)
  /** Reference up vector used to orient the ribbon's width direction. Default [0,1,0]. */
  up?: Vec3
  /** Emit back faces too, so the blade is visible from both sides. Default true. */
  doubleSided?: boolean
}

/**
 * Build a thin, tapered ribbon swept along a path — a leaf blade, grass blade, frond
 * leaflet, or petal. The width runs perpendicular to the path (around `up`) and tapers
 * along it; by default the blade is double-sided so it reads from any angle.
 */
export function blade(path: Vec3[], options: BladeOptions): Mesh {
  const widthFn = typeof options.width === 'function'
    ? options.width
    : (t: number) => (options.width as number) * (1 - t)
  const up = options.up ?? [0, 1, 0]
  const doubleSided = options.doubleSided ?? true
  const n = path.length

  const left: Vec3[] = []
  const right: Vec3[] = []
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0
    // Central-difference tangent.
    const a = path[Math.max(0, i - 1)]
    const b = path[Math.min(n - 1, i + 1)]
    let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]
    const tl = Math.hypot(tx, ty, tz) || 1
    tx /= tl; ty /= tl; tz /= tl
    // Width direction = tangent × up (perpendicular to the blade's length and facing).
    let sx = ty * up[2] - tz * up[1]
    let sy = tz * up[0] - tx * up[2]
    let sz = tx * up[1] - ty * up[0]
    let sl = Math.hypot(sx, sy, sz)
    if (sl < 1e-5) { sx = 1; sy = 0; sz = 0; sl = 1 } // tangent ∥ up → fall back
    sx /= sl; sy /= sl; sz /= sl
    const hw = Math.max(0, widthFn(t)) / 2
    const p = path[i]
    left.push([p[0] - sx * hw, p[1] - sy * hw, p[2] - sz * hw])
    right.push([p[0] + sx * hw, p[1] + sy * hw, p[2] + sz * hw])
  }

  const pos: number[] = []
  const tri = (a: Vec3, b: Vec3, c: Vec3) =>
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2])

  for (let i = 0; i < n - 1; i++) {
    const l0 = left[i], r0 = right[i], l1 = left[i + 1], r1 = right[i + 1]
    tri(l0, r0, r1)
    tri(l0, r1, l1)
    if (doubleSided) {
      tri(l0, r1, r0)
      tri(l0, l1, r1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  geo.computeVertexNormals()
  return new Mesh(geo)
}
