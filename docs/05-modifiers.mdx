# Modifiers

Modifiers come in two patterns:

**Warp functions** — return a `WarpFn`, used with `mesh.warp(fn)`:

```ts
import { twist, bend, taper } from 'shapecraft'
```

**Mesh-in mesh-out** — take and return a Mesh directly:

```ts
import { smooth } from 'shapecraft'
```

## twist

Rotate vertices around an axis proportional to their position along that axis.

```ts
mesh.warp(twist({ amount: 2 }))                 // twist around Y (default)
mesh.warp(twist({ axis: 'x', amount: 1.5 }))
```

Higher `amount` = more twist. Works best on geometry with enough segments along the twist axis.

## bend

Curve geometry along an axis.

```ts
mesh.warp(bend({ amount: 1 }))                  // bend around Y
mesh.warp(bend({ axis: 'z', amount: 2 }))
```

## taper

Scale vertices perpendicular to an axis based on a curve function.

```ts
// Linear taper: full size at y=0, half at y=1
mesh.warp(taper({ curve: (t) => 1 - t * 0.5 }))

// Custom curve along X axis
mesh.warp(taper({ axis: 'x', curve: (t) => Math.cos(t * Math.PI) }))
```

The curve receives the raw coordinate value along the axis.

## smooth

Laplacian smoothing — moves each vertex toward the average of its neighbors.

```ts
const smoothed = smooth(mesh)          // 1 iteration
const verySmooth = smooth(mesh, 5)     // 5 iterations
```
