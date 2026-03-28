import * as THREE from 'three'
import { Mesh } from '../core/mesh'
import type { Vec3 } from '../core/types'

export interface LoftOptions {
  /** Points along the path */
  path: Vec3[]
  /** Cross-section shape as 2D points, OR a function of t (0-1 along path) returning the shape */
  shape: [number, number][] | ((t: number) => [number, number][])
  /** Whether to close the ends with caps */
  closed?: boolean
  /** Whether the cross-section shape loops back to the first point (default true) */
  closedShape?: boolean
  /** Reference up direction for orienting the cross-section (default: auto) */
  up?: Vec3
}

/**
 * Create a mesh by sweeping a 2D cross-section along a 3D path.
 * The cross-section is oriented to face along the path direction at each point.
 */
export function loft(options: LoftOptions): Mesh {
  const { path, shape, closed = true, closedShape = true, up } = options
  const pathLen = path.length
  const shapeFn = typeof shape === 'function' ? shape : () => shape
  const firstShape = shapeFn(0)
  const shapeLen = firstShape.length

  if (pathLen < 2) throw new Error('Loft path needs at least 2 points')
  if (shapeLen < 2) throw new Error('Loft shape needs at least 2 points')

  const positions: number[] = []
  const indices: number[] = []

  // Compute tangent, normal, binormal frames along the path
  const frames = computeFrames(path, up)

  // Generate vertices: for each path point, place the shape in the local frame
  for (let i = 0; i < pathLen; i++) {
    const t = i / (pathLen - 1)
    const [px, py, pz] = path[i]
    const { normal, binormal } = frames[i]
    const currentShape = shapeFn(t)

    for (let j = 0; j < shapeLen; j++) {
      const [sx, sy] = currentShape[j]
      positions.push(
        px + normal[0] * sx + binormal[0] * sy,
        py + normal[1] * sx + binormal[1] * sy,
        pz + normal[2] * sx + binormal[2] * sy,
      )
    }
  }

  // Generate faces connecting adjacent rings
  const edgeCount = closedShape ? shapeLen : shapeLen - 1
  for (let i = 0; i < pathLen - 1; i++) {
    for (let j = 0; j < edgeCount; j++) {
      const j2 = (j + 1) % shapeLen
      const a = i * shapeLen + j
      const b = i * shapeLen + j2
      const c = (i + 1) * shapeLen + j2
      const d = (i + 1) * shapeLen + j
      indices.push(a, b, c)
      indices.push(a, c, d)
    }
  }

  // Caps
  if (closed) {
    // Start cap
    const startCenter = positions.length / 3
    const [sx, sy, sz] = path[0]
    positions.push(sx, sy, sz)
    for (let j = 0; j < shapeLen; j++) {
      const j2 = (j + 1) % shapeLen
      indices.push(startCenter, j2, j)
    }

    // End cap
    const endCenter = positions.length / 3
    const [ex, ey, ez] = path[pathLen - 1]
    positions.push(ex, ey, ez)
    const endOffset = (pathLen - 1) * shapeLen
    for (let j = 0; j < shapeLen; j++) {
      const j2 = (j + 1) % shapeLen
      indices.push(endCenter, endOffset + j, endOffset + j2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return new Mesh(geo)
}

/**
 * Simple loft variant: sweep a radius along a path to make a tube/branch shape.
 * radiusFn maps t (0-1 along path) to radius at that point.
 */
export function tube(path: Vec3[], radiusFn: number | ((t: number) => number), segments: number = 6): Mesh {
  const rFn = typeof radiusFn === 'number' ? () => radiusFn : radiusFn

  // Generate circle cross-sections at each path point
  const pathLen = path.length
  const frames = computeFrames(path)
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i < pathLen; i++) {
    const t = i / (pathLen - 1)
    const r = rFn(t)
    const [px, py, pz] = path[i]
    const { normal, binormal } = frames[i]

    for (let j = 0; j < segments; j++) {
      const angle = (j / segments) * Math.PI * 2
      const cos = Math.cos(angle) * r
      const sin = Math.sin(angle) * r
      positions.push(
        px + normal[0] * cos + binormal[0] * sin,
        py + normal[1] * cos + binormal[1] * sin,
        pz + normal[2] * cos + binormal[2] * sin,
      )
    }
  }

  for (let i = 0; i < pathLen - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const j2 = (j + 1) % segments
      const a = i * segments + j
      const b = i * segments + j2
      const c = (i + 1) * segments + j2
      const d = (i + 1) * segments + j
      indices.push(a, b, c)
      indices.push(a, c, d)
    }
  }

  // Caps
  const startCenter = positions.length / 3
  positions.push(path[0][0], path[0][1], path[0][2])
  for (let j = 0; j < segments; j++) {
    indices.push(startCenter, (j + 1) % segments, j)
  }

  const endCenter = positions.length / 3
  positions.push(path[pathLen - 1][0], path[pathLen - 1][1], path[pathLen - 1][2])
  const endOff = (pathLen - 1) * segments
  for (let j = 0; j < segments; j++) {
    indices.push(endCenter, endOff + j, endOff + (j + 1) % segments)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return new Mesh(geo)
}

// --- Frame computation (rotation minimizing frames) ---

interface Frame {
  tangent: Vec3
  normal: Vec3
  binormal: Vec3
}

function computeFrames(path: Vec3[], up?: Vec3): Frame[] {
  const frames: Frame[] = []

  // Compute tangents
  const tangents: Vec3[] = []
  for (let i = 0; i < path.length; i++) {
    let tx: number, ty: number, tz: number
    if (i === 0) {
      tx = path[1][0] - path[0][0]
      ty = path[1][1] - path[0][1]
      tz = path[1][2] - path[0][2]
    } else if (i === path.length - 1) {
      tx = path[i][0] - path[i - 1][0]
      ty = path[i][1] - path[i - 1][1]
      tz = path[i][2] - path[i - 1][2]
    } else {
      tx = path[i + 1][0] - path[i - 1][0]
      ty = path[i + 1][1] - path[i - 1][1]
      tz = path[i + 1][2] - path[i - 1][2]
    }
    const len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1
    tangents.push([tx / len, ty / len, tz / len])
  }

  if (up) {
    // Fixed up vector: derive consistent frames at every point
    for (let i = 0; i < path.length; i++) {
      const t = tangents[i]
      // normal = cross(up, tangent), binormal = cross(tangent, normal)
      let n = normalize(cross(up, t))
      // If tangent is parallel to up, fall back
      const nLen = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2])
      if (nLen < 0.001) {
        n = normalize(cross([1, 0, 0], t))
      }
      const b = cross(t, n)
      frames.push({ tangent: t, normal: n, binormal: b })
    }
  } else {
    // Rotation minimizing frames
    const t0 = tangents[0]
    let initNormal: Vec3
    if (Math.abs(t0[0]) < 0.9) {
      initNormal = normalize(cross([1, 0, 0], t0))
    } else {
      initNormal = normalize(cross([0, 1, 0], t0))
    }
    let prevNormal = initNormal

    for (let i = 0; i < path.length; i++) {
      const t = tangents[i]
      const dot = prevNormal[0] * t[0] + prevNormal[1] * t[1] + prevNormal[2] * t[2]
      let n: Vec3 = [
        prevNormal[0] - dot * t[0],
        prevNormal[1] - dot * t[1],
        prevNormal[2] - dot * t[2],
      ]
      n = normalize(n)
      const b = cross(t, n)
      frames.push({ tangent: t, normal: n, binormal: b })
      prevNormal = n
    }
  }

  return frames
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1
  return [v[0] / len, v[1] / len, v[2] / len]
}
