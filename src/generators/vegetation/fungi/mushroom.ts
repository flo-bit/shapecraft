import { sphere } from '../../../primitives'
import { merge } from '../../../ops'
import { setup, trunk, foliageBlob, facetShade, scatterOnSurface } from '../../../build'
import { pickRandom } from '../../../color'
import { UberNoise } from '../../../noise'
import type { Mesh } from '../../../core/mesh'
import type { OptionSchema, OptionInput } from '../../../core/schema'

export const mushroomSchema = {
  seed:       { type: 'integer',     default: 1,     min: 1,     max: 100,  label: 'Seed' },
  height:     { type: 'range',       default: 0.35,  min: 0.1,   max: 1.2,  step: 0.05,  label: 'Stem Height' },
  stemRadius: { type: 'range',       default: 0.045, min: 0.015, max: 0.15, step: 0.005, label: 'Stem Radius' },
  lean:       { type: 'range',       default: 0.1,   min: 0,     max: 0.4,  step: 0.02,  label: 'Lean' },
  capRadius:  { type: 'range',       default: 0.16,  min: 0.05,  max: 0.5,  step: 0.01,  label: 'Cap Radius' },
  capSquash:  { type: 'range',       default: 0.6,   min: 0.25,  max: 1.2,  step: 0.05,  label: 'Cap Squash' },
  capCurl:    { type: 'range',       default: 0.35,  min: 0,     max: 0.8,  step: 0.05,  label: 'Cap Curl' },
  capNoise:   { type: 'range',       default: 0.12,  min: 0,     max: 0.5,  step: 0.02,  label: 'Cap Lumpiness' },
  count:      { type: 'integer',     default: 1,     min: 1,     max: 9,    label: 'Cluster' },
  spread:     { type: 'range',       default: 1.0,   min: 0.4,   max: 2,    step: 0.05,  label: 'Spread' },
  spots:      { type: 'integer',     default: 0,     min: 0,     max: 20,   label: 'Spots' },
  spotColor:  { type: 'color',       default: '#f2efe6', label: 'Spot Color' },
  capColors:  { type: 'color-array', default: ['#9c6b3f', '#a87844', '#8a5a32'], min: 1, max: 6, label: 'Cap Colors' },
  gillColor:  { type: 'color',       default: '#e8dcc2', label: 'Gill Color' },
  stemColors: { type: 'color-array', default: ['#ddd2bc', '#cfc4ae'], min: 1, max: 4, label: 'Stem Colors' },
} satisfies OptionSchema

export type MushroomOptions = Partial<OptionInput<typeof mushroomSchema>> & { preset?: string }

export const mushroomPresets: Record<string, Partial<MushroomOptions>> = {
  default: {},
  toadstool: {
    capColors: ['#c43a2e', '#b33327', '#cf4334'],
    spots: 9,
    capSquash: 0.7,
    stemColors: ['#efe9da', '#e2dccb'],
    gillColor: '#efe7d2',
  },
  chanterelle: {
    capColors: ['#e0a83c', '#d49a32', '#e8b54a'],
    capSquash: 0.3,
    capCurl: 0.1,
    gillColor: '#dba939',
    stemColors: ['#e3b34e', '#d6a843'],
  },
  cluster: {
    count: 6,
    height: 0.28,
    capRadius: 0.1,
    capSquash: 0.75,
    capColors: ['#b08d57', '#a3814e', '#bd9a62'],
  },
  inkcap: {
    height: 0.55,
    stemRadius: 0.03,
    capRadius: 0.11,
    capSquash: 1.1,
    capCurl: 0.65,
    capColors: ['#8d8678', '#999285', '#7e776b'],
    gillColor: '#55504a',
    stemColors: ['#e6e2d8', '#d8d4ca'],
  },
}

export function mushroom(options: MushroomOptions = {}): Mesh {
  const { o, rng } = setup(mushroomSchema, options, mushroomPresets)
  const shapeRng = rng.stream('shape')
  const colorRng = rng.stream('color')
  const spotRng = rng.stream('spot')

  const colorNoise = new UberNoise({ seed: colorRng.seed(), scale: 4 })
  const gill = pickRandom(o.gillColor, colorRng)

  const parts: Mesh[] = []
  let anchorR = 0
  for (let i = 0; i < o.count; i++) {
    // Tallest mushroom at the center, smaller ones huddled around it.
    const rank = i / Math.max(1, o.count - 1)
    const scale = (1 - 0.4 * rank) * shapeRng.float(0.85, 1.15)
    const height = o.height * scale
    const capR = o.capRadius * scale * shapeRng.float(0.9, 1.1)
    const stemR = o.stemRadius * scale

    if (i === 0) anchorR = capR
    const placeAngle = ((i - 1) / Math.max(1, o.count - 1)) * Math.PI * 2 + shapeRng.float(-0.5, 0.5)
    const dist = i === 0 ? 0 : (anchorR + capR) * o.spread * shapeRng.float(0.9, 1.1)
    const px = Math.cos(placeAngle) * dist
    const pz = Math.sin(placeAngle) * dist

    const leanAngle = shapeRng.float(0, Math.PI * 2)
    const leanX = Math.cos(leanAngle) * o.lean * height
    const leanZ = Math.sin(leanAngle) * o.lean * height

    parts.push(trunk({
      height,
      baseRadius: stemR * 1.25,
      topRadius: stemR,
      taper: 2,
      lean: [leanX, leanZ],
      noiseSeed: shapeRng.seed(),
      noiseScale: 5,
      noiseAmount: 0.12,
      segments: 6,
      heightSegments: 3,
      colors: o.stemColors,
    }).translate(px, 0, pz))

    // Cap: a squashed blob with everything below the curl plane clamped flat —
    // the dome reads as the cap, the flat clamp as the gilled underside.
    const sy = capR * o.capSquash
    const cutY = -sy * o.capCurl
    const capBase = pickRandom(o.capColors, colorRng)
    const capShade = facetShade({ base: capBase, noise: colorNoise, ambient: 0.55, range: 0.45, noiseAmount: 0.1 })
    const gillShade = facetShade({ base: gill, ambient: 0.7, range: 0.3 })

    const cap = foliageBlob({
      radius: capR,
      detail: capR * 0.45,
      noiseSeed: shapeRng.seed(),
      noiseScale: 1.2,
      noiseOctaves: 2,
      noiseAmount: o.capNoise,
      jitter: capR * 0.02,
      jitterSeed: shapeRng.seed(),
    })
      .scale(1, o.capSquash, 1)
      .warp((p) => (p[1] < cutY ? [p[0], cutY, p[2]] : p))
      .translate(px + leanX, height - cutY - capR * 0.06, pz + leanZ)
      .faceColor((c, n) => (n[1] < -0.35 ? gillShade(c, n) : capShade(c, n)))
    parts.push(cap)

    // Optional fly-agaric spots: small flattened flecks sitting on the cap dome.
    if (o.spots > 0) {
      const points = scatterOnSurface(cap, o.spots, { rng: spotRng, minNormalY: 0.35 })
      for (const { position, normal } of points) {
        const s = capR * 0.14 * (0.7 + spotRng() * 0.6)
        let spot = sphere({ radius: s, widthSegments: 5, heightSegments: 3 }).scale(1, 0.45, 1)
        // Tilt the flattened fleck so it lies flush with the cap surface.
        const tilt = Math.acos(Math.max(-1, Math.min(1, normal[1])))
        if (tilt > 1e-3) spot = spot.rotate([normal[2], 0, -normal[0]], tilt)
        parts.push(
          spot
            .translate(
              position[0] + normal[0] * s * 0.15,
              position[1] + normal[1] * s * 0.15,
              position[2] + normal[2] * s * 0.15,
            )
            .vertexColor(o.spotColor),
        )
      }
    }
  }

  return merge(...parts)
}
