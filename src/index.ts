// Core
export { Mesh } from './core/mesh'
export type { Vec2, Vec3, Vec4, ColorInput, ColorFn, DisplaceFn, WarpFn, NoiseLike } from './core/types'

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
export { createRng } from './core/rng'
export { scatterOnSphere } from './core/scatter'

// Schema & options
export { resolveOptions } from './core/schema'
export type { OptionSchema, OptionDef, OptionValues, Randomizable } from './core/schema'

// Generators
export { tree, treeSchema, treePresets } from './generators'
export { pine, pineSchema, pinePresets } from './generators'
export { palm, palmSchema, palmPresets } from './generators'
