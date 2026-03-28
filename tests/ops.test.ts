import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { box, sphere } from '../src/primitives'
import { merge, center, clone } from '../src/ops'

describe('ops', () => {
  it('merge combines vertex counts', () => {
    const b = box()
    const s = sphere()
    const merged = merge(b, s)
    expect(merged.vertexCount).toBe(b.vertexCount + s.vertexCount)
  })

  it('merge handles mixed color/no-color meshes', () => {
    const colored = box().vertexColor('#ff0000')
    const plain = sphere()
    const merged = merge(colored, plain)
    expect(merged.colors).not.toBeNull()
    expect(merged.colors!.length).toBe(merged.vertexCount * 3)
  })

  it('center puts bounding box center at origin', () => {
    const b = box().translate(10, 10, 10)
    const centered = center(b)
    centered.geometry.computeBoundingBox()
    const c = new THREE.Vector3()
    centered.geometry.boundingBox!.getCenter(c)
    expect(c.x).toBeCloseTo(0)
    expect(c.y).toBeCloseTo(0)
    expect(c.z).toBeCloseTo(0)
  })

  it('clone produces independent copy', () => {
    const b = box()
    const c = clone(b)
    expect(c.vertexCount).toBe(b.vertexCount)
    expect(c.geometry).not.toBe(b.geometry)
  })
})
