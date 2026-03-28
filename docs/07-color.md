# Color

## Vertex coloring

On the Mesh directly:

```ts
mesh.vertexColor('#ff0000')                // flat color (hex string)
mesh.vertexColor(0xff0000)                 // hex number
mesh.vertexColor([1, 0, 0])               // RGB tuple, 0-1

mesh.vertexColor((pos, normal, i) => {     // per-vertex function
  return [pos[1], 0.5, 0.2]               // color based on height
})
```

## Face coloring

Colors each face independently (un-indexes geometry automatically):

```ts
mesh.faceColor((centroid, normal, faceIndex) => {
  return normal[1] > 0.5 ? '#00ff00' : '#888888'
})
```

## Gradients

```ts
import { gradient, heightGradient } from 'shapecraft'

// Value → color mapping
const colorize = gradient([
  [0, '#228B22'],      // green at 0
  [0.5, '#8B4513'],    // brown at 0.5
  [1, '#FFFFFF'],      // white at 1
])
colorize(0.3)          // returns [r, g, b]

// Shorthand: maps Y position to gradient
mesh.vertexColor(heightGradient([
  [0, [0.2, 0.5, 0.1]],
  [2, [0.6, 0.6, 0.6]],
  [4, [1, 1, 1]],
]))
```

## Utilities

```ts
import { lerpColor, parseColorToRgb, hexToRgb, rgbToHex } from 'shapecraft'

lerpColor('#ff0000', '#0000ff', 0.5)  // → [r, g, b]
parseColorToRgb('#ff0000')            // → [1, 0, 0]
hexToRgb('#ff0000')                   // → [1, 0, 0]
rgbToHex(1, 0, 0)                     // → '#ff0000'
```
