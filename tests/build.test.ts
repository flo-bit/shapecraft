import { describe, it, expect } from 'vitest'
import { setup, trunk, foliageBlob, facetShade, heightShade, scatterOnSurface, blade } from '../src/build'
import { sphere, box, plane } from '../src/primitives'
import type { OptionSchema } from '../src/core/schema'
import type { Vec3 } from '../src/core/types'

describe('setup', () => {
  const schema = {
    seed: { type: 'integer', default: 1, min: 1, max: 100 },
    height: { type: 'range', default: 2, min: 1, max: 5 },
  } satisfies OptionSchema

  it('resolves options and returns a deterministic rng for the seed', () => {
    const a = setup(schema, { seed: 7 })
    const b = setup(schema, { seed: 7 })
    expect(a.o.height).toBe(2)
    expect(a.rng()).toBe(b.rng())
  })

  it('falls back to the schema default seed when none is given', () => {
    const a = setup(schema, {})
    const b = setup(schema, { seed: 1 })
    expect(a.rng()).toBe(b.rng())
  })

  it('handles a [min,max] seed deterministically (collapsed to its low end)', () => {
    const a = setup(schema, { seed: [9, 9] as any })
    const b = setup(schema, { seed: [9, 9] as any })
    expect(a.rng()).toBe(b.rng())
  })
})

describe('trunk', () => {
  it('builds a straight colored trunk', () => {
    const m = trunk({ height: 2, baseRadius: 0.2, topRadius: 0.1, colors: ['#3b2', '#5a3'] })
    expect(m.vertexCount).toBeGreaterThan(0)
    expect(m.colors).not.toBeNull()
    // Spans roughly [0, height] in y.
    expect(m.boundingBox.max.y).toBeGreaterThan(1.8)
    expect(m.boundingBox.min.y).toBeLessThan(0.2)
  })

  it('builds a curved trunk along a path', () => {
    const path: Vec3[] = [
      [0, 0, 0],
      [0.2, 1, 0],
      [0.5, 2, 0],
    ]
    const m = trunk({ path, radiusProfile: (t) => 0.2 * (1 - t * 0.5), colors: ['#3b2'] })
    expect(m.vertexCount).toBeGreaterThan(0)
    expect(m.boundingBox.max.y).toBeGreaterThan(1.8)
  })

  it('is deterministic given the same seeds', () => {
    const opts = { height: 2, baseRadius: 0.2, colors: ['#3b2'], noiseSeed: 5, jitterSeed: 3, jitter: 0.02 }
    const a = trunk(opts).positions
    const b = trunk(opts).positions
    expect(Array.from(a)).toEqual(Array.from(b))
  })
})

describe('foliageBlob', () => {
  it('produces a rounded blob deformed from a sphere', () => {
    const m = foliageBlob({ radius: 1, detail: 0.5, noiseSeed: 1, noiseAmount: 0.4 })
    expect(m.vertexCount).toBeGreaterThan(0)
    const bb = m.boundingBox
    // Roughly within the radius + noise envelope.
    expect(bb.max.x).toBeLessThan(2)
    expect(bb.max.x).toBeGreaterThan(0.5)
  })

  it('is deterministic for the same seed', () => {
    const o = { radius: 1, detail: 0.5, noiseSeed: 2, noiseAmount: 0.4 }
    expect(Array.from(foliageBlob(o).positions)).toEqual(Array.from(foliageBlob(o).positions))
  })
})

describe('facetShade', () => {
  it('brightens upward faces and darkens downward faces', () => {
    const shade = facetShade({ base: [1, 1, 1], ambient: 0.6, range: 0.4 })
    const up = shade([0, 0, 0], [0, 1, 0])
    const down = shade([0, 0, 0], [0, -1, 0])
    expect(up[0]).toBeGreaterThan(down[0])
  })

  it('returns the snow color on faces above the threshold', () => {
    const flatNoise = { get: () => 0 }
    const shade = facetShade({
      base: [0.1, 0.5, 0.1],
      snow: { color: [1, 1, 1], noise: flatNoise, threshold: 0.5 },
    })
    const up = shade([0, 0, 0], [0, 1, 0]) // normal.y 1 > 0.5 → snow
    expect(up).toEqual([1, 1, 1])
    const side = shade([0, 0, 0], [1, 0, 0]) // normal.y 0 < 0.5 → not snow
    expect(side).not.toEqual([1, 1, 1])
  })
})

describe('heightShade', () => {
  it('maps the palette from bottom to top', () => {
    const shade = heightShade(['#000000', '#ffffff'], 2)
    const low = shade([0, 0, 0])
    const high = shade([0, 2, 0])
    expect(high[0]).toBeGreaterThan(low[0])
  })
})

describe('blade', () => {
  const path: Vec3[] = [
    [0, 0, 0],
    [0, 0.5, 0.1],
    [0, 0.9, 0.3],
    [0, 1.1, 0.6],
  ]

  it('builds a ribbon along the path', () => {
    const m = blade(path, { width: 0.1 })
    expect(m.vertexCount).toBeGreaterThan(0)
    const p = m.positions
    for (let i = 0; i < p.length; i++) expect(Number.isFinite(p[i])).toBe(true)
  })

  it('double-sided (default) has twice the triangles of single-sided', () => {
    const two = blade(path, { width: 0.1 }).vertexCount
    const one = blade(path, { width: 0.1, doubleSided: false }).vertexCount
    expect(two).toBe(one * 2)
  })

  it('reaches the path extent', () => {
    const m = blade(path, { width: 0.1 })
    expect(m.boundingBox.max.y).toBeGreaterThan(1.0)
  })
})

describe('scatterOnSurface', () => {
  it('returns the requested number of points with unit normals', () => {
    const pts = scatterOnSurface(sphere({ radius: 1 }), 20, { seed: 1 })
    expect(pts).toHaveLength(20)
    for (const p of pts) {
      const n = p.normal
      expect(Math.hypot(n[0], n[1], n[2])).toBeCloseTo(1, 5)
    }
  })

  it('places points on the surface (≈ unit radius for a unit sphere)', () => {
    const pts = scatterOnSurface(sphere({ radius: 1 }), 30, { seed: 2 })
    for (const { position } of pts) {
      const r = Math.hypot(position[0], position[1], position[2])
      expect(r).toBeGreaterThan(0.85)
      expect(r).toBeLessThan(1.15)
    }
  })

  it('is deterministic for the same rng/seed', () => {
    const a = scatterOnSurface(box({ size: 1 }), 10, { seed: 7 })
    const b = scatterOnSurface(box({ size: 1 }), 10, { seed: 7 })
    expect(a).toEqual(b)
  })

  it('minNormalY keeps only upward-facing faces', () => {
    // A horizontal plane (XZ) has a single upward normal (y≈1).
    const pts = scatterOnSurface(plane({ size: 2, segments: 3 }), 25, { seed: 3, minNormalY: 0.5 })
    expect(pts.length).toBe(25)
    for (const p of pts) expect(p.normal[1]).toBeGreaterThan(0.5)
  })

  it('returns nothing when no face passes the filter', () => {
    // A downward-facing plane has no upward faces.
    const down = plane({ size: 2 }).rotateX(Math.PI)
    const pts = scatterOnSurface(down, 10, { seed: 1, minNormalY: 0.5 })
    expect(pts).toHaveLength(0)
  })
})
