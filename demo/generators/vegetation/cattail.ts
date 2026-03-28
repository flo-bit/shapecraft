import { cylinder, sphere, cone, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function cattail(options?: {
  stalks?: number
  height?: number
  seed?: number
}): Mesh {
  const stalks = options?.stalks ?? 7
  const height = options?.height ?? 1.2
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  const parts: Mesh[] = []

  for (let i = 0; i < stalks; i++) {
    const angle = rand() * Math.PI * 2
    const dist = rand() * 0.1
    const h = height * (0.7 + rand() * 0.3)
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist
    const tilt = (rand() - 0.5) * 0.2

    // Thin green stalk
    const stalk = cylinder({ radius: 0.008, height: h, segments: 5 })
      .translate(0, h / 2, 0)
      .rotate('z', tilt)
      .translate(x, 0, z)
      .vertexColor([0.25, 0.45, 0.15])
    parts.push(stalk)

    // Brown sausage-shaped head on some stalks
    if (rand() > 0.3) {
      const headH = 0.08 + rand() * 0.04
      const head = cylinder({ radius: 0.025, height: headH, segments: 6 })
        .translate(0, h - headH, 0)
        .rotate('z', tilt)
        .translate(x, 0, z)
        .vertexColor([0.4, 0.25, 0.1])
      parts.push(head)
    }

    // Long thin leaf
    if (rand() > 0.4) {
      const leafH = h * 0.7
      const leaf = cone({ radius: 0.015, height: leafH, segments: 3 })
        .scale(0.3, 1, 1)
        .translate(0, leafH / 2, 0)
        .rotate('z', 0.3 + rand() * 0.3)
        .rotate('y', rand() * Math.PI * 2)
        .translate(x, 0, z)
        .vertexColor([0.2, 0.5, 0.12])
      parts.push(leaf)
    }
  }

  return merge(...parts)
}
