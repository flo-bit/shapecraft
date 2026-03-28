import type { OptionSchema, OptionDef } from './types'

export interface EditorCallbacks {
  onChange: (values: Record<string, any>) => void
}

export interface EditorOptions {
  presets?: Record<string, Record<string, any>>
}

export function createEditor(
  schema: OptionSchema,
  callbacks: EditorCallbacks,
  editorOptions?: EditorOptions,
): HTMLElement {
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed; top: 0; right: 0; width: 280px; height: 100vh;
    background: rgba(15, 15, 25, 0.92); color: #ddd; font-family: system-ui, sans-serif;
    font-size: 12px; overflow-y: auto; padding: 12px; box-sizing: border-box;
    backdrop-filter: blur(8px); z-index: 1000;
    scrollbar-width: thin; scrollbar-color: #444 transparent;
  `

  const title = document.createElement('div')
  title.textContent = 'Options'
  title.style.cssText = 'font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #fff;'
  container.appendChild(title)

  const values: Record<string, any> = {}
  for (const [key, def] of Object.entries(schema)) {
    const d = def.default
    // For range/integer with [min,max] default, show midpoint in editor
    if (Array.isArray(d) && d.length === 2 && typeof d[0] === 'number' && (def.type === 'range' || def.type === 'integer')) {
      values[key] = (d[0] + d[1]) / 2
    } else {
      values[key] = structuredClone(d)
    }
  }

  const controls: Map<string, { set: (v: any) => void }> = new Map()

  let rafId: number | null = null
  function emitChange() {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      callbacks.onChange({ ...values })
    })
  }

  // Preset selector
  if (editorOptions?.presets) {
    const presetNames = Object.keys(editorOptions.presets)
    const row = document.createElement('div')
    row.style.cssText = 'margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #333;'

    const label = document.createElement('label')
    label.textContent = 'Preset'
    label.style.cssText = 'display: block; margin-bottom: 4px; color: #aaa; font-size: 11px;'
    row.appendChild(label)

    const select = document.createElement('select')
    select.style.cssText = 'width: 100%; padding: 4px; background: #222; color: #ddd; border: 1px solid #444; font-size: 12px;'
    for (const name of presetNames) {
      const opt = document.createElement('option')
      opt.value = name
      opt.textContent = name.charAt(0).toUpperCase() + name.slice(1)
      select.appendChild(opt)
    }
    select.addEventListener('change', () => {
      applyPreset(select.value)
    })
    row.appendChild(select)
    container.appendChild(row)

    function applyPreset(name: string) {
      // Reset to schema defaults first (resolve [min,max] to midpoint for editor)
      for (const [key, def] of Object.entries(schema)) {
        const d = def.default
        if (Array.isArray(d) && d.length === 2 && typeof d[0] === 'number' && (def.type === 'range' || def.type === 'integer')) {
          values[key] = def.type === 'integer' ? Math.round((d[0] + d[1]) / 2) : (d[0] + d[1]) / 2
        } else {
          values[key] = structuredClone(d)
        }
      }
      // Apply preset overrides
      const preset = editorOptions!.presets![name]
      if (preset) {
        for (const [key, val] of Object.entries(preset)) {
          if (key in values) {
            values[key] = structuredClone(val)
          }
        }
      }
      // Update all controls
      for (const [key, ctrl] of controls) {
        ctrl.set(values[key])
      }
      emitChange()
    }
  }

  for (const [key, def] of Object.entries(schema)) {
    const { element, set } = createControl(key, def, values, emitChange)
    controls.set(key, { set })
    container.appendChild(element)
  }

  // Initial emit
  setTimeout(() => callbacks.onChange({ ...values }), 0)

  return container
}

function createControl(
  key: string,
  def: OptionDef,
  values: Record<string, any>,
  onChange: () => void
): { element: HTMLElement; set: (v: any) => void } {
  const row = document.createElement('div')
  row.style.cssText = 'margin-bottom: 10px;'

  const label = document.createElement('label')
  label.textContent = def.label ?? formatLabel(key)
  label.style.cssText = 'display: block; margin-bottom: 3px; color: #aaa; font-size: 11px;'
  row.appendChild(label)

  let setter: (v: any) => void = () => {}

  if (def.type === 'range') {
    const step = def.step ?? (def.max - def.min) / 200
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display: flex; align-items: center; gap: 6px;'

    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(def.min)
    input.max = String(def.max)
    input.step = String(step)
    input.value = String(values[key])
    input.style.cssText = 'flex: 1; accent-color: #6a6; height: 4px;'

    const num = document.createElement('span')
    num.textContent = formatNum(values[key])
    num.style.cssText = 'width: 40px; text-align: right; font-size: 11px; color: #888; font-variant-numeric: tabular-nums;'

    input.addEventListener('input', () => {
      values[key] = parseFloat(input.value)
      num.textContent = formatNum(values[key])
      onChange()
    })

    setter = (v) => {
      const n = Array.isArray(v) ? (v[0] + v[1]) / 2 : v
      input.value = String(n)
      num.textContent = formatNum(n)
    }

    wrap.appendChild(input)
    wrap.appendChild(num)
    row.appendChild(wrap)
  } else if (def.type === 'integer') {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display: flex; align-items: center; gap: 6px;'

    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(def.min)
    input.max = String(def.max)
    input.step = '1'
    input.value = String(values[key])
    input.style.cssText = 'flex: 1; accent-color: #6a6; height: 4px;'

    const num = document.createElement('span')
    num.textContent = String(values[key])
    num.style.cssText = 'width: 30px; text-align: right; font-size: 11px; color: #888;'

    input.addEventListener('input', () => {
      values[key] = parseInt(input.value)
      num.textContent = String(values[key])
      onChange()
    })

    setter = (v) => {
      const n = Array.isArray(v) ? Math.round((v[0] + v[1]) / 2) : v
      input.value = String(n)
      num.textContent = String(n)
    }

    wrap.appendChild(input)
    wrap.appendChild(num)
    row.appendChild(wrap)
  } else if (def.type === 'boolean') {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = def.default
    input.style.cssText = 'accent-color: #6a6;'
    input.addEventListener('change', () => {
      values[key] = input.checked
      onChange()
    })
    setter = (v) => { input.checked = v }
    label.style.cssText = 'display: flex; align-items: center; gap: 6px; color: #aaa; font-size: 11px; cursor: pointer;'
    label.prepend(input)
  } else if (def.type === 'color') {
    const input = document.createElement('input')
    input.type = 'color'
    input.value = def.default
    input.style.cssText = 'width: 100%; height: 24px; border: none; background: none; cursor: pointer;'
    input.addEventListener('input', () => {
      values[key] = input.value
      onChange()
    })
    setter = (v) => { input.value = v }
    row.appendChild(input)
  } else if (def.type === 'color-array') {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px;'

    function rebuild() {
      wrap.innerHTML = ''
      const arr = values[key] as string[]

      for (let i = 0; i < arr.length; i++) {
        const swatch = document.createElement('input')
        swatch.type = 'color'
        swatch.value = arr[i]
        swatch.style.cssText = 'width: 32px; height: 24px; border: 1px solid #333; background: none; cursor: pointer; padding: 0;'
        const idx = i
        swatch.addEventListener('input', () => {
          arr[idx] = swatch.value
          onChange()
        })
        swatch.addEventListener('contextmenu', (e) => {
          e.preventDefault()
          if (arr.length > (def.min ?? 1)) {
            arr.splice(idx, 1)
            rebuild()
            onChange()
          }
        })
        wrap.appendChild(swatch)
      }

      if (!def.max || arr.length < def.max) {
        const add = document.createElement('button')
        add.textContent = '+'
        add.style.cssText = 'width: 24px; height: 24px; border: 1px dashed #555; background: none; color: #888; cursor: pointer; font-size: 14px;'
        add.addEventListener('click', () => {
          arr.push(arr[arr.length - 1] ?? '#ffffff')
          rebuild()
          onChange()
        })
        wrap.appendChild(add)
      }
    }

    setter = (v) => {
      values[key] = structuredClone(v)
      rebuild()
    }

    rebuild()
    row.appendChild(wrap)
  } else if (def.type === 'select') {
    const select = document.createElement('select')
    select.style.cssText = 'width: 100%; padding: 4px; background: #222; color: #ddd; border: 1px solid #444; font-size: 12px;'
    for (const opt of def.options) {
      const el = document.createElement('option')
      el.value = opt
      el.textContent = opt.charAt(0).toUpperCase() + opt.slice(1)
      select.appendChild(el)
    }
    select.value = def.default
    select.addEventListener('change', () => {
      values[key] = select.value
      onChange()
    })
    setter = (v) => { select.value = v }
    row.appendChild(select)
  }

  return { element: row, set: setter }
}

function formatLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
}

function formatNum(n: number): string {
  return n >= 100 ? String(Math.round(n)) : n.toFixed(2)
}
