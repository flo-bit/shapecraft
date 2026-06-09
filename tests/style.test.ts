import { describe, it, expect } from 'vitest'
import { lowpoly, ghibli, styles, resolveStyle, stylePalette, styleMaterial } from '../src/style'
import { resolveOptions } from '../src/core/schema'
import { tree, treeSchema } from '../src/generators'
import type { Asset } from '../src/core/asset'

describe('style profiles', () => {
  it('resolveStyle defaults to lowpoly and accepts names or profiles', () => {
    expect(resolveStyle()).toBe(lowpoly)
    expect(resolveStyle('ghibli')).toBe(ghibli)
    expect(resolveStyle(ghibli)).toBe(ghibli)
    expect(() => resolveStyle('vaporwave')).toThrow(/Unknown style/)
  })

  it('every registered style covers the core semantic roles', () => {
    for (const style of Object.values(styles)) {
      for (const role of ['bark', 'leaf', 'snow', 'rock', 'wood']) {
        expect(stylePalette(style, role).length, `${style.name}/${role}`).toBeGreaterThan(0)
      }
    }
  })

  it('styleMaterial follows the shading model', () => {
    expect(styleMaterial(lowpoly)).toEqual({ vertexColors: true, flatShading: true })
    expect(styleMaterial(ghibli)).toEqual({ vertexColors: true, flatShading: false })
  })
})

describe('style resolution through the schema', () => {
  it('role-tagged color options take the style palette as default', () => {
    const o = resolveOptions(treeSchema, {}, undefined, () => 0.5, ghibli)
    expect(o.trunkColors).toEqual(ghibli.palettes.bark)
    expect(o.canopyColors).toEqual(ghibli.palettes.leaf)
  })

  it('without a style, schema defaults stand', () => {
    const o = resolveOptions(treeSchema, {}, undefined, () => 0.5)
    expect(o.canopyColors).toEqual(treeSchema.canopyColors.default)
  })

  it('presets and explicit overrides beat the style palette', () => {
    const presets = { autumn: { canopyColors: ['#c44422'] } }
    const fromPreset = resolveOptions(treeSchema, { preset: 'autumn' }, presets, () => 0.5, ghibli)
    expect(fromPreset.canopyColors).toEqual(['#c44422'])
    const fromOverride = resolveOptions(treeSchema, { canopyColors: ['#123456'] }, presets, () => 0.5, ghibli)
    expect(fromOverride.canopyColors).toEqual(['#123456'])
  })

  it('style palettes are copied, not shared', () => {
    const o = resolveOptions(treeSchema, {}, undefined, () => 0.5, ghibli)
    ;(o.canopyColors as string[]).push('#000000')
    expect(ghibli.palettes.leaf).toHaveLength(4)
  })
})

describe('styled tree generator', () => {
  function partsOf(asset: Asset): Record<string, Asset> {
    const out: Record<string, Asset> = {}
    for (const c of asset.children) out[c.name] = c
    return out
  }

  it('default style produces the unchanged lowpoly tree (golden parity)', () => {
    const plain = tree({ seed: 5 })
    const styled = tree({ seed: 5, style: 'lowpoly' })
    const a = partsOf(plain).canopy.geometry!.geometry.getAttribute('position')
    const b = partsOf(styled).canopy.geometry!.geometry.getAttribute('position')
    expect(b.array).toEqual(a.array)
    expect(partsOf(plain).trunk.material?.flatShading).toBe(true)
  })

  it('ghibli tree differs in geometry, shading, and palette', () => {
    const low = tree({ seed: 5 })
    const ghib = tree({ seed: 5, style: 'ghibli' })
    const lowCanopy = partsOf(low).canopy
    const ghibCanopy = partsOf(ghib).canopy

    expect(ghibCanopy.material?.flatShading).toBe(false)
    // Finer detail multiplier → more triangles (ghibli is indexed, lowpoly is facet soup)
    const ghibTris = ghibCanopy.geometry!.geometry.getIndex()!.count / 3
    const lowTris = lowCanopy.geometry!.geometry.getAttribute('position').count / 3
    expect(ghibTris).toBeGreaterThan(lowTris)
    // Gradient path keeps geometry welded/indexed (faceted path un-indexes)
    expect(ghibCanopy.geometry!.geometry.getIndex()).not.toBeNull()
    expect(lowCanopy.geometry!.geometry.getIndex()).toBeNull()
  })

  it('ghibli is deterministic per seed', () => {
    const a = tree({ seed: 9, style: 'ghibli' })
    const b = tree({ seed: 9, style: 'ghibli' })
    const pa = partsOf(a).canopy.geometry!.geometry.getAttribute('position')
    const pb = partsOf(b).canopy.geometry!.geometry.getAttribute('position')
    expect(pb.array).toEqual(pa.array)
  })

  it('user colors still win under a style', () => {
    const t = tree({ seed: 3, style: 'ghibli', preset: 'autumn' })
    // Autumn preset canopy must survive the ghibli palette (orange-ish, not green)
    const colors = partsOf(t).canopy.geometry!.geometry.getAttribute('color')
    let reds = 0
    for (let i = 0; i < colors.count; i++) {
      if (colors.getX(i) > colors.getY(i)) reds++
    }
    expect(reds / colors.count).toBeGreaterThan(0.5)
  })
})
