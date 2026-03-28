import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { toThreeMesh } from '../src/three'
import { plane } from '../src'
import { fbm } from '../src/noise'
import { heightGradient } from '../src/color'
import { tree, treeSchema, treePresets } from '../src/generators/common-tree'
import { pine, pineSchema, pinePresets } from '../src/generators/pine-tree'
import { palm, palmSchema, palmPresets } from '../src/generators/palm-tree'
import { createEditor } from './editor/editor'

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

// --- Scene ---
const scene = new THREE.Scene()

// --- Sky dome ---
const skyGeo = new THREE.SphereGeometry(50, 16, 12)
const skyColors = new Float32Array(skyGeo.getAttribute('position').count * 3)
const skyPos = skyGeo.getAttribute('position')
for (let i = 0; i < skyPos.count; i++) {
  const t = Math.max(0, skyPos.getY(i) / 50)
  skyColors[i * 3] = 0.55 + (0.2 - 0.55) * t
  skyColors[i * 3 + 1] = 0.7 + (0.35 - 0.7) * t
  skyColors[i * 3 + 2] = 0.85 + (0.65 - 0.85) * t
}
skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3))
const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }))
scene.add(sky)

// --- Fog ---
scene.fog = new THREE.FogExp2(0x8eb3d9, 0.025)

// --- Camera ---
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(4, 3, 8)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1, 0)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.maxPolarAngle = Math.PI / 2 - 0.05
controls.update()

// --- Lighting ---
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a5a2a, 0.6)
scene.add(hemi)

const sun = new THREE.DirectionalLight(0xfff4e0, 1.4)
sun.position.set(8, 12, 5)
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
sun.shadow.camera.left = -15
sun.shadow.camera.right = 15
sun.shadow.camera.top = 15
sun.shadow.camera.bottom = -15
sun.shadow.camera.near = 0.01
sun.shadow.camera.far = 40
sun.shadow.bias = -0.001
scene.add(sun)

const fill = new THREE.DirectionalLight(0xb0c4de, 0.3)
fill.position.set(-5, 4, -3)
scene.add(fill)

// --- Ground ---
const groundNoise = fbm({ seed: 7, octaves: 3, scale: 0.15, min: 0, max: 0.3 })
const groundMesh = plane({ size: 30, segments: 60 })
  .displace((pos) => groundNoise.get(pos[0], pos[2]))
  .vertexColor(heightGradient([
    [-0.05, [0.25, 0.38, 0.12]],
    [0.1, [0.3, 0.45, 0.15]],
    [0.25, [0.35, 0.42, 0.18]],
  ]))
const groundObj = toThreeMesh(groundMesh)
groundObj.receiveShadow = true
scene.add(groundObj)

// --- Tree management ---
let treeObjects: THREE.Mesh[] = []
let activeGenerator: 'common' | 'pine' | 'palm' = 'common'

function clearTrees() {
  for (const obj of treeObjects) {
    scene.remove(obj)
    obj.geometry.dispose()
    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
    else obj.material.dispose()
  }
  treeObjects = []
}

function rebuildTrees(opts: Record<string, any>) {
  clearTrees()

  let rngSeed = 42
  function rng() { rngSeed = (rngSeed * 16807) % 2147483647; return (rngSeed & 0x7fffffff) / 2147483647 }

  const gen = activeGenerator === 'pine' ? pine : activeGenerator === 'palm' ? palm : tree
  const defaultHeight = activeGenerator === 'pine' ? 3 : activeGenerator === 'palm' ? 3.5 : 2.5

  for (let i = 0; i < 15; i++) {
    const x = (rng() - 0.5) * 20
    const z = (rng() - 0.5) * 20
    if (Math.sqrt(x * x + z * z) < 1.5) continue

    const t = gen({
      ...opts,
      seed: (opts.seed ?? 1) + i,
      height: (opts.height ?? defaultHeight) * (0.8 + rng() * 0.4),
    })
    const obj = toThreeMesh(t)
    obj.position.set(x, groundNoise.get(x, z), z)
    obj.castShadow = true
    obj.receiveShadow = true
    scene.add(obj)
    treeObjects.push(obj)
  }
}

// --- Editor with generator switcher ---
let currentEditorEl: HTMLElement | null = null
let lastOpts: Record<string, any> = {}

function mountEditor(type: 'common' | 'pine') {
  activeGenerator = type
  if (currentEditorEl) currentEditorEl.remove()

  const schema = type === 'pine' ? pineSchema : type === 'palm' ? palmSchema : treeSchema
  const presets = type === 'pine' ? pinePresets : type === 'palm' ? palmPresets : treePresets

  currentEditorEl = createEditor(schema, {
    onChange: (opts) => { lastOpts = opts; rebuildTrees(opts) },
  }, { presets })

  // Add generator switcher at the top
  const switcher = document.createElement('div')
  switcher.style.cssText = 'margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #333; display: flex; gap: 4px;'
  for (const t of ['common', 'pine', 'palm'] as const) {
    const btn = document.createElement('button')
    btn.textContent = t === 'common' ? 'Common' : t === 'pine' ? 'Pine' : 'Palm'
    btn.style.cssText = `flex: 1; padding: 6px; border: 1px solid #444; background: ${t === type ? '#3a5a3a' : '#222'}; color: #ddd; cursor: pointer; font-size: 12px;`
    btn.addEventListener('click', () => { if (t !== activeGenerator) mountEditor(t) })
    switcher.appendChild(btn)
  }
  currentEditorEl.prepend(switcher)

  document.body.appendChild(currentEditorEl)
}

mountEditor('common')

// Expose for screenshot scripts
;(window as any).__camera = camera
;(window as any).__controls = controls

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// --- Animate ---
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()
