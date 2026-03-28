import { sphere, cylinder, cone, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function flower(options?: {
  height?: number
  petalColor?: [number, number, number]
  petals?: number
  seed?: number
}): Mesh {
  const height = options?.height ?? 0.6
  const petalColor = options?.petalColor ?? [0.9, 0.2, 0.3]
  const numPetals = options?.petals ?? 5
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  // Stem
  const stem = cylinder({ radius: 0.01, height: height, segments: 6 })
    .translate(0, height / 2, 0)
    .vertexColor([0.2, 0.5, 0.15])

  // Center
  const center = sphere({ radius: 0.05, widthSegments: 6, heightSegments: 5 })
    .translate(0, height + 0.02, 0)
    .vertexColor([0.9, 0.8, 0.2])

  // Petals - small flattened spheres arranged in a ring
  const petals: Mesh[] = []
  for (let i = 0; i < numPetals; i++) {
    const angle = (i / numPetals) * Math.PI * 2
    const pr = 0.07
    const dist = 0.065
    const petal = sphere({ radius: pr, widthSegments: 5, heightSegments: 4 })
      .scale(1, 0.4, 1)
      .translate(Math.cos(angle) * dist, height + 0.02, Math.sin(angle) * dist)
      .vertexColor([
        petalColor[0] + (rand() - 0.5) * 0.1,
        petalColor[1] + (rand() - 0.5) * 0.05,
        petalColor[2] + (rand() - 0.5) * 0.05,
      ])
    petals.push(petal)
  }

  return merge(stem, center, ...petals)
}
