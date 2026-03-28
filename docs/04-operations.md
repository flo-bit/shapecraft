# Operations

Standalone functions for combining and manipulating meshes.

## merge

Combine multiple meshes into one. Automatically normalizes attributes — if any mesh has vertex colors, meshes without get white; same for UVs (filled with zeros).

```ts
import { merge, box, sphere } from 'shapecraft'

const combined = merge(
  box().translate(-1, 0, 0),
  sphere().translate(1, 0, 0),
)
```

## center

Recenter a mesh's bounding box to the origin.

```ts
import { center } from 'shapecraft'

const centered = center(mesh)
// same as mesh.center()
```

## clone

Deep copy a mesh.

```ts
import { clone } from 'shapecraft'

const copy = clone(mesh)
// same as mesh.clone()
```
