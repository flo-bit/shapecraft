import { sphere, cylinder, cone, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function willowTree(options?: {
  height?: number
  seed?: number
}): Mesh {
  const height = options?.height ?? 2.5
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  // Trunk
  const trunkHeight = height * 0.5
  const trunk = cylinder({ radius: 0.09, radiusTop: 0.06, height: trunkHeight, segments: 8 })
    .translate(0, trunkHeight / 2, 0)
    .vertexColor([0.35, 0.25, 0.12])

  // Main canopy dome
  const canopyR = 0.7
  const canopy = sphere({ radius: canopyR, widthSegments: 8, heightSegments: 6 })
    .scale(1.2, 0.7, 1.2)
    .translate(0, trunkHeight + canopyR * 0.3, 0)
    .vertexColor([0.2, 0.42, 0.12])

  // Drooping branches — thin long cones hanging down
  const droops: Mesh[] = []
  const numDroops = 14
  for (let i = 0; i < numDroops; i++) {
    const angle = (i / numDroops) * Math.PI * 2 + rand() * 0.3
    const droopLen = 0.8 + rand() * 0.6
    const outDist = canopyR * 0.8 + rand() * 0.2
    const startY = trunkHeight + canopyR * 0.2 + rand() * 0.3

    const droop = cone({ radius: 0.04, height: droopLen, segments: 4 })
      .scale(0.6, 1, 0.6)
      .rotate('x', Math.PI) // point down
      .translate(Math.cos(angle) * outDist, startY - droopLen / 2, Math.sin(angle) * outDist)
      .vertexColor([0.18, 0.45 + rand() * 0.08, 0.1])
    droops.push(droop)
  }

  return merge(trunk, canopy, ...droops)
}
