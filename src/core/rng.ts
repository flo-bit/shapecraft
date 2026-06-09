import { aleaFactory } from '../noise/alea/alea'

/**
 * A seeded random number generator.
 *
 * It is callable — `rng()` returns the next float in [0, 1) — so it is a drop-in
 * replacement anywhere a `() => number` is expected (scatter, schema, palettes).
 *
 * The important addition is {@link Rng.stream}: a named, independent sub-generator.
 * Pulling values from one stream never advances another, so a model can give each
 * concern (`'trunk'`, `'canopy'`, `'snow'`, …) its own stream and toggling one feature
 * can't shift the randomness of an unrelated one. This replaces the fragile
 * "call `rand()` to keep the sequence stable" pattern.
 */
export interface Rng {
  /** Next float in [0, 1). Drop-in compatible with `() => number`. */
  (): number
  /** Next float in [min, max) (defaults to [0, 1)). */
  float(min?: number, max?: number): number
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number
  /** True with probability `p` (default 0.5). */
  bool(p?: number): boolean
  /** Randomly -1 or 1. */
  sign(): number
  /** A random element of `arr`. */
  pick<T>(arr: readonly T[]): T
  /** Resolve a fixed value or a `[min, max]` range. Rounds when `integer` is true. */
  range(value: number | [number, number], integer?: boolean): number
  /** Derive a fresh integer seed (e.g. for noise/jitter). Advances this stream. */
  seed(): number
  /** An independent, deterministic sub-stream identified by `name`. */
  stream(name: string): Rng
  /** An independent anonymous sub-stream (auto-numbered per parent). */
  fork(): Rng
}

/**
 * Create a seeded RNG from a number or string seed.
 */
export function createRng(seed: number | string): Rng {
  return makeRng(String(seed))
}

function makeRng(base: string): Rng {
  const next = aleaFactory(base).random
  let forkCounter = 0

  const rng = function (): number {
    return next()
  } as Rng

  rng.float = (min = 0, max = 1) => min + next() * (max - min)
  rng.int = (min, max) => Math.floor(min + next() * (max - min + 1))
  rng.bool = (p = 0.5) => next() < p
  rng.sign = () => (next() < 0.5 ? -1 : 1)
  rng.pick = <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)]
  rng.range = (value, integer = false) => {
    if (Array.isArray(value)) {
      const r = value[0] + next() * (value[1] - value[0])
      return integer ? Math.round(r) : r
    }
    return value
  }
  rng.seed = () => Math.floor(next() * 2147483647)
  rng.stream = (name: string) => makeRng(`${base}/${name}`)
  rng.fork = () => makeRng(`${base}#${forkCounter++}`)

  return rng
}
