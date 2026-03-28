import { icosphere, cylinder, merge } from '../../src'
import { UberNoise } from '../../src/noise'
import type { Mesh } from '../../src'

export interface TreeOptions {
  height?: number
  trunkRadius?: number
  canopyRadius?: number
  seed?: number
}

export function tree(options: TreeOptions = {}): Mesh {
  const height = options?.height ?? 2.5
  const trunkRadius = options?.trunkRadius ?? 0.06
  const canopyRadius = options?.canopyRadius ?? 0.8
  const seed = options?.seed ?? 1

  let s = seed
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647 }

  // Trunk — thick at base, tapering to thin at top
  const trunkHeight = height * 0.45
  const trunk = cylinder({ radius: trunkRadius * 2, radiusTop: trunkRadius * 0.5, height: trunkHeight, segments: 5, heightSegments: 4 })
    .translate(0, trunkHeight / 2, 0)
    .jitter(trunkRadius * 0.25, { seed })
    .vertexColor((pos) => {
      const t = pos[1] / trunkHeight
      return [0.3 + t * 0.05, 0.2 + t * 0.02, 0.1]
    })

  // Canopy — one big main sphere + smaller bumps on its surface
  const canopyParts: Mesh[] = []
  const canopyY = trunkHeight + canopyRadius * 0.6
  const mainR = canopyRadius

  // Target triangle edge length — consistent across all canopy blobs
  const edgeLen = canopyRadius * 0.45

  function canopyBlob(r: number, blobSeed: number): Mesh {
    const noise = new UberNoise({ seed: blobSeed, scale: 0.5, octaves: 3 })
    return icosphere({ radius: r, subdivisions: 0 })
      .subdivideAdaptive(edgeLen)
      .warp((pos) => {
        // Normalize onto sphere + add noise displacement
        const len = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]) || 1
        const nx = pos[0] / len, ny = pos[1] / len, nz = pos[2] / len
        const d = r + noise.get(pos[0], pos[1], pos[2]) * r * 0.5
        return [nx * d, ny * d, nz * d]
      })
      .jitter(r * 0.04, { seed: blobSeed })
  }

  // Main sphere
  const main = canopyBlob(mainR, seed)
    .scale(1, 0.8, 1)
    .translate(0, canopyY, 0)
    .vertexColor((_pos, normal) => {
      const top = normal[1] * 0.5 + 0.5
      const gv = rand() * 0.04
      return [0.1 + gv, 0.3 + top * 0.15 + gv, 0.05]
    })
  canopyParts.push(main)

  // Smaller blobs on the surface of the main sphere (equatorial band, avoiding top/bottom)
  const blobCount = 3 + Math.floor(rand() * 3)
  for (let i = 0; i < blobCount; i++) {
    const azimuth = rand() * Math.PI * 2
    // Restrict polar angle to roughly 40°–110° (equatorial band)
    const polar = (0.4 + rand() * 0.4) * Math.PI
    const sx = Math.sin(polar) * Math.cos(azimuth)
    const sy = Math.cos(polar) * 0.8 // squashed like the main sphere
    const sz = Math.sin(polar) * Math.sin(azimuth)

    // Place center slightly inside the main sphere surface
    const inset = 0.9
    const bx = sx * mainR * inset
    const by = sy * mainR * inset + canopyY
    const bz = sz * mainR * inset

    // Alternate medium and small
    const r = mainR * (i < 2 ? (0.35 + rand() * 0.1) : (0.2 + rand() * 0.1))

    const blob = canopyBlob(r, seed + i + 1)
      .translate(bx, by, bz)
      .vertexColor((_pos, normal) => {
        const top = normal[1] * 0.5 + 0.5
        const gv = rand() * 0.04
        return [0.1 + gv, 0.3 + top * 0.15 + gv, 0.05]
      })
    canopyParts.push(blob)
  }

  return merge(trunk, ...canopyParts)
}
