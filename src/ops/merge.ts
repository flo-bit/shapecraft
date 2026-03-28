import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Mesh } from '../core/mesh'

export function merge(...meshes: Mesh[]): Mesh {
  if (meshes.length === 0) {
    return new Mesh(new THREE.BufferGeometry())
  }
  if (meshes.length === 1) {
    return meshes[0].clone()
  }

  let geometries = meshes.map(m => m.geometry.clone())

  // Normalize indexed/non-indexed: if mixed, convert all to non-indexed
  const hasIndexed = geometries.some(g => g.getIndex() !== null)
  const hasNonIndexed = geometries.some(g => g.getIndex() === null)
  if (hasIndexed && hasNonIndexed) {
    geometries = geometries.map(g => g.getIndex() ? g.toNonIndexed() : g)
  }

  // Normalize attributes: if any geometry has an attribute, all must have it
  const hasColors = geometries.some(g => g.getAttribute('color'))
  const hasUVs = geometries.some(g => g.getAttribute('uv'))
  const hasNormals = geometries.some(g => g.getAttribute('normal'))

  for (const geo of geometries) {
    const vertCount = geo.getAttribute('position').count

    if (hasColors && !geo.getAttribute('color')) {
      const colors = new Float32Array(vertCount * 3)
      colors.fill(1) // white default
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    }

    if (hasUVs && !geo.getAttribute('uv')) {
      const uvs = new Float32Array(vertCount * 2)
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    }

    if (hasNormals && !geo.getAttribute('normal')) {
      geo.computeVertexNormals()
    }
  }

  const merged = mergeGeometries(geometries, false)
  if (!merged) {
    throw new Error('Failed to merge geometries')
  }
  return new Mesh(merged)
}
