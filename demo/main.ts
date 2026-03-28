import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { toThreeMesh } from '../src/three'
import { plane, icosphere } from '../src'
import { fbm } from '../src/noise'
import { heightGradient } from '../src/color'
import { tree } from './generators/tree'

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

// --- Sky dome — vertex-colored hemisphere ---
const skyMesh = icosphere({ radius: 50, subdivisions: 3 })
  .vertexColor((pos) => {
    const t = Math.max(0, pos[1] / 50) // 0 at horizon, 1 at zenith
    // Horizon: warm haze → zenith: deeper blue
    return [
      0.55 + (0.2 - 0.55) * t,
      0.7 + (0.35 - 0.7) * t,
      0.85 + (0.65 - 0.85) * t,
    ]
  })
const sky = toThreeMesh(skyMesh, {
  material: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }),
})
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
controls.maxPolarAngle = Math.PI / 2 - 0.05 // don't go below ground
controls.update()

// --- Lighting ---
// Hemisphere light: sky blue from above, ground green from below
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a5a2a, 0.6)
scene.add(hemi)

// Sun
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

// Soft fill from opposite side
const fill = new THREE.DirectionalLight(0xb0c4de, 0.3)
fill.position.set(-5, 4, -3)
scene.add(fill)

// --- Ground — noise-displaced plane with height coloring ---
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

// --- Trees — scattered naturally ---
let rngSeed = 42
function rng() { rngSeed = (rngSeed * 16807) % 2147483647; return (rngSeed & 0x7fffffff) / 2147483647 }

for (let i = 0; i < 18; i++) {
  const x = (rng() - 0.5) * 20
  const z = (rng() - 0.5) * 20
  const dist = Math.sqrt(x * x + z * z)
  if (dist < 1.5) continue // keep center clear

  const h = 1.8 + rng() * 1.5
  const t = tree({ seed: i + 1, height: h, canopyRadius: 0.5 + rng() * 0.5 })
  const obj = toThreeMesh(t)

  // Sample ground height at this position
  const groundY = groundNoise.get(x, z)
  obj.position.set(x, groundY, z)
  obj.castShadow = true
  obj.receiveShadow = true
  scene.add(obj)
}

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
