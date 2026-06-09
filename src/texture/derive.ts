import type { Field, TextureData } from './types'

export interface NormalMapOptions {
  /** Square resolution. Default 256. */
  size?: number
  width?: number
  height?: number
  /** Bump strength multiplier. Default 1. */
  strength?: number
  /** Sample across tile edges (keep on for tileable fields). Default true. */
  wrap?: boolean
  filter?: 'nearest' | 'linear'
}

/**
 * Derive a tangent-space normal map from a height field (Sobel filter),
 * OpenGL/glTF convention (green = up). Treat the same field as height that
 * you rasterized as albedo and the lighting matches the color pattern —
 * one field definition yields the whole texture set.
 */
export function normalMap(height: Field, options: NormalMapOptions = {}): TextureData {
  const size = options.size ?? 256
  const width = options.width ?? size
  const height_ = options.height ?? size
  const strength = options.strength ?? 1
  const wrap = options.wrap ?? true
  const filter = options.filter ?? 'linear'

  // Rasterize heights once; the Sobel reads each sample up to 8 times
  const h = new Float32Array(width * height_)
  for (let y = 0; y < height_; y++) {
    const v = (y + 0.5) / height_
    for (let x = 0; x < width; x++) {
      h[y * width + x] = height((x + 0.5) / width, v)
    }
  }

  const at = (x: number, y: number): number => {
    if (wrap) {
      x = ((x % width) + width) % width
      y = ((y % height_) + height_) % height_
    } else {
      x = Math.min(width - 1, Math.max(0, x))
      y = Math.min(height_ - 1, Math.max(0, y))
    }
    return h[y * width + x]
  }

  const data = new Uint8ClampedArray(width * height_ * 4)
  for (let y = 0; y < height_; y++) {
    for (let x = 0; x < width; x++) {
      const dx =
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) -
        (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1))
      const dy =
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) -
        (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1))
      // Rows are stored bottom-up (row 0 = v=0), so dy is dh/dv directly and
      // the OpenGL green-up convention is n = normalize(-dh/du, -dh/dv, 1)
      const nx = -dx * strength
      const ny = -dy * strength
      const len = Math.sqrt(nx * nx + ny * ny + 1)

      const i = (y * width + x) * 4
      data[i] = (nx / len) * 0.5 * 255 + 127.5
      data[i + 1] = (ny / len) * 0.5 * 255 + 127.5
      data[i + 2] = (1 / len) * 0.5 * 255 + 127.5
      data[i + 3] = 255
    }
  }

  return { width, height: height_, data, filter }
}
