import * as THREE from 'three'
import { Mesh } from '../core/mesh'
import { weld } from './weld'
import type { Vec3 } from '../core/types'

// Face-region operations (inset / extrude / bevel infrastructure). These treat a mesh as
// a set of *coplanar connected face groups* — so a box side (two triangles) is one quad
// face, a cylinder cap one n-gon — rather than raw triangle soup, matching what you'd
// expect operating on flat faces in a DCC. Faces are assumed convex (fan-triangulated).

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }

interface Face {
  normal: Vec3
  centroid: Vec3
  /** Ordered boundary vertex indices (into the welded position list). */
  loop: number[]
  /** Triangles (vertex-index triples) making up the face. */
  tris: [number, number, number][]
}

export interface FaceFilter {
  /** Keep a face only if this returns true. Receives the face normal and centroid. */
  only?: (normal: Vec3, centroid: Vec3) => boolean
}

/** Group a welded mesh into coplanar connected faces with ordered boundary loops. */
function extractFaces(geo: THREE.BufferGeometry, angleTol = 0.087): { faces: Face[]; pos: (i: number) => Vec3 } {
  const posAttr = geo.getAttribute('position')
  const index = geo.getIndex()!
  const triCount = index.count / 3
  const pos = (i: number): Vec3 => [posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)]
  const tri = (t: number): [number, number, number] => [index.getX(t * 3), index.getX(t * 3 + 1), index.getX(t * 3 + 2)]

  const triNormal = (t: number): Vec3 => {
    const [a, b, c] = tri(t)
    return norm(cross(sub(pos(b), pos(a)), sub(pos(c), pos(a))))
  }
  const normals: Vec3[] = []
  for (let t = 0; t < triCount; t++) normals.push(triNormal(t))

  // Edge → triangles using it.
  const ekey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`)
  const edgeTris = new Map<string, number[]>()
  for (let t = 0; t < triCount; t++) {
    const [a, b, c] = tri(t)
    for (const [u, v] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      const k = ekey(u, v)
      ;(edgeTris.get(k) ?? edgeTris.set(k, []).get(k)!).push(t)
    }
  }

  // Union coplanar adjacent triangles.
  const parent = new Int32Array(triCount).map((_, i) => i)
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] } return i }
  const cosTol = Math.cos(angleTol)
  for (const tris of edgeTris.values()) {
    if (tris.length === 2 && dot(normals[tris[0]], normals[tris[1]]) > cosTol) {
      parent[find(tris[0])] = find(tris[1])
    }
  }

  const groups = new Map<number, number[]>()
  for (let t = 0; t < triCount; t++) {
    const r = find(t)
    ;(groups.get(r) ?? groups.set(r, []).get(r)!).push(t)
  }

  const faces: Face[] = []
  for (const groupTris of groups.values()) {
    // Boundary = undirected edges used by exactly one triangle in the group.
    const count = new Map<string, number>()
    for (const t of groupTris) {
      const [a, b, c] = tri(t)
      for (const [u, v] of [[a, b], [b, c], [c, a]] as [number, number][]) {
        const k = ekey(u, v); count.set(k, (count.get(k) ?? 0) + 1)
      }
    }
    const nextOf = new Map<number, number>()
    for (const t of groupTris) {
      const [a, b, c] = tri(t)
      for (const [u, v] of [[a, b], [b, c], [c, a]] as [number, number][]) {
        if (count.get(ekey(u, v)) === 1) nextOf.set(u, v) // directed (winding-consistent)
      }
    }
    if (nextOf.size === 0) continue
    const start = nextOf.keys().next().value as number
    const loop: number[] = [start]
    let cur = nextOf.get(start)!
    let guard = 0
    while (cur !== start && guard++ < nextOf.size + 1) { loop.push(cur); cur = nextOf.get(cur)! }

    let n: Vec3 = [0, 0, 0]
    for (const t of groupTris) n = add(n, normals[t])
    const normal = norm(n)
    let centroid: Vec3 = [0, 0, 0]
    for (const v of loop) centroid = add(centroid, pos(v))
    centroid = scale(centroid, 1 / loop.length)

    faces.push({ normal, centroid, loop, tris: groupTris.map(tri) })
  }

  return { faces, pos }
}

/** Inward (toward the face interior) offset direction at each loop vertex, in the face plane. */
function inwardDirs(face: Face, pos: (i: number) => Vec3): Vec3[] {
  const { loop, normal, centroid } = face
  const n = loop.length
  const edgeIn = (a: Vec3, b: Vec3): Vec3 => {
    let d = norm(cross(normal, norm(sub(b, a))))
    if (dot(d, sub(centroid, a)) < 0) d = scale(d, -1)
    return d
  }
  const dirs: Vec3[] = []
  for (let i = 0; i < n; i++) {
    const prev = pos(loop[(i - 1 + n) % n]), cur = pos(loop[i]), next = pos(loop[(i + 1) % n])
    dirs.push(norm(add(edgeIn(prev, cur), edgeIn(cur, next))))
  }
  return dirs
}

/** Build a Mesh from a list of triangles (each three Vec3 positions). Color attribute optional. */
function meshFromTris(tris: Vec3[][], colors?: Vec3[][]): Mesh {
  const positions: number[] = []
  const cols: number[] = []
  for (let t = 0; t < tris.length; t++) {
    for (let k = 0; k < 3; k++) {
      positions.push(tris[t][k][0], tris[t][k][1], tris[t][k][2])
      if (colors) cols.push(colors[t][k][0], colors[t][k][1], colors[t][k][2])
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  if (colors) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3))
  geo.computeVertexNormals()
  return new Mesh(geo)
}

export interface ExtrudeOptions extends FaceFilter {
  /** Distance to push faces along their normal. */
  distance: number
}

/** Push coplanar faces out along their normals, adding side walls — the Extrude modifier. */
export function extrudeFaces(mesh: Mesh, options: ExtrudeOptions): Mesh {
  const welded = weld(mesh)
  const { faces, pos } = extractFaces(welded.geometry)
  const out: Vec3[][] = []

  for (const face of faces) {
    const selected = !options.only || options.only(face.normal, face.centroid)
    if (!selected) {
      for (const [a, b, c] of face.tris) out.push([pos(a), pos(b), pos(c)])
      continue
    }
    const off = scale(face.normal, options.distance)
    const top = (i: number) => add(pos(i), off)
    // Top (moved) faces.
    for (const [a, b, c] of face.tris) out.push([top(a), top(b), top(c)])
    // Side walls along the boundary loop (wound outward).
    const loop = face.loop
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length]
      out.push([pos(a), top(b), pos(b)])
      out.push([pos(a), top(a), top(b)])
    }
  }
  return meshFromTris(out)
}

export interface InsetOptions extends FaceFilter {
  /** How far to shrink each face inward (in its plane). */
  amount: number
  /** Optional push of the inset face along the normal (negative = recess). Default 0. */
  depth?: number
}

/** Shrink coplanar faces inward, adding a border ring (optionally pushed in/out) — the Inset modifier. */
export function insetFaces(mesh: Mesh, options: InsetOptions): Mesh {
  const depth = options.depth ?? 0
  const welded = weld(mesh)
  const { faces, pos } = extractFaces(welded.geometry)
  const out: Vec3[][] = []

  for (const face of faces) {
    const selected = !options.only || options.only(face.normal, face.centroid)
    if (!selected) {
      for (const [a, b, c] of face.tris) out.push([pos(a), pos(b), pos(c)])
      continue
    }
    const loop = face.loop
    const dirs = inwardDirs(face, pos)
    const off = scale(face.normal, depth)
    const inner: Vec3[] = loop.map((v, i) => add(add(pos(v), scale(dirs[i], options.amount)), off))
    // Border ring: original edge → inset edge.
    for (let i = 0; i < loop.length; i++) {
      const j = (i + 1) % loop.length
      out.push([pos(loop[i]), pos(loop[j]), inner[j]])
      out.push([pos(loop[i]), inner[j], inner[i]])
    }
    // Inner face: fan-triangulate the inset loop from its centroid.
    let c: Vec3 = [0, 0, 0]
    for (const p of inner) c = add(c, p)
    c = scale(c, 1 / inner.length)
    for (let i = 0; i < inner.length; i++) out.push([c, inner[i], inner[(i + 1) % inner.length]])
  }
  return meshFromTris(out)
}

/** Flip triangle windings so their normals point away from a centre (correct for convex meshes). */
function orientOutward(tris: Vec3[][]): void {
  let c: Vec3 = [0, 0, 0], n = 0
  for (const t of tris) for (const v of t) { c = add(c, v); n++ }
  c = scale(c, 1 / n)
  for (const t of tris) {
    const triC = scale(add(add(t[0], t[1]), t[2]), 1 / 3)
    const nrm = cross(sub(t[1], t[0]), sub(t[2], t[0]))
    if (dot(nrm, sub(triC, c)) < 0) { const tmp = t[1]; t[1] = t[2]; t[2] = tmp }
  }
}

export interface BevelOptions {
  /** Chamfer width (how far each face shrinks; edges/corners fill the gap). */
  amount: number
}

/**
 * Chamfer the edges of a (convex) mesh: shrink every face inward by `amount`, then bridge
 * the gaps along edges and fill the corners — the single-segment Bevel modifier. Best on
 * hard-surface primitives (boxes, cylinders); softens razor-sharp low-poly edges.
 */
export function bevel(mesh: Mesh, options: BevelOptions): Mesh {
  const amount = options.amount
  const welded = weld(mesh)
  const { faces, pos } = extractFaces(welded.geometry)
  const out: Vec3[][] = []

  const vertexCorners = new Map<number, Vec3[]>()
  const edgeData = new Map<string, { a: number; b: number; ia: Vec3; ib: Vec3 }[]>()
  const ekey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`)

  for (const face of faces) {
    const dirs = inwardDirs(face, pos)
    const inset = face.loop.map((v, i) => add(pos(v), scale(dirs[i], amount)))
    // Shrunken face.
    let c: Vec3 = [0, 0, 0]
    for (const p of inset) c = add(c, p)
    c = scale(c, 1 / inset.length)
    for (let i = 0; i < inset.length; i++) out.push([c, inset[i], inset[(i + 1) % inset.length]])
    // Record corner + edge data for bridging.
    for (let i = 0; i < face.loop.length; i++) {
      const v = face.loop[i]
      ;(vertexCorners.get(v) ?? vertexCorners.set(v, []).get(v)!).push(inset[i])
      const a = face.loop[i], b = face.loop[(i + 1) % face.loop.length]
      const k = ekey(a, b)
      ;(edgeData.get(k) ?? edgeData.set(k, []).get(k)!).push({ a, b, ia: inset[i], ib: inset[(i + 1) % face.loop.length] })
    }
  }

  // Edge bevels: bridge the two faces' inset edges along each shared original edge.
  for (const arr of edgeData.values()) {
    if (arr.length !== 2) continue
    const [f1, f2] = arr
    const at = (f: { a: number; b: number; ia: Vec3; ib: Vec3 }, vert: number) => (vert === f.a ? f.ia : f.ib)
    const A = f1.a, B = f1.b
    out.push([at(f1, A), at(f1, B), at(f2, B)])
    out.push([at(f1, A), at(f2, B), at(f2, A)])
  }

  // Corner caps: fill the polygon of inset corners around each original vertex.
  for (const [v, corners] of vertexCorners) {
    if (corners.length < 3) continue
    const center = pos(v)
    let avg: Vec3 = [0, 0, 0]
    for (const p of corners) avg = add(avg, sub(p, center))
    avg = norm(avg)
    const ref: Vec3 = Math.abs(avg[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
    const u = norm(cross(avg, ref)), w = cross(avg, u)
    const ordered = corners
      .map((p) => { const d = sub(p, center); return { p, ang: Math.atan2(dot(d, w), dot(d, u)) } })
      .sort((x, y) => x.ang - y.ang)
      .map((o) => o.p)
    for (let i = 1; i < ordered.length - 1; i++) out.push([ordered[0], ordered[i], ordered[i + 1]])
  }

  orientOutward(out) // windings vary across faces/edges/corners; fix for the convex case
  return meshFromTris(out)
}
