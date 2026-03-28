import { cylinder, sphere, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function stump(options?: {
  radius?: number
  height?: number
  seed?: number
}): Mesh {
  const radius = options?.radius ?? 0.2
  const height = options?.height ?? 0.25
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  // Main stump
  const main = cylinder({ radius, radiusTop: radius * 0.9, height, segments: 8 })
    .translate(0, height / 2, 0)
    .vertexColor([0.35, 0.25, 0.12])

  // Top face — lighter color for exposed wood
  const topFace = cylinder({ radius: radius * 0.85, height: 0.01, segments: 8 })
    .translate(0, height, 0)
    .vertexColor([0.6, 0.5, 0.35])

  // Root bumps
  const roots: Mesh[] = []
  const numRoots = 3 + Math.floor(rand() * 3)
  for (let i = 0; i < numRoots; i++) {
    const angle = (i / numRoots) * Math.PI * 2 + rand() * 0.5
    const rootR = radius * (0.2 + rand() * 0.15)
    const root = sphere({ radius: rootR, widthSegments: 5, heightSegments: 4 })
      .scale(1.5, 0.5, 1)
      .rotate('y', angle)
      .translate(Math.cos(angle) * radius * 0.8, rootR * 0.2, Math.sin(angle) * radius * 0.8)
      .vertexColor([0.32, 0.22, 0.1])
    roots.push(root)
  }

  return merge(main, topFace, ...roots)
}
