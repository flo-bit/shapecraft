import { describe, it, expect } from 'vitest'
import {
  noiseField, voronoi, stripes, rings, checker, bricks, dots,
  mix, invert, threshold, posterize, warp, remap, constant, rampU, rampV,
  rasterize, normalMap, textureStyles,
} from '../src/texture'
import { toDataTexture } from '../src/three'

describe('texture fields', () => {
  it('noiseField is deterministic for the same seed', () => {
    const a = noiseField({ seed: 'bark', scale: [1, 6], octaves: 4 })
    const b = noiseField({ seed: 'bark', scale: [1, 6], octaves: 4 })
    for (let i = 0; i < 50; i++) {
      const u = (i * 7919 % 100) / 100
      const v = (i * 104729 % 100) / 100
      expect(a(u, v)).toBe(b(u, v))
    }
  })

  it('noiseField differs across seeds', () => {
    const a = noiseField({ seed: 1 })
    const b = noiseField({ seed: 2 })
    let differ = false
    for (let i = 0; i < 20; i++) {
      if (a(i / 20, i / 20) !== b(i / 20, i / 20)) differ = true
    }
    expect(differ).toBe(true)
  })

  it('noiseField stays in [0, 1]', () => {
    const f = noiseField({ seed: 42, octaves: 4 })
    for (let i = 0; i < 200; i++) {
      const v = f((i % 17) / 17, (i % 23) / 23)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('tileable noiseField wraps seamlessly at both edges', () => {
    const f = noiseField({ seed: 7, scale: 5, octaves: 3, tileable: true })
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      expect(f(0, t)).toBeCloseTo(f(1, t), 6)
      expect(f(t, 0)).toBeCloseTo(f(t, 1), 6)
    }
  })

  it('tileable voronoi wraps seamlessly at both edges', () => {
    for (const output of ['f1', 'edge', 'cell'] as const) {
      const f = voronoi({ seed: 3, cells: 6, output })
      for (let i = 0; i <= 20; i++) {
        const t = i / 20 + 0.013 // avoid sampling exactly on cell borders
        expect(f(0, t)).toBeCloseTo(f(1, t), 6)
        expect(f(t, 0)).toBeCloseTo(f(t, 1), 6)
      }
    }
  })

  it('voronoi outputs are in range and cell output is flat within a region', () => {
    const cell = voronoi({ seed: 9, cells: 4, output: 'cell', jitter: 0 })
    // jitter 0 → feature points at cell centers; two samples inside one cell match
    expect(cell(0.1, 0.1)).toBe(cell(0.15, 0.12))
    const f1 = voronoi({ seed: 9, cells: 4, output: 'f1' })
    for (let i = 0; i < 50; i++) {
      const v = f1((i % 11) / 11, (i % 13) / 13)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('patterns produce expected values', () => {
    expect(checker({ count: 2 })(0.1, 0.1)).toBe(0)
    expect(checker({ count: 2 })(0.6, 0.1)).toBe(1)
    expect(stripes({ count: 4 })(0, 0.5)).toBeCloseTo(0, 6)
    expect(rings({ count: 6 })(0.5, 0.5)).toBeCloseTo(0, 6)
    // Brick interior is solid, mortar line is 0
    const b = bricks({ rows: 4, cols: 2, mortar: 0.02 })
    expect(b(0.25, 0.125)).toBe(1)
    expect(b(0.25, 0.25)).toBe(0) // on a row boundary
    // Dots: covered somewhere, empty somewhere
    const d = dots({ seed: 5, count: 4, radius: 0.3 })
    const samples: number[] = []
    for (let i = 0; i < 400; i++) samples.push(d((i % 20) / 20, Math.floor(i / 20) / 20))
    expect(Math.max(...samples)).toBeGreaterThan(0.9)
    expect(Math.min(...samples)).toBe(0)
  })

  it('combinators behave', () => {
    expect(mix(constant(0), constant(1), 0.25)(0, 0)).toBeCloseTo(0.25)
    expect(invert(constant(0.2))(0, 0)).toBeCloseTo(0.8)
    expect(threshold(rampU(), 0.5)(0.4, 0)).toBe(0)
    expect(threshold(rampU(), 0.5)(0.6, 0)).toBe(1)
    expect(remap(constant(0.5), 0, 0.5)(0, 0)).toBeCloseTo(1)
    const p = posterize(rampV(), 4)
    const seen = new Set<number>()
    for (let i = 0; i <= 100; i++) seen.add(p(0, i / 100))
    expect(seen.size).toBe(4)
  })

  it('warp keeps tileable fields tileable', () => {
    const f = warp(noiseField({ seed: 1, scale: 3 }), 0.3, { seed: 2, scale: 2 })
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      expect(f(0, t)).toBeCloseTo(f(1, t), 6)
    }
  })
})

describe('rasterize', () => {
  it('produces RGBA bytes at the requested size, deterministically', () => {
    const field = noiseField({ seed: 'x', scale: 4 })
    const a = rasterize(field, { size: 32 })
    const b = rasterize(field, { size: 32 })
    expect(a.width).toBe(32)
    expect(a.height).toBe(32)
    expect(a.data.length).toBe(32 * 32 * 4)
    expect(a.data).toEqual(b.data)
  })

  it('grayscale default and palette colorization', () => {
    const gray = rasterize(constant(0.5), { size: 2 })
    expect(gray.data[0]).toBe(gray.data[1])
    expect(gray.data[1]).toBe(gray.data[2])
    expect(gray.data[3]).toBe(255)
    const colored = rasterize(rampU(), { size: 8, colors: ['#000000', '#ff0000'] })
    // Rightmost pixel should be strongly red
    const i = (0 * 8 + 7) * 4
    expect(colored.data[i]).toBeGreaterThan(200)
    expect(colored.data[i + 1]).toBeLessThan(60)
  })

  it('levels posterizes the output', () => {
    const tex = rasterize(rampU(), { size: 64, levels: 3 })
    const values = new Set<number>()
    for (let x = 0; x < 64; x++) values.add(tex.data[x * 4])
    expect(values.size).toBe(3)
  })

  it('dither perturbs values within a quantization step', () => {
    const flat = rasterize(constant(0.5), { size: 8, levels: 8 })
    const dithered = rasterize(constant(0.5), { size: 8, levels: 8, dither: 1 })
    expect(flat.data).not.toEqual(dithered.data)
  })

  it('alpha field fills the alpha channel', () => {
    const tex = rasterize(constant(1), { size: 4, alpha: threshold(rampU(), 0.5) })
    expect(tex.data[0 * 4 + 3]).toBe(0) // left edge transparent
    expect(tex.data[3 * 4 + 3]).toBe(255) // right edge opaque
  })

  it('style presets apply and explicit options win', () => {
    const tex = rasterize(rampU(), { style: textureStyles.pixel })
    expect(tex.width).toBe(32)
    expect(tex.filter).toBe('nearest')
    const overridden = rasterize(rampU(), { style: textureStyles.pixel, size: 16 })
    expect(overridden.width).toBe(16)
  })
})

describe('normalMap', () => {
  it('flat height yields a uniform up normal (128, 128, 255)', () => {
    const tex = normalMap(constant(0.5), { size: 8 })
    for (let i = 0; i < tex.data.length; i += 4) {
      expect(Math.abs(tex.data[i] - 128)).toBeLessThanOrEqual(1)
      expect(Math.abs(tex.data[i + 1] - 128)).toBeLessThanOrEqual(1)
      expect(tex.data[i + 2]).toBeGreaterThan(250)
    }
  })

  it('a u-ramp tilts normals in -x (red < 128), leaving green centered', () => {
    const tex = normalMap(rampU(), { size: 16, strength: 4, wrap: false })
    const i = (8 * 16 + 8) * 4 // interior pixel
    expect(tex.data[i]).toBeLessThan(120)
    expect(Math.abs(tex.data[i + 1] - 128)).toBeLessThanOrEqual(1)
  })

  it('is deterministic', () => {
    const f = noiseField({ seed: 'n', scale: 4 })
    expect(normalMap(f, { size: 16 }).data).toEqual(normalMap(f, { size: 16 }).data)
  })
})

describe('toDataTexture', () => {
  it('converts TextureData with matching dimensions and filtering', () => {
    const tex = rasterize(noiseField({ seed: 1 }), { size: 16, filter: 'nearest' })
    const dt = toDataTexture(tex)
    expect(dt.image.width).toBe(16)
    expect(dt.image.height).toBe(16)
    expect(dt.generateMipmaps).toBe(false)
  })
})
