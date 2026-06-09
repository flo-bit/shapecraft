import { describe, it, expect } from 'vitest'
import { box, cylinder } from '../src/primitives'
import { extrudeFaces, insetFaces, bevel } from '../src/ops'
import type { Mesh } from '../src/core/mesh'

function finite(m: Mesh): boolean {
  const p = m.positions
  for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) return false
  return true
}

describe('extrudeFaces', () => {
  it('adds geometry and walls when pushing a face out', () => {
    const b = box({ size: 1 })
    const e = extrudeFaces(b, { distance: 0.5, only: (n) => n[1] > 0.9 }) // top face only
    expect(e.faceCount).toBeGreaterThan(b.faceCount)
    expect(finite(e)).toBe(true)
    expect(e.boundingBox.max.y).toBeCloseTo(1, 1) // box half 0.5 + extrude 0.5
  })
})

describe('insetFaces', () => {
  it('shrinks a face inward, keeping the outer bounds', () => {
    const b = box({ size: 1 })
    const i = insetFaces(b, { amount: 0.2, only: (n) => n[1] > 0.9 })
    expect(i.faceCount).toBeGreaterThan(b.faceCount)
    expect(finite(i)).toBe(true)
    expect(i.boundingBox.max.x).toBeCloseTo(0.5, 2)
  })

  it('depth recesses the inset face', () => {
    const b = box({ size: 1 })
    const i = insetFaces(b, { amount: 0.2, depth: -0.3, only: (n) => n[1] > 0.9 })
    expect(finite(i)).toBe(true)
    // recessed panel dips below the original top
    expect(i.boundingBox.max.y).toBeCloseTo(0.5, 2)
  })
})

describe('bevel', () => {
  it('chamfers a box (more faces, same bounds, finite)', () => {
    const b = box({ size: 1 })
    const v = bevel(b, { amount: 0.15 })
    expect(v.faceCount).toBeGreaterThan(b.faceCount)
    expect(finite(v)).toBe(true)
    const bb = v.boundingBox
    expect(bb.max.x).toBeCloseTo(0.5, 2)
    expect(bb.min.x).toBeCloseTo(-0.5, 2)
  })

  it('works on a cylinder', () => {
    const c = cylinder({ radius: 0.5, height: 1, segments: 12 })
    const v = bevel(c, { amount: 0.08 })
    expect(v.faceCount).toBeGreaterThan(0)
    expect(finite(v)).toBe(true)
  })
})
