import { createRng, type Rng } from '../core/rng'
import { resolveOptions, type OptionSchema, type OptionValues } from '../core/schema'
import { resolveStyle, type StyleInput, type StyleProfile } from '../style/profile'

/**
 * Standard generator entry point: derive the RNG from the seed option, resolve the
 * style (every generator accepts `style?: string | StyleProfile`), resolve the
 * schema (preset + overrides + style palettes + range randomization), and hand
 * all three back.
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
): { o: OptionValues<S>; rng: Rng; style: StyleProfile } {
  const seedDef = (schema as any).seed?.default ?? 1
  const seedOpt = options.seed ?? seedDef
  const seed = Array.isArray(seedOpt) ? seedOpt[0] : seedOpt
  const rng = createRng(seed)
  const style = resolveStyle(options.style as StyleInput)
  const o = resolveOptions(schema, options, presets, rng, style)
  return { o, rng, style }
}
