import { cylinder, sphere, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function mushroom(options?: {
  height?: number
  capColor?: [number, number, number]
  capRadius?: number
  seed?: number
}): Mesh {
  const height = options?.height ?? 0.3
  const capColor = options?.capColor ?? [0.7, 0.15, 0.1]
  const capRadius = options?.capRadius ?? 0.12
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  // Stem
  const stemRadius = capRadius * 0.3
  const stem = cylinder({ radius: stemRadius, radiusTop: stemRadius * 0.8, height: height, segments: 8 })
    .translate(0, height / 2, 0)
    .vertexColor([0.9, 0.88, 0.8])

  // Cap - flattened sphere
  const cap = sphere({ radius: capRadius, widthSegments: 10, heightSegments: 8 })
    .scale(1, 0.5, 1)
    .translate(0, height + capRadius * 0.1, 0)
    .vertexColor(capColor)

  // Cap underside - slightly recessed disc
  const underside = cylinder({ radius: capRadius * 0.85, height: 0.01, segments: 10 })
    .translate(0, height - 0.005, 0)
    .vertexColor([0.85, 0.8, 0.7])

  return merge(stem, cap, underside)
}
