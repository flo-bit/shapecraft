import * as THREE from 'three'
import { Mesh } from '../mesh'

export function toThreeMesh(mesh: Mesh, options?: {
  material?: THREE.Material
  flatShading?: boolean
  wireframe?: boolean
  roughness?: number
  metalness?: number
}): THREE.Mesh {
  const geometry = toThreeGeometry(mesh)
  const flatShading = options?.flatShading ?? true
  const wireframe = options?.wireframe ?? false
  const roughness = options?.roughness ?? 1
  const metalness = options?.metalness ?? 0

  let material: THREE.Material
  if (options?.material) {
    material = options.material
  } else if (mesh.colors) {
    material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading,
      wireframe,
      roughness,
      metalness,
    })
  } else {
    material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      flatShading,
      wireframe,
      roughness,
      metalness,
    })
  }

  return new THREE.Mesh(geometry, material)
}

export function toThreeGeometry(mesh: Mesh): THREE.BufferGeometry {
  return mesh.geometry
}
