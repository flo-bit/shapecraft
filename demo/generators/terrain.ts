import { plane } from '../../src'
import { fbm, ridged } from '../../src/noise'
import { heightGradient } from '../../src/color'
import type { Mesh } from '../../src'

export function terrain(options?: { size?: number; segments?: number; seed?: number }): Mesh {
  const size = options?.size ?? 10
  const segments = options?.segments ?? 80
  const seed = options?.seed ?? 42

  const noise = fbm({ seed, octaves: 5, scale: 0.3, min: 0, max: 1.5 })
  const ridgeNoise = ridged({ seed: seed + 1, scale: 0.2, min: 0, max: 0.5 })

  const p = plane({ size, segments })
    .displace((pos) => {
      const n = noise.get(pos[0], pos[2])
      const r = ridgeNoise.get(pos[0] + 10, pos[2] + 10)
      return n + r * 0.3
    })
    .vertexColor(heightGradient([
      [-0.1, [0.2, 0.45, 0.15]],  // green (low)
      [0.4, [0.35, 0.55, 0.2]],   // lighter green
      [0.8, [0.5, 0.38, 0.22]],   // brown
      [1.2, [0.6, 0.6, 0.6]],     // gray rock
      [1.6, [0.95, 0.95, 0.98]],  // snow
    ]))

  return p
}
