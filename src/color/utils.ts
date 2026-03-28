import * as THREE from 'three'
import type { ColorInput } from '../core/types'

export function parseColorToRgb(input: ColorInput): [number, number, number] {
  if (typeof input === 'number') {
    const c = new THREE.Color(input)
    return [c.r, c.g, c.b]
  }
  if (typeof input === 'string') {
    const c = new THREE.Color(input)
    return [c.r, c.g, c.b]
  }
  return [input[0], input[1], input[2]]
}

export function lerpColor(a: ColorInput, b: ColorInput, t: number): [number, number, number] {
  const ca = parseColorToRgb(a)
  const cb = parseColorToRgb(b)
  return [
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t,
  ]
}

export function hexToRgb(hex: string): [number, number, number] {
  const c = new THREE.Color(hex)
  return [c.r, c.g, c.b]
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + new THREE.Color(r, g, b).getHexString()
}
