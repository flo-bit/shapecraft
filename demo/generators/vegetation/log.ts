import { cylinder, sphere, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function log(options?: {
  length?: number
  radius?: number
  seed?: number
}): Mesh {
  const length = options?.length ?? 0.8
  const radius = options?.radius ?? 0.1
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  // Main log body — horizontal cylinder
  const body = cylinder({ radius, height: length, segments: 8 })
    .rotate('z', Math.PI / 2) // lay on side
    .translate(0, radius, 0)
    .vertexColor([0.35, 0.25, 0.12])

  // End caps — lighter wood
  const endL = cylinder({ radius: radius * 0.9, height: 0.01, segments: 8 })
    .rotate('z', Math.PI / 2)
    .translate(-length / 2, radius, 0)
    .vertexColor([0.55, 0.45, 0.3])

  const endR = cylinder({ radius: radius * 0.9, height: 0.01, segments: 8 })
    .rotate('z', Math.PI / 2)
    .translate(length / 2, radius, 0)
    .vertexColor([0.55, 0.45, 0.3])

  // Optional small mushrooms on top
  const extras: Mesh[] = []
  if (rand() > 0.3) {
    for (let i = 0; i < 2; i++) {
      const mx = (rand() - 0.5) * length * 0.6
      const mush = sphere({ radius: 0.025, widthSegments: 5, heightSegments: 4 })
        .scale(1, 0.5, 1)
        .translate(mx, radius * 2 + 0.01, (rand() - 0.5) * radius * 0.5)
        .vertexColor([0.55, 0.35, 0.15])
      extras.push(mush)
    }
  }

  return merge(body, endL, endR, ...extras)
}
