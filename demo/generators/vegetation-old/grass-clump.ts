import { cone, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function grassClump(options?: {
  blades?: number
  height?: number
  spread?: number
  seed?: number
}): Mesh {
  const blades = options?.blades ?? 12
  const height = options?.height ?? 0.3
  const spread = options?.spread ?? 0.15
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  const parts: Mesh[] = []
  for (let i = 0; i < blades; i++) {
    const angle = rand() * Math.PI * 2
    const dist = rand() * spread
    const h = height * (0.6 + rand() * 0.4)
    const tilt = (rand() - 0.5) * 0.4
    const gv = rand() * 0.15

    const blade = cone({ radius: 0.012, height: h, segments: 4 })
      .translate(0, h / 2, 0)
      .rotate('z', tilt)
      .rotate('y', rand() * 0.3)
      .translate(Math.cos(angle) * dist, 0, Math.sin(angle) * dist)
      .vertexColor([0.2 + gv, 0.55 + gv, 0.1])

    parts.push(blade)
  }

  return merge(...parts)
}
