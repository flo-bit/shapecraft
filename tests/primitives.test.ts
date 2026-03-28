import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { box, sphere, cylinder, plane, cone, torus } from '../src/primitives'

describe('primitives', () => {
  it('box returns a Mesh with correct defaults', () => {
    const b = box()
    expect(b.vertexCount).toBe(24)
    expect(b.faceCount).toBe(12)
  })

  it('box size shorthand works', () => {
    const b = box({ size: 2 })
    const size = b.boundingBox.getSize(new THREE.Vector3())
    expect(size.x).toBeCloseTo(2)
    expect(size.y).toBeCloseTo(2)
    expect(size.z).toBeCloseTo(2)
  })

  it('box vec3 size shorthand works', () => {
    const b = box({ size: [2, 3, 4] })
    const size = b.boundingBox.getSize(new THREE.Vector3())
    expect(size.x).toBeCloseTo(2)
    expect(size.y).toBeCloseTo(3)
    expect(size.z).toBeCloseTo(4)
  })

  it('sphere returns a Mesh', () => {
    const s = sphere()
    expect(s.vertexCount).toBeGreaterThan(0)
    expect(s.faceCount).toBeGreaterThan(0)
  })

  it('cylinder returns a Mesh', () => {
    const c = cylinder()
    expect(c.vertexCount).toBeGreaterThan(0)
  })

  it('plane returns a Mesh and is XZ-oriented', () => {
    const p = plane()
    const pos = p.positions
    for (let i = 0; i < pos.length; i += 3) {
      expect(Math.abs(pos[i + 1])).toBeLessThan(0.001)
    }
  })

  it('plane size shorthand works', () => {
    const p = plane({ size: 5 })
    const size = p.boundingBox.getSize(new THREE.Vector3())
    expect(size.x).toBeCloseTo(5)
    expect(size.z).toBeCloseTo(5)
  })

  it('cone returns a Mesh', () => {
    const c = cone()
    expect(c.vertexCount).toBeGreaterThan(0)
  })

  it('torus returns a Mesh', () => {
    const t = torus()
    expect(t.vertexCount).toBeGreaterThan(0)
  })
})
