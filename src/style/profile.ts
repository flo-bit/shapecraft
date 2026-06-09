import type { TextureStyle } from '../texture/types'
import type { Material } from '../core/material'

/**
 * Geometry treatment knobs consumed by the shared building blocks. These are
 * multipliers/modes over a generator's own options, so a model written once
 * renders in any style without per-style forks.
 */
export interface StyleGeometry {
  /**
   * Multiplier on adaptive-subdivision edge length. < 1 = finer mesh.
   * (Applied to e.g. canopy `detail` — 1 is the low-poly baseline.)
   */
  detail: number
  /** Laplacian smoothing iterations for organic parts (canopies, caps). 0 = off. */
  smoothing: number
  /** Multiplier on low-poly vertex jitter. 0 disables the crunchy facet look. */
  jitter: number
  /** Foliage representation. 'card' (alpha-cutout quads) reserved for future styles. */
  foliage: 'blob' | 'card'
}

/**
 * A style is a cross-cutting profile, not a property of a model. Generators
 * declare *structure* (trunk, canopy, …) and semantic color roles ('bark',
 * 'leaf', …); the style interprets them. Models are never forked per style —
 * at most they ship a per-style preset.
 */
export interface StyleProfile {
  name: string
  label: string
  /** Faceted vs smooth surface shading (drives material.flatShading). */
  flatShading: boolean
  /**
   * How parts are colored: 'faceted' = per-face random shading (facetShade),
   * 'gradient' = smooth vertex gradients. Building blocks switch on this.
   */
  shading: 'faceted' | 'gradient'
  /** Rasterize-time texture treatment for this style (see textureStyles). */
  texture: TextureStyle
  geometry: StyleGeometry
  /**
   * Semantic color roles → palettes. Generators reference roles via the
   * schema (`role: 'bark'`), so swapping styles re-colors the whole catalog
   * from this one table. Hex strings to stay schema- and UI-compatible.
   */
  palettes: Record<string, string[]>
}

/** The current Shapecraft identity: crunchy facets, saturated flats. */
export const lowpoly: StyleProfile = {
  name: 'lowpoly',
  label: 'Low Poly',
  flatShading: true,
  shading: 'faceted',
  texture: { size: 64, filter: 'linear' },
  geometry: { detail: 1, smoothing: 0, jitter: 1, foliage: 'blob' },
  palettes: {
    bark: ['#1a0f06', '#4a2815', '#5a3520'],
    leaf: ['#1e6b10', '#2a7518', '#238020', '#2d8a1e'],
    snow: ['#e8e8f0', '#dddde8', '#f0f0f5'],
    rock: ['#5a5a62', '#6e6e76', '#84848c'],
    wood: ['#8a6a45', '#a8845a', '#c9a878'],
  },
}

/**
 * Soft, painterly, smooth-shaded — rounded silhouettes, sage greens,
 * gradient coloring instead of facets.
 */
export const ghibli: StyleProfile = {
  name: 'ghibli',
  label: 'Ghibli',
  flatShading: false,
  shading: 'gradient',
  texture: { size: 256, filter: 'linear' },
  geometry: { detail: 0.55, smoothing: 1, jitter: 0.15, foliage: 'blob' },
  // Authored darker than they should read: gradient styles render vertex colors
  // without the facet-shading ambient multiplier, so they display ~1 stop lighter.
  palettes: {
    bark: ['#43342a', '#514033', '#5e4c3c'],
    leaf: ['#33611f', '#3d7026', '#477f2e', '#528e37'],
    snow: ['#e8eaf2', '#dde2ec', '#d2d9e6'],
    rock: ['#64625c', '#726f68', '#807d75'],
    wood: ['#7c6240', '#8d7250', '#9e835f'],
  },
}

export const styles: Record<string, StyleProfile> = { lowpoly, ghibli }

/** Anything a generator accepts as its `style` option. */
export type StyleInput = string | StyleProfile | undefined

/** Resolve a style name/profile to a profile; defaults to lowpoly. */
export function resolveStyle(style?: StyleInput): StyleProfile {
  if (style === undefined) return lowpoly
  if (typeof style === 'string') {
    const found = styles[style]
    if (!found) throw new Error(`Unknown style '${style}' (available: ${Object.keys(styles).join(', ')})`)
    return found
  }
  return style
}

/** Palette for a semantic role, with optional fallback for roles a style omits. */
export function stylePalette(style: StyleProfile, role: string, fallback?: string[]): string[] {
  return style.palettes[role] ?? fallback ?? []
}

/** The standard vertex-colored material under a style's shading model. */
export function styleMaterial(style: StyleProfile): Material {
  return { vertexColors: true, flatShading: style.flatShading }
}
