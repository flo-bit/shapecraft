import * as THREE from 'three'
import { Mesh } from '../mesh'

export function fromThreeGeometry(geometry: THREE.BufferGeometry): Mesh {
  return new Mesh(geometry.clone())
}
