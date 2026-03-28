import { icosphere, cylinder, merge, createRng, scatterOnSphere, normalGradient } from '../../src'
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
  const trunkRadius = options?.trunkRadius ?? 0.12
  const canopyRadius = options?.canopyRadius ?? 0.8
  const seed = options?.seed ?? 1

  const rand = createRng(seed)

  // Randomize trunk radii
  const baseRadius = trunkRadius * (1.6 + rand() * 0.8)
  const topRadius = trunkRadius * (0.3 + rand() * 0.4)

  // Bigger trunk → bigger canopy
  const canopyScale = baseRadius / (trunkRadius * 2)
  const actualCanopyRadius = canopyRadius * canopyScale

  // Trunk — quadratic taper (root flare) + slight lean
  const trunkHeight = height * 0.45
  const leanX = (rand() - 0.5) * 0.4
  const leanZ = (rand() - 0.5) * 0.4
  const trunk = cylinder({ radius: 1, radiusTop: 1, height: trunkHeight, segments: 5, heightSegments: 4 })
    .translate(0, trunkHeight / 2, 0)
    .warp((pos) => {
      const t = Math.max(0, Math.min(1, pos[1] / trunkHeight))
      const radius = topRadius + (baseRadius - topRadius) * (1 - t) * (1 - t)
      return [
        pos[0] * radius + leanX * t * t,
        pos[1],
        pos[2] * radius + leanZ * t * t,
      ]
    })
    .jitter(baseRadius * 0.12, { seed })
    .vertexColor((pos) => {
      const t = pos[1] / trunkHeight
      return [0.3 + t * 0.05, 0.2 + t * 0.02, 0.1]
    })

  // Trunk top position after lean
  const topOffsetX = leanX
  const topOffsetZ = leanZ

  // Canopy
  const canopyParts: Mesh[] = []
  const canopyY = trunkHeight + actualCanopyRadius * 0.6
  const mainR = actualCanopyRadius
  const edgeLen = canopyRadius * 0.45

  const canopyColor = normalGradient([0.15, 0.48, 0.08], [0.08, 0.28, 0.04])

  function canopyBlob(r: number, blobSeed: number): Mesh {
    const noise = new UberNoise({ seed: blobSeed, scale: 0.5, octaves: 3 })
    return icosphere({ radius: r, subdivisions: 0 })
      .subdivideAdaptive(edgeLen)
      .spherize(r)
      .displaceNoise(noise, r * 0.5, { direction: 'radial' })
      .jitter(r * 0.04, { seed: blobSeed })
  }

  // Main sphere
  const main = canopyBlob(mainR, seed)
    .scale(1, 0.8, 1)
    .translate(topOffsetX, canopyY, topOffsetZ)
    .vertexColor(canopyColor)
  canopyParts.push(main)

  // Smaller blobs scattered on main sphere surface (equatorial band)
  const blobCount = 2 + Math.floor(rand() * 2)
  const blobPositions = scatterOnSphere(blobCount, seed + 100, {
    radius: mainR * 0.9,
    polarMin: Math.PI * 0.3,
    polarMax: Math.PI * 0.7,
  })

  for (let i = 0; i < blobCount; i++) {
    const [bx, by, bz] = blobPositions[i]
    const r = mainR * (i < 1 ? (0.45 + rand() * 0.15) : (0.3 + rand() * 0.15))

    const blob = canopyBlob(r, seed + i + 1)
      .scale(1, 0.8, 1)
      .translate(bx + topOffsetX, by * 0.8 + canopyY, bz + topOffsetZ)
      .vertexColor(canopyColor)
    canopyParts.push(blob)
  }

  return merge(trunk, ...canopyParts)
}
