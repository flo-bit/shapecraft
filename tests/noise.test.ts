import { describe, it, expect } from 'vitest'
import { UberNoise, fbm, ridged, simplex } from '../src/noise'

describe('noise', () => {
  it('UberNoise produces values in expected range', () => {
    const noise = new UberNoise({ seed: 42 })
    for (let i = 0; i < 100; i++) {
      const v = noise.get(i * 0.1, i * 0.2)
      expect(v).toBeGreaterThanOrEqual(-1.01)
      expect(v).toBeLessThanOrEqual(1.01)
    }
  })

  it('fbm returns configured UberNoise', () => {
    const noise = fbm({ seed: 42 })
    const v = noise.get(0.5, 0.5)
    expect(typeof v).toBe('number')
    expect(Math.abs(v)).toBeLessThan(2)
  })

  it('ridged produces values', () => {
    const noise = ridged({ seed: 42 })
    const v = noise.get(0.5, 0.5)
    expect(typeof v).toBe('number')
  })

  it('seeded noise is deterministic', () => {
    const a = new UberNoise({ seed: 'test' })
    const b = new UberNoise({ seed: 'test' })
    for (let i = 0; i < 10; i++) {
      expect(a.get(i, i)).toBe(b.get(i, i))
    }
  })

  it('simplex helper works', () => {
    const noise = simplex({ seed: 123 })
    const v = noise.get(1, 2, 3)
    expect(typeof v).toBe('number')
  })
})
