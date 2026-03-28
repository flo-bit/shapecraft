import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { toThreeMesh } from '../src/three'
import { plane, createRng } from '../src'
import { fbm } from '../src/noise'
import { heightGradient } from '../src/color'
import { tree } from '../src/generators/common-tree'
import { pine } from '../src/generators/pine-tree'
import { palm } from '../src/generators/palm-tree'

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

// --- Sky ---
const skyGeo = new THREE.SphereGeometry(80, 16, 12)
const skyColors = new Float32Array(skyGeo.getAttribute('position').count * 3)
const skyPos = skyGeo.getAttribute('position')
for (let i = 0; i < skyPos.count; i++) {
  const t = Math.max(0, skyPos.getY(i) / 80)
  skyColors[i * 3] = 0.55 + (0.2 - 0.55) * t
  skyColors[i * 3 + 1] = 0.7 + (0.35 - 0.7) * t
  skyColors[i * 3 + 2] = 0.85 + (0.65 - 0.85) * t
}
skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3))
scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })))

// --- Fog ---
scene.fog = new THREE.FogExp2(0x8eb3d9, 0.012)

// --- Camera ---
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(12, 8, 20)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1, 0)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.maxPolarAngle = Math.PI / 2 - 0.05
controls.update()

// --- Lighting ---
scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3a5a2a, 0.6))

const sun = new THREE.DirectionalLight(0xfff4e0, 1.4)
sun.position.set(10, 15, 8)
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
sun.shadow.camera.left = -25
sun.shadow.camera.right = 25
sun.shadow.camera.top = 25
sun.shadow.camera.bottom = -25
sun.shadow.camera.near = 0.01
sun.shadow.camera.far = 60
sun.shadow.bias = -0.001
scene.add(sun)

scene.add(new THREE.DirectionalLight(0xb0c4de, 0.3).translateX(-5).translateY(4).translateZ(-3))

// --- Terrain ---
const terrainNoise = fbm({ seed: 7, octaves: 4, scale: 0.08, min: 0, max: 0.8 })
const terrainMesh = plane({ size: 50, segments: 80 })
  .displace((pos) => terrainNoise.get(pos[0], pos[2]))
  .vertexColor(heightGradient([
    [-0.05, [0.22, 0.35, 0.12]],
    [0.15, [0.28, 0.42, 0.15]],
    [0.4, [0.32, 0.40, 0.18]],
    [0.7, [0.38, 0.36, 0.2]],
  ]))
const terrainObj = toThreeMesh(terrainMesh)
terrainObj.receiveShadow = true
scene.add(terrainObj)

// --- Scatter trees ---
const rand = createRng(123)

function addTree(mesh: ReturnType<typeof tree>, x: number, z: number) {
  const obj = toThreeMesh(mesh)
  const groundY = terrainNoise.get(x, z)
  obj.position.set(x, groundY, z)
  obj.castShadow = true
  obj.receiveShadow = true
  scene.add(obj)
}

// Common trees — center area
for (let i = 0; i < 12; i++) {
  const x = (rand() - 0.5) * 20
  const z = (rand() - 0.5) * 20 - 5
  if (Math.abs(x) < 2 && Math.abs(z + 5) < 2) continue
  addTree(
    tree({
      seed: i + 1,
      height: [2, 3.5] as any,
      canopyRadius: [0.6, 1.1] as any,
    }),
    x, z,
  )
}

// Pine trees — back/left cluster
for (let i = 0; i < 15; i++) {
  const x = -8 + (rand() - 0.5) * 18
  const z = -12 + (rand() - 0.5) * 14
  addTree(
    pine({
      seed: i + 50,
      height: [2.5, 5] as any,
      coneTilt: [0.05, 0.3] as any,
      swayAmount: [0.1, 0.4] as any,
    }),
    x, z,
  )
}

// Palm trees — right/front area
for (let i = 0; i < 8; i++) {
  const x = 6 + (rand() - 0.5) * 16
  const z = 4 + (rand() - 0.5) * 14
  addTree(
    palm({
      seed: i + 100,
      height: [2.5, 5] as any,
      trunkCurve: [0.2, 0.8] as any,
      frondDroop: [0.8, 1.3] as any,
    }),
    x, z,
  )
}

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
