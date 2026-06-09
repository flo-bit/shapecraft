import * as THREE from 'three'
import { Mesh } from '../core/mesh'
import { Asset } from '../core/asset'
import { parseColor } from '../core/math'
import type { Material } from '../core/material'
import { toDataTexture } from './texture'

/** Build a THREE material from a shapecraft Material (or sensible defaults). */
export function toThreeMaterial(m: Material | null, hasVertexColors: boolean): THREE.Material {
  const vertexColors = m ? !!m.vertexColors : hasVertexColors
  return new THREE.MeshStandardMaterial({
    color: vertexColors ? new THREE.Color(0xffffff) : (m?.color !== undefined ? parseColor(m.color) : new THREE.Color(0xcccccc)),
    vertexColors,
    roughness: m?.roughness ?? 1,
    metalness: m?.metalness ?? 0,
    emissive: m?.emissive !== undefined ? parseColor(m.emissive) : new THREE.Color(0x000000),
    flatShading: m?.flatShading ?? true,
    side: m?.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    map: m?.map ? toDataTexture(m.map) : null,
    normalMap: m?.normalMap ? toDataTexture(m.normalMap, { colorSpace: 'linear' }) : null,
    alphaMap: m?.alphaMap ? toDataTexture(m.alphaMap, { colorSpace: 'linear' }) : null,
    alphaTest: m?.alphaMap ? (m.alphaTest ?? 0.5) : 0,
  })
}

export interface ToThreeOptions {
  castShadow?: boolean
  receiveShadow?: boolean
}

/** Convert an Asset (or plain Mesh) to a THREE.Object3D tree, one part per node. */
export function toThree(input: Asset | Mesh, options?: ToThreeOptions): THREE.Object3D {
  const obj = input instanceof Asset ? assetToObject3D(input) : toThreeMesh(input)
  if (options?.castShadow || options?.receiveShadow) {
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = !!options.castShadow
        o.receiveShadow = !!options.receiveShadow
      }
    })
  }
  return obj
}

function assetToObject3D(asset: Asset): THREE.Object3D {
  let obj: THREE.Object3D
  if (asset.geometry) {
    obj = new THREE.Mesh(asset.geometry.geometry, toThreeMaterial(asset.material, !!asset.geometry.colors))
  } else {
    obj = new THREE.Group()
  }
  obj.name = asset.name
  obj.applyMatrix4(asset.transform)
  for (const c of asset.children) obj.add(assetToObject3D(c))
  return obj
}

export function toThreeMesh(input: Mesh | Asset, options?: {
  material?: THREE.Material
  flatShading?: boolean
  wireframe?: boolean
  roughness?: number
  metalness?: number
  doubleSided?: boolean
}): THREE.Mesh {
  // Accept an Asset by flattening it to a single mesh (per-part materials are lost —
  // use toThree() for those). Lets migrated Asset generators flow through existing code.
  const mesh = input instanceof Asset ? input.flatten() : input
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
