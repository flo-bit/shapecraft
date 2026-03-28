# Noise

```ts
import { UberNoise, fbm, ridged, simplex, billowed, stepped, warped } from 'shapecraft/noise'
```

Built on UberNoise — a full-featured noise generator with simplex noise, FBM, warping, ridging, and more.

## Quick helpers

Each returns a pre-configured `UberNoise` instance:

```ts
simplex()                          // basic simplex noise
simplex({ seed: 42, scale: 0.5 })

fbm()                              // 4 octaves, lacunarity 2, gain 0.5
fbm({ octaves: 6, seed: 42 })

ridged()                           // sharpness: -1
ridged({ seed: 42, scale: 0.3 })

billowed()                         // sharpness: 1

stepped(5)                         // 5 discrete steps

warped(0.5)                        // domain warping, amount 0.5
```

## Using with meshes

Any object with `.get(x, y?, z?)` works with `displaceNoise`:

```ts
import { plane } from 'shapecraft'
import { fbm } from 'shapecraft/noise'

const terrain = plane({ size: 10, segments: 50 })
  .displaceNoise(fbm({ seed: 42, scale: 0.3 }), 2)
```

Or use `displace` for full control:

```ts
const noise = fbm({ seed: 42 })

plane({ size: 10, segments: 50 }).displace((pos) => {
  return noise.get(pos[0], pos[2]) * 1.5
})
```

## UberNoise options

```ts
new UberNoise({
  seed: 42,              // deterministic seed
  min: -1, max: 1,       // output range (default -1 to 1)
  scale: 1,              // frequency ("zoom")
  power: 1,              // 1=linear, 2=quadratic
  octaves: 4,            // FBM layers
  gain: 0.5,             // amplitude multiplier per octave
  lacunarity: 2,         // frequency multiplier per octave
  sharpness: 0,          // -1=ridged, 0=normal, 1=billowed
  steps: 0,              // >0 = discrete terracing
  warp: 0,               // domain warp amount
  tileX: false,          // seamless tiling
  tileY: false,
})
```
