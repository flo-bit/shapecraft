import { cylinder, cone, plane, merge, box } from '../../../src'
import type { Mesh } from '../../../src'

export function palmTree(options?: {
  height?: number
  lean?: number
  fronds?: number
  seed?: number
}): Mesh {
  const height = options?.height ?? 3
  const lean = options?.lean ?? 0.15
  const numFronds = options?.fronds ?? 7
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  // Curved trunk - stack of overlapping cylinders
  const segments = 12
  const segHeight = (height / segments) * 1.3 // overlap
  const stepHeight = height / segments
  const trunkParts: Mesh[] = []

  let cx = 0, cz = 0, cy = 0
  for (let i = 0; i < segments; i++) {
    const t = i / segments
    const radius = 0.07 * (1 - t * 0.35)
    const seg = cylinder({ radius, height: segHeight, segments: 8 })
      .translate(cx, cy + stepHeight / 2, cz)
      .vertexColor([0.5, 0.38, 0.22])
    trunkParts.push(seg)
    cy += stepHeight
    cx += lean * Math.sin(t * 1.5)
    cz += lean * Math.cos(t * 0.7) * 0.3
  }

  // Coconuts cluster at top
  const coconuts: Mesh[] = []
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2
    const coconut = cylinder({ radius: 0.04, height: 0.06, segments: 6 })
      .translate(cx + Math.cos(angle) * 0.06, cy - 0.05, cz + Math.sin(angle) * 0.06)
      .vertexColor([0.4, 0.28, 0.1])
    coconuts.push(coconut)
  }

  // Fronds - elongated cones drooping from top
  const frondParts: Mesh[] = []
  for (let i = 0; i < numFronds; i++) {
    const angle = (i / numFronds) * Math.PI * 2 + rand() * 0.3
    const droop = 0.4 + rand() * 0.3
    const frondLen = 0.8 + rand() * 0.4
    // Each frond is a flattened cone
    const frond = cone({ radius: 0.15, height: frondLen, segments: 4 })
      .scale(1, 1, 0.3)
      .rotate('z', -Math.PI / 2 - droop)
      .rotate('y', angle)
      .translate(cx, cy + 0.1, cz)
      .vertexColor([0.2, 0.5 + rand() * 0.1, 0.1])
    frondParts.push(frond)
  }

  return merge(...trunkParts, ...coconuts, ...frondParts)
}
