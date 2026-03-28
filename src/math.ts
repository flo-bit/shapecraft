import * as THREE from 'three'
import type { Vec3, ColorInput } from './types'

export function vec3(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z)
}

export function mat4(): THREE.Matrix4 {
  return new THREE.Matrix4()
}

export function makeTranslation(x: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeTranslation(x, y, z)
}

export function makeRotation(axis: Vec3 | 'x' | 'y' | 'z', angle: number): THREE.Matrix4 {
  let axisVec: THREE.Vector3
  if (axis === 'x') axisVec = new THREE.Vector3(1, 0, 0)
  else if (axis === 'y') axisVec = new THREE.Vector3(0, 1, 0)
  else if (axis === 'z') axisVec = new THREE.Vector3(0, 0, 1)
  else axisVec = new THREE.Vector3(axis[0], axis[1], axis[2]).normalize()
  return new THREE.Matrix4().makeRotationAxis(axisVec, angle)
}

export function makeScale(x: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeScale(x, y, z)
}

export function parseColor(input: ColorInput): THREE.Color {
  if (typeof input === 'number') {
    return new THREE.Color(input)
  }
  if (typeof input === 'string') {
    return new THREE.Color(input)
  }
  // Vec3 or Vec4 — rgb values 0-1
  return new THREE.Color(input[0], input[1], input[2])
}
