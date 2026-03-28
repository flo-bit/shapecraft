import * as THREE from 'three'
import { Mesh } from '../mesh'

export interface TorusOptions {
  radius?: number
  tube?: number
  radialSegments?: number
  tubularSegments?: number
}

export function torus(options: TorusOptions = {}): Mesh {
  const { radius = 0.5, tube = 0.2, radialSegments = 12, tubularSegments = 24 } = options
  const geo = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments)
  return new Mesh(geo)
}
