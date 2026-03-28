import type { ColorInput, ColorFn, Vec3 } from '../types'
import { parseColorToRgb, lerpColor } from './utils'

export type GradientStop = [number, ColorInput]

export function gradient(stops: GradientStop[]): (value: number) => [number, number, number] {
  const sorted = [...stops].sort((a, b) => a[0] - b[0])

  return function sampleGradient(value: number): [number, number, number] {
    if (sorted.length === 0) return [1, 1, 1]
    if (value <= sorted[0][0]) return parseColorToRgb(sorted[0][1])
    if (value >= sorted[sorted.length - 1][0]) return parseColorToRgb(sorted[sorted.length - 1][1])

    for (let i = 0; i < sorted.length - 1; i++) {
      if (value >= sorted[i][0] && value <= sorted[i + 1][0]) {
        const t = (value - sorted[i][0]) / (sorted[i + 1][0] - sorted[i][0])
        return lerpColor(sorted[i][1], sorted[i + 1][1], t)
      }
    }
    return parseColorToRgb(sorted[sorted.length - 1][1])
  }
}

export function heightGradient(stops: GradientStop[]): ColorFn {
  const grad = gradient(stops)
  return function heightColorFn(position: Vec3): [number, number, number] {
    return grad(position[1])
  }
}

/**
 * Color based on normal direction — lerps between downColor (facing down)
 * and upColor (facing up). Useful for vegetation, terrain, etc.
 */
export function normalGradient(upColor: ColorInput, downColor: ColorInput): ColorFn {
  const up = parseColorToRgb(upColor)
  const down = parseColorToRgb(downColor)
  return function normalColorFn(_position: Vec3, normal: Vec3): [number, number, number] {
    const t = normal[1] * 0.5 + 0.5 // -1..1 → 0..1
    return [
      down[0] + (up[0] - down[0]) * t,
      down[1] + (up[1] - down[1]) * t,
      down[2] + (up[2] - down[2]) * t,
    ]
  }
}
