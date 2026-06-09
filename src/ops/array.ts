import * as THREE from 'three'
import { Mesh } from '../core/mesh'
import { merge } from './merge'
import { makeRotation } from '../core/math'
import type { Vec3 } from '../core/types'

export interface ArrayOptions {
  /** Number of copies (including the original). */
  count: number
  /** Per-step translation. Default [0,0,0]. */
  offset?: Vec3
  /** Per-step rotation (radians, XYZ Euler) about `pivot`. Default [0,0,0]. */
  rotate?: Vec3
  /** Per-step uniform scale factor (compounded). Default 1. */
  scale?: number
  /** Pivot for per-step rotation/scale. Default [0,0,0]. */
  pivot?: Vec3
}

/**
 * Repeat a mesh `count` times, compounding a per-step translate/rotate/scale — the Array
 * modifier. Linear (offset), spiral (offset+rotate), tapering (scale): fences, stairs,
 * pickets, chains, vertebrae. Copy 0 is the original.
 */
export function array(mesh: Mesh, options: ArrayOptions): Mesh {
  const count = Math.max(1, Math.floor(options.count))
  const offset = options.offset ?? [0, 0, 0]
  const rotate = options.rotate ?? [0, 0, 0]
  const scale = options.scale ?? 1
  const pivot = options.pivot ?? [0, 0, 0]

  const copies: Mesh[] = []
  for (let i = 0; i < count; i++) {
    const f = Math.pow(scale, i)
    const m = new THREE.Matrix4()
      .makeTranslation(offset[0] * i, offset[1] * i, offset[2] * i)
      .multiply(new THREE.Matrix4().makeTranslation(pivot[0], pivot[1], pivot[2]))
      .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotate[0] * i, rotate[1] * i, rotate[2] * i)))
      .multiply(new THREE.Matrix4().makeScale(f, f, f))
      .multiply(new THREE.Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2]))
    copies.push(i === 0 ? mesh.clone() : mesh.transform(m))
  }
  return merge(...copies)
}

export interface RadialArrayOptions {
  /** Number of copies around the circle. */
  count: number
  /** Axis to rotate around. Default 'y'. */
  axis?: 'x' | 'y' | 'z'
  /** Distance each copy is pushed out from the axis before rotating. Default 0. */
  radius?: number
  /** Starting angle (radians). Default 0. */
  startAngle?: number
}

/**
 * Place `count` copies evenly around an axis — spokes, columns, petals, gears, fences in
 * a ring. With `radius` they orbit the axis; with 0 they pinwheel about it.
 */
export function radialArray(mesh: Mesh, options: RadialArrayOptions): Mesh {
  const count = Math.max(1, Math.floor(options.count))
  const axis = options.axis ?? 'y'
  const radius = options.radius ?? 0
  const start = options.startAngle ?? 0
  const step = (Math.PI * 2) / count

  const perp: Vec3 = axis === 'x' ? [0, radius, 0] : [radius, 0, 0]

  const copies: Mesh[] = []
  for (let i = 0; i < count; i++) {
    const m = makeRotation(axis, start + i * step)
      .multiply(new THREE.Matrix4().makeTranslation(perp[0], perp[1], perp[2]))
    copies.push(mesh.transform(m))
  }
  return merge(...copies)
}
