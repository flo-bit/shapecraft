import { sphere, cylinder, cone, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function succulent(options?: {
  size?: number
  layers?: number
  seed?: number
}): Mesh {
  const size = options?.size ?? 0.2
  const layers = options?.layers ?? 3
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  const parts: Mesh[] = []

  // Small pot
  const pot = cylinder({ radius: size * 0.6, radiusBottom: size * 0.45, height: size * 0.5, segments: 8 })
    .translate(0, size * 0.25, 0)
    .vertexColor([0.55, 0.35, 0.2])

  // Soil top
  const soil = cylinder({ radius: size * 0.55, height: 0.01, segments: 8 })
    .translate(0, size * 0.5, 0)
    .vertexColor([0.3, 0.2, 0.1])

  parts.push(pot, soil)

  // Rosette of leaves — concentric rings of flattened spheres
  for (let layer = 0; layer < layers; layer++) {
    const t = layer / layers
    const leavesInRing = 5 + layer * 2
    const ringRadius = size * (0.15 + t * 0.3)
    const leafSize = size * (0.12 + t * 0.05)
    const layerY = size * 0.52 + layer * size * 0.06

    for (let i = 0; i < leavesInRing; i++) {
      const angle = (i / leavesInRing) * Math.PI * 2 + layer * 0.3
      const tiltOut = 0.2 + t * 0.5
      const gv = rand() * 0.06
      const leaf = sphere({ radius: leafSize, widthSegments: 5, heightSegments: 4 })
        .scale(0.7, 0.4, 1.2)
        .rotate('x', -tiltOut)
        .rotate('y', angle)
        .translate(Math.cos(angle) * ringRadius, layerY, Math.sin(angle) * ringRadius)
        .vertexColor([0.25 + gv, 0.5 + gv, 0.25])
    parts.push(leaf)
    }
  }

  return merge(...parts)
}
