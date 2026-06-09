import * as THREE from 'three'
import { Mesh } from '../core/mesh'
import type { Vec3 } from '../core/types'

// --- Naive Surface Nets (dual isosurface extraction), after Mikola Lysenko. ---
// Samples a scalar field on a grid and reconstructs a watertight surface around the
// `inside` region — the right way to mesh an SDF / metaball field (genuine merged
// lobes and necks, not just a bumpy sphere).

const CUBE_EDGES = new Int32Array(24)
const EDGE_TABLE = new Int32Array(256)
;(function initTables() {
  let k = 0
  for (let i = 0; i < 8; i++) {
    for (let j = 1; j <= 4; j <<= 1) {
      const p = i ^ j
      if (i <= p) { CUBE_EDGES[k++] = i; CUBE_EDGES[k++] = p }
    }
  }
  for (let i = 0; i < 256; i++) {
    let em = 0
    for (let j = 0; j < 24; j += 2) {
      const a = !!(i & (1 << CUBE_EDGES[j]))
      const b = !!(i & (1 << CUBE_EDGES[j + 1]))
      em |= a !== b ? (1 << (j >> 1)) : 0
    }
    EDGE_TABLE[i] = em
  }
})()

/** Mesh the zero-isosurface of `data` (inside where data < 0) on a grid of `dims` samples. */
function netsFromVolume(data: Float32Array, dims: [number, number, number]) {
  const vertices: number[][] = []
  const faces: number[][] = []
  const R = [1, dims[0] + 1, (dims[0] + 1) * (dims[1] + 1)]
  const grid = new Float32Array(8)
  let bufNo = 1
  const buffer = new Int32Array(R[2] * 2)
  let n = 0
  const x = [0, 0, 0]

  for (x[2] = 0; x[2] < dims[2] - 1; ++x[2], n += dims[0], bufNo ^= 1, R[2] = -R[2]) {
    let m = 1 + (dims[0] + 1) * (1 + bufNo * (dims[1] + 1))
    for (x[1] = 0; x[1] < dims[1] - 1; ++x[1], ++n, m += 2)
      for (x[0] = 0; x[0] < dims[0] - 1; ++x[0], ++n, ++m) {
        let mask = 0, g = 0, idx = n
        for (let k = 0; k < 2; ++k, idx += dims[0] * (dims[1] - 2))
          for (let j = 0; j < 2; ++j, idx += dims[0] - 2)
            for (let i = 0; i < 2; ++i, ++g, ++idx) {
              const p = data[idx]
              grid[g] = p
              mask |= p < 0 ? 1 << g : 0
            }
        if (mask === 0 || mask === 0xff) continue

        const edgeMask = EDGE_TABLE[mask]
        const v = [0, 0, 0]
        let eCount = 0
        for (let i = 0; i < 12; ++i) {
          if (!(edgeMask & (1 << i))) continue
          const e0 = CUBE_EDGES[i << 1]
          const e1 = CUBE_EDGES[(i << 1) + 1]
          const g0 = grid[e0]
          const g1 = grid[e1]
          let t = g0 - g1
          if (Math.abs(t) > 1e-6) t = g0 / t; else continue
          ++eCount
          for (let j = 0, kk = 1; j < 3; ++j, kk <<= 1) {
            const a = e0 & kk, b = e1 & kk
            if (a !== b) v[j] += a ? 1 - t : t
            else v[j] += a ? 1 : 0
          }
        }
        if (eCount === 0) continue
        const s = 1 / eCount
        v[0] = x[0] + s * v[0]; v[1] = x[1] + s * v[1]; v[2] = x[2] + s * v[2]

        buffer[m] = vertices.length
        vertices.push([v[0], v[1], v[2]])

        for (let i = 0; i < 3; ++i) {
          if (!(edgeMask & (1 << i))) continue
          const iu = (i + 1) % 3, iv = (i + 2) % 3
          if (x[iu] === 0 || x[iv] === 0) continue
          const du = R[iu], dv = R[iv]
          if (mask & 1) faces.push([buffer[m], buffer[m - du], buffer[m - du - dv], buffer[m - dv]])
          else faces.push([buffer[m], buffer[m - dv], buffer[m - du - dv], buffer[m - du]])
        }
      }
  }
  return { vertices, faces }
}

function emptyMesh(): Mesh {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3))
  return new Mesh(g)
}

export interface SurfaceNetsOptions {
  /** Bounding box to sample within. */
  min: Vec3
  max: Vec3
  /** Number of samples along the longest axis (others scaled to keep cubic cells). Default 32. */
  resolution?: number
  /** Isolevel of the field to extract. Default 0. */
  iso?: number
  /** Whether "inside" the surface is where field is below or above the isolevel. Default 'below'. */
  inside?: 'below' | 'above'
}

/**
 * Reconstruct a mesh of the `iso` level-set of an arbitrary scalar field / SDF via
 * surface nets. Returns flat-shaded (non-indexed) triangles — chunky and low-poly at
 * modest resolution, the surface tightening as resolution rises.
 */
export function surfaceNets(field: (x: number, y: number, z: number) => number, options: SurfaceNetsOptions): Mesh {
  const iso = options.iso ?? 0
  const above = options.inside === 'above'
  const [minx, miny, minz] = options.min
  const [maxx, maxy, maxz] = options.max
  const ext = [maxx - minx, maxy - miny, maxz - minz]
  const longest = Math.max(ext[0], ext[1], ext[2]) || 1
  const spacing = longest / (options.resolution ?? 32)
  const dims: [number, number, number] = [
    Math.max(2, Math.ceil(ext[0] / spacing) + 2),
    Math.max(2, Math.ceil(ext[1] / spacing) + 2),
    Math.max(2, Math.ceil(ext[2] / spacing) + 2),
  ]
  const [nx, ny, nz] = dims

  // Sample the field (pad by one cell so the surface never clips the grid edge).
  const ox = minx - spacing, oy = miny - spacing, oz = minz - spacing
  const data = new Float32Array(nx * ny * nz)
  let i = 0
  for (let z = 0; z < nz; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++) {
        const f = field(ox + x * spacing, oy + y * spacing, oz + z * spacing)
        data[i++] = above ? iso - f : f - iso
      }

  const { vertices, faces } = netsFromVolume(data, dims)
  if (faces.length === 0) return emptyMesh()

  const pos: number[] = []
  const wx = (vi: number) => ox + vertices[vi][0] * spacing
  const wy = (vi: number) => oy + vertices[vi][1] * spacing
  const wz = (vi: number) => oz + vertices[vi][2] * spacing
  for (const f of faces) {
    const a = f[0], b = f[1], c = f[2], d = f[3]
    pos.push(wx(a), wy(a), wz(a), wx(b), wy(b), wz(b), wx(c), wy(c), wz(c))
    pos.push(wx(a), wy(a), wz(a), wx(c), wy(c), wz(c), wx(d), wy(d), wz(d))
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  geo.computeVertexNormals()
  return new Mesh(geo)
}

export interface MetaBall {
  center: Vec3
  radius: number
}

export interface MetaballsOptions {
  /** Samples along the longest axis of the bounding box. Default 28. */
  resolution?: number
  /** Field threshold. Lower = balls reach further and merge more. Default 0.5. */
  isolevel?: number
  /** Each ball's influence radius = radius × support. Default 2.2. */
  support?: number
}

/**
 * Build one watertight surface enveloping a set of metaballs — they melt together with
 * smooth necks where they meet, true to the field's topology (unlike a star-convex
 * hull). Uses a smooth finite-support kernel sampled into {@link surfaceNets}.
 */
export function metaballs(balls: MetaBall[], options: MetaballsOptions = {}): Mesh {
  if (balls.length === 0) return emptyMesh()
  const support = options.support ?? 2.2
  const iso = options.isolevel ?? 0.5

  let minx = Infinity, miny = Infinity, minz = Infinity
  let maxx = -Infinity, maxy = -Infinity, maxz = -Infinity
  for (const b of balls) {
    const R = b.radius * support
    minx = Math.min(minx, b.center[0] - R); maxx = Math.max(maxx, b.center[0] + R)
    miny = Math.min(miny, b.center[1] - R); maxy = Math.max(maxy, b.center[1] + R)
    minz = Math.min(minz, b.center[2] - R); maxz = Math.max(maxz, b.center[2] + R)
  }

  const field = (x: number, y: number, z: number): number => {
    let s = 0
    for (const b of balls) {
      const R = b.radius * support
      const dx = x - b.center[0], dy = y - b.center[1], dz = z - b.center[2]
      const d2 = dx * dx + dy * dy + dz * dz
      const R2 = R * R
      if (d2 < R2) {
        const q = 1 - d2 / R2
        s += q * q
      }
    }
    return s
  }

  return surfaceNets(field, {
    min: [minx, miny, minz],
    max: [maxx, maxy, maxz],
    resolution: options.resolution ?? 28,
    iso,
    inside: 'above',
  })
}
