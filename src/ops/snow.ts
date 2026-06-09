import * as THREE from 'three'
import { Mesh } from '../core/mesh'
import { merge } from './merge'
import { parseColor } from '../core/math'
import { UberNoise } from '../noise'
import type { ColorInput } from '../core/types'

export interface SnowOptions {
  /** Vertical thickness of the snow layer. Default 0.06. */
  depth?: number
  /** Max surface slope from horizontal (degrees) that still holds snow. Higher = more coverage. Default 40. */
  minAngle?: number
  /** Snow color. Default a cool off-white. */
  color?: ColorInput
  /** Horizontal overhang outward from the mesh's vertical axis, giving snow a soft lip. Default depth * 0.6. */
  spread?: number
  /** 0..1 — fraction of eligible faces actually covered. < 1 produces patchy, noisy edges. Default 1. */
  coverage?: number
  /** Noise scale for coverage patchiness and color variation. Default 2. */
  noiseScale?: number
  /** Random brightness variation of the snow color. Default 0.04. */
  colorVariation?: number
  /** Seed for the coverage/color noise. Default 0. */
  seed?: number
  /** [x, z] axis the snow spreads away from. Defaults to the mesh's bounding-box center. */
  center?: [number, number]
  /** If false, return only the snow shell instead of merging it onto the input mesh. Default true. */
  merge?: boolean
}

/**
 * Lay a layer of snow with real thickness on the upward-facing surfaces of a mesh.
 *
 * Unlike painting snow as a face color, this builds geometry: a raised "blanket" over
 * the snow-receiving faces plus skirt walls around its edges, so the snow reads as a
 * solid layer sitting on top of branches, canopies, rocks, roofs, etc.
 */
export function snow(mesh: Mesh, options: SnowOptions = {}): Mesh {
  const depth = options.depth ?? 0.06
  const minAngle = options.minAngle ?? 40
  const spread = options.spread ?? depth * 0.6
  const coverage = options.coverage ?? 1
  const noiseScale = options.noiseScale ?? 2
  const colorVariation = options.colorVariation ?? 0.04
  const seed = options.seed ?? 0
  const threshold = Math.cos((minAngle * Math.PI) / 180)
  const snowColor = parseColor(options.color ?? '#eef0f5')

  let geo = mesh.geometry
  geo = geo.getIndex() ? geo.toNonIndexed() : geo.clone()
  const pos = geo.getAttribute('position')
  const faceCount = pos.count / 3

  // Axis the snow spreads away from (for the overhang lip + skirt orientation).
  let cx = 0
  let cz = 0
  if (options.center) {
    cx = options.center[0]
    cz = options.center[1]
  } else {
    geo.computeBoundingBox()
    const bb = geo.boundingBox!
    cx = (bb.min.x + bb.max.x) / 2
    cz = (bb.min.z + bb.max.z) / 2
  }

  const noise = new UberNoise({ seed, scale: noiseScale })

  const q = (n: number) => Math.round(n * 1e5)
  const edgeKey = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
  ): string => {
    const ka = `${q(ax)},${q(ay)},${q(az)}`
    const kb = `${q(bx)},${q(by)},${q(bz)}`
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
  }

  // Pass 1: classify faces and count edges within the snowy region.
  interface EdgeRec {
    ax: number; ay: number; az: number
    bx: number; by: number; bz: number
    count: number
  }
  const snowyFaces: number[] = []
  const edges = new Map<string, EdgeRec>()

  for (let f = 0; f < faceCount; f++) {
    const i = f * 3
    const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i)
    const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1)
    const cxv = pos.getX(i + 2), cyv = pos.getY(i + 2), czv = pos.getZ(i + 2)

    // Face normal (only the up-component matters for the slope test).
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az
    const e2x = cxv - ax, e2y = cyv - ay, e2z = czv - az
    const nx = e1y * e2z - e1z * e2y
    const ny = e1z * e2x - e1x * e2z
    const nz = e1x * e2y - e1y * e2x
    const nl = Math.hypot(nx, ny, nz) || 1
    if (ny / nl < threshold) continue

    if (coverage < 1) {
      const mx = (ax + bx + cxv) / 3
      const my = (ay + by + cyv) / 3
      const mz = (az + bz + czv) / 3
      const n01 = noise.get(mx, my, mz) * 0.5 + 0.5
      if (n01 > coverage) continue
    }

    snowyFaces.push(f)
    const tri = [[ax, ay, az], [bx, by, bz], [cxv, cyv, czv]]
    for (let k = 0; k < 3; k++) {
      const A = tri[k]
      const B = tri[(k + 1) % 3]
      const key = edgeKey(A[0], A[1], A[2], B[0], B[1], B[2])
      const rec = edges.get(key)
      if (rec) rec.count++
      else edges.set(key, { ax: A[0], ay: A[1], az: A[2], bx: B[0], by: B[1], bz: B[2], count: 1 })
    }
  }

  if (snowyFaces.length === 0) {
    return options.merge === false ? new Mesh(new THREE.BufferGeometry()) : mesh.clone()
  }

  const sp: number[] = []
  const sc: number[] = []

  const raise = (x: number, y: number, z: number): [number, number, number] => {
    let dx = x - cx
    let dz = z - cz
    const dl = Math.hypot(dx, dz)
    if (dl > 1e-6) { dx /= dl; dz /= dl } else { dx = 0; dz = 0 }
    return [x + dx * spread, y + depth, z + dz * spread]
  }
  const pushColor = (mx: number, my: number, mz: number) => {
    const v = noise.get(mx + 10, my + 10, mz + 10) * colorVariation
    sc.push(
      Math.min(1, Math.max(0, snowColor.r + v)),
      Math.min(1, Math.max(0, snowColor.g + v)),
      Math.min(1, Math.max(0, snowColor.b + v)),
    )
  }

  // The raised snow blanket (same winding as the source faces → normals point up).
  for (const f of snowyFaces) {
    const i = f * 3
    const a = raise(pos.getX(i), pos.getY(i), pos.getZ(i))
    const b = raise(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1))
    const c = raise(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2))
    sp.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2])
    const mx = (a[0] + b[0] + c[0]) / 3
    const my = (a[1] + b[1] + c[1]) / 3
    const mz = (a[2] + b[2] + c[2]) / 3
    pushColor(mx, my, mz); pushColor(mx, my, mz); pushColor(mx, my, mz)
  }

  // Skirt walls along the region boundary (edges used by exactly one snowy face).
  for (const rec of edges.values()) {
    if (rec.count !== 1) continue
    const A: [number, number, number] = [rec.ax, rec.ay, rec.az]
    const B: [number, number, number] = [rec.bx, rec.by, rec.bz]
    const Ar = raise(A[0], A[1], A[2])
    const Br = raise(B[0], B[1], B[2])

    // Orient the wall outward (its horizontal normal should point away from center).
    const midx = (A[0] + B[0]) / 2
    const midz = (A[2] + B[2]) / 2
    let ox = midx - cx, oz = midz - cz
    const ol = Math.hypot(ox, oz) || 1
    ox /= ol; oz /= ol
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2]
    const vx = Br[0] - A[0], vy = Br[1] - A[1], vz = Br[2] - A[2]
    const tnx = uy * vz - uz * vy
    const tnz = ux * vy - uy * vx

    if (tnx * ox + tnz * oz >= 0) {
      sp.push(A[0], A[1], A[2], B[0], B[1], B[2], Br[0], Br[1], Br[2])
      sp.push(A[0], A[1], A[2], Br[0], Br[1], Br[2], Ar[0], Ar[1], Ar[2])
    } else {
      sp.push(A[0], A[1], A[2], Br[0], Br[1], Br[2], B[0], B[1], B[2])
      sp.push(A[0], A[1], A[2], Ar[0], Ar[1], Ar[2], Br[0], Br[1], Br[2])
    }
    const mx = (A[0] + B[0]) / 2
    const my = (A[1] + B[1]) / 2 + depth / 2
    const mz = (A[2] + B[2]) / 2
    for (let k = 0; k < 6; k++) pushColor(mx, my, mz)
  }

  const snowGeo = new THREE.BufferGeometry()
  snowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sp), 3))
  snowGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sc), 3))
  snowGeo.computeVertexNormals()
  const snowMesh = new Mesh(snowGeo)

  return options.merge === false ? snowMesh : merge(mesh, snowMesh)
}
