import { aleaFactory } from './noise/alea/alea'

/**
 * Create a seeded random number generator.
 * Returns a function that produces values in [0, 1) on each call.
 */
export function createRng(seed: number | string): () => number {
  return aleaFactory(seed).random
}
