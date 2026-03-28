import * as THREE from 'three'
import { Mesh } from '../mesh'

export interface ConeOptions {
  radius?: number
  height?: number
  segments?: number
  heightSegments?: number
}

export function cone(options: ConeOptions = {}): Mesh {
  const { radius = 0.5, height = 1, segments = 16, heightSegments = 1 } = options
  const geo = new THREE.ConeGeometry(radius, height, segments, heightSegments)
  return new Mesh(geo)
}
