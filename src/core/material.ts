import type { ColorInput } from './types'
import type { TextureData } from '../texture/types'

/**
 * A surface material, decoupled from geometry. A part references a Material; the same
 * geometry can be re-skinned, and distinct parts can carry distinct materials (the basis
 * for multi-material export). Baked vertex colors become just one option (`vertexColors`).
 */
export interface Material {
  /** Optional name (used as the glTF material name when exporting). */
  name?: string
  /** Solid base color. Ignored when `vertexColors` is true. */
  color?: ColorInput
  /** Use the geometry's baked `color` attribute instead of `color`. */
  vertexColors?: boolean
  /** PBR roughness 0–1. Default 1. */
  roughness?: number
  /** PBR metalness 0–1. Default 0. */
  metalness?: number
  /** Emissive color. */
  emissive?: ColorInput
  /** Faceted (low-poly) shading. Default true. */
  flatShading?: boolean
  /** Render both sides (for thin geometry like leaves/blades). Default false. */
  doubleSided?: boolean
  /** Albedo texture (multiplied with `color` / vertex colors). Needs UVs — see `Mesh.computeUVs()`. */
  map?: TextureData
  /** Tangent-space normal map (OpenGL convention, as produced by `normalMap()`). */
  normalMap?: TextureData
  /** Alpha cutout mask (foliage cards, leaf shapes). Enables alpha testing. */
  alphaMap?: TextureData
  /** Alpha-test cutoff when `alphaMap` is set. Default 0.5. */
  alphaTest?: number
}

/** Convenience identity helper for authoring materials inline with defaults documented. */
export function material(m: Material): Material {
  return m
}

/** A vertex-colored, faceted material — the default for the stylized generators. */
export const VERTEX_COLOR_MATERIAL: Material = { vertexColors: true, flatShading: true }
