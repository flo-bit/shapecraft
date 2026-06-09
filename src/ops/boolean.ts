import * as THREE from 'three'
import { Evaluator, Brush, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg'
import { Mesh } from '../core/mesh'

// Constructive solid geometry via three-bvh-csg (BVH-accelerated, robust). Carries
// position/normal/color through cuts so baked vertex colors survive.

const evaluator = new Evaluator()
evaluator.attributes = ['position', 'normal', 'color']
evaluator.useGroups = false

/** three-bvh-csg requires both operands to share the same attribute set. */
function prep(mesh: Mesh): THREE.BufferGeometry {
  let geo = mesh.geometry.clone()
  if (geo.getIndex()) geo = geo.toNonIndexed()
  if (!geo.getAttribute('normal')) geo.computeVertexNormals()
  if (!geo.getAttribute('color')) {
    const colors = new Float32Array(geo.getAttribute('position').count * 3)
    colors.fill(1)
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }
  return geo
}

export type BooleanOp = 'union' | 'subtract' | 'intersect'

/** Combine two meshes with a constructive-solid-geometry operation. */
export function boolean(a: Mesh, b: Mesh, op: BooleanOp): Mesh {
  const brushA = new Brush(prep(a))
  brushA.updateMatrixWorld()
  const brushB = new Brush(prep(b))
  brushB.updateMatrixWorld()

  const csgOp = op === 'union' ? ADDITION : op === 'subtract' ? SUBTRACTION : INTERSECTION
  const result = evaluator.evaluate(brushA, brushB, csgOp)
  return new Mesh((result.geometry as THREE.BufferGeometry).clone())
}

/** Boolean union — the outer shell of both volumes. */
export function union(a: Mesh, b: Mesh): Mesh { return boolean(a, b, 'union') }
/** Boolean difference — `a` with `b` carved out of it. */
export function subtract(a: Mesh, b: Mesh): Mesh { return boolean(a, b, 'subtract') }
/** Boolean intersection — only the volume shared by both. */
export function intersect(a: Mesh, b: Mesh): Mesh { return boolean(a, b, 'intersect') }
