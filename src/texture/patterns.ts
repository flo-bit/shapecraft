import type { Field } from './types'
import { hash2, seedToInt } from './field'

const TAU = Math.PI * 2

// All patterns tile across the unit square (for integer counts) and tolerate
// out-of-range u/v, so they survive domain warping.

export interface StripesOptions {
  /** Stripe pairs across the tile. Default 8. */
  count?: number
  /** Stripe direction: bands perpendicular to this axis. Default 'u' (vertical stripes). */
  axis?: 'u' | 'v'
}

/** Soft sinusoidal stripes in [0, 1]. Threshold for hard stripes, warp for bark. */
export function stripes(options: StripesOptions = {}): Field {
  const count = options.count ?? 8
  const alongU = (options.axis ?? 'u') === 'u'
  return (u, v) => 0.5 - 0.5 * Math.cos((alongU ? u : v) * count * TAU)
}

export interface RingsOptions {
  /** Ring count from center to corner. Default 6. */
  count?: number
  center?: [number, number]
}

/** Concentric rings (wood growth rings on stump/log cut faces). Not tileable by nature. */
export function rings(options: RingsOptions = {}): Field {
  const count = options.count ?? 6
  const [cx, cy] = options.center ?? [0.5, 0.5]
  return (u, v) => {
    const d = Math.sqrt((u - cx) * (u - cx) + (v - cy) * (v - cy))
    return 0.5 - 0.5 * Math.cos(d * count * TAU)
  }
}

export interface CheckerOptions {
  /** Cells per side, or `[cu, cv]`. Default 2. */
  count?: number | [number, number]
}

/** Binary checkerboard (0 / 1). */
export function checker(options: CheckerOptions = {}): Field {
  const [cu, cv] = Array.isArray(options.count) ? options.count : [options.count ?? 2, options.count ?? 2]
  return (u, v) => {
    const p = Math.floor(u * cu) + Math.floor(v * cv)
    return ((p % 2) + 2) % 2
  }
}

export interface BricksOptions {
  /** Brick rows. Default 6. */
  rows?: number
  /** Bricks per row. Default 3. */
  cols?: number
  /** Mortar half-width in tile units. Default 0.02. */
  mortar?: number
  /** Horizontal offset of alternate rows, in brick widths. Default 0.5 (running bond). */
  offset?: number
  /** Per-brick value variation 0–1 (multiplies brick interiors). Default 0. */
  vary?: number
  seed?: number | string
}

/**
 * Brick / tile pattern: 1 inside bricks, falling to 0 across the mortar gap.
 * The mortar edge is a linear gradient — threshold it hard for crisp styles or
 * use as-is for a beveled look. `vary` gives each brick its own shade.
 */
export function bricks(options: BricksOptions = {}): Field {
  const rows = options.rows ?? 6
  const cols = options.cols ?? 3
  const mortar = options.mortar ?? 0.02
  const offset = options.offset ?? 0.5
  const vary = options.vary ?? 0
  const seed = seedToInt(options.seed)

  return (u, v) => {
    const vr = v * rows
    const row = Math.floor(vr)
    const fu0 = u * cols + (((row % 2) + 2) % 2) * offset
    const col = Math.floor(fu0)
    const fu = fu0 - col
    const fv = vr - row
    // Distance to nearest brick edge, in tile units
    const du = Math.min(fu, 1 - fu) / cols
    const dv = Math.min(fv, 1 - fv) / rows
    const d = Math.min(du, dv)
    let value = Math.min(1, d / mortar)
    if (vary > 0) value *= 1 - vary * hash2(seed, col, row)
    return value
  }
}

export interface DotsOptions {
  /** Grid cells per side (one dot per cell). Default 5. */
  count?: number
  /** Dot radius in cell units. Default 0.35. */
  radius?: number
  /** Random per-dot position offset 0–1. Default 0.8. */
  jitter?: number
  /** Random per-dot radius variation 0–1. Default 0. */
  varyRadius?: number
  /** Edge softness as a fraction of radius. Default 0.15. */
  softness?: number
  seed?: number | string
}

/**
 * Jitter-scattered dots (mushroom cap spots, lichen flecks, flower centers).
 * 1 inside dots, 0 outside. Tileable.
 */
export function dots(options: DotsOptions = {}): Field {
  const count = Math.max(1, Math.floor(options.count ?? 5))
  const radius = options.radius ?? 0.35
  const jitter = options.jitter ?? 0.8
  const varyRadius = options.varyRadius ?? 0
  const softness = options.softness ?? 0.15
  const seed = seedToInt(options.seed)

  return (u, v) => {
    const pu = (u - Math.floor(u)) * count
    const pv = (v - Math.floor(v)) * count
    const cu = Math.floor(pu)
    const cv = Math.floor(pv)
    let value = 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const wx = ((cu + dx) % count + count) % count // wrapped cell for tiling
        const wy = ((cv + dy) % count + count) % count
        const px = cu + dx + 0.5 + (hash2(seed, wx, wy) - 0.5) * jitter
        const py = cv + dy + 0.5 + (hash2(seed ^ 0x9e3779b9, wx, wy) - 0.5) * jitter
        const r = radius * (1 - varyRadius * hash2(seed ^ 0x85ebca6b, wx, wy))
        const d = Math.sqrt((pu - px) * (pu - px) + (pv - py) * (pv - py))
        const inner = r * (1 - softness)
        const t = r > inner ? Math.min(1, Math.max(0, (r - d) / (r - inner))) : d < r ? 1 : 0
        value = Math.max(value, t * t * (3 - 2 * t))
      }
    }
    return value
  }
}
