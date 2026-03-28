import { cone, cylinder, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function fern(options?: {
  fronds?: number
  size?: number
  seed?: number
}): Mesh {
  const numFronds = options?.fronds ?? 7
  const size = options?.size ?? 0.8
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  const parts: Mesh[] = []

  // Small center stem
  const center = cylinder({ radius: 0.015, height: 0.08, segments: 6 })
    .translate(0, 0.04, 0)
    .vertexColor([0.25, 0.4, 0.12])

  parts.push(center)

  // Fronds radiating outward and drooping
  for (let i = 0; i < numFronds; i++) {
    const angle = (i / numFronds) * Math.PI * 2 + rand() * 0.3
    const frondLen = size * (0.7 + rand() * 0.3)
    const droop = 0.3 + rand() * 0.4

    // Build frond from small segments
    const segments = 5
    let fx = 0, fy = 0.06, fz = 0
    for (let j = 0; j < segments; j++) {
      const t = j / segments
      const segLen = frondLen / segments
      const leafSize = 0.03 * (1 - t * 0.5) * size * 2
      const dx = Math.cos(angle) * segLen
      const dz = Math.sin(angle) * segLen
      const dy = -droop * segLen * t

      const leaf = cone({ radius: leafSize, height: segLen, segments: 4 })
        .scale(0.5, 1, 1)
        .rotate('z', -droop * t - 0.3)
        .rotate('y', angle)
        .translate(fx + dx / 2, fy + dy / 2, fz + dz / 2)
        .vertexColor([0.15, 0.45 + rand() * 0.1, 0.08])

      parts.push(leaf)
      fx += dx
      fy += dy
      fz += dz
    }
  }

  return merge(...parts)
}
