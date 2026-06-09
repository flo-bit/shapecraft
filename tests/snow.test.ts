import { describe, it, expect } from 'vitest'
import { snow } from '../src/ops/snow'
import { sphere, plane, box } from '../src/primitives'

describe('snow op', () => {
  it('adds geometry on top of an existing mesh', () => {
    const base = sphere({ radius: 1 })
    const snowy = snow(base, { depth: 0.1 })
    expect(snowy.vertexCount).toBeGreaterThan(base.vertexCount)
    expect(snowy.colors).not.toBeNull()
  })

  it('raises the bounding box by roughly the snow depth', () => {
    const base = plane({ size: 2, segments: 4 })
    const baseTop = base.boundingBox.max.y
    const snowy = snow(base, { depth: 0.2, spread: 0 })
    // The snow blanket sits ~depth above the highest surface.
    expect(snowy.boundingBox.max.y).toBeGreaterThan(baseTop + 0.15)
  })

  it('produces finite positions', () => {
    const snowy = snow(box({ size: 1 }), { depth: 0.1 })
    const p = snowy.positions
    for (let i = 0; i < p.length; i++) expect(Number.isFinite(p[i])).toBe(true)
  })

  it('is deterministic for the same seed', () => {
    const a = snow(sphere({ radius: 1 }), { depth: 0.1, coverage: 0.6, seed: 5 }).positions
    const b = snow(sphere({ radius: 1 }), { depth: 0.1, coverage: 0.6, seed: 5 }).positions
    expect(Array.from(a)).toEqual(Array.from(b))
  })

  it('leaves the original mesh untouched (immutability)', () => {
    const base = sphere({ radius: 1 })
    const before = base.vertexCount
    snow(base, { depth: 0.1 })
    expect(base.vertexCount).toBe(before)
  })

  it('a fully downward-facing surface receives no snow', () => {
    // A plane flipped to face down: no upward faces → snow shell is empty,
    // so merging returns the original vertex count.
    const downPlane = plane({ size: 2, segments: 2 }).rotateX(Math.PI)
    const snowy = snow(downPlane, { depth: 0.1 })
    expect(snowy.vertexCount).toBe(downPlane.vertexCount)
  })

  it('merge:false returns only the snow shell', () => {
    const base = sphere({ radius: 1 })
    const shell = snow(base, { depth: 0.1, merge: false })
    expect(shell.vertexCount).toBeGreaterThan(0)
    expect(shell.vertexCount).toBeLessThan(snow(base, { depth: 0.1 }).vertexCount)
  })
})
