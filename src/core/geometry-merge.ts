import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Mesh } from './mesh'

/**
 * Merge several meshes into one, normalizing attribute sets (fills missing colors with
 * white, missing UVs with zero, recomputes missing normals) and indexed/non-indexed
 * mismatches. Lives in core so both `ops/merge` and `Asset.flatten` can use it without a
 * core ↔ ops cycle.
 */
export function mergeMeshes(meshes: Mesh[]): Mesh {
  if (meshes.length === 0) return new Mesh(new THREE.BufferGeometry())
  if (meshes.length === 1) return meshes[0].clone()

  let geometries = meshes.map((m) => m.geometry.clone())

  const hasIndexed = geometries.some((g) => g.getIndex() !== null)
  const hasNonIndexed = geometries.some((g) => g.getIndex() === null)
  if (hasIndexed && hasNonIndexed) {
    geometries = geometries.map((g) => (g.getIndex() ? g.toNonIndexed() : g))
  }

  const hasColors = geometries.some((g) => g.getAttribute('color'))
  const hasUVs = geometries.some((g) => g.getAttribute('uv'))
  const hasNormals = geometries.some((g) => g.getAttribute('normal'))

  for (const geo of geometries) {
    const vertCount = geo.getAttribute('position').count
    if (hasColors && !geo.getAttribute('color')) {
      const colors = new Float32Array(vertCount * 3)
      colors.fill(1)
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    }
    if (hasUVs && !geo.getAttribute('uv')) {
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(vertCount * 2), 2))
    }
    if (hasNormals && !geo.getAttribute('normal')) {
      geo.computeVertexNormals()
    }
  }

  const merged = mergeGeometries(geometries, false)
  if (!merged) throw new Error('Failed to merge geometries')
  return new Mesh(merged)
}
