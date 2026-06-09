// Core
export { Mesh } from './core/mesh'
export { Asset, part, group, type Socket } from './core/asset'
export { material, VERTEX_COLOR_MATERIAL, type Material } from './core/material'
export type { Vec2, Vec3, Vec4, ColorInput, ColorFn, DisplaceFn, WarpFn, NoiseLike } from './core/types'

// Primitives
export { box, sphere, cylinder, plane, cone, torus, icosphere } from './primitives'

// Operations
export { merge, center, clone, loft, tube, thicken, snow, decimate, weld, mirror, array, radialArray, boolean, union, subtract, intersect, extrudeFaces, insetFaces, bevel } from './ops'
export type { SnowOptions, DecimateOptions, WeldOptions, MirrorOptions, ArrayOptions, RadialArrayOptions, BooleanOp, ExtrudeOptions, InsetOptions, BevelOptions, FaceFilter } from './ops'

// Modifiers
export { twist, bend, taper } from './modifiers'
export { smooth } from './modifiers/smooth'

// Color
export { gradient, heightGradient, normalGradient, lerpColor, parseColorToRgb, hexToRgb, rgbToHex } from './color'
export { pickRandom, paletteGradient, axisGradient, noiseColor, varyColor, type Palette } from './color'

// UV
export { projectUVs } from './uv'

// Texture (full field/pattern toolkit via 'shapecraft/texture')
export { rasterize, noiseField, voronoi, normalMap, textureStyles } from './texture'
export type { Field, TextureData, TextureStyle } from './texture'

// Style profiles — cross-cutting style system (see 'shapecraft/style')
export { lowpoly, ghibli, styles, resolveStyle, stylePalette, styleMaterial } from './style'
export type { StyleProfile, StyleGeometry, StyleInput } from './style'

// Utilities
export { createRng } from './core/rng'
export type { Rng } from './core/rng'
export { scatterOnSphere } from './core/scatter'

// Build — composable model primitives
export { setup, trunk, foliageBlob, facetShade, heightShade, scatterOnSurface, blade, branches, metaballs, surfaceNets } from './build'
export type { TrunkOptions, FoliageBlobOptions, FacetShadeOptions, SurfacePoint, ScatterOnSurfaceOptions, BladeOptions, BranchesOptions, BranchResult, BranchTip, MetaBall, MetaballsOptions, SurfaceNetsOptions } from './build'

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
export { leafyTree, leafyTreeSchema, leafyTreePresets } from './generators'
export { rock, rockSchema, rockPresets } from './generators'
export { sharpRock, sharpRockSchema, sharpRockPresets } from './generators'
export { blockRock, blockRockSchema, blockRockPresets } from './generators'
export { mushroom, mushroomSchema, mushroomPresets } from './generators'
