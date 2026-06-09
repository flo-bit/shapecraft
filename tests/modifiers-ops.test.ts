import { describe, it, expect } from 'vitest'
import { box, sphere, cylinder } from '../src/primitives'
import { weld, mirror, array, radialArray, subtract, union, intersect } from '../src/ops'

describe('weld', () => {
  it('merges coincident vertices and indexes the mesh', () => {
    const b = box({ size: 1 }) // non-indexed, 24 verts (4 per face × 6)
    const w = weld(b)
    expect(w.geometry.getIndex()).not.toBeNull()
    expect(w.vertexCount).toBe(8) // a cube has 8 unique corners
    expect(w.faceCount).toBe(b.faceCount) // same triangles
  })
})

describe('mirror', () => {
  it('doubles geometry and spans both sides of the plane', () => {
    const b = box({ size: 1 }).translate(1, 0, 0) // sits at x∈[0.5,1.5]
    const m = mirror(b, { axis: 'x', position: 0 })
    expect(m.faceCount).toBe(b.faceCount * 2)
    const bb = m.boundingBox
    expect(bb.min.x).toBeLessThan(-0.4) // reflected copy on the −x side
    expect(bb.max.x).toBeGreaterThan(1.4)
  })

  it('keepOriginal:false returns just the reflection', () => {
    const b = box({ size: 1 }).translate(1, 0, 0)
    const m = mirror(b, { axis: 'x', keepOriginal: false })
    expect(m.faceCount).toBe(b.faceCount)
    expect(m.boundingBox.max.x).toBeLessThan(-0.4)
  })
})

describe('array', () => {
  it('repeats count times with an offset', () => {
    const b = box({ size: 1 })
    const a = array(b, { count: 4, offset: [2, 0, 0] })
    expect(a.vertexCount).toBe(b.vertexCount * 4)
    // 4 boxes spaced by 2 along x → spans ~[-0.5, 6.5]
    expect(a.boundingBox.max.x).toBeGreaterThan(6)
  })

  it('count 1 is just the original', () => {
    const b = box({ size: 1 })
    expect(array(b, { count: 1 }).vertexCount).toBe(b.vertexCount)
  })
})

describe('radialArray', () => {
  it('places copies around an axis', () => {
    const s = sphere({ radius: 0.3 })
    const r = radialArray(s, { count: 6, radius: 1, axis: 'y' })
    expect(r.vertexCount).toBe(s.vertexCount * 6)
    const bb = r.boundingBox
    // a ring of radius 1 → spans roughly ±1.3 in x and z
    expect(bb.max.x).toBeGreaterThan(1)
    expect(bb.max.z).toBeGreaterThan(1)
  })
})

describe('boolean (CSG)', () => {
  it('subtract carves a hole, keeping the outer bounds', () => {
    const block = box({ size: 2 })
    const drill = cylinder({ radius: 0.4, height: 3, segments: 16 })
    const result = subtract(block, drill)
    expect(result.vertexCount).toBeGreaterThan(0)
    const p = result.positions
    for (let i = 0; i < p.length; i++) expect(Number.isFinite(p[i])).toBe(true)
    const bb = result.boundingBox
    expect(bb.max.x).toBeCloseTo(1, 1)
    expect(bb.min.x).toBeCloseTo(-1, 1)
  })

  it('union spans both volumes', () => {
    const a = box({ size: 1 })
    const b = box({ size: 1 }).translate(1.4, 0, 0)
    const bb = union(a, b).boundingBox
    expect(bb.min.x).toBeCloseTo(-0.5, 1)
    expect(bb.max.x).toBeCloseTo(1.9, 1)
  })

  it('intersect keeps only the overlap', () => {
    const a = box({ size: 2 }) // x∈[-1,1]
    const b = box({ size: 2 }).translate(1, 0, 0) // x∈[0,2]
    const bb = intersect(a, b).boundingBox
    expect(bb.min.x).toBeCloseTo(0, 1)
    expect(bb.max.x).toBeCloseTo(1, 1)
  })
})
