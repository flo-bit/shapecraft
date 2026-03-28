import * as THREE from 'three'
import { Mesh } from '../mesh'

export interface ConeOptions {
  radius?: number
  height?: number
  segments?: number
}

export function cone(options: ConeOptions = {}): Mesh {
  const { radius = 0.5, height = 1, segments = 16 } = options
  const geo = new THREE.ConeGeometry(radius, height, segments)
  return new Mesh(geo)
}
