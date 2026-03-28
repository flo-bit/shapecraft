export type Vec2 = [number, number]
export type Vec3 = [number, number, number]
export type Vec4 = [number, number, number, number]
export type ColorInput = string | Vec3 | Vec4 | number
export type ColorFn = (position: Vec3, normal: Vec3, index: number) => ColorInput
export type DisplaceFn = (position: Vec3, normal: Vec3, uv: Vec2 | null, index: number) => number
export type WarpFn = (position: Vec3, index: number) => Vec3
export type NoiseLike = { get(x: number, y?: number, z?: number, w?: number): number }
