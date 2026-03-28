import { cone, cylinder, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function pineTree(options?: {
  height?: number
  trunkRadius?: number
  layers?: number
  seed?: number
}): Mesh {
  const height = options?.height ?? 2.5
  const trunkRadius = options?.trunkRadius ?? 0.06
  const layers = options?.layers ?? 4
  const seed = options?.seed ?? 1

  // Trunk
  const trunkHeight = height * 0.35
  const trunk = cylinder({ radius: trunkRadius, height: trunkHeight, segments: 8 })
    .translate(0, trunkHeight / 2, 0)
    .vertexColor([0.35, 0.22, 0.1])

  // Foliage layers - cones stacked and overlapping
  const foliageParts: Mesh[] = []
  const foliageStart = trunkHeight * 0.6
  const foliageHeight = height - foliageStart
  const layerHeight = foliageHeight / layers

  // Simple seeded random
  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  for (let i = 0; i < layers; i++) {
    const t = i / layers
    const radius = (0.25 + (1 - t) * 0.45) * (height / 2.5)
    const h = layerHeight * 1.5
    const y = foliageStart + i * layerHeight + h * 0.4
    const greenVar = 0.05 * (rand() - 0.5)
    const foliage = cone({ radius, height: h, segments: 8 })
      .translate(0, y, 0)
      .vertexColor([0.1 + greenVar, 0.35 + t * 0.1 + greenVar, 0.08])
    foliageParts.push(foliage)
  }

  return merge(trunk, ...foliageParts)
}
