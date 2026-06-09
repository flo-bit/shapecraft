import type { TextureStyle } from './types'

/**
 * Style presets — proof that style is a rasterize-time decision, not baked
 * into pattern definitions. `rasterize(field, { style: textureStyles.pixel })`
 * and `…textureStyles.painterly` produce different renderings of the same field.
 *
 * These are starting points; a future "Ghibli" or "realistic" Shapecraft style
 * is a preset here (plus its own palettes), not a rewrite of the fields.
 */
export const textureStyles = {
  /** Chunky low-res, hard color steps, crisp texels. */
  pixel: { size: 32, levels: 5, filter: 'nearest' },
  /** Low-res with ordered dithering — the retro-console look. */
  ps1: { size: 128, levels: 24, dither: 1, filter: 'nearest' },
  /** Soft gradients at modest resolution — painterly / Ghibli-leaning. */
  painterly: { size: 256, filter: 'linear' },
  /** Higher resolution, continuous tones — pair with normalMap() for realism. */
  detailed: { size: 512, filter: 'linear' },
} satisfies Record<string, TextureStyle>
