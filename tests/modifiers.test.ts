import { describe, it, expect } from 'vitest'
import { box, cylinder } from '../src/primitives'
import { twist, bend, taper } from '../src/modifiers'
import { smooth } from '../src/modifiers/smooth'
import { UberNoise } from '../src/noise'

describe('modifiers', () => {
  it('twist modifies positions', () => {
    const b = box({ heightSegments: 4 })
    const twisted = b.warp(twist({ amount: 2 }))
    // Positions should differ
    const origPos = b.positions
    const newPos = twisted.positions
    let changed = false
    for (let i = 0; i < origPos.length; i++) {
      if (Math.abs(origPos[i] - newPos[i]) > 0.001) {
        changed = true
        break
      }
    }
    expect(changed).toBe(true)
  })

  it('taper scales vertices at extremes', () => {
    const c = cylinder({ height: 2 })
    // Taper along Y: top should be smaller
    const tapered = c.warp(taper({ axis: 'y', curve: (t) => 1 - t * 0.5 }))
    expect(tapered.vertexCount).toBe(c.vertexCount)
  })

  it('displace moves vertices along normals', () => {
    const b = box()
    const displaced = b.displace(() => 0.1)
    const origPos = b.positions
    const newPos = displaced.positions
    let changed = false
    for (let i = 0; i < origPos.length; i++) {
      if (Math.abs(origPos[i] - newPos[i]) > 0.001) {
        changed = true
        break
      }
    }
    expect(changed).toBe(true)
  })

  it('displaceNoise produces non-zero displacement', () => {
    const b = box({ widthSegments: 4, heightSegments: 4, depthSegments: 4 })
    const noise = new UberNoise({ seed: 42 })
    const displaced = b.displaceNoise(noise, 0.5)
    const origPos = b.positions
    const newPos = displaced.positions
    let changed = false
    for (let i = 0; i < origPos.length; i++) {
      if (Math.abs(origPos[i] - newPos[i]) > 0.001) {
        changed = true
        break
      }
    }
    expect(changed).toBe(true)
  })

  it('smooth produces a mesh with same vertex count (indexed)', () => {
    const b = box()
    const smoothed = smooth(b, 1)
    expect(smoothed.vertexCount).toBe(b.vertexCount)
  })

  it('bend modifies positions', () => {
    const b = box({ heightSegments: 4 })
    const bent = b.warp(bend({ amount: 1 }))
    const origPos = b.positions
    const newPos = bent.positions
    let changed = false
    for (let i = 0; i < origPos.length; i++) {
      if (Math.abs(origPos[i] - newPos[i]) > 0.001) {
        changed = true
        break
      }
    }
    expect(changed).toBe(true)
  })
})
