import { paletteGradient, type Palette } from '../color'
import type { Vec3, NoiseLike } from '../core/types'

export interface FacetShadeOptions {
  /** Base RGB color (0–1). */
  base: Vec3
  /** Optional noise used to mottle the shade across the surface. */
  noise?: NoiseLike
  /** Flat ambient term. Default 0.6. */
  ambient?: number
  /** How much upward-facing faces brighten. Default 0.4. */
  range?: number
  /** How strongly `noise` perturbs the shade. Default 0.15. */
  noiseAmount?: number
  /**
   * Optional painted snow: faces facing up past `threshold` get the snow color.
   * (Geometric snow via the `snow()` op is preferred; this is the cheap fallback.)
   */
  snow?: { color: Vec3; noise: NoiseLike; threshold: number; noiseAmount?: number }
}

/**
 * Build a per-face color function that darkens by facing direction and mottles with
 * noise — the shared "stylized foliage" shading used across the tree generators.
 */
export function facetShade(opts: FacetShadeOptions): (centroid: Vec3, normal: Vec3) => Vec3 {
  const base = opts.base
  const ambient = opts.ambient ?? 0.6
  const range = opts.range ?? 0.4
  const noiseAmount = opts.noiseAmount ?? 0.15
  const snow = opts.snow
  const snowNoiseAmount = snow?.noiseAmount ?? 0.15

  return (centroid, normal) => {
    if (snow) {
      const n = snow.noise.get(centroid[0], centroid[1], centroid[2]) * snowNoiseAmount
      if (normal[1] + n > snow.threshold) return snow.color
    }
    const top = normal[1] * 0.5 + 0.5
    const n = opts.noise ? opts.noise.get(centroid[0], centroid[1], centroid[2]) * noiseAmount : 0
    const darken = ambient + top * range + n
    return [base[0] * darken, base[1] * darken, base[2] * darken]
  }
}

/**
 * Build a vertex color function that maps a palette along height (y), normalized to
 * `[bottom, bottom + height]`. Handy for trunks, stems, and stratified surfaces.
 */
export function heightShade(
  palette: Palette,
  height: number,
  options?: { bottom?: number },
): (pos: Vec3) => Vec3 {
  const grad = paletteGradient(palette)
  const bottom = options?.bottom ?? 0
  const span = height || 1
  return (pos) => grad(Math.max(0, Math.min(1, (pos[1] - bottom) / span)))
}
