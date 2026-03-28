import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { toThreeMesh } from '../src/three'
import { plane } from '../src'
import { fbm } from '../src/noise'
import { heightGradient } from '../src/color'
import { tree, treeSchema, treePresets } from './generators/tree'
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

function rebuildTrees(opts: Record<string, any>) {
  // Remove old trees
  for (const obj of treeObjects) {
    scene.remove(obj)
    obj.geometry.dispose()
    if (Array.isArray(obj.material)) {
      obj.material.forEach(m => m.dispose())
    } else {
      obj.material.dispose()
    }
  }
  treeObjects = []

  // Scatter trees using a fixed layout RNG
  let rngSeed = 42
  function rng() { rngSeed = (rngSeed * 16807) % 2147483647; return (rngSeed & 0x7fffffff) / 2147483647 }

  for (let i = 0; i < 15; i++) {
    const x = (rng() - 0.5) * 20
    const z = (rng() - 0.5) * 20
    const dist = Math.sqrt(x * x + z * z)
    if (dist < 1.5) continue

    const t = tree({
      ...opts,
      seed: (opts.seed ?? 1) + i,
      height: (opts.height ?? 2.5) * (0.8 + rng() * 0.4),
    })
    const obj = toThreeMesh(t)
    const groundY = groundNoise.get(x, z)
    obj.position.set(x, groundY, z)
    obj.castShadow = true
    obj.receiveShadow = true
    scene.add(obj)
    treeObjects.push(obj)
  }
}

// --- Editor ---
const editorEl = createEditor(treeSchema, {
  onChange: rebuildTrees,
}, {
  presets: treePresets,
})
document.body.appendChild(editorEl)

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
