import { describe, it, expect } from 'vitest'
import { tree } from '../src/generators/common-tree'
import { pine } from '../src/generators/pine-tree'
import { palm } from '../src/generators/palm-tree'
import type { Mesh } from '../src/core/mesh'

const generators = [
  { name: 'tree', gen: tree },
  { name: 'pine', gen: pine },
  { name: 'palm', gen: palm },
] as const

// Golden snapshots captured after the named-stream RNG migration. A change here means
// generator output shifted — intentional changes should update these numbers deliberately.
const golden: Record<string, { verts: number }> = {
  tree: { verts: 1830 },
  pine: { verts: 840 },
  palm: { verts: 3630 },
}

function allFinite(m: Mesh): boolean {
  const p = m.positions
  for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) return false
  return true
}

describe.each(generators)('$name generator', ({ name, gen }) => {
  it('produces a valid, colored, finite mesh', () => {
    const m = gen({ seed: 1 })
    expect(m.vertexCount).toBeGreaterThan(0)
    expect(m.colors).not.toBeNull()
    expect(allFinite(m)).toBe(true)
  })

  it('matches the golden vertex count for seed 1', () => {
    expect(gen({ seed: 1 }).vertexCount).toBe(golden[name].verts)
  })

  it('is deterministic: same seed → identical positions', () => {
    const a = gen({ seed: 7 }).positions
    const b = gen({ seed: 7 }).positions
    expect(Array.from(a)).toEqual(Array.from(b))
  })

  it('different seeds produce different geometry', () => {
    const a = gen({ seed: 1 }).positions
    const b = gen({ seed: 2 }).positions
    expect(Array.from(a)).not.toEqual(Array.from(b))
  })
})

describe('stream independence at the model level', () => {
  // The headline benefit of named streams: a feature that only affects color (snow)
  // must not perturb geometry, because positions come from independent streams.
  it.each(generators)('$name: toggling snow leaves geometry byte-identical', ({ gen }) => {
    const bare = gen({ seed: 3, snowColors: [] })
    const snowy = gen({ seed: 3, snowColors: ['#ffffff', '#eeeeee'] })

    // Same geometry...
    expect(Array.from(snowy.positions)).toEqual(Array.from(bare.positions))
    // ...but different coloring.
    expect(Array.from(snowy.colors!)).not.toEqual(Array.from(bare.colors!))
  })
})
