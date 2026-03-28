import * as THREE from 'three'
import { Mesh } from '../core/mesh'

export function toThreeMesh(mesh: Mesh, options?: {
  material?: THREE.Material
  flatShading?: boolean
  wireframe?: boolean
  roughness?: number
  metalness?: number
  doubleSided?: boolean
}): THREE.Mesh {
  const geometry = toThreeGeometry(mesh)
  const flatShading = options?.flatShading ?? true
  const wireframe = options?.wireframe ?? false
  const side = options?.doubleSided ? THREE.DoubleSide : THREE.FrontSide
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
      side,
    })
  } else {
    material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      flatShading,
      wireframe,
      roughness,
      metalness,
      side,
    })
  }

  return new THREE.Mesh(geometry, material)
}

export function toThreeGeometry(mesh: Mesh): THREE.BufferGeometry {
  return mesh.geometry
}
