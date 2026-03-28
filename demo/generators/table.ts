import { cylinder, merge } from '../../src'
import type { Mesh } from '../../src'
import { chair } from './chair'

export function diningSet(options?: { chairs?: number; tableRadius?: number }): Mesh {
  const numChairs = options?.chairs ?? 4
  const tableRadius = options?.tableRadius ?? 0.6

  // Table top
  const top = cylinder({ radius: tableRadius, height: 0.05, segments: 24 })
    .translate(0, 0.72, 0)
    .vertexColor([0.5, 0.32, 0.18])

  // Table legs
  const legRadius = 0.03
  const legHeight = 0.72
  const legDist = tableRadius * 0.6
  const legMesh = cylinder({ radius: legRadius, height: legHeight })
    .vertexColor([0.4, 0.25, 0.12])

  const legs: Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2
    legs.push(
      legMesh.translate(
        Math.cos(angle) * legDist,
        legHeight / 2,
        Math.sin(angle) * legDist
      )
    )
  }

  // Chairs around the table
  const chairs: Mesh[] = []
  const chairDist = tableRadius + 0.35
  for (let i = 0; i < numChairs; i++) {
    const angle = (i / numChairs) * Math.PI * 2
    const x = Math.cos(angle) * chairDist
    const z = Math.sin(angle) * chairDist
    chairs.push(
      chair()
        .rotateY(-angle + Math.PI)
        .translate(x, 0, z)
    )
  }

  return merge(top, ...legs, ...chairs)
}
