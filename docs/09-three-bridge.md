# Three.js Bridge

Convert between shapecraft meshes and Three.js objects.

```ts
import { toThreeMesh, toThreeGeometry, fromThreeGeometry } from 'shapecraft/three'
```

## toThreeMesh

Returns a `THREE.Mesh` ready to add to a scene.

```ts
const threeMesh = toThreeMesh(mesh)
scene.add(threeMesh)

// Options
toThreeMesh(mesh, {
  flatShading: true,     // default true (low-poly look)
  wireframe: false,      // default false
  material: myMaterial,  // override auto-generated material
})
```

Auto-detects vertex colors — uses `MeshStandardMaterial({ vertexColors: true })` if present, otherwise a default gray material.

## toThreeGeometry

Get just the `THREE.BufferGeometry` (to provide your own material):

```ts
const geometry = toThreeGeometry(mesh)
const obj = new THREE.Mesh(geometry, myMaterial)
```

## fromThreeGeometry

Import an existing Three.js geometry into shapecraft:

```ts
const mesh = fromThreeGeometry(existingGeometry)
// Now use all shapecraft methods on it
mesh.translate(1, 0, 0).vertexColor('#ff0000')
```
