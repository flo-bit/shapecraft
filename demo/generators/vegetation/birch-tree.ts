import { sphere, cylinder, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function birchTree(options?: {
  height?: number
  seed?: number
}): Mesh {
  const height = options?.height ?? 2.8
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  // Thin white trunk with slight taper
  const trunkHeight = height * 0.6
  const trunk = cylinder({ radius: 0.04, radiusTop: 0.025, height: trunkHeight, segments: 8 })
    .translate(0, trunkHeight / 2, 0)
    .vertexColor([0.85, 0.82, 0.75])

  // A few dark horizontal marks on trunk (small dark cylinders)
  const marks: Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const y = trunkHeight * (0.2 + rand() * 0.6)
    const mark = cylinder({ radius: 0.042, height: 0.015, segments: 8 })
      .translate(0, y, 0)
      .vertexColor([0.2, 0.18, 0.15])
    marks.push(mark)
  }

  // Canopy — loose, airy wider cluster
  const canopyParts: Mesh[] = []
  const canopyBase = trunkHeight * 0.65
  const canopyHeight = height * 0.35
  const numBlobs = 8 + Math.floor(rand() * 4)

  for (let i = 0; i < numBlobs; i++) {
    const angle = rand() * Math.PI * 2
    const dist = rand() * 0.6
    const r = 0.2 + rand() * 0.25
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist
    const y = canopyBase + canopyHeight * 0.5 + (rand() - 0.5) * canopyHeight
    const gv = rand() * 0.15
    const blob = sphere({ radius: r, widthSegments: 6, heightSegments: 5 })
      .translate(x, y, z)
      .vertexColor([0.3 + gv, 0.55 + gv, 0.15])
    canopyParts.push(blob)
  }

  return merge(trunk, ...marks, ...canopyParts)
}
