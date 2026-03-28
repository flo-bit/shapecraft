import { sphere, cylinder, cone, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function topiary(options?: {
  shape?: 'sphere' | 'cone' | 'spiral'
  height?: number
  seed?: number
}): Mesh {
  const shape = options?.shape ?? 'sphere'
  const height = options?.height ?? 1.2
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  const green: [number, number, number] = [0.12, 0.38, 0.08]
  const darkGreen: [number, number, number] = [0.08, 0.3, 0.06]

  // Trunk
  const trunkH = height * 0.35
  const trunk = cylinder({ radius: 0.04, height: trunkH, segments: 8 })
    .translate(0, trunkH / 2, 0)
    .vertexColor([0.35, 0.22, 0.1])

  const canopyParts: Mesh[] = []

  if (shape === 'sphere') {
    const r = height * 0.3
    const canopy = sphere({ radius: r, widthSegments: 10, heightSegments: 8 })
      .translate(0, trunkH + r, 0)
      .vertexColor(green)
    canopyParts.push(canopy)
  } else if (shape === 'cone') {
    const r = height * 0.25
    const coneH = height * 0.6
    const canopy = cone({ radius: r, height: coneH, segments: 10 })
      .translate(0, trunkH + coneH / 2, 0)
      .vertexColor(green)
    canopyParts.push(canopy)
  } else {
    // Spiral — stacked spheres decreasing in size
    const levels = 3
    let cy = trunkH
    for (let i = 0; i < levels; i++) {
      const t = i / levels
      const r = height * (0.25 - t * 0.07)
      const ball = sphere({ radius: r, widthSegments: 8, heightSegments: 6 })
        .translate(0, cy + r, 0)
        .vertexColor(i % 2 === 0 ? green : darkGreen)
      canopyParts.push(ball)

      // Thin connector
      if (i < levels - 1) {
        const connH = 0.06
        const conn = cylinder({ radius: 0.02, height: connH, segments: 6 })
          .translate(0, cy + r * 2 + connH / 2, 0)
          .vertexColor([0.35, 0.22, 0.1])
        canopyParts.push(conn)
        cy += r * 2 + connH
      }
    }
  }

  return merge(trunk, ...canopyParts)
}
