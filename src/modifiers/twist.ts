import type { WarpFn, Vec3 } from '../types'

export function twist(options: { axis?: 'x' | 'y' | 'z'; amount: number }): WarpFn {
  const { axis = 'y', amount } = options

  return function twistWarp(position: Vec3): Vec3 {
    const [x, y, z] = position
    if (axis === 'y') {
      const angle = y * amount
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      return [x * cos - z * sin, y, x * sin + z * cos]
    } else if (axis === 'x') {
      const angle = x * amount
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      return [x, y * cos - z * sin, y * sin + z * cos]
    } else {
      const angle = z * amount
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      return [x * cos - y * sin, x * sin + y * cos, z]
    }
  }
}
