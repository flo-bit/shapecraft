import type { WarpFn, Vec3 } from '../types'

export function taper(options: { axis?: 'x' | 'y' | 'z'; curve?: (t: number) => number }): WarpFn {
  const { axis = 'y', curve = (t: number) => 1 - t } = options

  return function taperWarp(position: Vec3): Vec3 {
    const [x, y, z] = position
    // We need bounding info, but since we don't have it here, normalize t to be the position along the axis
    // User should pass a curve that expects the raw coordinate value
    if (axis === 'y') {
      const scale = curve(y)
      return [x * scale, y, z * scale]
    } else if (axis === 'x') {
      const scale = curve(x)
      return [x, y * scale, z * scale]
    } else {
      const scale = curve(z)
      return [x * scale, y * scale, z]
    }
  }
}
