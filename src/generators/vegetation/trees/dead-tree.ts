import { setup, branches, heightShade } from '../../../build'
import type { Mesh } from '../../../core/mesh'
import type { OptionSchema, OptionInput } from '../../../core/schema'

export const deadTreeSchema = {
  seed:           { type: 'integer',     default: 1,    min: 1,    max: 100,  label: 'Seed' },
  height:         { type: 'range',       default: 3,    min: 1.5,  max: 6,    step: 0.1,  label: 'Trunk Length' },
  trunkRadius:    { type: 'range',       default: 0.16, min: 0.05, max: 0.4,  step: 0.01, label: 'Trunk Radius' },
  levels:         { type: 'integer',     default: 4,    min: 2,    max: 5,    label: 'Branch Levels' },
  branches:       { type: 'integer',     default: 3,    min: 2,    max: 4,    label: 'Splits' },
  spread:         { type: 'range',       default: 0.8,  min: 0.3,  max: 1.3,  step: 0.05, label: 'Spread' },
  upBias:         { type: 'range',       default: 0.22, min: 0,    max: 0.6,  step: 0.02, label: 'Upward Bias' },
  wander:         { type: 'range',       default: 0.5,  min: 0,    max: 1,    step: 0.05, label: 'Gnarl' },
  lengthFalloff:  { type: 'range',       default: 0.7,  min: 0.5,  max: 0.85, step: 0.02, label: 'Length Falloff' },
  radiusFalloff:  { type: 'range',       default: 0.82, min: 0.6,  max: 0.95, step: 0.02, label: 'Radius Falloff' },
  taper:          { type: 'range',       default: 0.5,  min: 0.3,  max: 1.4,  step: 0.05, label: 'Taper' },
  segments:       { type: 'integer',     default: 6,    min: 4,    max: 12,   label: 'Smoothness' },
  sides:          { type: 'integer',     default: 5,    min: 4,    max: 8,    label: 'Trunk Sides' },
  colors:         { type: 'color-array', default: ['#2e2419', '#4a3d2e', '#6b5e50'], min: 2, max: 6, label: 'Bark Colors' },
} satisfies OptionSchema

export type DeadTreeOptions = Partial<OptionInput<typeof deadTreeSchema>> & { preset?: string }

export const deadTreePresets: Record<string, Partial<DeadTreeOptions>> = {
  default: {},
  gnarled: { spread: 1.1, wander: 0.9, upBias: 0.08 },
  tall: { height: 4.5, upBias: 0.4, spread: 0.6, levels: 5 },
  stump: { height: 1.0, levels: 3, trunkRadius: 0.3, branches: 4, taper: 1.3 },
}

export function deadTree(options: DeadTreeOptions = {}): Mesh {
  const { o, rng } = setup(deadTreeSchema, options, deadTreePresets)

  const { mesh } = branches({
    rng: rng.stream('shape'),
    length: o.height,
    radius: o.trunkRadius,
    depth: o.levels,
    children: o.branches,
    spread: o.spread,
    upBias: o.upBias,
    wander: o.wander,
    lengthFalloff: o.lengthFalloff,
    radiusFalloff: o.radiusFalloff,
    taper: o.taper,
    segments: o.segments,
    sides: o.sides,
  })

  const top = mesh.boundingBox.max.y || o.height
  return mesh.vertexColor(heightShade(o.colors, top))
}
