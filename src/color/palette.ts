import { interpolate, oklch, formatRgb, parse, converter } from 'culori'
import type { ColorInput, ColorFn, Vec3 } from '../types'
import type { NoiseLike } from '../types'

const toOklch = converter('oklch')

/** A color or array of colors */
export type Palette = ColorInput | ColorInput[]

/** Parse any ColorInput to [r, g, b] 0-1 */
function toRgb(c: ColorInput): [number, number, number] {
  if (typeof c === 'string') {
    const parsed = parse(c)
    if (!parsed) return [1, 0, 1]
    const rgb = converter('rgb')(parsed)
    return [rgb.r, rgb.g, rgb.b]
  }
  if (typeof c === 'number') {
    return [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255]
  }
  return [c[0], c[1], c[2]]
}

/** Pick a random color from a palette using a seeded rand function */
export function pickRandom(palette: Palette, rand: () => number): [number, number, number] {
  if (!Array.isArray(palette) || (palette.length === 3 && typeof palette[0] === 'number' && (palette[0] as number) <= 1)) {
    // Single color (or Vec3 tuple)
    return toRgb(palette as ColorInput)
  }
  const colors = palette as ColorInput[]
  return toRgb(colors[Math.floor(rand() * colors.length)])
}

/**
 * Create a smooth gradient function from a palette.
 * t=0 → first color, t=1 → last color, interpolated in oklch.
 */
export function paletteGradient(palette: Palette): (t: number) => [number, number, number] {
  const colors = Array.isArray(palette) && (palette.length !== 3 || typeof palette[0] !== 'number' || (palette[0] as number) > 1)
    ? (palette as ColorInput[]).map(c => {
        const rgb = toRgb(c)
        return { mode: 'rgb' as const, r: rgb[0], g: rgb[1], b: rgb[2] }
      })
    : (() => {
        const rgb = toRgb(palette as ColorInput)
        return [{ mode: 'rgb' as const, r: rgb[0], g: rgb[1], b: rgb[2] }]
      })()

  if (colors.length === 1) {
    const c = colors[0]
    return () => [c.r, c.g, c.b]
  }

  const interp = interpolate(colors, 'oklch')
  return function sample(t: number): [number, number, number] {
    const c = interp(Math.max(0, Math.min(1, t)))
    const rgb = converter('rgb')(c)
    return [rgb.r, rgb.g, rgb.b]
  }
}

/**
 * Create a ColorFn that maps a palette along an axis (default Y).
 * Normalizes position to [0,1] within the mesh's extent on that axis.
 */
export function axisGradient(palette: Palette, options?: {
  axis?: 'x' | 'y' | 'z'
  min?: number
  max?: number
}): ColorFn {
  const grad = paletteGradient(palette)
  const axis = options?.axis ?? 'y'
  const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  const min = options?.min ?? 0
  const max = options?.max ?? 1

  return function axisColorFn(position: Vec3): [number, number, number] {
    const t = (position[idx] - min) / (max - min || 1)
    return grad(Math.max(0, Math.min(1, t)))
  }
}

/**
 * Color from noise sampling into a palette gradient.
 * noise output [-1,1] mapped to [0,1] → palette.
 */
export function noiseColor(palette: Palette, noise: NoiseLike, options?: {
  scale?: number
}): ColorFn {
  const grad = paletteGradient(palette)
  const scale = options?.scale ?? 1

  return function noiseColorFn(position: Vec3): [number, number, number] {
    const n = noise.get(position[0] * scale, position[1] * scale, position[2] * scale)
    const t = n * 0.5 + 0.5 // -1..1 → 0..1
    return grad(t)
  }
}

/**
 * Vary a base color by a random amount in oklch space.
 * Returns a function that gives a slightly different shade each call.
 */
export function varyColor(color: ColorInput, amount: number, rand: () => number): () => [number, number, number] {
  const rgb = toRgb(color)
  const base = toOklch({ mode: 'rgb', r: rgb[0], g: rgb[1], b: rgb[2] })

  return function varied(): [number, number, number] {
    const varied = oklch({
      l: Math.max(0, Math.min(1, (base.l ?? 0.5) + (rand() - 0.5) * amount)),
      c: Math.max(0, (base.c ?? 0.1) + (rand() - 0.5) * amount * 0.5),
      h: (base.h ?? 140) + (rand() - 0.5) * amount * 60,
    })
    const out = converter('rgb')(varied)
    return [
      Math.max(0, Math.min(1, out.r)),
      Math.max(0, Math.min(1, out.g)),
      Math.max(0, Math.min(1, out.b)),
    ]
  }
}
