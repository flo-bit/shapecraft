# Mesh

The core class. Wraps a `THREE.BufferGeometry`. Every method that modifies geometry returns a **new** Mesh — the original is never mutated.

## Accessors

```ts
mesh.positions    // Float32Array
mesh.indices      // Uint32Array | Uint16Array | null
mesh.normals      // Float32Array | null
mesh.uvs          // Float32Array | null
mesh.colors       // Float32Array | null
mesh.vertexCount  // number
mesh.faceCount    // number
mesh.boundingBox  // THREE.Box3
mesh.geometry     // THREE.BufferGeometry (direct access)
```

## Transforms

All return a new Mesh.

```ts
mesh.translate(x, y, z)
mesh.rotate(axis, angle)       // axis: 'x' | 'y' | 'z' | [x, y, z]
mesh.rotateX(angle)
mesh.rotateY(angle)
mesh.rotateZ(angle)
mesh.scale(uniform)            // scale(2) = 2× all axes
mesh.scale(x, y, z)            // non-uniform
mesh.transform(matrix)         // arbitrary THREE.Matrix4
mesh.center()                  // recenter bounding box to origin
mesh.clone()
mesh.computeNormals()
```

## Displacement & warping

```ts
// Move each vertex along its normal by fn's return value
mesh.displace((position, normal, uv, index) => amount)

// Shorthand for noise-based displacement
mesh.displaceNoise(noise, amplitude?)

// Replace each vertex position with fn's return value
mesh.warp((position, index) => [x, y, z])

// Position-based random offset (deterministic — same position = same offset)
mesh.jitter(amount)
mesh.jitter(0.05, { seed: 42, scale: 5000 })
```

## Subdivision

```ts
// Uniform: split every triangle into 4, N times
mesh.subdivide(iterations?)

// Adaptive: split until no edge exceeds maxLength
mesh.subdivideAdaptive(maxEdgeLength)
mesh.subdivideAdaptive(0.5, { mode: 'bisect' })  // split longest edge → 2 tris (default)
mesh.subdivideAdaptive(0.5, { mode: 'quad' })    // split all edges → 4 tris
mesh.subdivideAdaptive(0.1, { maxIterations: 10 })
```

## Coloring

```ts
// Flat color — all vertices
mesh.vertexColor('#ff0000')
mesh.vertexColor(0xff0000)
mesh.vertexColor([1, 0, 0])        // RGB 0-1

// Per-vertex function
mesh.vertexColor((position, normal, index) => color)

// Per-face function (un-indexes geometry automatically)
mesh.faceColor((centroid, normal, faceIndex) => color)
```

## UVs

```ts
mesh.computeUVs()                  // default: box projection
mesh.computeUVs('planar')          // Y-down onto XZ
mesh.computeUVs('cylindrical')
mesh.computeUVs('spherical')
```

## Serialization

For future worker support. Packs all attributes into a single `ArrayBuffer`.

```ts
const buffer = mesh.serialize()
const restored = Mesh.deserialize(buffer)
```
