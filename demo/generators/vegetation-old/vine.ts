import { cylinder, sphere, cone, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function vine(options?: {
  height?: number
  tendrils?: number
  seed?: number
}): Mesh {
  const height = options?.height ?? 1.8
  const tendrils = options?.tendrils ?? 5
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  const parts: Mesh[] = []

  // Thin support pole (like a trellis)
  const pole = cylinder({ radius: 0.015, height: height, segments: 4 })
    .translate(0, height / 2, 0)
    .vertexColor([0.4, 0.3, 0.18])
  parts.push(pole)

  // Winding vine tendrils
  for (let t = 0; t < tendrils; t++) {
    const startAngle = (t / tendrils) * Math.PI * 2
    const segments = 12
    const segH = height / segments

    for (let i = 0; i < segments; i++) {
      const frac = i / segments
      const angle = startAngle + frac * Math.PI * 3
      const dist = 0.04 + Math.sin(frac * Math.PI) * 0.06
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      const y = i * segH

      const seg = cylinder({ radius: 0.012, height: segH * 1.2, segments: 4 })
        .translate(x, y + segH / 2, z)
        .vertexColor([0.25, 0.4, 0.12])
      parts.push(seg)

      // Leaves at intervals
      if (i % 3 === 1) {
        const leafAngle = angle + rand() * 1.5
        const leaf = cone({ radius: 0.035, height: 0.06, segments: 3 })
          .scale(0.6, 1, 1)
          .rotate('z', -0.5)
          .rotate('y', leafAngle)
          .translate(x, y + segH / 2, z)
          .vertexColor([0.18, 0.48 + rand() * 0.08, 0.1])
        parts.push(leaf)
      }
    }
  }

  return merge(...parts)
}
