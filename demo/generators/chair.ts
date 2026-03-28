import { box, cylinder, merge } from '../../src'
import type { Mesh } from '../../src'

export function chair(options?: { seatHeight?: number; legRadius?: number }): Mesh {
  const seatHeight = options?.seatHeight ?? 0.45
  const legRadius = options?.legRadius ?? 0.025

  // Seat
  const seat = box({ width: 0.4, height: 0.04, depth: 0.4 })
    .translate(0, seatHeight, 0)
    .vertexColor([0.45, 0.28, 0.15])

  // Legs
  const legHeight = seatHeight
  const legOffset = 0.16
  const legMesh = cylinder({ radius: legRadius, height: legHeight })
    .vertexColor([0.35, 0.22, 0.1])

  const leg1 = legMesh.translate(-legOffset, legHeight / 2, -legOffset)
  const leg2 = legMesh.translate(legOffset, legHeight / 2, -legOffset)
  const leg3 = legMesh.translate(-legOffset, legHeight / 2, legOffset)
  const leg4 = legMesh.translate(legOffset, legHeight / 2, legOffset)

  // Back
  const backHeight = 0.4
  const back = box({ width: 0.4, height: backHeight, depth: 0.03 })
    .translate(0, seatHeight + backHeight / 2, -0.185)
    .vertexColor([0.45, 0.28, 0.15])

  return merge(seat, leg1, leg2, leg3, leg4, back)
}
