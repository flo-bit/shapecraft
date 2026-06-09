import { describe, it, expect } from 'vitest'
import { createRng } from '../src/core/rng'

describe('createRng', () => {
  it('is callable and returns floats in [0, 1)', () => {
    const rng = createRng(1)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is deterministic for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('differs across seeds', () => {
    const a = createRng(1)
    const b = createRng(2)
    expect(a()).not.toEqual(b())
  })

  it('accepts string seeds', () => {
    const a = createRng('hello')
    const b = createRng('hello')
    expect(a()).toEqual(b())
  })
})

describe('Rng helpers', () => {
  it('int() is inclusive and within bounds', () => {
    const rng = createRng(7)
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(1, 6)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
      seen.add(v)
    }
    // Should eventually hit both ends of the inclusive range
    expect(seen.has(1)).toBe(true)
    expect(seen.has(6)).toBe(true)
  })

  it('float(min, max) stays within bounds', () => {
    const rng = createRng(3)
    for (let i = 0; i < 100; i++) {
      const v = rng.float(5, 10)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThan(10)
    }
  })

  it('range() passes through fixed values and resolves tuples', () => {
    const rng = createRng(9)
    expect(rng.range(2.5)).toBe(2.5)
    const v = rng.range([0, 4])
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThanOrEqual(4)
    const n = rng.range([0, 4], true)
    expect(Number.isInteger(n)).toBe(true)
  })

  it('pick() returns an element of the array', () => {
    const rng = createRng(11)
    const arr = ['a', 'b', 'c']
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(rng.pick(arr))
    }
  })

  it('seed() produces deterministic integer seeds', () => {
    const a = createRng(5)
    const b = createRng(5)
    expect(a.seed()).toBe(b.seed())
    expect(Number.isInteger(a.seed())).toBe(true)
  })
})

describe('named streams', () => {
  it('a stream is deterministic for the same name', () => {
    const rootA = createRng(1)
    const rootB = createRng(1)
    const seqA = Array.from({ length: 5 }, () => rootA.stream('canopy')())
    // Re-derive each time — same name + same root => same first value
    expect(rootB.stream('canopy')()).toEqual(rootA.stream('canopy')())
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true)
  })

  it('different stream names are independent', () => {
    const root = createRng(1)
    expect(root.stream('a')()).not.toEqual(root.stream('b')())
  })

  it('consuming one stream does not perturb another (the key property)', () => {
    // Baseline: read canopy without touching snow at all.
    const root1 = createRng(99)
    const canopy1 = root1.stream('canopy')
    const baseline = [canopy1(), canopy1(), canopy1()]

    // Now heavily consume an unrelated stream first, then read canopy.
    const root2 = createRng(99)
    const snow2 = root2.stream('snow')
    for (let i = 0; i < 50; i++) snow2()
    const canopy2 = root2.stream('canopy')
    const after = [canopy2(), canopy2(), canopy2()]

    expect(after).toEqual(baseline)
  })

  it('fork() yields independent anonymous streams', () => {
    const root = createRng(1)
    const f1 = root.fork()
    const f2 = root.fork()
    expect(f1()).not.toEqual(f2())
  })
})
