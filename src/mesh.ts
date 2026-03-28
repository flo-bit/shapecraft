import * as THREE from 'three'
import type { Vec2, Vec3, ColorInput, ColorFn, DisplaceFn, WarpFn, NoiseLike } from './types'
import { makeRotation, parseColor } from './math'

function cloneGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  return geometry.clone()
}

function fract(x: number): number {
  return x - Math.floor(x)
}

export class Mesh {
  readonly geometry: THREE.BufferGeometry

  constructor(geometry: THREE.BufferGeometry) {
    this.geometry = geometry
  }

  // --- Accessors ---

  get positions(): Float32Array {
    return this.geometry.getAttribute('position').array as Float32Array
  }

  get indices(): Uint32Array | Uint16Array | null {
    const index = this.geometry.getIndex()
    return index ? (index.array as Uint32Array | Uint16Array) : null
  }

  get normals(): Float32Array | null {
    const attr = this.geometry.getAttribute('normal')
    return attr ? (attr.array as Float32Array) : null
  }

  get uvs(): Float32Array | null {
    const attr = this.geometry.getAttribute('uv')
    return attr ? (attr.array as Float32Array) : null
  }

  get colors(): Float32Array | null {
    const attr = this.geometry.getAttribute('color')
    return attr ? (attr.array as Float32Array) : null
  }

  get vertexCount(): number {
    return this.geometry.getAttribute('position').count
  }

  get faceCount(): number {
    const index = this.geometry.getIndex()
    if (index) return index.count / 3
    return this.vertexCount / 3
  }

  get boundingBox(): THREE.Box3 {
    this.geometry.computeBoundingBox()
    return this.geometry.boundingBox!
  }

  // --- Transforms ---

  translate(x: number, y: number, z: number): Mesh {
    const geo = cloneGeometry(this.geometry)
    geo.translate(x, y, z)
    return new Mesh(geo)
  }

  rotate(axis: Vec3 | 'x' | 'y' | 'z', angle: number): Mesh {
    const geo = cloneGeometry(this.geometry)
    geo.applyMatrix4(makeRotation(axis, angle))
    return new Mesh(geo)
  }

  rotateX(angle: number): Mesh {
    return this.rotate('x', angle)
  }

  rotateY(angle: number): Mesh {
    return this.rotate('y', angle)
  }

  rotateZ(angle: number): Mesh {
    return this.rotate('z', angle)
  }

  scale(x: number, y?: number, z?: number): Mesh {
    const geo = cloneGeometry(this.geometry)
    geo.scale(x, y ?? x, z ?? x)
    return new Mesh(geo)
  }

  transform(matrix: THREE.Matrix4): Mesh {
    const geo = cloneGeometry(this.geometry)
    geo.applyMatrix4(matrix)
    return new Mesh(geo)
  }

  // --- Modifiers ---

  displace(fn: DisplaceFn): Mesh {
    const geo = cloneGeometry(this.geometry)
    const pos = geo.getAttribute('position')
    const norm = geo.getAttribute('normal')
    const uvAttr = geo.getAttribute('uv')

    if (!norm) {
      geo.computeVertexNormals()
    }
    const normals = geo.getAttribute('normal')

    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i)
      const nx = normals.getX(i), ny = normals.getY(i), nz = normals.getZ(i)
      const uv: Vec2 | null = uvAttr ? [uvAttr.getX(i), uvAttr.getY(i)] : null
      const amount = fn([px, py, pz], [nx, ny, nz], uv, i)
      pos.setXYZ(i, px + nx * amount, py + ny * amount, pz + nz * amount)
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()
    return new Mesh(geo)
  }

  displaceNoise(noise: NoiseLike, amplitude: number = 1): Mesh {
    return this.displace((pos) => {
      return noise.get(pos[0], pos[1], pos[2]) * amplitude
    })
  }

  warp(fn: WarpFn): Mesh {
    const geo = cloneGeometry(this.geometry)
    const pos = geo.getAttribute('position')

    for (let i = 0; i < pos.count; i++) {
      const result = fn([pos.getX(i), pos.getY(i), pos.getZ(i)], i)
      pos.setXYZ(i, result[0], result[1], result[2])
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()
    return new Mesh(geo)
  }

  /**
   * Offset each vertex by a random amount. Deterministic: same seed + same geometry = same result.
   * Vertices at the same position get the same offset (preserving watertight meshes).
   */
  jitter(amount: number, options?: { seed?: number }): Mesh {
    const geo = cloneGeometry(this.geometry)
    const pos = geo.getAttribute('position')
    const seed = options?.seed ?? 0

    // Build cache: same position → same offset. Key = quantized position string.
    const cache = new Map<string, [number, number, number]>()
    // Seeded PRNG (simple LCG)
    let s = (seed * 2654435761 + 1) >>> 0 || 1
    function rand(): number {
      s = (s * 16807 + 0) % 2147483647
      return ((s & 0x7fffffff) / 2147483647) * 2 - 1
    }

    // Quantize to avoid floating-point key mismatches (6 decimal places)
    function key(x: number, y: number, z: number): string {
      return `${Math.round(x * 1e6)}:${Math.round(y * 1e6)}:${Math.round(z * 1e6)}`
    }

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const k = key(x, y, z)
      let offset = cache.get(k)
      if (!offset) {
        offset = [rand() * amount, rand() * amount, rand() * amount]
        cache.set(k, offset)
      }
      pos.setXYZ(i, x + offset[0], y + offset[1], z + offset[2])
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()
    return new Mesh(geo)
  }

  subdivide(iterations: number = 1): Mesh {
    let geo = cloneGeometry(this.geometry)
    for (let iter = 0; iter < iterations; iter++) {
      geo = subdivideGeometry(geo)
    }
    geo.computeVertexNormals()
    return new Mesh(geo)
  }

  /**
   * Adaptively subdivide so no triangle edge exceeds maxEdgeLength.
   * mode 'quad' splits into 4 (all midpoints), 'bisect' splits into 2 (longest edge midpoint to opposite corner).
   * maxIterations caps the number of passes to prevent runaway subdivision.
   */
  subdivideAdaptive(maxEdgeLength: number, options?: {
    mode?: 'quad' | 'bisect'
    maxIterations?: number
  }): Mesh {
    const mode = options?.mode ?? 'bisect'
    const maxIter = options?.maxIterations ?? 20
    let geo = cloneGeometry(this.geometry)
    if (geo.getIndex()) geo = geo.toNonIndexed()

    for (let iter = 0; iter < maxIter; iter++) {
      const result = adaptiveSubdividePass(geo, maxEdgeLength, mode)
      if (!result.changed) break
      geo = result.geometry
    }

    geo.computeVertexNormals()
    return new Mesh(geo)
  }

  computeNormals(): Mesh {
    const geo = cloneGeometry(this.geometry)
    geo.computeVertexNormals()
    return new Mesh(geo)
  }

  // --- Coloring ---

  vertexColor(color: ColorInput | ColorFn): Mesh {
    const geo = cloneGeometry(this.geometry)
    const pos = geo.getAttribute('position')
    const norm = geo.getAttribute('normal')
    const colors = new Float32Array(pos.count * 3)

    if (typeof color === 'function') {
      if (!norm) geo.computeVertexNormals()
      const normals = geo.getAttribute('normal')
      for (let i = 0; i < pos.count; i++) {
        const c = parseColor((color as ColorFn)(
          [pos.getX(i), pos.getY(i), pos.getZ(i)],
          [normals.getX(i), normals.getY(i), normals.getZ(i)],
          i
        ))
        colors[i * 3] = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
      }
    } else {
      const c = parseColor(color)
      for (let i = 0; i < pos.count; i++) {
        colors[i * 3] = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return new Mesh(geo)
  }

  faceColor(fn: (centroid: Vec3, normal: Vec3, faceIndex: number) => ColorInput): Mesh {
    let geo = cloneGeometry(this.geometry)
    if (geo.getIndex()) {
      geo = geo.toNonIndexed()
    }
    const pos = geo.getAttribute('position')
    const colors = new Float32Array(pos.count * 3)

    for (let f = 0; f < pos.count / 3; f++) {
      const i = f * 3
      const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i)
      const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1)
      const cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2)

      const centroid: Vec3 = [(ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3]

      // compute face normal
      const edge1 = new THREE.Vector3(bx - ax, by - ay, bz - az)
      const edge2 = new THREE.Vector3(cx - ax, cy - ay, cz - az)
      const faceNormal = edge1.cross(edge2).normalize()
      const normal: Vec3 = [faceNormal.x, faceNormal.y, faceNormal.z]

      const c = parseColor(fn(centroid, normal, f))
      for (let v = 0; v < 3; v++) {
        colors[(i + v) * 3] = c.r
        colors[(i + v) * 3 + 1] = c.g
        colors[(i + v) * 3 + 2] = c.b
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return new Mesh(geo)
  }

  // --- UV ---

  computeUVs(projection: 'box' | 'planar' | 'cylindrical' | 'spherical' = 'box'): Mesh {
    const geo = cloneGeometry(this.geometry)
    projectUVsOnGeometry(geo, projection)
    return new Mesh(geo)
  }

  // --- Utility ---

  center(): Mesh {
    const geo = cloneGeometry(this.geometry)
    geo.computeBoundingBox()
    const center = new THREE.Vector3()
    geo.boundingBox!.getCenter(center)
    geo.translate(-center.x, -center.y, -center.z)
    return new Mesh(geo)
  }

  clone(): Mesh {
    return new Mesh(cloneGeometry(this.geometry))
  }

  // --- Serialization ---

  serialize(): ArrayBuffer {
    const attributes: Array<{ name: string; itemSize: number; array: Float32Array }> = []
    const geo = this.geometry

    for (const name of Object.keys(geo.attributes)) {
      const attr = geo.getAttribute(name)
      attributes.push({ name, itemSize: attr.itemSize, array: attr.array as Float32Array })
    }

    const index = geo.getIndex()

    // Header: [attrCount, hasIndex, ...for each attr: nameLen, name bytes, itemSize, arrayLen, array data]
    // Simple JSON header + binary data approach
    const header = JSON.stringify({
      attributes: attributes.map(a => ({ name: a.name, itemSize: a.itemSize, length: a.array.length })),
      index: index ? { count: index.count } : null,
    })

    const headerBytes = new TextEncoder().encode(header)
    // Pad header to 4-byte alignment for typed array views
    const headerPadded = headerBytes.length + ((4 - (headerBytes.length % 4)) % 4)
    let totalSize = 4 + headerPadded

    for (const attr of attributes) {
      totalSize += attr.array.byteLength
    }
    if (index) {
      totalSize += index.count * 4 // always store as Uint32
    }

    const buffer = new ArrayBuffer(totalSize)
    const view = new DataView(buffer)
    let offset = 0

    // Write header length
    view.setUint32(offset, headerBytes.length)
    offset += 4

    // Write header
    new Uint8Array(buffer, offset, headerBytes.length).set(headerBytes)
    offset += headerPadded // skip past padding

    // Write attribute data
    for (const attr of attributes) {
      new Float32Array(buffer, offset, attr.array.length).set(attr.array)
      offset += attr.array.byteLength
    }

    // Write index data (always as Uint32)
    if (index) {
      const idx32 = new Uint32Array(buffer, offset, index.count)
      for (let i = 0; i < index.count; i++) {
        idx32[i] = index.array[i]
      }
    }

    return buffer
  }

  static deserialize(buffer: ArrayBuffer): Mesh {
    const view = new DataView(buffer)
    let offset = 0

    const headerLength = view.getUint32(offset)
    offset += 4

    const headerBytes = new Uint8Array(buffer, offset, headerLength)
    const header = JSON.parse(new TextDecoder().decode(headerBytes))
    const headerPadded = headerLength + ((4 - (headerLength % 4)) % 4)
    offset += headerPadded

    const geo = new THREE.BufferGeometry()

    for (const attrInfo of header.attributes) {
      const array = new Float32Array(buffer, offset, attrInfo.length)
      geo.setAttribute(attrInfo.name, new THREE.BufferAttribute(new Float32Array(array), attrInfo.itemSize))
      offset += attrInfo.length * 4
    }

    if (header.index) {
      const array = new Uint32Array(buffer, offset, header.index.count)
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(array), 1))
    }

    return new Mesh(geo)
  }
}

// --- Internal helpers ---

function subdivideGeometry(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  // Midpoint subdivision: split each triangle into 4
  let nonIndexed = geo.getIndex() ? geo.toNonIndexed() : geo.clone()
  const pos = nonIndexed.getAttribute('position')
  const vertCount = pos.count
  const triCount = vertCount / 3

  const newPositions: number[] = []
  const newNormals: number[] = []
  const hasUVs = !!nonIndexed.getAttribute('uv')
  const newUVs: number[] = []
  const hasColors = !!nonIndexed.getAttribute('color')
  const newColors: number[] = []
  const normAttr = nonIndexed.getAttribute('normal')
  const uvAttr = nonIndexed.getAttribute('uv')
  const colorAttr = nonIndexed.getAttribute('color')

  for (let t = 0; t < triCount; t++) {
    const i = t * 3
    const a = [pos.getX(i), pos.getY(i), pos.getZ(i)]
    const b = [pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)]
    const c = [pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2)]

    const ab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
    const bc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2, (b[2] + c[2]) / 2]
    const ca = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2, (c[2] + a[2]) / 2]

    // 4 triangles: (a, ab, ca), (ab, b, bc), (ca, bc, c), (ab, bc, ca)
    const tris = [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]
    for (const tri of tris) {
      for (const v of tri) {
        newPositions.push(v[0], v[1], v[2])
      }
    }

    if (normAttr) {
      const na = [normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i)]
      const nb = [normAttr.getX(i + 1), normAttr.getY(i + 1), normAttr.getZ(i + 1)]
      const nc = [normAttr.getX(i + 2), normAttr.getY(i + 2), normAttr.getZ(i + 2)]
      const nab = [(na[0] + nb[0]) / 2, (na[1] + nb[1]) / 2, (na[2] + nb[2]) / 2]
      const nbc = [(nb[0] + nc[0]) / 2, (nb[1] + nc[1]) / 2, (nb[2] + nc[2]) / 2]
      const nca = [(nc[0] + na[0]) / 2, (nc[1] + na[1]) / 2, (nc[2] + na[2]) / 2]
      const ntris = [[na, nab, nca], [nab, nb, nbc], [nca, nbc, nc], [nab, nbc, nca]]
      for (const tri of ntris) {
        for (const v of tri) newNormals.push(v[0], v[1], v[2])
      }
    }

    if (hasUVs && uvAttr) {
      const ua = [uvAttr.getX(i), uvAttr.getY(i)]
      const ub = [uvAttr.getX(i + 1), uvAttr.getY(i + 1)]
      const uc = [uvAttr.getX(i + 2), uvAttr.getY(i + 2)]
      const uab = [(ua[0] + ub[0]) / 2, (ua[1] + ub[1]) / 2]
      const ubc = [(ub[0] + uc[0]) / 2, (ub[1] + uc[1]) / 2]
      const uca = [(uc[0] + ua[0]) / 2, (uc[1] + ua[1]) / 2]
      const utris = [[ua, uab, uca], [uab, ub, ubc], [uca, ubc, uc], [uab, ubc, uca]]
      for (const tri of utris) {
        for (const v of tri) newUVs.push(v[0], v[1])
      }
    }

    if (hasColors && colorAttr) {
      const ca2 = [colorAttr.getX(i), colorAttr.getY(i), colorAttr.getZ(i)]
      const cb = [colorAttr.getX(i + 1), colorAttr.getY(i + 1), colorAttr.getZ(i + 1)]
      const cc = [colorAttr.getX(i + 2), colorAttr.getY(i + 2), colorAttr.getZ(i + 2)]
      const cab = [(ca2[0] + cb[0]) / 2, (ca2[1] + cb[1]) / 2, (ca2[2] + cb[2]) / 2]
      const cbc = [(cb[0] + cc[0]) / 2, (cb[1] + cc[1]) / 2, (cb[2] + cc[2]) / 2]
      const cca = [(cc[0] + ca2[0]) / 2, (cc[1] + ca2[1]) / 2, (cc[2] + ca2[2]) / 2]
      const ctris = [[ca2, cab, cca], [cab, cb, cbc], [cca, cbc, cc], [cab, cbc, cca]]
      for (const tri of ctris) {
        for (const v of tri) newColors.push(v[0], v[1], v[2])
      }
    }
  }

  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPositions), 3))
  if (newNormals.length > 0) {
    result.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(newNormals), 3))
  }
  if (newUVs.length > 0) {
    result.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(newUVs), 2))
  }
  if (newColors.length > 0) {
    result.setAttribute('color', new THREE.BufferAttribute(new Float32Array(newColors), 3))
  }
  return result
}

function projectUVsOnGeometry(geo: THREE.BufferGeometry, mode: 'box' | 'planar' | 'cylindrical' | 'spherical'): void {
  const pos = geo.getAttribute('position')
  const uvs = new Float32Array(pos.count * 2)

  geo.computeBoundingBox()
  const bbox = geo.boundingBox!
  const size = new THREE.Vector3()
  bbox.getSize(size)
  const center = new THREE.Vector3()
  bbox.getCenter(center)

  if (mode === 'planar') {
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2] = size.x > 0 ? (pos.getX(i) - bbox.min.x) / size.x : 0
      uvs[i * 2 + 1] = size.z > 0 ? (pos.getZ(i) - bbox.min.z) / size.z : 0
    }
  } else if (mode === 'cylindrical') {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) - center.x
      const z = pos.getZ(i) - center.z
      uvs[i * 2] = (Math.atan2(z, x) / (2 * Math.PI)) + 0.5
      uvs[i * 2 + 1] = size.y > 0 ? (pos.getY(i) - bbox.min.y) / size.y : 0
    }
  } else if (mode === 'spherical') {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) - center.x
      const y = pos.getY(i) - center.y
      const z = pos.getZ(i) - center.z
      const r = Math.sqrt(x * x + y * y + z * z) || 1
      uvs[i * 2] = (Math.atan2(z, x) / (2 * Math.PI)) + 0.5
      uvs[i * 2 + 1] = Math.acos(Math.max(-1, Math.min(1, y / r))) / Math.PI
    }
  } else {
    // box projection — per face, pick axis based on face normal
    const norm = geo.getAttribute('normal')
    if (!norm) geo.computeVertexNormals()
    const normals = geo.getAttribute('normal')

    for (let i = 0; i < pos.count; i++) {
      const nx = Math.abs(normals.getX(i))
      const ny = Math.abs(normals.getY(i))
      const nz = Math.abs(normals.getZ(i))

      let u: number, v: number
      if (nx >= ny && nx >= nz) {
        // project from X axis
        u = size.z > 0 ? (pos.getZ(i) - bbox.min.z) / size.z : 0
        v = size.y > 0 ? (pos.getY(i) - bbox.min.y) / size.y : 0
      } else if (ny >= nx && ny >= nz) {
        // project from Y axis
        u = size.x > 0 ? (pos.getX(i) - bbox.min.x) / size.x : 0
        v = size.z > 0 ? (pos.getZ(i) - bbox.min.z) / size.z : 0
      } else {
        // project from Z axis
        u = size.x > 0 ? (pos.getX(i) - bbox.min.x) / size.x : 0
        v = size.y > 0 ? (pos.getY(i) - bbox.min.y) / size.y : 0
      }
      uvs[i * 2] = u
      uvs[i * 2 + 1] = v
    }
  }

  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
}

function edgeLength(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const dx = bx - ax, dy = by - ay, dz = bz - az
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function mid(a: number, b: number): number {
  return (a + b) / 2
}

function adaptiveSubdividePass(
  geo: THREE.BufferGeometry,
  maxEdge: number,
  mode: 'quad' | 'bisect'
): { geometry: THREE.BufferGeometry; changed: boolean } {
  const pos = geo.getAttribute('position')
  const normAttr = geo.getAttribute('normal')
  const uvAttr = geo.getAttribute('uv')
  const colorAttr = geo.getAttribute('color')
  const triCount = pos.count / 3

  const newPos: number[] = []
  const newNorm: number[] = []
  const newUV: number[] = []
  const newCol: number[] = []
  let changed = false

  for (let t = 0; t < triCount; t++) {
    const i = t * 3
    // Vertex positions
    const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i)
    const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1)
    const cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2)

    const ab = edgeLength(ax, ay, az, bx, by, bz)
    const bc = edgeLength(bx, by, bz, cx, cy, cz)
    const ca = edgeLength(cx, cy, cz, ax, ay, az)
    const maxSide = Math.max(ab, bc, ca)

    if (maxSide <= maxEdge) {
      // Keep triangle as-is
      newPos.push(ax, ay, az, bx, by, bz, cx, cy, cz)
      if (normAttr) {
        for (let v = 0; v < 3; v++) newNorm.push(normAttr.getX(i + v), normAttr.getY(i + v), normAttr.getZ(i + v))
      }
      if (uvAttr) {
        for (let v = 0; v < 3; v++) newUV.push(uvAttr.getX(i + v), uvAttr.getY(i + v))
      }
      if (colorAttr) {
        for (let v = 0; v < 3; v++) newCol.push(colorAttr.getX(i + v), colorAttr.getY(i + v), colorAttr.getZ(i + v))
      }
      continue
    }

    changed = true

    if (mode === 'quad') {
      // Split into 4: midpoints of all 3 edges
      const abm = [mid(ax, bx), mid(ay, by), mid(az, bz)]
      const bcm = [mid(bx, cx), mid(by, cy), mid(bz, cz)]
      const cam = [mid(cx, ax), mid(cy, ay), mid(cz, az)]
      // (a, ab, ca), (ab, b, bc), (ca, bc, c), (ab, bc, ca)
      const verts = [
        [ax, ay, az], abm, cam,
        abm, [bx, by, bz], bcm,
        cam, bcm, [cx, cy, cz],
        abm, bcm, cam,
      ]
      for (const v of verts) newPos.push(v[0], v[1], v[2])

      if (normAttr) {
        const na = [normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i)]
        const nb = [normAttr.getX(i + 1), normAttr.getY(i + 1), normAttr.getZ(i + 1)]
        const nc = [normAttr.getX(i + 2), normAttr.getY(i + 2), normAttr.getZ(i + 2)]
        const nab = [mid(na[0], nb[0]), mid(na[1], nb[1]), mid(na[2], nb[2])]
        const nbc = [mid(nb[0], nc[0]), mid(nb[1], nc[1]), mid(nb[2], nc[2])]
        const nca = [mid(nc[0], na[0]), mid(nc[1], na[1]), mid(nc[2], na[2])]
        const norms = [na, nab, nca, nab, nb, nbc, nca, nbc, nc, nab, nbc, nca]
        for (const n of norms) newNorm.push(n[0], n[1], n[2])
      }

      if (uvAttr) {
        const ua = [uvAttr.getX(i), uvAttr.getY(i)]
        const ub = [uvAttr.getX(i + 1), uvAttr.getY(i + 1)]
        const uc = [uvAttr.getX(i + 2), uvAttr.getY(i + 2)]
        const uab = [mid(ua[0], ub[0]), mid(ua[1], ub[1])]
        const ubc = [mid(ub[0], uc[0]), mid(ub[1], uc[1])]
        const uca = [mid(uc[0], ua[0]), mid(uc[1], ua[1])]
        const uvs = [ua, uab, uca, uab, ub, ubc, uca, ubc, uc, uab, ubc, uca]
        for (const u of uvs) newUV.push(u[0], u[1])
      }

      if (colorAttr) {
        const ca2 = [colorAttr.getX(i), colorAttr.getY(i), colorAttr.getZ(i)]
        const cb = [colorAttr.getX(i + 1), colorAttr.getY(i + 1), colorAttr.getZ(i + 1)]
        const cc = [colorAttr.getX(i + 2), colorAttr.getY(i + 2), colorAttr.getZ(i + 2)]
        const cab = [mid(ca2[0], cb[0]), mid(ca2[1], cb[1]), mid(ca2[2], cb[2])]
        const cbc = [mid(cb[0], cc[0]), mid(cb[1], cc[1]), mid(cb[2], cc[2])]
        const cca = [mid(cc[0], ca2[0]), mid(cc[1], ca2[1]), mid(cc[2], ca2[2])]
        const cols = [ca2, cab, cca, cab, cb, cbc, cca, cbc, cc, cab, cbc, cca]
        for (const c of cols) newCol.push(c[0], c[1], c[2])
      }
    } else {
      // Bisect: split longest edge, connect midpoint to opposite vertex → 2 triangles
      // Find longest edge
      let splitEdge: 0 | 1 | 2 // 0=AB, 1=BC, 2=CA
      if (ab >= bc && ab >= ca) splitEdge = 0
      else if (bc >= ab && bc >= ca) splitEdge = 1
      else splitEdge = 2

      // Reorder so the split edge is always A-B, opposite vertex is C
      let pa: number[], pb: number[], pc: number[]
      let ia: number, ib: number, ic: number
      if (splitEdge === 0) {
        pa = [ax, ay, az]; pb = [bx, by, bz]; pc = [cx, cy, cz]
        ia = i; ib = i + 1; ic = i + 2
      } else if (splitEdge === 1) {
        pa = [bx, by, bz]; pb = [cx, cy, cz]; pc = [ax, ay, az]
        ia = i + 1; ib = i + 2; ic = i
      } else {
        pa = [cx, cy, cz]; pb = [ax, ay, az]; pc = [bx, by, bz]
        ia = i + 2; ib = i; ic = i + 1
      }

      const m = [mid(pa[0], pb[0]), mid(pa[1], pb[1]), mid(pa[2], pb[2])]
      // Triangle 1: A, M, C
      // Triangle 2: M, B, C
      newPos.push(pa[0], pa[1], pa[2], m[0], m[1], m[2], pc[0], pc[1], pc[2])
      newPos.push(m[0], m[1], m[2], pb[0], pb[1], pb[2], pc[0], pc[1], pc[2])

      if (normAttr) {
        const na = [normAttr.getX(ia), normAttr.getY(ia), normAttr.getZ(ia)]
        const nb = [normAttr.getX(ib), normAttr.getY(ib), normAttr.getZ(ib)]
        const nc = [normAttr.getX(ic), normAttr.getY(ic), normAttr.getZ(ic)]
        const nm = [mid(na[0], nb[0]), mid(na[1], nb[1]), mid(na[2], nb[2])]
        newNorm.push(na[0], na[1], na[2], nm[0], nm[1], nm[2], nc[0], nc[1], nc[2])
        newNorm.push(nm[0], nm[1], nm[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2])
      }

      if (uvAttr) {
        const ua = [uvAttr.getX(ia), uvAttr.getY(ia)]
        const ub = [uvAttr.getX(ib), uvAttr.getY(ib)]
        const uc = [uvAttr.getX(ic), uvAttr.getY(ic)]
        const um = [mid(ua[0], ub[0]), mid(ua[1], ub[1])]
        newUV.push(ua[0], ua[1], um[0], um[1], uc[0], uc[1])
        newUV.push(um[0], um[1], ub[0], ub[1], uc[0], uc[1])
      }

      if (colorAttr) {
        const ca2 = [colorAttr.getX(ia), colorAttr.getY(ia), colorAttr.getZ(ia)]
        const cb = [colorAttr.getX(ib), colorAttr.getY(ib), colorAttr.getZ(ib)]
        const cc = [colorAttr.getX(ic), colorAttr.getY(ic), colorAttr.getZ(ic)]
        const cm = [mid(ca2[0], cb[0]), mid(ca2[1], cb[1]), mid(ca2[2], cb[2])]
        newCol.push(ca2[0], ca2[1], ca2[2], cm[0], cm[1], cm[2], cc[0], cc[1], cc[2])
        newCol.push(cm[0], cm[1], cm[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2])
      }
    }
  }

  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPos), 3))
  if (newNorm.length > 0) result.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(newNorm), 3))
  if (newUV.length > 0) result.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(newUV), 2))
  if (newCol.length > 0) result.setAttribute('color', new THREE.BufferAttribute(new Float32Array(newCol), 3))

  return { geometry: result, changed }
}
