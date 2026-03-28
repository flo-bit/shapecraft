# Patterns

Common patterns for building procedural assets.

## Generator functions

A generator is just a function that returns a Mesh:

```ts
function tree(options?: { height?: number; seed?: number }): Mesh {
  const height = options?.height ?? 2
  const trunk = cylinder({ radius: 0.05, height: height * 0.4 })
    .translate(0, height * 0.2, 0)
    .vertexColor([0.35, 0.22, 0.1])

  const canopy = sphere({ radius: 0.5 })
    .translate(0, height * 0.6, 0)
    .vertexColor([0.15, 0.4, 0.1])

  return merge(trunk, canopy)
}
```

## Composition

Generators call other generators:

```ts
function forest(count: number): Mesh {
  const trees: Mesh[] = []
  for (let i = 0; i < count; i++) {
    trees.push(tree({ height: 1.5 + Math.random() })
      .translate(Math.random() * 10, 0, Math.random() * 10))
  }
  return merge(...trees)
}
```

## Seeded randomness

Use a simple LCG for deterministic variation:

```ts
function makeRng(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s & 0x7fffffff) / 2147483647 }
}

function rocks(seed: number): Mesh {
  const rand = makeRng(seed)
  // rand() returns 0-1, deterministic per seed
}
```

## Terrain workflow

```ts
import { plane } from 'shapecraft'
import { fbm } from 'shapecraft/noise'
import { heightGradient } from 'shapecraft'

const terrain = plane({ size: 20, segments: 100 })
  .displaceNoise(fbm({ seed: 42, scale: 0.2, octaves: 5 }), 3)
  .vertexColor(heightGradient([
    [0, [0.2, 0.5, 0.1]],     // green valleys
    [1.5, [0.5, 0.35, 0.2]],  // brown slopes
    [2.5, [0.6, 0.6, 0.6]],   // gray rock
    [3, [1, 1, 1]],            // snow peaks
  ]))
```

## Adaptive detail

Add detail only where geometry is coarse:

```ts
// Subdivide so no edge > 0.2, then displace
plane({ size: 10, segments: 10 })
  .subdivideAdaptive(0.2)
  .displaceNoise(fbm({ seed: 1 }), 0.5)
```

## Low-poly style with jitter

```ts
box({ size: 1, widthSegments: 3, heightSegments: 3, depthSegments: 3 })
  .jitter(0.03)  // subtle vertex scatter for organic feel
```
