import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { Mesh } from '../src/core/mesh'

function makeTriangleGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  return geo
}

describe('Mesh', () => {
  it('constructs from geometry', () => {
    const mesh = new Mesh(new THREE.BoxGeometry(1, 1, 1))
    expect(mesh.vertexCount).toBeGreaterThan(0)
    expect(mesh.faceCount).toBeGreaterThan(0)
  })

  it('has correct vertex and face counts for box', () => {
    const mesh = new Mesh(new THREE.BoxGeometry(1, 1, 1))
    expect(mesh.vertexCount).toBe(24) // 6 faces * 4 vertices
    expect(mesh.faceCount).toBe(12) // 6 faces * 2 triangles
  })

  it('translate produces correct positions', () => {
    const mesh = new Mesh(makeTriangleGeometry())
    const translated = mesh.translate(1, 2, 3)
    const pos = translated.positions
    expect(pos[0]).toBeCloseTo(1)
    expect(pos[1]).toBeCloseTo(2)
    expect(pos[2]).toBeCloseTo(3)
  })

  it('translate does not mutate original', () => {
    const mesh = new Mesh(makeTriangleGeometry())
    const origPos = mesh.positions[0]
    mesh.translate(10, 0, 0)
    expect(mesh.positions[0]).toBe(origPos)
  })

  it('scale works uniformly', () => {
    const mesh = new Mesh(new THREE.BoxGeometry(1, 1, 1))
    const scaled = mesh.scale(2)
    scaled.geometry.computeBoundingBox()
    const size = new THREE.Vector3()
    scaled.geometry.boundingBox!.getSize(size)
    expect(size.x).toBeCloseTo(2)
    expect(size.y).toBeCloseTo(2)
    expect(size.z).toBeCloseTo(2)
  })

  it('scale works non-uniformly', () => {
    const mesh = new Mesh(new THREE.BoxGeometry(1, 1, 1))
    const scaled = mesh.scale(2, 3, 4)
    scaled.geometry.computeBoundingBox()
    const size = new THREE.Vector3()
    scaled.geometry.boundingBox!.getSize(size)
    expect(size.x).toBeCloseTo(2)
    expect(size.y).toBeCloseTo(3)
    expect(size.z).toBeCloseTo(4)
  })

  it('rotate changes positions', () => {
    const mesh = new Mesh(makeTriangleGeometry())
    const rotated = mesh.rotateY(Math.PI / 2)
    // Original vertex at (1,0,0) should move to ~(0,0,-1)
    expect(rotated.positions[3]).toBeCloseTo(0, 4)
    expect(rotated.positions[5]).toBeCloseTo(-1, 4)
  })

  it('clone produces independent copy', () => {
    const mesh = new Mesh(new THREE.BoxGeometry(1, 1, 1))
    const cloned = mesh.clone()
    expect(cloned.vertexCount).toBe(mesh.vertexCount)
    expect(cloned.geometry).not.toBe(mesh.geometry)
  })

  it('center moves bounding box center to origin', () => {
    const mesh = new Mesh(new THREE.BoxGeometry(1, 1, 1)).translate(5, 5, 5)
    const centered = mesh.center()
    centered.geometry.computeBoundingBox()
    const c = new THREE.Vector3()
    centered.geometry.boundingBox!.getCenter(c)
    expect(c.x).toBeCloseTo(0)
    expect(c.y).toBeCloseTo(0)
    expect(c.z).toBeCloseTo(0)
  })

  it('computeNormals returns new mesh with normals', () => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3))
    const mesh = new Mesh(geo)
    const withNormals = mesh.computeNormals()
    expect(withNormals.normals).not.toBeNull()
  })

  it('serialize/deserialize roundtrips', () => {
    const mesh = new Mesh(new THREE.BoxGeometry(1, 1, 1))
    const buffer = mesh.serialize()
    const restored = Mesh.deserialize(buffer)
    expect(restored.vertexCount).toBe(mesh.vertexCount)
    expect(restored.positions[0]).toBeCloseTo(mesh.positions[0])
  })

  it('subdivideAdaptive bisect splits only large triangles', () => {
    // A box has edge length 1. Setting maxEdge=0.6 should split edges.
    const mesh = new Mesh(new THREE.BoxGeometry(1, 1, 1))
    const subdiv = mesh.subdivideAdaptive(0.6)
    // Should have more vertices than original
    expect(subdiv.vertexCount).toBeGreaterThan(mesh.vertexCount)

    // Verify no edge exceeds maxEdge (check all triangles)
    const pos = subdiv.positions
    const triCount = pos.length / 9
    for (let t = 0; t < triCount; t++) {
      const i = t * 9
      const ax = pos[i], ay = pos[i+1], az = pos[i+2]
      const bx = pos[i+3], by = pos[i+4], bz = pos[i+5]
      const cx = pos[i+6], cy = pos[i+7], cz = pos[i+8]
      const ab = Math.sqrt((bx-ax)**2 + (by-ay)**2 + (bz-az)**2)
      const bc = Math.sqrt((cx-bx)**2 + (cy-by)**2 + (cz-bz)**2)
      const ca = Math.sqrt((ax-cx)**2 + (ay-cy)**2 + (az-cz)**2)
      expect(Math.max(ab, bc, ca)).toBeLessThanOrEqual(0.601) // small epsilon
    }
  })

  it('subdivideAdaptive quad splits into 4', () => {
    const mesh = new Mesh(new THREE.BoxGeometry(1, 1, 1))
    const subdiv = mesh.subdivideAdaptive(0.6, { mode: 'quad' })
    expect(subdiv.vertexCount).toBeGreaterThan(mesh.vertexCount)
  })

  it('jitter offsets vertices deterministically by position', () => {
    const mesh = new Mesh(new THREE.BoxGeometry(1, 1, 1))
    const jittered = mesh.jitter(0.05)

    // Positions should change
    let changed = false
    for (let i = 0; i < mesh.positions.length; i++) {
      if (Math.abs(mesh.positions[i] - jittered.positions[i]) > 0.001) { changed = true; break }
    }
    expect(changed).toBe(true)

    // Same input → same output (deterministic)
    const jittered2 = mesh.jitter(0.05)
    for (let i = 0; i < jittered.positions.length; i++) {
      expect(jittered.positions[i]).toBe(jittered2.positions[i])
    }

    // Different seed → different output
    const jittered3 = mesh.jitter(0.05, { seed: 99 })
    let differs = false
    for (let i = 0; i < jittered.positions.length; i++) {
      if (jittered.positions[i] !== jittered3.positions[i]) { differs = true; break }
    }
    expect(differs).toBe(true)
  })

  it('subdivideAdaptive does nothing when triangles are already small', () => {
    const mesh = new Mesh(new THREE.BoxGeometry(1, 1, 1))
    const subdiv = mesh.subdivideAdaptive(10) // way bigger than any edge
    // Box has 12 triangles = 36 non-indexed verts; no splits should occur
    expect(subdiv.faceCount).toBe(mesh.faceCount)
  })
})
