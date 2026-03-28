import { cylinder, cone, sphere, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function bamboo(options?: {
  stalks?: number
  height?: number
  seed?: number
}): Mesh {
  const stalks = options?.stalks ?? 5
  const height = options?.height ?? 2
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  const parts: Mesh[] = []

  for (let i = 0; i < stalks; i++) {
    const angle = rand() * Math.PI * 2
    const dist = rand() * 0.15
    const h = height * (0.7 + rand() * 0.3)
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist

    // Stalk segments with nodes
    const nodeCount = Math.floor(h / 0.3)
    const segH = h / nodeCount
    for (let j = 0; j < nodeCount; j++) {
      const seg = cylinder({ radius: 0.025, height: segH * 0.9, segments: 6 })
        .translate(x, j * segH + segH / 2, z)
        .vertexColor([0.4, 0.6 + rand() * 0.05, 0.2])
      parts.push(seg)

      // Node ring
      const node = cylinder({ radius: 0.032, height: segH * 0.1, segments: 6 })
        .translate(x, (j + 1) * segH, z)
        .vertexColor([0.35, 0.55, 0.18])
      parts.push(node)

      // Occasional leaf pair
      if (rand() > 0.6) {
        const leafAngle = rand() * Math.PI * 2
        const leaf = cone({ radius: 0.04, height: 0.15, segments: 3 })
          .scale(0.4, 1, 1)
          .rotate('z', -0.8)
          .rotate('y', leafAngle)
          .translate(x, (j + 1) * segH, z)
          .vertexColor([0.25, 0.55, 0.15])
        parts.push(leaf)
      }
    }
  }

  return merge(...parts)
}
