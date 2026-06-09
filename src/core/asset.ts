import * as THREE from 'three'
import { Mesh } from './mesh'
import { mergeMeshes } from './geometry-merge'
import { makeRotation } from './math'
import type { Material } from './material'
import type { Vec3 } from './types'

/** A named local anchor on an asset — an attach point for foliage, props, fruit, etc. */
export interface Socket {
  position: Vec3
  direction?: Vec3
  radius?: number
}

interface AssetInit {
  name: string
  geometry?: Mesh | null
  material?: Material | null
  transform?: THREE.Matrix4
  children?: readonly Asset[]
  sockets?: Readonly<Record<string, Socket>>
}

/**
 * A procedural asset: a tree of named parts. A leaf part carries geometry + a material;
 * a group part carries children. Transforms live on the node (lazy — no geometry clone),
 * and named sockets mark attach points. This replaces "merge everything into one anonymous
 * colored mesh", keeping structure for per-part materials, editing, sockets, and export.
 *
 * All edit methods are immutable and return a new Asset.
 */
export class Asset {
  readonly name: string
  readonly geometry: Mesh | null
  readonly material: Material | null
  readonly transform: THREE.Matrix4
  readonly children: readonly Asset[]
  readonly sockets: Readonly<Record<string, Socket>>

  constructor(init: AssetInit) {
    this.name = init.name
    this.geometry = init.geometry ?? null
    this.material = init.material ?? null
    this.transform = init.transform ?? new THREE.Matrix4()
    this.children = init.children ?? []
    this.sockets = init.sockets ?? {}
  }

  static part(name: string, geometry: Mesh, material?: Material): Asset {
    return new Asset({ name, geometry, material: material ?? null })
  }
  static group(name: string, children: Asset[]): Asset {
    return new Asset({ name, children })
  }

  private patch(p: Partial<AssetInit>): Asset {
    return new Asset({
      name: p.name ?? this.name,
      geometry: p.geometry !== undefined ? p.geometry : this.geometry,
      material: p.material !== undefined ? p.material : this.material,
      transform: p.transform ?? this.transform,
      children: p.children ?? this.children,
      sockets: p.sockets ?? this.sockets,
    })
  }

  // --- Transforms (applied to the node's matrix; geometry is not touched) ---
  transformBy(m: THREE.Matrix4): Asset {
    return this.patch({ transform: this.transform.clone().premultiply(m) })
  }
  translate(x: number, y: number, z: number): Asset {
    return this.transformBy(new THREE.Matrix4().makeTranslation(x, y, z))
  }
  rotate(axis: Vec3 | 'x' | 'y' | 'z', angle: number): Asset {
    return this.transformBy(makeRotation(axis, angle))
  }
  rotateX(a: number): Asset { return this.rotate('x', a) }
  rotateY(a: number): Asset { return this.rotate('y', a) }
  rotateZ(a: number): Asset { return this.rotate('z', a) }
  scale(x: number, y: number = x, z: number = x): Asset {
    return this.transformBy(new THREE.Matrix4().makeScale(x, y, z))
  }

  // --- Edits ---
  withMaterial(material: Material): Asset { return this.patch({ material }) }
  withName(name: string): Asset { return this.patch({ name }) }
  add(...children: Asset[]): Asset { return this.patch({ children: [...this.children, ...children] }) }
  socket(name: string, s: Socket): Asset { return this.patch({ sockets: { ...this.sockets, [name]: s } }) }

  /** Replace the material on every part named `name` (recursively). */
  recolor(name: string, material: Material): Asset {
    const here = this.name === name ? this.withMaterial(material) : this
    if (here.children.length === 0) return here
    return here.patch({ children: here.children.map((c) => c.recolor(name, material)) })
  }

  // --- Queries ---
  find(name: string): Asset | null {
    if (this.name === name) return this
    for (const c of this.children) {
      const f = c.find(name)
      if (f) return f
    }
    return null
  }

  /** Visit every node with its accumulated world matrix. */
  walk(fn: (node: Asset, world: THREE.Matrix4) => void, parentWorld = new THREE.Matrix4()): void {
    const world = parentWorld.clone().multiply(this.transform)
    fn(this, world)
    for (const c of this.children) c.walk(fn, world)
  }

  bounds(): THREE.Box3 {
    const box = new THREE.Box3()
    this.walk((node, world) => {
      if (!node.geometry) return
      const g = node.geometry.geometry.clone()
      g.applyMatrix4(world)
      g.computeBoundingBox()
      box.union(g.boundingBox!)
    })
    return box
  }

  /** World-space socket by name (searches the tree). */
  getSocket(name: string): Socket | null {
    let found: Socket | null = null
    this.walk((node, world) => {
      if (found) return
      const s = node.sockets[name]
      if (!s) return
      const p = new THREE.Vector3(s.position[0], s.position[1], s.position[2]).applyMatrix4(world)
      found = { position: [p.x, p.y, p.z], direction: s.direction, radius: s.radius }
    })
    return found
  }

  /** Bake the whole tree (transforms applied) into a single Mesh — for export or when one mesh is wanted. */
  flatten(): Mesh {
    if (this._flat) return this._flat
    const parts: Mesh[] = []
    this.walk((node, world) => {
      if (node.geometry) parts.push(node.geometry.transform(world))
    })
    this._flat = mergeMeshes(parts)
    return this._flat
  }
  private _flat: Mesh | null = null

  // --- Mesh-compatible read accessors (delegate to the flattened mesh, cached) so an
  //     Asset can stand in for a Mesh anywhere read-only geometry is consumed. ---
  get vertexCount(): number { return this.flatten().vertexCount }
  get faceCount(): number { return this.flatten().faceCount }
  get positions(): Float32Array { return this.flatten().positions }
  get colors(): Float32Array | null { return this.flatten().colors }
  get boundingBox(): THREE.Box3 { return this.flatten().boundingBox }

  clone(): Asset { return this.patch({}) }
}

/** Make a leaf part. */
export function part(name: string, geometry: Mesh, material?: Material): Asset {
  return Asset.part(name, geometry, material)
}

/** Make a group of parts. */
export function group(name: string, children: Asset[]): Asset {
  return Asset.group(name, children)
}
