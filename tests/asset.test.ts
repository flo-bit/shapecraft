import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { part, group } from '../src/core/asset'
import { box, sphere } from '../src/primitives'

describe('Asset', () => {
  it('builds a tree of named parts', () => {
    const a = group('thing', [
      part('a', box({ size: 1 })),
      part('b', sphere({ radius: 0.5 })),
    ])
    expect(a.name).toBe('thing')
    expect(a.children).toHaveLength(2)
    expect(a.find('b')).not.toBeNull()
    expect(a.find('nope')).toBeNull()
  })

  it('flatten merges all part geometry', () => {
    const b = box({ size: 1 })
    const s = sphere({ radius: 0.5 })
    const a = group('g', [part('a', b), part('b', s)])
    expect(a.flatten().vertexCount).toBe(b.vertexCount + s.vertexCount)
  })

  it('node transforms move world bounds without touching geometry', () => {
    const b = box({ size: 1 })
    const a = part('b', b).translate(10, 0, 0)
    // The part geometry is untouched...
    expect(a.geometry).toBe(b)
    // ...but bounds reflect the transform.
    const c = a.bounds().getCenter(new THREE.Vector3())
    expect(c.x).toBeCloseTo(10, 5)
  })

  it('transforms are immutable', () => {
    const a = part('b', box({ size: 1 }))
    const moved = a.translate(5, 0, 0)
    expect(moved).not.toBe(a)
    expect(a.bounds().getCenter(new THREE.Vector3()).x).toBeCloseTo(0, 5)
  })

  it('recolor replaces a named part material', () => {
    const a = group('g', [part('trunk', box()), part('leaf', sphere())])
    const recolored = a.recolor('leaf', { color: '#00ff00' })
    expect(recolored.find('leaf')!.material).toEqual({ color: '#00ff00' })
    expect(recolored.find('trunk')!.material).toBeNull()
  })

  it('sockets report world-space position', () => {
    const a = part('b', box()).socket('top', { position: [0, 1, 0] }).translate(0, 5, 0)
    const s = a.getSocket('top')
    expect(s).not.toBeNull()
    expect(s!.position[1]).toBeCloseTo(6, 5)
  })
})
