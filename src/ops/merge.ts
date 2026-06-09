import { mergeMeshes } from '../core/geometry-merge'
import type { Mesh } from '../core/mesh'

/** Combine multiple meshes into one (attributes normalized; see `mergeMeshes`). */
export function merge(...meshes: Mesh[]): Mesh {
  return mergeMeshes(meshes)
}
