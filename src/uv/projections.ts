// UV projection implementation is in Mesh.computeUVs() (mesh.ts)
// Re-export the standalone function for direct geometry use
import * as THREE from 'three'

export function projectUVs(geometry: THREE.BufferGeometry, mode: 'box' | 'planar' | 'cylindrical' | 'spherical'): void {
  const pos = geometry.getAttribute('position')
  const uvs = new Float32Array(pos.count * 2)

  geometry.computeBoundingBox()
  const bbox = geometry.boundingBox!
  const size = new THREE.Vector3()
  bbox.getSize(size)
  const center = new THREE.Vector3()
  bbox.getCenter(center)

  if (mode === 'planar') {
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2] = size.x > 0 ? (pos.getX(i) - bbox.min.x) / size.x : 0
      uvs[i * 2 + 1] = size.z > 0 ? (pos.getZ(i) - bbox.min.z) / size.z : 0
    }
  } else if (mode === 'cylindrical') {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) - center.x
      const z = pos.getZ(i) - center.z
      uvs[i * 2] = (Math.atan2(z, x) / (2 * Math.PI)) + 0.5
      uvs[i * 2 + 1] = size.y > 0 ? (pos.getY(i) - bbox.min.y) / size.y : 0
    }
  } else if (mode === 'spherical') {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) - center.x
      const y = pos.getY(i) - center.y
      const z = pos.getZ(i) - center.z
      const r = Math.sqrt(x * x + y * y + z * z) || 1
      uvs[i * 2] = (Math.atan2(z, x) / (2 * Math.PI)) + 0.5
      uvs[i * 2 + 1] = Math.acos(Math.max(-1, Math.min(1, y / r))) / Math.PI
    }
  } else {
    // box projection
    const norm = geometry.getAttribute('normal')
    if (!norm) geometry.computeVertexNormals()
    const normals = geometry.getAttribute('normal')

    for (let i = 0; i < pos.count; i++) {
      const nx = Math.abs(normals.getX(i))
      const ny = Math.abs(normals.getY(i))
      const nz = Math.abs(normals.getZ(i))

      let u: number, v: number
      if (nx >= ny && nx >= nz) {
        u = size.z > 0 ? (pos.getZ(i) - bbox.min.z) / size.z : 0
        v = size.y > 0 ? (pos.getY(i) - bbox.min.y) / size.y : 0
      } else if (ny >= nx && ny >= nz) {
        u = size.x > 0 ? (pos.getX(i) - bbox.min.x) / size.x : 0
        v = size.z > 0 ? (pos.getZ(i) - bbox.min.z) / size.z : 0
      } else {
        u = size.x > 0 ? (pos.getX(i) - bbox.min.x) / size.x : 0
        v = size.y > 0 ? (pos.getY(i) - bbox.min.y) / size.y : 0
      }
      uvs[i * 2] = u
      uvs[i * 2 + 1] = v
    }
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
}
