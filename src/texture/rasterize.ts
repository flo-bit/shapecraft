import { paletteGradient, type Palette } from '../color/palette'
import type { Field, TextureData, TextureStyle } from './types'

// Bayer 4×4 ordered-dither matrix, normalized to [0, 1)
const BAYER4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
].map((n) => n / 16)

export interface RasterizeOptions extends TextureStyle {
  /** Explicit dimensions; default `size` (then `style.size`, then 256). */
  width?: number
  height?: number
  /**
   * Maps the field value to a color: a Palette (interpolated via
   * {@link paletteGradient}) or a `(t) => [r, g, b]` function (0–1 channels).
   * Default grayscale. Colors are authored in sRGB.
   */
  colors?: Palette | ((t: number) => [number, number, number])
  /** Optional alpha channel (cutout masks for foliage cards). Default opaque. */
  alpha?: Field
  /** A style preset; explicit options on this object override it. */
  style?: TextureStyle
}

/**
 * Sample a field over a pixel grid and colorize it into RGBA bytes.
 *
 * This is where style happens: the same field rasterized with different
 * `levels` / `dither` / `size` / `colors` yields pixel-art, PS1, painterly,
 * or realistic variants of one pattern definition.
 */
export function rasterize(field: Field, options: RasterizeOptions = {}): TextureData {
  const style = options.style ?? {}
  const size = options.size ?? style.size ?? 256
  const width = options.width ?? size
  const height = options.height ?? size
  const levels = options.levels ?? style.levels
  const dither = options.dither ?? style.dither ?? 0
  const filter = options.filter ?? style.filter ?? 'linear'

  const colorFn = options.colors === undefined
    ? null
    : typeof options.colors === 'function'
      ? options.colors
      : paletteGradient(options.colors)

  // Dither amplitude: one quantization step when posterizing, one byte otherwise
  const ditherAmp = dither * (levels ? 1 / levels : 1 / 255)

  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height // row 0 = v=0 (bottom), matching UV space
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width
      let t = field(u, v)
      if (dither > 0) t += (BAYER4[(y % 4) * 4 + (x % 4)] - 0.5) * ditherAmp
      t = Math.min(1, Math.max(0, t))
      if (levels) {
        const n = Math.max(2, Math.floor(levels))
        t = Math.min(n - 1, Math.floor(t * n)) / (n - 1)
      }

      const i = (y * width + x) * 4
      if (colorFn) {
        const [r, g, b] = colorFn(t)
        data[i] = r * 255
        data[i + 1] = g * 255
        data[i + 2] = b * 255
      } else {
        data[i] = data[i + 1] = data[i + 2] = t * 255
      }
      data[i + 3] = options.alpha ? Math.min(1, Math.max(0, options.alpha(u, v))) * 255 : 255
    }
  }

  return { width, height, data, filter }
}
