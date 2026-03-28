import { UberNoise, type NoiseOptions } from './uber-noise'

export function simplex(options?: Partial<NoiseOptions>): UberNoise {
  return new UberNoise({ ...options })
}

export function fbm(options?: Partial<NoiseOptions> & { octaves?: number }): UberNoise {
  return new UberNoise({
    octaves: 4,
    lacunarity: 2,
    gain: 0.5,
    ...options,
  })
}

export function ridged(options?: Partial<NoiseOptions>): UberNoise {
  return new UberNoise({
    sharpness: -1,
    ...options,
  })
}

export function billowed(options?: Partial<NoiseOptions>): UberNoise {
  return new UberNoise({
    sharpness: 1,
    ...options,
  })
}

export function stepped(steps: number, options?: Partial<NoiseOptions>): UberNoise {
  return new UberNoise({
    steps,
    ...options,
  })
}

export function warped(amount: number, options?: Partial<NoiseOptions>): UberNoise {
  return new UberNoise({
    warp: amount,
    ...options,
  })
}
