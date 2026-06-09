import type { Field } from './types'
import { hash2, seedToInt } from './field'

export interface VoronoiOptions {
  seed?: number | string
  /** Grid cells per tile side, or `[cu, cv]`. Default 8. */
  cells?: number | [number, number]
  /**
   * What the field returns, all in cell units clamped to [0, 1]:
   * - `'f1'`   — distance to nearest feature point (bubbly; invert for cobbles)
   * - `'f2'`   — distance to second-nearest
   * - `'edge'` — f2 − f1 (0 on cell borders: cracks, stone joints, dry mud)
   * - `'cell'` — a flat random value per cell (stylized rock facets, color zones)
   * Default 'f1'.
   */
  output?: 'f1' | 'f2' | 'edge' | 'cell'
  /** Feature point jitter 0–1. 0 = regular grid. Default 1. */
  jitter?: number
  /** Seamless wrap at tile edges. Default true. */
  tileable?: boolean
}

/**
 * Voronoi / cellular noise — the workhorse for rock, stone walls, cracked
 * earth, and scale/plate patterns, which plain simplex can't produce.
 */
export function voronoi(options: VoronoiOptions = {}): Field {
  const seed = seedToInt(options.seed)
  const [cu, cv] = Array.isArray(options.cells) ? options.cells : [options.cells ?? 8, options.cells ?? 8]
  const output = options.output ?? 'f1'
  const jitter = options.jitter ?? 1
  const tileable = options.tileable ?? true

  return (u, v) => {
    const pu = (u - Math.floor(u)) * cu
    const pv = (v - Math.floor(v)) * cv
    const gx = Math.floor(pu)
    const gy = Math.floor(pv)

    let f1 = Infinity
    let f2 = Infinity
    let cellValue = 0

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        let cx = gx + dx
        let cy = gy + dy
        // Identify the cell (wrapped when tiling) but keep its unwrapped
        // position so distances across the seam are correct.
        let hx = cx
        let hy = cy
        if (tileable) {
          hx = ((cx % cu) + cu) % cu
          hy = ((cy % cv) + cv) % cv
        }
        const px = cx + 0.5 + (hash2(seed, hx, hy) - 0.5) * jitter
        const py = cy + 0.5 + (hash2(seed ^ 0x9e3779b9, hx, hy) - 0.5) * jitter
        const d = Math.sqrt((pu - px) * (pu - px) + (pv - py) * (pv - py))
        if (d < f1) {
          f2 = f1
          f1 = d
          cellValue = hash2(seed ^ 0x85ebca6b, hx, hy)
        } else if (d < f2) {
          f2 = d
        }
      }
    }

    switch (output) {
      case 'f1': return Math.min(1, f1)
      case 'f2': return Math.min(1, f2)
      case 'edge': return Math.min(1, f2 - f1)
      case 'cell': return cellValue
    }
  }
}
