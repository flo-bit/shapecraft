# Primitives

All primitives return a `Mesh`. Defaults are sensible — call with no args for a unit-sized shape.

## box

```ts
box()                              // 1×1×1
box({ width: 2, height: 3, depth: 1 })
box({ size: 2 })                   // 2×2×2
box({ size: [2, 3, 4] })           // 2×3×4
box({ widthSegments: 4, heightSegments: 4, depthSegments: 4 })
```

## sphere

```ts
sphere()                           // radius 0.5, 16×12 segments
sphere({ radius: 1, widthSegments: 32, heightSegments: 24 })
```

## cylinder

```ts
cylinder()                         // radius 0.5, height 1
cylinder({ radius: 0.3, height: 2, segments: 8 })
cylinder({ radiusTop: 0.2, radiusBottom: 0.5, height: 1 })  // tapered
```

## plane

Horizontal (XZ) by default — natural for terrain/floors.

```ts
plane()                            // 1×1, 1 segment
plane({ size: 10, segments: 50 })  // 10×10, 50×50 segments
plane({ width: 5, height: 3, widthSegments: 10, heightSegments: 6 })
plane({ size: [4, 8], segments: [8, 16] })
```

## cone

```ts
cone()                             // radius 0.5, height 1
cone({ radius: 1, height: 2, segments: 8 })
```

## torus

```ts
torus()                            // radius 0.5, tube 0.2
torus({ radius: 1, tube: 0.3, radialSegments: 16, tubularSegments: 32 })
```
