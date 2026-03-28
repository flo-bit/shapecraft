import * as THREE from 'three'
import { Mesh } from '../core/mesh'

/**
 * Give a mesh thickness by duplicating it, offsetting along normals,
 * and stitching boundary edges.
 */
export function thicken(mesh: Mesh, thickness: number): Mesh {
  let geo = mesh.geometry.clone()
  // Keep indexed if possible — we need shared edge info
  if (!geo.getIndex()) {
    // Non-indexed: can't reliably find boundary edges, just do top+bottom
    return thickenSimple(geo, thickness)
  }

  geo.computeVertexNormals()
  const pos = geo.getAttribute('position')
  const norm = geo.getAttribute('normal')
  const index = geo.getIndex()!
  const vertCount = pos.count
  const half = thickness / 2

  // Build new positions: top (offset +normal) then bottom (offset -normal)
  const newPos = new Float32Array(vertCount * 2 * 3)
  for (let i = 0; i < vertCount; i++) {
    const nx = norm.getX(i), ny = norm.getY(i), nz = norm.getZ(i)
    // Top
    newPos[i * 3] = pos.getX(i) + nx * half
    newPos[i * 3 + 1] = pos.getY(i) + ny * half
    newPos[i * 3 + 2] = pos.getZ(i) + nz * half
    // Bottom
    const bi = (i + vertCount) * 3
    newPos[bi] = pos.getX(i) - nx * half
    newPos[bi + 1] = pos.getY(i) - ny * half
    newPos[bi + 2] = pos.getZ(i) - nz * half
  }

  const indexArr = index.array
  const triCount = indexArr.length / 3
  const newIndices: number[] = []

  // Top faces (same winding)
  for (let i = 0; i < indexArr.length; i++) {
    newIndices.push(indexArr[i])
  }

  // Bottom faces (reversed winding)
  for (let t = 0; t < triCount; t++) {
    const i = t * 3
    newIndices.push(
      indexArr[i] + vertCount,
      indexArr[i + 2] + vertCount,
      indexArr[i + 1] + vertCount,
    )
  }

  // Find boundary edges: edges that appear in only one triangle
  const edgeCount = new Map<string, { a: number; b: number; count: number }>()
  for (let t = 0; t < triCount; t++) {
    const i = t * 3
    const v0 = indexArr[i], v1 = indexArr[i + 1], v2 = indexArr[i + 2]
    for (const [a, b] of [[v0, v1], [v1, v2], [v2, v0]] as [number, number][]) {
      const key = a < b ? `${a},${b}` : `${b},${a}`
      const existing = edgeCount.get(key)
      if (existing) {
        existing.count++
      } else {
        edgeCount.set(key, { a, b, count: 1 })
      }
    }
  }

  // Stitch boundary edges with side quads
  for (const { a, b, count } of edgeCount.values()) {
    if (count === 1) {
      const a2 = a + vertCount
      const b2 = b + vertCount
      newIndices.push(a, b2, b)
      newIndices.push(a, a2, b2)
    }
  }

  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.BufferAttribute(newPos, 3))
  result.setIndex(newIndices)
  result.computeVertexNormals()
  return new Mesh(result)
}

/** Fallback for non-indexed geometry: just top + bottom, no side stitching */
function thickenSimple(geo: THREE.BufferGeometry, thickness: number): Mesh {
  geo.computeVertexNormals()
  const pos = geo.getAttribute('position')
  const norm = geo.getAttribute('normal')
  const vertCount = pos.count
  const half = thickness / 2

  const newPos: number[] = []
  const indices: number[] = []

  for (let i = 0; i < vertCount; i++) {
    const nx = norm.getX(i), ny = norm.getY(i), nz = norm.getZ(i)
    newPos.push(pos.getX(i) + nx * half, pos.getY(i) + ny * half, pos.getZ(i) + nz * half)
  }
  for (let i = 0; i < vertCount; i++) {
    const nx = norm.getX(i), ny = norm.getY(i), nz = norm.getZ(i)
    newPos.push(pos.getX(i) - nx * half, pos.getY(i) - ny * half, pos.getZ(i) - nz * half)
  }

  const triCount = vertCount / 3
  for (let t = 0; t < triCount; t++) {
    const i = t * 3
    indices.push(i, i + 1, i + 2)
    indices.push(i + vertCount, i + 2 + vertCount, i + 1 + vertCount)
  }

  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPos), 3))
  result.setIndex(indices)
  result.computeVertexNormals()
  return new Mesh(result)
}
