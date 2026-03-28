export interface RangeOption {
  type: 'range'
  default: number | [number, number]
  min: number
  max: number
  step?: number
  label?: string
}

export interface IntegerOption {
  type: 'integer'
  default: number | [number, number]
  min: number
  max: number
  label?: string
}

export interface ColorOption {
  type: 'color'
  default: string
  label?: string
}

export interface ColorArrayOption {
  type: 'color-array'
  default: string[]
  min?: number
  max?: number
  label?: string
}

export interface BooleanOption {
  type: 'boolean'
  default: boolean
  label?: string
}

export interface SelectOption {
  type: 'select'
  default: string
  options: string[]
  label?: string
}

export type OptionDef = RangeOption | IntegerOption | ColorOption | ColorArrayOption | BooleanOption | SelectOption

export type OptionSchema = Record<string, OptionDef>

export type OptionValues<S extends OptionSchema> = {
  [K in keyof S]: S[K] extends RangeOption ? number
    : S[K] extends IntegerOption ? number
    : S[K] extends ColorOption ? string
    : S[K] extends ColorArrayOption ? string[]
    : S[K] extends BooleanOption ? boolean
    : S[K] extends SelectOption ? string
    : never
}

/** A value that can be fixed or a [min, max] range resolved at generation time */
export type Randomizable<T> = T | [T, T]

/**
 * Resolve options for a generator: apply preset, then overrides, then fill schema defaults.
 * Numeric values can be [min, max] tuples — resolved using rand() if provided.
 */
export function resolveOptions<S extends OptionSchema>(
  schema: S,
  options: Record<string, any>,
  presets?: Record<string, Record<string, any>>,
  rand?: () => number,
): OptionValues<S> {
  const presetName = options.preset ?? 'default'
  const preset = presets?.[presetName] ?? {}
  const { preset: _, ...overrides } = options

  const resolved: Record<string, any> = {}
  for (const [key, def] of Object.entries(schema)) {
    let val = overrides[key] ?? preset[key] ?? structuredClone(def.default)

    // Resolve [min, max] ranges for numeric types
    if (Array.isArray(val) && val.length === 2 && typeof val[0] === 'number' && typeof val[1] === 'number'
        && (def.type === 'range' || def.type === 'integer')) {
      const r = rand ? rand() : Math.random()
      val = val[0] + (val[1] - val[0]) * r
      if (def.type === 'integer') val = Math.round(val)
    }

    resolved[key] = val
  }

  return resolved as OptionValues<S>
}
