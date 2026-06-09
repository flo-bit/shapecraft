import * as THREE from 'three'
import { Mesh } from '../core/mesh'

export interface WeldOptions {
  /** Positions closer than this are merged into one vertex. Default 1e-4. */
  tolerance?: number
}

/**
 * Merge vertices that share a position (within `tolerance`) into a single indexed
 * vertex, then recompute normals. Welds the flat, non-indexed soup our generators
 * produce into a watertight indexed mesh — prerequisite for boolean/bevel and smaller
 * exports. Color/UV are kept from the first vertex seen at each position.
 *
 * (Normals become smooth; with the default flat-shaded materials it still renders faceted.)
 */
export function weld(mesh: Mesh, options: WeldOptions = {}): Mesh {
  const tol = options.tolerance ?? 1e-4
  const src = mesh.geometry
  const pos = src.getAttribute('position')
  const col = src.getAttribute('color')
  const uv = src.getAttribute('uv')
  const index = src.getIndex()
  const count = index ? index.count : pos.count
  const vid = (i: number) => (index ? index.getX(i) : i)

  const q = 1 / tol
  const keyOf = (x: number, y: number, z: number) =>
    `${Math.round(x * q)}_${Math.round(y * q)}_${Math.round(z * q)}`

  const map = new Map<string, number>()
  const newPos: number[] = []
  const newCol: number[] | null = col ? [] : null
  const newUv: number[] | null = uv ? [] : null
  const newIndex: number[] = []

  for (let i = 0; i < count; i++) {
    const vi = vid(i)
    const x = pos.getX(vi), y = pos.getY(vi), z = pos.getZ(vi)
    const k = keyOf(x, y, z)
    let idx = map.get(k)
    if (idx === undefined) {
      idx = newPos.length / 3
      map.set(k, idx)
      newPos.push(x, y, z)
      if (newCol && col) newCol.push(col.getX(vi), col.getY(vi), col.getZ(vi))
      if (newUv && uv) newUv.push(uv.getX(vi), uv.getY(vi))
    }
    newIndex.push(idx)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPos), 3))
  if (newCol) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(newCol), 3))
  if (newUv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(newUv), 2))
  geo.setIndex(newIndex)
  geo.computeVertexNormals()
  return new Mesh(geo)
}
