import * as THREE from 'three'
import { Mesh } from '../core/mesh'
import { merge } from './merge'

export interface MirrorOptions {
  /** Axis to mirror across. Default 'x'. */
  axis?: 'x' | 'y' | 'z'
  /** Position of the mirror plane along that axis. Default 0. */
  position?: number
  /** Keep the original alongside its reflection. Default true. */
  keepOriginal?: boolean
}

/** Reverse triangle winding (swap the 2nd & 3rd vertex of each tri) across all attributes. */
function reverseWinding(geo: THREE.BufferGeometry): void {
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.getAttribute(name) as THREE.BufferAttribute
    const item = a.itemSize
    const arr = a.array as Float32Array
    const triCount = a.count / 3
    for (let t = 0; t < triCount; t++) {
      const i1 = (t * 3 + 1) * item
      const i2 = (t * 3 + 2) * item
      for (let k = 0; k < item; k++) {
        const tmp = arr[i1 + k]
        arr[i1 + k] = arr[i2 + k]
        arr[i2 + k] = tmp
      }
    }
    a.needsUpdate = true
  }
}

/**
 * Reflect a mesh across an axis-aligned plane (and, by default, keep the original) —
 * the classic Mirror modifier for symmetric props, characters, leaves, buildings.
 */
export function mirror(mesh: Mesh, options: MirrorOptions = {}): Mesh {
  const axis = options.axis ?? 'x'
  const p = options.position ?? 0
  const keepOriginal = options.keepOriginal ?? true
  const ai = axis === 'x' ? 0 : axis === 'y' ? 1 : 2

  const s: [number, number, number] = [1, 1, 1]
  s[ai] = -1
  const m = new THREE.Matrix4().makeScale(s[0], s[1], s[2])
  if (p !== 0) {
    const before: [number, number, number] = [0, 0, 0]
    const after: [number, number, number] = [0, 0, 0]
    before[ai] = -p
    after[ai] = p
    m.premultiply(new THREE.Matrix4().makeTranslation(after[0], after[1], after[2]))
    m.multiply(new THREE.Matrix4().makeTranslation(before[0], before[1], before[2]))
  }

  let geo = mesh.geometry.clone()
  if (geo.getIndex()) geo = geo.toNonIndexed()
  geo.applyMatrix4(m)
  reverseWinding(geo) // reflection flips winding — restore outward-facing tris
  geo.computeVertexNormals()
  const reflected = new Mesh(geo)

  return keepOriginal ? merge(mesh, reflected) : reflected
}
