import * as THREE from 'three'
import { Mesh } from '../core/mesh'
import type { Vec2 } from '../core/types'

export interface PlaneOptions {
  width?: number
  height?: number
  size?: number | Vec2
  widthSegments?: number
  heightSegments?: number
  segments?: number | Vec2
}

export function plane(options: PlaneOptions = {}): Mesh {
  let { width = 1, height = 1 } = options
  if (options.size !== undefined) {
    if (typeof options.size === 'number') {
      width = height = options.size
    } else {
      width = options.size[0]
      height = options.size[1]
    }
  }

  let widthSegments = options.widthSegments ?? 1
  let heightSegments = options.heightSegments ?? 1
  if (options.segments !== undefined) {
    if (typeof options.segments === 'number') {
      widthSegments = heightSegments = options.segments
    } else {
      widthSegments = options.segments[0]
      heightSegments = options.segments[1]
    }
  }

  const geo = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments)
  // Rotate from XY (vertical) to XZ (horizontal) for natural terrain/floor use
  geo.rotateX(-Math.PI / 2)
  return new Mesh(geo)
}
