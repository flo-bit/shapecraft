import * as THREE from 'three'
import { Mesh } from '../core/mesh'

export interface IcosphereOptions {
  radius?: number
  subdivisions?: number  // 0 = icosahedron (12 verts), 1 = 42 verts, 2 = 162, etc.
}

export function icosphere(options: IcosphereOptions = {}): Mesh {
  const { radius = 0.5, subdivisions = 2 } = options
  const geo = new THREE.IcosahedronGeometry(radius, subdivisions)
  return new Mesh(geo)
}
