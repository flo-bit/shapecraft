import * as THREE from 'three'
import { Mesh } from '../core/mesh'
import type { Vec3 } from '../core/types'

export interface BoxOptions {
  width?: number
  height?: number
  depth?: number
  size?: Vec3 | number
  widthSegments?: number
  heightSegments?: number
  depthSegments?: number
}

export function box(options: BoxOptions = {}): Mesh {
  let { width = 1, height = 1, depth = 1 } = options
  if (options.size !== undefined) {
    if (typeof options.size === 'number') {
      width = height = depth = options.size
    } else {
      width = options.size[0]
      height = options.size[1]
      depth = options.size[2]
    }
  }
  const geo = new THREE.BoxGeometry(
    width, height, depth,
    options.widthSegments, options.heightSegments, options.depthSegments
  )
  return new Mesh(geo)
}
