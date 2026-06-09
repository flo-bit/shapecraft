# Shapecraft — Implementation Plan

## Overview

A procedural 3D model generation library for the browser. Functional-first API, Three.js under the hood, composable generators and modifiers, first-class noise support via an existing UberNoise library.

**Key design principles:**
- Generators are just functions that return meshes. No class hierarchies, no registration.
- Composition = calling functions inside functions.
- Immutable by default — every transform/modifier returns a new Mesh.
- Three.js is the internal engine but the API should feel library-agnostic where possible.
- The package name is "shapecraft" but avoid hardcoding it deeply — keep it easy to rename.

---

## Tech Stack

- **Language:** TypeScript (strict)
- **3D Engine:** Three.js (peer dependency — user provides it)
- **Noise:** Existing UberNoise library (bundled, see `uber-noise.ts` and its deps `simplex-noise/` and `alea/`)
- **Build:** Vite (library mode for the package, dev server for demos)
- **Test:** Vitest
- **Package:** Single flat package, subpath exports for tree-shaking (`shapecraft`, `shapecraft/noise`, `shapecraft/three`, etc.)

---

## Project Structure

```
shapecraft/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── index.ts                     # Main barrel export
├── src/
│   ├── mesh.ts                  # Core Mesh class
│   ├── types.ts                 # Shared types (Vec3, Color, etc.)
│   ├── math.ts                  # Vec3/Mat4 helpers (thin wrappers over THREE)
│   ├── primitives/
│   │   ├── index.ts
│   │   ├── box.ts
│   │   ├── sphere.ts
│   │   ├── cylinder.ts
│   │   ├── plane.ts
│   │   ├── torus.ts
│   │   └── cone.ts
│   ├── ops/
│   │   ├── index.ts
│   │   ├── merge.ts             # Combine multiple meshes into one
│   │   ├── clone.ts             # Deep clone a mesh
│   │   └── center.ts            # Recenter mesh to origin
│   ├── modifiers/
│   │   ├── index.ts
│   │   ├── twist.ts
│   │   ├── bend.ts
│   │   ├── taper.ts
│   │   ├── lattice.ts           # Simple lattice deform
│   │   └── smooth.ts            # Laplacian smooth
│   ├── noise/
│   │   ├── index.ts             # Re-exports UberNoise + helpers
│   │   ├── uber-noise.ts        # Existing UberNoise (verbatim, with imports fixed)
│   │   ├── simplex-noise/       # Existing simplex-noise dependency
│   │   │   └── simplex-noise.ts
│   │   ├── alea/                # Existing alea dependency
│   │   │   └── alea.ts
│   │   └── helpers.ts           # Convenience: fbm(), ridged(), etc. that return UberNoise instances
│   ├── color/
│   │   ├── index.ts
│   │   ├── vertex-color.ts      # Apply vertex colors (flat or procedural fn)
│   │   ├── face-color.ts        # Apply per-face colors
│   │   ├── gradient.ts          # Height/angle gradient helpers
│   │   └── utils.ts             # Color parsing, lerp, hex<->rgb
│   ├── uv/
│   │   ├── index.ts
│   │   ├── projections.ts       # Box, planar, cylindrical, spherical UV projection
│   │   └── textures.ts          # Procedural texture generators (checkerboard, wood, etc.) — STUB for v0
│   ├── three/
│   │   ├── index.ts
│   │   ├── to-three.ts          # Mesh → THREE.Mesh / THREE.BufferGeometry
│   │   └── from-three.ts        # THREE.BufferGeometry → Mesh
│   └── worker/
│       ├── index.ts
│       └── pool.ts              # STUB for v0 — types + placeholder
├── demo/
│   ├── index.html
│   ├── main.ts                  # Vite dev entry — renders demo scene
│   └── generators/
│       ├── chair.ts             # Example generator: a simple chair
│       ├── table.ts             # Example generator: table with chairs
│       └── terrain.ts           # Example generator: noise terrain
└── tests/
    ├── mesh.test.ts
    ├── primitives.test.ts
    ├── ops.test.ts
    ├── modifiers.test.ts
    └── noise.test.ts
```

---

## Phase 1: Foundation

### 1.1 — Project setup

- Init `package.json` with:
  - `name: "shapecraft"`
  - `type: "module"`
  - `peerDependencies: { "three": ">=0.150.0" }`
  - `devDependencies: { "three": "^0.170.0", "@types/three": "...", "typescript": "...", "vite": "...", "vitest": "..." }`
  - `exports` field with subpath exports:
    ```json
    {
      ".": "./src/index.ts",
      "./noise": "./src/noise/index.ts",
      "./three": "./src/three/index.ts",
      "./modifiers": "./src/modifiers/index.ts",
      "./ops": "./src/ops/index.ts",
      "./color": "./src/color/index.ts",
      "./uv": "./src/uv/index.ts"
    }
    ```
  - Scripts: `"dev": "vite demo"`, `"build": "vite build"`, `"test": "vitest"`
- `tsconfig.json`: strict, ESNext, paths alias `@/*` → `./src/*`
- `vite.config.ts`: library mode config (entry `src/index.ts`, external `three`)
- `vitest.config.ts`: basic setup

### 1.2 — Types (`src/types.ts`)

```ts
export type Vec2 = [number, number]
export type Vec3 = [number, number, number]
export type Vec4 = [number, number, number, number]
export type ColorInput = string | Vec3 | Vec4 | number  // hex string, rgb tuple, rgba tuple, or 0xRRGGBB
export type ColorFn = (position: Vec3, normal: Vec3, index: number) => ColorInput
export type DisplaceFn = (position: Vec3, normal: Vec3, uv: Vec2 | null, index: number) => number
export type WarpFn = (position: Vec3, index: number) => Vec3
export type NoiseLike = { get(x: number, y?: number, z?: number): number }
```

### 1.3 — Core Mesh class (`src/mesh.ts`)

This is the most important file. The Mesh wraps a `THREE.BufferGeometry` internally.

```ts
import * as THREE from 'three'

class Mesh {
  /** Internal geometry — users CAN access this but the API doesn't require it */
  readonly geometry: THREE.BufferGeometry

  constructor(geometry: THREE.BufferGeometry)

  // --- Accessors (read from geometry attributes) ---
  get positions(): Float32Array
  get indices(): Uint32Array | Uint16Array | null
  get normals(): Float32Array | null
  get uvs(): Float32Array | null
  get colors(): Float32Array | null
  get vertexCount(): number
  get faceCount(): number
  get boundingBox(): THREE.Box3

  // --- Transforms (all return new Mesh, geometry is cloned) ---
  translate(x: number, y: number, z: number): Mesh
  rotate(axis: Vec3 | 'x' | 'y' | 'z', angle: number): Mesh
  rotateX(angle: number): Mesh
  rotateY(angle: number): Mesh
  rotateZ(angle: number): Mesh
  scale(x: number, y?: number, z?: number): Mesh
  transform(matrix: THREE.Matrix4): Mesh

  // --- Modifiers (return new Mesh) ---
  displace(fn: DisplaceFn): Mesh
  displaceNoise(noise: NoiseLike, amplitude?: number): Mesh
  warp(fn: WarpFn): Mesh
  subdivide(iterations?: number): Mesh   // uses THREE's subdivision if available, else loop subdivision
  computeNormals(): Mesh

  // --- Coloring (return new Mesh) ---
  vertexColor(color: ColorInput | ColorFn): Mesh
  faceColor(fn: (centroid: Vec3, normal: Vec3, faceIndex: number) => ColorInput): Mesh

  // --- UV (return new Mesh) ---
  computeUVs(projection?: 'box' | 'planar' | 'cylindrical' | 'spherical'): Mesh

  // --- Utility ---
  center(): Mesh
  clone(): Mesh

  // --- Serialization (for future worker support) ---
  serialize(): ArrayBuffer
  static deserialize(buffer: ArrayBuffer): Mesh
}
```

**Implementation notes:**
- Every method that returns a new Mesh should: clone the geometry, apply the operation to the clone, return `new Mesh(clone)`.
- Use a private helper `cloneGeometry()` that does `geometry.clone()` and ensures all attributes are properly copied.
- `displace(fn)`: iterate vertices, call fn with position + normal + uv, move vertex along its normal by the returned amount. Recompute normals after.
- `warp(fn)`: iterate vertices, replace position with fn result. Recompute normals after.
- `vertexColor(color | fn)`: if color, set all vertex colors to that color. If fn, iterate vertices and call fn. Creates/updates a `color` attribute (Float32Array, itemSize 3).
- `faceColor(fn)`: iterate faces (3 indices per face), compute centroid and face normal, call fn, set all 3 vertices of that face to the returned color. **Important:** this requires un-indexing the geometry first (so vertices aren't shared between faces). Use `geometry.toNonIndexed()` before applying.
- `serialize()`/`deserialize()`: pack all typed arrays into a single ArrayBuffer with a simple header (attribute count, sizes). This is for future worker support.

### 1.4 — Math utilities (`src/math.ts`)

Thin wrappers — don't reimplement, use THREE internally:

```ts
import * as THREE from 'three'

export function vec3(x: number, y: number, z: number): THREE.Vector3
export function mat4(): THREE.Matrix4
export function makeTranslation(x: number, y: number, z: number): THREE.Matrix4
export function makeRotation(axis: Vec3 | 'x' | 'y' | 'z', angle: number): THREE.Matrix4
export function makeScale(x: number, y: number, z: number): THREE.Matrix4
export function parseColor(input: ColorInput): THREE.Color
```

---

## Phase 2: Primitives

All primitives are **functions** that return a `Mesh`. They use Three.js geometry constructors internally.

### `src/primitives/box.ts`
```ts
export interface BoxOptions {
  width?: number    // default 1
  height?: number   // default 1
  depth?: number    // default 1
  // OR shorthand:
  size?: Vec3 | number  // overrides width/height/depth
  widthSegments?: number
  heightSegments?: number
  depthSegments?: number
}
export function box(options?: BoxOptions): Mesh
```
Internally: `new THREE.BoxGeometry(...)` → wrap in Mesh.

### `src/primitives/sphere.ts`
```ts
export interface SphereOptions {
  radius?: number           // default 0.5
  widthSegments?: number    // default 16
  heightSegments?: number   // default 12
}
export function sphere(options?: SphereOptions): Mesh
```

### `src/primitives/cylinder.ts`
```ts
export interface CylinderOptions {
  radius?: number           // default 0.5 (sets both top and bottom)
  radiusTop?: number        // overrides radius for top
  radiusBottom?: number     // overrides radius for bottom
  height?: number           // default 1
  segments?: number         // default 16
}
export function cylinder(options?: CylinderOptions): Mesh
```

### `src/primitives/plane.ts`
```ts
export interface PlaneOptions {
  width?: number            // default 1
  height?: number           // default 1
  // OR shorthand:
  size?: number | Vec2      // overrides width/height
  widthSegments?: number    // default 1
  heightSegments?: number   // default 1
  // OR shorthand:
  segments?: number | Vec2  // overrides both segment counts
}
export function plane(options?: PlaneOptions): Mesh
```
**Note:** Three.js PlaneGeometry creates a vertical plane (XY). We should rotate it to be horizontal (XZ) by default since that's more natural for terrain/floors. Document this clearly.

### `src/primitives/cone.ts`
```ts
export interface ConeOptions {
  radius?: number
  height?: number
  segments?: number
}
export function cone(options?: ConeOptions): Mesh
```

### `src/primitives/torus.ts`
```ts
export interface TorusOptions {
  radius?: number
  tube?: number
  radialSegments?: number
  tubularSegments?: number
}
export function torus(options?: TorusOptions): Mesh
```

### `src/primitives/index.ts`
Re-export all primitives.

---

## Phase 3: Operations

### `src/ops/merge.ts`
```ts
export function merge(...meshes: Mesh[]): Mesh
```
Implementation: use `THREE.BufferGeometryUtils.mergeGeometries()` (import from `three/addons/utils/BufferGeometryUtils.js`). Handle the case where some meshes have vertex colors and some don't — fill missing colors with white. Same for UVs — fill missing with zeros.

**Important:** `mergeGeometries` requires all geometries to have the same set of attributes. Before merging, normalize all geometries to have the same attribute set. If any mesh in the set has colors, ensure all do. If any has UVs, ensure all do.

### `src/ops/center.ts`
```ts
export function center(mesh: Mesh): Mesh
```
Compute bounding box center, translate by negative center.

### `src/ops/clone.ts`
```ts
export function clone(mesh: Mesh): Mesh  // just calls mesh.clone()
```

---

## Phase 4: Modifiers

Modifiers are standalone functions that return `WarpFn` or can be applied directly. Two patterns:

**Pattern A — warp functions** (for use with `mesh.warp(fn)`):
```ts
// Returns a WarpFn: (position: Vec3) => Vec3
export function twist(options: { axis?: 'x' | 'y' | 'z', amount: number }): WarpFn
export function bend(options: { axis?: 'x' | 'y' | 'z', amount: number }): WarpFn
export function taper(options: { axis?: 'x' | 'y' | 'z', curve?: (t: number) => number }): WarpFn
```

**Pattern B — mesh-in mesh-out** (for complex operations):
```ts
export function smooth(mesh: Mesh, iterations?: number): Mesh
export function subdivide(mesh: Mesh, iterations?: number): Mesh
```

### `src/modifiers/twist.ts`
Rotate vertices around an axis proportional to their position along that axis.
```
angle = position[axis] * amount
rotate position around axis by angle
```

### `src/modifiers/bend.ts`
Curve vertices along an axis. Map position along axis to an arc.

### `src/modifiers/taper.ts`
Scale vertices perpendicular to an axis based on a curve function of their position along the axis.
```
t = normalize position along axis to [0, 1]
scale = curve(t)
position[perpendicular axes] *= scale
```

### `src/modifiers/smooth.ts`
Laplacian smoothing: for each vertex, move it toward the average of its neighbors. Requires building an adjacency map from the index buffer.

### `src/modifiers/lattice.ts`
STUB for v0. Just export the type and a placeholder that returns the input unchanged.

---

## Phase 5: Noise Integration

### Copy existing code
Copy the user's existing noise implementation into `src/noise/`:
- `src/noise/uber-noise.ts` — the UberNoise class (adjust imports to use relative paths within the package)
- `src/noise/simplex-noise/simplex-noise.ts` — existing simplex noise
- `src/noise/alea/alea.ts` — existing alea PRNG

**Important:** Remove the `globalThis` assignments at the bottom of `uber-noise.ts`. We don't want to pollute globals — everything is imported.

### `src/noise/helpers.ts`
Convenience factory functions that create pre-configured UberNoise instances:

```ts
import { UberNoise, type NoiseOptions } from './uber-noise'

/** Basic simplex noise */
export function simplex(options?: Partial<NoiseOptions>): UberNoise

/** FBM (fractional Brownian motion) with sensible defaults */
export function fbm(options?: Partial<NoiseOptions> & { octaves?: number }): UberNoise
// Default: octaves 4, lacunarity 2, gain 0.5

/** Ridged noise */
export function ridged(options?: Partial<NoiseOptions>): UberNoise
// Sets sharpness: -1

/** Billowed noise */
export function billowed(options?: Partial<NoiseOptions>): UberNoise
// Sets sharpness: 1

/** Stepped/terraced noise */
export function stepped(steps: number, options?: Partial<NoiseOptions>): UberNoise
// Sets steps

/** Warped noise */
export function warped(amount: number, options?: Partial<NoiseOptions>): UberNoise
// Sets warp amount
```

### `src/noise/index.ts`
```ts
export { UberNoise, type NoiseOptions } from './uber-noise'
export { simplex, fbm, ridged, billowed, stepped, warped } from './helpers'
```

### Integration with Mesh

`mesh.displaceNoise(noise, amplitude)` should accept an `UberNoise` instance (or anything with a `.get(x, y, z)` method):

```ts
displaceNoise(noise: NoiseLike, amplitude: number = 1): Mesh {
  return this.displace((pos, normal) => {
    return noise.get(pos[0], pos[1], pos[2]) * amplitude
  })
}
```

This keeps the coupling loose — any object with `get(x, y?, z?)` works.

---

## Phase 6: Color & UV

### `src/color/utils.ts`
```ts
export function parseColor(input: ColorInput): [number, number, number]  // rgb 0-1
export function lerpColor(a: ColorInput, b: ColorInput, t: number): [number, number, number]
export function hexToRgb(hex: string): [number, number, number]
export function rgbToHex(r: number, g: number, b: number): string
```
Use `THREE.Color` internally for parsing.

### `src/color/gradient.ts`
```ts
export type GradientStop = [number, ColorInput]  // [threshold, color]

/** Create a function that maps a value to a color based on gradient stops */
export function gradient(stops: GradientStop[]): (value: number) => [number, number, number]

/** Shorthand for height-based gradient (maps y position to color) */
export function heightGradient(stops: GradientStop[]): ColorFn
```

### `src/color/vertex-color.ts`
Implementation of `Mesh.vertexColor()`:
- If given a flat color, set all vertex colors to that color.
- If given a function, iterate all vertices, call the function with (position, normal, vertexIndex), set the color attribute.

### `src/color/face-color.ts`
Implementation of `Mesh.faceColor()`:
- Call `geometry.toNonIndexed()` first (un-share vertices).
- Iterate face by face (every 3 vertices), compute centroid and normal, call fn, set all 3 vertex colors.

### `src/uv/projections.ts`
```ts
export function projectUVs(geometry: THREE.BufferGeometry, mode: 'box' | 'planar' | 'cylindrical' | 'spherical'): void
```
Modifies geometry in place (called on a clone inside `Mesh.computeUVs()`).

- **planar**: project from Y axis down onto XZ plane. `u = x`, `v = z` (normalized to bounding box).
- **box**: tri-planar — pick projection axis per face based on face normal, project from that axis.
- **cylindrical**: `u = atan2(z, x) / (2π)`, `v = y` (normalized).
- **spherical**: `u = atan2(z, x) / (2π)`, `v = acos(y/r) / π`.

### `src/uv/textures.ts`
STUB for v0. Export types and a couple basic functions:
```ts
export function checkerboard(size?: number): (u: number, v: number) => [number, number, number]
```
Full procedural texture system is post-v0.

---

## Phase 7: Three.js Bridge

### `src/three/to-three.ts`
```ts
import * as THREE from 'three'
import type { Mesh } from '../mesh'

/** Convert a shapecraft Mesh to a THREE.Mesh ready to add to a scene */
export function toThreeMesh(mesh: Mesh, options?: {
  material?: THREE.Material
  flatShading?: boolean    // default true for low-poly look
  wireframe?: boolean
}): THREE.Mesh

/** Get just the geometry (if user wants to provide their own material) */
export function toThreeGeometry(mesh: Mesh): THREE.BufferGeometry
```

`toThreeMesh` implementation:
- If mesh has vertex colors, use `THREE.MeshStandardMaterial({ vertexColors: true, flatShading })`.
- If no vertex colors, use `THREE.MeshStandardMaterial({ color: 0xcccccc, flatShading })`.
- If wireframe requested, set `material.wireframe = true`.
- The geometry is already a `THREE.BufferGeometry` internally, so just reference it (or clone if immutability is desired).

### `src/three/from-three.ts`
```ts
/** Import an existing Three.js geometry into shapecraft */
export function fromThreeGeometry(geometry: THREE.BufferGeometry): Mesh
```

---

## Phase 8: Worker Support (STUB)

### `src/worker/pool.ts`
For v0, just define the interface and a simple synchronous fallback:

```ts
export interface WorkerPoolOptions {
  maxWorkers?: number
}

export class WorkerPool {
  constructor(options?: WorkerPoolOptions)

  /** Run a generator function in a worker. For v0, runs synchronously. */
  async run<T>(fn: (...args: any[]) => Mesh, ...args: any[]): Promise<Mesh>

  /** Batch run multiple generators. For v0, runs sequentially. */
  async batch(tasks: Array<[Function, ...any[]]>): Promise<Mesh[]>

  dispose(): void
}
```

The v0 implementation just calls the functions directly. Real worker support comes later and will use `Mesh.serialize()`/`deserialize()` with `Transferable`.

---

## Phase 9: Demo

### `demo/index.html`
Basic HTML shell that loads `demo/main.ts` via Vite.

### `demo/main.ts`
Sets up a Three.js scene with:
- Renderer, camera, controls (OrbitControls)
- Ambient light + directional light
- Calls all three demo generators
- Adds them to the scene
- Animation loop

### `demo/generators/chair.ts`
```ts
export function chair(options?: { seatHeight?: number, legRadius?: number }): Mesh
```
A simple 4-legged chair:
- Box for seat
- 4 cylinders for legs
- Box for back
- Vertex colored brown tones
- Returns merged mesh

### `demo/generators/table.ts`
```ts
export function diningSet(options?: { chairs?: number, tableRadius?: number }): Mesh
```
- Cylinder for table top
- 4 cylinder legs
- N chairs arranged in a circle using the `chair()` generator
- Demonstrates composition

### `demo/generators/terrain.ts`
```ts
export function terrain(options?: { size?: number, segments?: number, seed?: number }): Mesh
```
- Large subdivided plane
- Displaced with UberNoise (fbm, maybe ridged mix)
- Height-based vertex coloring (green → brown → gray → white)
- Demonstrates noise integration

---

## Phase 10: Tests

### `tests/mesh.test.ts`
- Construction from geometry
- Transforms: translate, rotate, scale produce correct vertex positions
- Immutability: original mesh unchanged after transform
- `vertexCount` and `faceCount` correct
- `clone()` produces independent copy

### `tests/primitives.test.ts`
- Each primitive returns a Mesh
- Vertex counts are correct for given parameters
- Default options produce reasonable geometry
- `size` shorthand works for box and plane

### `tests/ops.test.ts`
- `merge()` combines vertex counts correctly
- `merge()` handles mixed color/no-color meshes (fills missing with white)
- `center()` puts bounding box center at origin

### `tests/modifiers.test.ts`
- `twist()` modifies positions (not identity)
- `taper()` scales vertices correctly at extremes
- `displace()` moves vertices along normals
- `displaceNoise()` produces non-zero displacement

### `tests/noise.test.ts`
- UberNoise produces values in expected range
- `fbm()` helper returns configured UberNoise
- `ridged()` produces values with expected characteristics
- Seeded noise is deterministic

---

## Implementation Order for Claude Code

Follow this order. Each step should be completable and testable before moving to the next.

1. **Project scaffolding** — `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, directory structure, install deps.

2. **Types + Math** — `src/types.ts`, `src/math.ts`.

3. **Core Mesh class** — `src/mesh.ts`. Start with constructor, accessors, transforms (`translate`, `rotate`, `scale`, `transform`), `clone()`, `center()`, `computeNormals()`. Write `tests/mesh.test.ts` alongside.

4. **Primitives** — All 6 primitives. Write `tests/primitives.test.ts`. At this point you can already do `box().translate(1,0,0)`.

5. **Merge operation** — `src/ops/merge.ts` + `center.ts` + `clone.ts`. Write `tests/ops.test.ts`. Now you can compose: `merge(box().translate(-1,0,0), sphere().translate(1,0,0))`.

6. **Noise integration** — Copy UberNoise + deps into `src/noise/`, fix imports, strip globals, write `src/noise/helpers.ts`, write `src/noise/index.ts`. Write `tests/noise.test.ts`.

7. **Displace + warp on Mesh** — Implement `mesh.displace()`, `mesh.displaceNoise()`, `mesh.warp()`. These depend on noise being available for testing.

8. **Modifiers** — `twist`, `bend`, `taper`, `smooth` (lattice as stub). Write `tests/modifiers.test.ts`.

9. **Color system** — `src/color/*`. Implement `mesh.vertexColor()` and `mesh.faceColor()`, plus gradient helpers.

10. **UV projections** — `src/uv/projections.ts`, implement `mesh.computeUVs()`. Texture stubs.

11. **Three.js bridge** — `src/three/to-three.ts`, `src/three/from-three.ts`.

12. **Worker stubs** — `src/worker/pool.ts`.

13. **Main barrel exports** — `src/index.ts` re-exporting everything.

14. **Demo** — `demo/index.html`, `demo/main.ts`, all three generators (`chair.ts`, `table.ts`, `terrain.ts`). This is the integration test that proves everything works together.

15. **Final pass** — Run all tests, fix any issues, make sure `npm run dev` launches the demo and it looks good.

---

## API Surface Summary (what gets exported)

```ts
// shapecraft (main)
export { Mesh } from './mesh'
export { box, sphere, cylinder, plane, cone, torus } from './primitives'
export { merge, center, clone } from './ops'
export { twist, bend, taper, smooth, subdivide } from './modifiers'
export { vertexColor, faceColor, gradient, heightGradient, lerpColor } from './color'
export { projectUVs } from './uv'

// shapecraft/noise
export { UberNoise, simplex, fbm, ridged, billowed, stepped, warped } from './noise'

// shapecraft/three
export { toThreeMesh, toThreeGeometry, fromThreeGeometry } from './three'
```

---

## Notes & Gotchas for the Implementer

1. **Always clone geometry before modifying.** Every Mesh method that modifies geometry must clone first. Never mutate the internal geometry of an existing Mesh.

2. **mergeGeometries attribute alignment.** Before calling `THREE.BufferGeometryUtils.mergeGeometries()`, ensure all geometries have the same attribute set. If any geometry has `color` attribute, add a default white color attribute to those that don't. Same pattern for UVs (fill with zeros).

3. **Plane orientation.** `THREE.PlaneGeometry` is XY-aligned. Rotate it -π/2 around X to make it XZ (horizontal) before wrapping in Mesh. This is more intuitive for terrain/floors.

4. **faceColor requires toNonIndexed().** Three.js indexed geometry shares vertices between faces, so you can't set per-face colors without first un-indexing. Call `geometry.toNonIndexed()` before applying face colors.

5. **UberNoise integration.** The existing UberNoise `.get(x, y, z, w)` signature matches what we need. The `NoiseLike` interface should be `{ get(x: number, y?: number, z?: number, w?: number): number }` so UberNoise satisfies it directly.

6. **Color attribute format.** Three.js expects vertex colors as a `Float32Array` with itemSize 3 (RGB, values 0-1). Use `THREE.Color` for parsing hex strings etc.

7. **subdivide()** — For v0, use a simple midpoint subdivision (split each triangle into 4). If `three/examples/jsm` has a SubdivisionModifier or similar, prefer that. Otherwise implement a basic loop subdivision.

8. **Performance note.** Cloning geometry on every operation is fine for the typical use case (building a mesh from a few dozen operations at setup time). It would be a problem if someone tried to modify meshes every frame — but that's not the intended use pattern. Document this.

9. **Import BufferGeometryUtils correctly.** In modern Three.js: `import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'` or `import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'` depending on the version. Check which import works with the installed Three.js version and use that.

10. **Demo scene lighting.** Use a combination of `THREE.AmbientLight(0x404040)` and `THREE.DirectionalLight(0xffffff, 1)` positioned at `(5, 10, 7)` for good default look with flat shading.