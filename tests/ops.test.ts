import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { box, sphere } from '../src/primitives'
import { merge, center, clone, decimate } from '../src/ops'

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

  it('decimate reduces face count while preserving the silhouette', () => {
    const s = sphere({ radius: 1, widthSegments: 32, heightSegments: 24 })
    const before = s.faceCount
    const d = decimate(s, { ratio: 0.3 })
    expect(d.faceCount).toBeLessThan(before)
    expect(d.vertexCount).toBeGreaterThan(0)
    // Bounding box (silhouette) stays close to the original sphere.
    const bb = d.boundingBox
    expect(bb.max.x).toBeGreaterThan(0.85)
    expect(bb.max.x).toBeLessThan(1.15)
  })

  it('decimate hits an explicit target count', () => {
    const s = sphere({ radius: 1, widthSegments: 24, heightSegments: 16 })
    const d = decimate(s, { count: 80 })
    expect(d.vertexCount).toBeLessThanOrEqual(120)
  })
})
