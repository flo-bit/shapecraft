import { cylinder, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function deadTree(options?: {
  height?: number
  branches?: number
  seed?: number
}): Mesh {
  const height = options?.height ?? 2
  const branches = options?.branches ?? 4
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  const bark: [number, number, number] = [0.3, 0.22, 0.15]
  const darkBark: [number, number, number] = [0.25, 0.18, 0.1]

  // Main trunk - slightly tapered
  const trunk = cylinder({ radius: 0.08, radiusTop: 0.04, height: height, segments: 6 })
    .translate(0, height / 2, 0)
    .vertexColor(bark)

  const branchParts: Mesh[] = []
  for (let i = 0; i < branches; i++) {
    const angle = (i / branches) * Math.PI * 2 + rand() * 0.8
    const branchY = height * (0.35 + rand() * 0.5)
    const branchLen = 0.3 + rand() * 0.5
    const tilt = 0.4 + rand() * 0.6

    // Main branch
    const branch = cylinder({ radius: 0.025, radiusTop: 0.01, height: branchLen, segments: 5 })
      .translate(0, branchLen / 2, 0)
      .rotate('z', tilt)
      .rotate('y', angle)
      .translate(0, branchY, 0)
      .vertexColor(darkBark)
    branchParts.push(branch)

    // Sub-branch
    if (rand() > 0.3) {
      const subLen = branchLen * 0.5
      const subAngle = angle + (rand() - 0.5) * 1
      const sub = cylinder({ radius: 0.015, radiusTop: 0.005, height: subLen, segments: 4 })
        .translate(0, subLen / 2, 0)
        .rotate('z', tilt + 0.3)
        .rotate('y', subAngle)
        .translate(
          Math.sin(tilt) * Math.sin(angle) * branchLen * 0.6,
          branchY + Math.cos(tilt) * branchLen * 0.6,
          Math.sin(tilt) * Math.cos(angle) * branchLen * 0.6
        )
        .vertexColor(darkBark)
      branchParts.push(sub)
    }
  }

  return merge(trunk, ...branchParts)
}
