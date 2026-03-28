import { cylinder, sphere, merge } from '../../../src'
import type { Mesh } from '../../../src'

export function cactus(options?: {
  height?: number
  arms?: number
  seed?: number
}): Mesh {
  const height = options?.height ?? 1.2
  const arms = options?.arms ?? 2
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  const green: [number, number, number] = [0.2, 0.5, 0.2]
  const darkGreen: [number, number, number] = [0.15, 0.4, 0.15]

  // Main body
  const body = cylinder({ radius: 0.1, height: height, segments: 8 })
    .translate(0, height / 2, 0)
    .vertexColor(green)

  // Top dome
  const top = sphere({ radius: 0.1, widthSegments: 8, heightSegments: 6 })
    .scale(1, 0.5, 1)
    .translate(0, height, 0)
    .vertexColor(green)

  // Arms
  const armParts: Mesh[] = []
  for (let i = 0; i < arms; i++) {
    const angle = (i / arms) * Math.PI * 2 + rand() * 0.5
    const armY = height * (0.35 + rand() * 0.3)
    const armLen = 0.25 + rand() * 0.2
    const armUp = 0.2 + rand() * 0.15

    // Horizontal part
    const hArm = cylinder({ radius: 0.06, height: armLen, segments: 6 })
      .rotate('z', Math.PI / 2)
      .rotate('y', angle)
      .translate(Math.cos(angle) * armLen / 2, armY, Math.sin(angle) * armLen / 2)
      .vertexColor(darkGreen)

    // Vertical part going up
    const vArm = cylinder({ radius: 0.06, height: armUp, segments: 6 })
      .translate(Math.cos(angle) * armLen, armY + armUp / 2, Math.sin(angle) * armLen)
      .vertexColor(darkGreen)

    // Arm top dome
    const armTop = sphere({ radius: 0.06, widthSegments: 6, heightSegments: 4 })
      .scale(1, 0.5, 1)
      .translate(Math.cos(angle) * armLen, armY + armUp, Math.sin(angle) * armLen)
      .vertexColor(darkGreen)

    armParts.push(hArm, vArm, armTop)
  }

  return merge(body, top, ...armParts)
}
