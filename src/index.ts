// Core
export { Mesh } from './core/mesh'
export type { Vec2, Vec3, Vec4, ColorInput, ColorFn, DisplaceFn, WarpFn, NoiseLike } from './core/types'

// Primitives
export { box, sphere, cylinder, plane, cone, torus, icosphere } from './primitives'

// Operations
export { merge, center, clone, loft, tube, thicken, snow } from './ops'
export type { SnowOptions } from './ops'

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
export type { Rng } from './core/rng'
export { scatterOnSphere } from './core/scatter'

// Build — composable model primitives
export { setup, trunk, foliageBlob, facetShade, heightShade, scatterOnSurface, blade, branches } from './build'
export type { TrunkOptions, FoliageBlobOptions, FacetShadeOptions, SurfacePoint, ScatterOnSurfaceOptions, BladeOptions, BranchesOptions, BranchResult, BranchTip } from './build'

// Schema & options
export { resolveOptions } from './core/schema'
export type { OptionSchema, OptionDef, OptionValues, OptionInput, Randomizable } from './core/schema'

// Generators
export { tree, treeSchema, treePresets } from './generators'
export { pine, pineSchema, pinePresets } from './generators'
export { palm, palmSchema, palmPresets } from './generators'
export { bush, bushSchema, bushPresets } from './generators'
export { grass, grassSchema, grassPresets } from './generators'
export { fern, fernSchema, fernPresets } from './generators'
export { flower, flowerSchema, flowerPresets } from './generators'
export { deadTree, deadTreeSchema, deadTreePresets } from './generators'
export { rock, rockSchema, rockPresets } from './generators'
