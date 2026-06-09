import { createRng, type Rng } from '../core/rng'
import { resolveOptions, type OptionSchema, type OptionValues } from '../core/schema'

/**
 * Standard generator entry point: derive the RNG from the seed option, resolve the
 * schema (applying preset + overrides + range randomization), and hand back both.
 *
 * Replaces the boilerplate every generator opened with:
 *   const seed = options.seed ?? schema.seed.default
 *   const rng = createRng(seed)
 *   const o = resolveOptions(schema, options, presets, rng)
 *
 * The seed is read before resolution (it drives the range draws), and a `[min,max]`
 * seed — which is never meaningful — collapses to its low end.
 */
export function setup<S extends OptionSchema>(
  schema: S,
  options: Record<string, any> = {},
  presets?: Record<string, Record<string, any>>,
): { o: OptionValues<S>; rng: Rng } {
  const seedDef = (schema as any).seed?.default ?? 1
  const seedOpt = options.seed ?? seedDef
  const seed = Array.isArray(seedOpt) ? seedOpt[0] : seedOpt
  const rng = createRng(seed)
  const o = resolveOptions(schema, options, presets, rng)
  return { o, rng }
}
