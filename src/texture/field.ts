import { createNoise2D, createNoise4D } from '../noise/simplex-noise/simplex-noise'
import { aleaFactory } from '../noise/alea/alea'
import type { Field } from './types'

const TAU = Math.PI * 2

/** Reduce a seed to a 32-bit integer (FNV-1a) for the fast per-cell hashes. */
export function seedToInt(seed: number | string | undefined): number {
  const s = String(seed ?? 0)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Deterministic integer-pair hash → [0, 1). Integer-only math, so it is
 * bit-stable across platforms (unlike sin-based hashes).
 */
export function hash2(seed: number, x: number, y: number): number {
  let h = seed ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export interface NoiseFieldOptions {
  seed?: number | string
  /** Pattern repetitions across the tile. A pair gives anisotropic scale (e.g. `[1, 6]` = vertical striations). Default 4. */
  scale?: number | [number, number]
  /** fbm octaves. Default 1 (plain simplex). */
  octaves?: number
  /** Frequency multiplier per octave. Default 2. */
  lacunarity?: number
  /** Amplitude multiplier per octave. Default 0.5. */
  gain?: number
  /**
   * Seamlessly tileable (samples 4D noise on a torus). Default true — texture
   * fields almost always want it and it costs little.
   */
  tileable?: boolean
}

/**
 * Simplex/fbm noise as a Field, normalized to [0, 1].
 *
 * Tileable mode maps the UV square onto a torus in 4D noise space, so opposite
 * edges meet exactly — required for terrain/architecture tiles, free here.
 */
export function noiseField(options: NoiseFieldOptions = {}): Field {
  const seed = String(options.seed ?? 0)
  const [sx, sy] = Array.isArray(options.scale) ? options.scale : [options.scale ?? 4, options.scale ?? 4]
  const octaves = Math.max(1, Math.floor(options.octaves ?? 1))
  const lacunarity = options.lacunarity ?? 2
  const gain = options.gain ?? 0.5
  const tileable = options.tileable ?? true

  // Total amplitude for normalization back to [-1, 1]
  let totalAmp = 0
  for (let o = 0, a = 1; o < octaves; o++, a *= gain) totalAmp += a

  if (tileable) {
    const noise4 = createNoise4D(aleaFactory(seed).random)
    const rx = sx / TAU
    const ry = sy / TAU
    return function tiledNoise(u, v) {
      const au = u * TAU
      const av = v * TAU
      const x = Math.cos(au) * rx
      const y = Math.sin(au) * rx
      const z = Math.cos(av) * ry
      const w = Math.sin(av) * ry
      let sum = 0
      let amp = 1
      let freq = 1
      for (let o = 0; o < octaves; o++) {
        sum += noise4(x * freq, y * freq, z * freq, w * freq) * amp
        amp *= gain
        freq *= lacunarity
      }
      return (sum / totalAmp) * 0.5 + 0.5
    }
  }

  const noise2 = createNoise2D(aleaFactory(seed).random)
  return function flatNoise(u, v) {
    let sum = 0
    let amp = 1
    let freq = 1
    for (let o = 0; o < octaves; o++) {
      sum += noise2(u * sx * freq, v * sy * freq) * amp
      amp *= gain
      freq *= lacunarity
    }
    return (sum / totalAmp) * 0.5 + 0.5
  }
}

// ---------------------------------------------------------------------------
// Combinators — compose fields into new fields. All stay pure and deterministic.
// ---------------------------------------------------------------------------

export function constant(value: number): Field {
  return () => value
}

/** Linear ramp 0→1 along u. */
export function rampU(): Field {
  return (u) => u
}

/** Linear ramp 0→1 along v (v=0 is the bottom of the texture). */
export function rampV(): Field {
  return (_u, v) => v
}

/** Blend two fields; `t` may be a constant or a third field (mask). */
export function mix(a: Field, b: Field, t: number | Field): Field {
  const tf = typeof t === 'number' ? null : t
  const tc = typeof t === 'number' ? t : 0
  return (u, v) => {
    const k = tf ? tf(u, v) : tc
    return a(u, v) * (1 - k) + b(u, v) * k
  }
}

export function add(a: Field, b: Field): Field {
  return (u, v) => a(u, v) + b(u, v)
}

export function multiply(a: Field, b: Field): Field {
  return (u, v) => a(u, v) * b(u, v)
}

export function invert(a: Field): Field {
  return (u, v) => 1 - a(u, v)
}

export function clamp01(a: Field): Field {
  return (u, v) => Math.min(1, Math.max(0, a(u, v)))
}

/** Map `[inLo, inHi]` to `[outLo, outHi]` (unclamped). */
export function remap(a: Field, inLo: number, inHi: number, outLo = 0, outHi = 1): Field {
  const inSpan = inHi - inLo || 1
  return (u, v) => outLo + ((a(u, v) - inLo) / inSpan) * (outHi - outLo)
}

/**
 * Step at `edge`. With `softness > 0`, a smoothstep band of that width —
 * the difference between a crisp mask and a painterly one.
 */
export function threshold(a: Field, edge = 0.5, softness = 0): Field {
  if (softness <= 0) return (u, v) => (a(u, v) >= edge ? 1 : 0)
  const lo = edge - softness / 2
  return (u, v) => {
    const t = Math.min(1, Math.max(0, (a(u, v) - lo) / softness))
    return t * t * (3 - 2 * t)
  }
}

/** Quantize to N levels (also available as a rasterize style option). */
export function posterize(a: Field, levels: number): Field {
  const n = Math.max(2, Math.floor(levels))
  return (u, v) => {
    const t = Math.min(1, Math.max(0, a(u, v)))
    return Math.min(n - 1, Math.floor(t * n)) / (n - 1)
  }
}

export interface WarpOptions extends Pick<NoiseFieldOptions, 'seed' | 'scale' | 'octaves' | 'tileable'> {}

/**
 * Domain-warp a field with internal noise — turns regular patterns organic
 * (straight striations → bark, perfect rings → real wood). Warping a tileable
 * field with tileable noise (the default) stays tileable.
 */
export function warp(a: Field, amount: number, options: WarpOptions = {}): Field {
  const seed = options.seed ?? 0
  const nu = noiseField({ ...options, seed: `${seed}/warp-u` })
  const nv = noiseField({ ...options, seed: `${seed}/warp-v` })
  return (u, v) => a(u + (nu(u, v) - 0.5) * amount, v + (nv(u, v) - 0.5) * amount)
}
