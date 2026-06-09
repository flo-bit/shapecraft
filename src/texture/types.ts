/**
 * A scalar field over the unit UV square: (u, v) → value, nominally in [0, 1].
 * Fields are the style-agnostic layer of texture generation — they describe
 * *structure* (bark striations, wood rings, voronoi cells). Style decisions
 * (palette, resolution, posterization, dithering, filtering) are applied later,
 * at {@link rasterize} time, so the same field definitions serve flat-shaded,
 * pixel-art, PS1, painterly, or realistic output.
 *
 * v follows UV convention: v=0 is the bottom of the texture.
 */
export type Field = (u: number, v: number) => number

/** A rasterized RGBA texture, renderer-agnostic (convertible to THREE.DataTexture or PNG). */
export interface TextureData {
  width: number
  height: number
  /** RGBA bytes, row-major; row 0 is v=0 (bottom, matching UV space). */
  data: Uint8ClampedArray
  /** Sampling hint for renderers/exporters. */
  filter: 'nearest' | 'linear'
}

/**
 * Style knobs applied at rasterize time. A "texture style" (pixel art, PS1,
 * painterly, …) is just a preset of these — see {@link textureStyles}.
 */
export interface TextureStyle {
  /** Square output resolution (overridden by explicit width/height). */
  size?: number
  /** Posterize the field to N discrete levels before colorizing (pixel-art look). */
  levels?: number
  /** Ordered (Bayer 4×4) dither strength 0–1, applied before posterizing (PS1 look). */
  dither?: number
  /** Sampling hint stored on the output. */
  filter?: 'nearest' | 'linear'
}
