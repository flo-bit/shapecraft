import * as THREE from 'three'
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Mesh } from '../core/mesh'

export interface DecimateOptions {
  /** Fraction of vertices to KEEP (0–1). Default 0.5. Ignored if `count` is given. */
  ratio?: number
  /** Explicit target vertex count. */
  count?: number
}

/**
 * Reduce a mesh's triangle count via quadric-error edge collapse (Three's
 * SimplifyModifier), preserving the silhouette. Returns position+normal geometry only —
 * baked vertex colors/UVs are dropped, so re-apply procedural coloring afterwards. Ideal
 * for thinning dense isosurfaces (metaballs/surface nets) and for building LODs.
 */
export function decimate(mesh: Mesh, options: DecimateOptions = {}): Mesh {
  const src = mesh.geometry
  const srcPos = src.getAttribute('position')
  if (!srcPos) return mesh.clone()

  // Weld by position only — flat (per-face) normals would otherwise block welding and
  // leave the simplifier with no shared edges to collapse.
  const posGeo = new THREE.BufferGeometry()
  posGeo.setAttribute('position', new THREE.BufferAttribute((srcPos.array as Float32Array).slice(), 3))
  const index = src.getIndex()
  if (index) posGeo.setIndex(new THREE.BufferAttribute((index.array as Uint32Array | Uint16Array).slice(), 1))
  const welded = mergeVertices(posGeo)

  const vcount = welded.getAttribute('position').count
  const target = Math.max(4, Math.min(vcount, options.count ?? Math.floor(vcount * (options.ratio ?? 0.5))))
  const toRemove = vcount - target

  const out = toRemove > 0 ? new SimplifyModifier().modify(welded, toRemove) : welded
  out.computeVertexNormals()
  return new Mesh(out)
}
