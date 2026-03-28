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
