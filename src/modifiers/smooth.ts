import * as THREE from 'three'
import { Mesh } from '../core/mesh'

export function smooth(mesh: Mesh, iterations: number = 1): Mesh {
  let geo = mesh.geometry.clone()

  for (let iter = 0; iter < iterations; iter++) {
    const pos = geo.getAttribute('position')
    const index = geo.getIndex()
    const newPos = new Float32Array(pos.array.length)
    newPos.set(pos.array as Float32Array)

    // Build adjacency map
    const neighbors: Map<number, Set<number>> = new Map()
    function addEdge(a: number, b: number) {
      if (!neighbors.has(a)) neighbors.set(a, new Set())
      if (!neighbors.has(b)) neighbors.set(b, new Set())
      neighbors.get(a)!.add(b)
      neighbors.get(b)!.add(a)
    }

    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const a = index.array[i], b = index.array[i + 1], c = index.array[i + 2]
        addEdge(a, b)
        addEdge(b, c)
        addEdge(c, a)
      }
    } else {
      for (let i = 0; i < pos.count; i += 3) {
        addEdge(i, i + 1)
        addEdge(i + 1, i + 2)
        addEdge(i + 2, i)
      }
    }

    // Laplacian smoothing
    for (let i = 0; i < pos.count; i++) {
      const nbrs = neighbors.get(i)
      if (!nbrs || nbrs.size === 0) continue
      let sx = 0, sy = 0, sz = 0
      for (const n of nbrs) {
        sx += pos.getX(n)
        sy += pos.getY(n)
        sz += pos.getZ(n)
      }
      const count = nbrs.size
      newPos[i * 3] = sx / count
      newPos[i * 3 + 1] = sy / count
      newPos[i * 3 + 2] = sz / count
    }

    geo.setAttribute('position', new THREE.BufferAttribute(newPos, 3))
  }

  geo.computeVertexNormals()
  return new Mesh(geo)
}
