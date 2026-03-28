import * as THREE from 'three'
import { Mesh } from '../mesh'

export interface CylinderOptions {
  radius?: number
  radiusTop?: number
  radiusBottom?: number
  height?: number
  segments?: number
  heightSegments?: number
}

export function cylinder(options: CylinderOptions = {}): Mesh {
  const { radius = 0.5, height = 1, segments = 16, heightSegments = 1 } = options
  const radiusTop = options.radiusTop ?? radius
  const radiusBottom = options.radiusBottom ?? radius
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, heightSegments)
  return new Mesh(geo)
}
