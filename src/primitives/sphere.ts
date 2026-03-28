import * as THREE from 'three'
import { Mesh } from '../core/mesh'

export interface SphereOptions {
  radius?: number
  widthSegments?: number
  heightSegments?: number
}

export function sphere(options: SphereOptions = {}): Mesh {
  const { radius = 0.5, widthSegments = 16, heightSegments = 12 } = options
  const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments)
  return new Mesh(geo)
}
