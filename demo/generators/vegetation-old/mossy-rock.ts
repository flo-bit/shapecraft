import { sphere, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function mossyRock(options?: {
  size?: number
  mossAmount?: number
  seed?: number
}): Mesh {
  const size = options?.size ?? 0.3
  const mossAmount = options?.mossAmount ?? 0.5
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  // Main rock — deformed sphere
  const rock = sphere({ radius: size, widthSegments: 7, heightSegments: 5 })
    .scale(1 + rand() * 0.3, 0.6 + rand() * 0.3, 1 + rand() * 0.2)
    .translate(0, size * 0.4, 0)
    .vertexColor((pos, normal) => {
      // Upper faces get moss, sides/bottom stay gray
      const mossFactor = Math.max(0, normal[1]) * mossAmount
      const gray: [number, number, number] = [0.45, 0.43, 0.4]
      const green: [number, number, number] = [0.2, 0.45, 0.15]
      return [
        gray[0] + (green[0] - gray[0]) * mossFactor,
        gray[1] + (green[1] - gray[1]) * mossFactor,
        gray[2] + (green[2] - gray[2]) * mossFactor,
      ]
    })

  // Small extra rocks
  const extras: Mesh[] = []
  for (let i = 0; i < 2; i++) {
    const angle = rand() * Math.PI * 2
    const dist = size * (0.7 + rand() * 0.3)
    const r = size * (0.2 + rand() * 0.2)
    const rock2 = sphere({ radius: r, widthSegments: 5, heightSegments: 4 })
      .scale(1, 0.6, 1)
      .translate(Math.cos(angle) * dist, r * 0.3, Math.sin(angle) * dist)
      .vertexColor([0.45 + rand() * 0.05, 0.43, 0.4])
    extras.push(rock2)
  }

  return merge(rock, ...extras)
}
