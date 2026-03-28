// Core
export { Mesh } from './mesh'
export type { Vec2, Vec3, Vec4, ColorInput, ColorFn, DisplaceFn, WarpFn, NoiseLike } from './types'

// Primitives
export { box, sphere, cylinder, plane, cone, torus, icosphere } from './primitives'

// Operations
export { merge, center, clone, loft, tube, thicken } from './ops'

// Modifiers
export { twist, bend, taper } from './modifiers'
export { smooth } from './modifiers/smooth'

// Color
export { gradient, heightGradient, normalGradient, lerpColor, parseColorToRgb, hexToRgb, rgbToHex } from './color'
export { pickRandom, paletteGradient, axisGradient, noiseColor, varyColor, type Palette } from './color'

// UV
export { projectUVs } from './uv'

// Utilities
export { createRng } from './rng'
export { scatterOnSphere } from './scatter'

// Schema & options
export { resolveOptions } from './schema'
export type { OptionSchema, OptionDef, OptionValues, Randomizable } from './schema'
