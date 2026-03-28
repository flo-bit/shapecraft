import type { WarpFn, Vec3 } from '../types'

export function bend(options: { axis?: 'x' | 'y' | 'z'; amount: number }): WarpFn {
  const { axis = 'y', amount } = options

  return function bendWarp(position: Vec3): Vec3 {
    const [x, y, z] = position
    if (amount === 0) return [x, y, z]

    if (axis === 'y') {
      const angle = y * amount
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const radius = 1 / amount + x
      return [radius * cos - 1 / amount, radius * sin, z]
    } else if (axis === 'x') {
      const angle = x * amount
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const radius = 1 / amount + y
      return [radius * sin, radius * cos - 1 / amount, z]
    } else {
      const angle = z * amount
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const radius = 1 / amount + x
      return [radius * cos - 1 / amount, y, radius * sin]
    }
  }
}
