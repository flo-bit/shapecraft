import { sphere, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function bush(options?: {
  size?: number
  density?: number
  seed?: number
  color?: [number, number, number]
}): Mesh {
  const size = options?.size ?? 0.5
  const density = options?.density ?? 6
  const seed = options?.seed ?? 1
  const baseColor = options?.color ?? [0.15, 0.4, 0.1]

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  const parts: Mesh[] = []
  for (let i = 0; i < density; i++) {
    const angle = rand() * Math.PI * 2
    const dist = rand() * size * 0.4
    const r = size * (0.35 + rand() * 0.3)
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist
    const y = r * 0.6 + (rand() - 0.5) * size * 0.15
    const gv = rand() * 0.08
    const blob = sphere({ radius: r, widthSegments: 7, heightSegments: 5 })
      .translate(x, y, z)
      .vertexColor([baseColor[0] + gv, baseColor[1] + gv, baseColor[2]])
    parts.push(blob)
  }

  return merge(...parts)
}
