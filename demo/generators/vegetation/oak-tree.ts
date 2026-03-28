import { sphere, cylinder, merge, box } from '../../../src'
import type { Mesh } from '../../../src'

export function oakTree(options?: {
  height?: number
  canopySize?: number
  seed?: number
}): Mesh {
  const height = options?.height ?? 2.5
  const canopySize = options?.canopySize ?? 1.2
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  // Trunk
  const trunkHeight = height * 0.45
  const trunk = cylinder({ radius: 0.08, radiusTop: 0.05, height: trunkHeight, segments: 8 })
    .translate(0, trunkHeight / 2, 0)
    .vertexColor([0.35, 0.22, 0.1])

  // Canopy - cluster of spheres
  const canopyParts: Mesh[] = []
  const canopyCenter = trunkHeight + canopySize * 0.3
  const numBlobs = 5 + Math.floor(rand() * 3)

  for (let i = 0; i < numBlobs; i++) {
    const angle = rand() * Math.PI * 2
    const dist = rand() * canopySize * 0.35
    const r = canopySize * (0.3 + rand() * 0.25)
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist
    const y = canopyCenter + (rand() - 0.5) * canopySize * 0.3
    const greenVar = rand() * 0.1
    const blob = sphere({ radius: r, widthSegments: 8, heightSegments: 6 })
      .translate(x, y, z)
      .vertexColor([0.15 + greenVar, 0.4 + greenVar, 0.1])
    canopyParts.push(blob)
  }

  return merge(trunk, ...canopyParts)
}
