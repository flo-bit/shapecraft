import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { toThreeMesh } from '../src/three'
import type { Mesh } from '../src'

import { pineTree } from './generators/vegetation/pine-tree'
import { oakTree } from './generators/vegetation/oak-tree'
import { palmTree } from './generators/vegetation/palm-tree'
import { birchTree } from './generators/vegetation/birch-tree'
import { bush } from './generators/vegetation/bush'
import { flower } from './generators/vegetation/flower'
import { grassClump } from './generators/vegetation/grass-clump'
import { cactus } from './generators/vegetation/cactus'
import { mushroom } from './generators/vegetation/mushroom'
import { fern } from './generators/vegetation/fern'
import { deadTree } from './generators/vegetation/dead-tree'
import { willowTree } from './generators/vegetation/willow-tree'
import { bamboo } from './generators/vegetation/bamboo'
import { cattail } from './generators/vegetation/cattail'
import { stump } from './generators/vegetation/stump'
import { log } from './generators/vegetation/log'
import { mossyRock } from './generators/vegetation/mossy-rock'
import { vine } from './generators/vegetation/vine'
import { topiary } from './generators/vegetation/topiary'
import { succulent } from './generators/vegetation/succulent'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x2a2a3a)

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(12, 12, 26)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(12, 0, 8)
controls.update()

scene.add(new THREE.AmbientLight(0x707070))
const dir = new THREE.DirectionalLight(0xffffff, 1.0)
dir.position.set(8, 15, 10)
scene.add(dir)
const dir2 = new THREE.DirectionalLight(0xffffff, 0.4)
dir2.position.set(-5, 8, -3)
scene.add(dir2)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0x3a5a3a })
)
ground.rotation.x = -Math.PI / 2
ground.position.set(12, 0, 12)
scene.add(ground)

function add(mesh: Mesh, x: number, z: number) {
  const obj = toThreeMesh(mesh)
  obj.position.set(x, 0, z)
  scene.add(obj)
}

// Label helper — simple text sprites (skip, just use grid positions)
// Grid: 5 columns, each asset gets a "cell" with main + variations side by side
// Column spacing 5, row spacing 5, variations offset 1.5 within cell

const colW = 5
const rowH = 5

// ── Row 0: Trees (tall) ──────────────────────────

// 1. Pine tree — small, medium, large
add(pineTree({ height: 1.5, seed: 1 }), 0, 0)
add(pineTree({ height: 2.5, seed: 2 }), 1.5, 0)
add(pineTree({ height: 3.5, layers: 5, seed: 3 }), 3, 0)

// 2. Oak tree — variations
add(oakTree({ height: 2, seed: 1 }), colW, 0)
add(oakTree({ height: 3, canopySize: 1.5, seed: 7 }), colW + 2, 0)

// 3. Palm tree
add(palmTree({ height: 2.5, seed: 1 }), colW * 2, 0)
add(palmTree({ height: 3.5, lean: 0.25, fronds: 9, seed: 5 }), colW * 2 + 2, 0)

// 4. Birch tree
add(birchTree({ height: 2.2, seed: 1 }), colW * 3, 0)
add(birchTree({ height: 3, seed: 10 }), colW * 3 + 2, 0)

// 5. Willow tree
add(willowTree({ height: 2.2, seed: 1 }), colW * 4, 0)
add(willowTree({ height: 3, seed: 5 }), colW * 4 + 2, 0)

// ── Row 1: More trees & structural ──────────────

// 6. Dead tree
add(deadTree({ height: 1.8, branches: 3, seed: 1 }), 0, rowH)
add(deadTree({ height: 2.5, branches: 6, seed: 4 }), 2, rowH)

// 7. Bamboo
add(bamboo({ stalks: 3, height: 1.5, seed: 1 }), colW, rowH)
add(bamboo({ stalks: 7, height: 2.5, seed: 3 }), colW + 2, rowH)

// 8. Vine
add(vine({ height: 1.5, tendrils: 3, seed: 1 }), colW * 2, rowH)
add(vine({ height: 2, tendrils: 6, seed: 4 }), colW * 2 + 2, rowH)

// 9. Topiary — three shapes
add(topiary({ shape: 'sphere', height: 1, seed: 1 }), colW * 3, rowH)
add(topiary({ shape: 'cone', height: 1.3, seed: 1 }), colW * 3 + 1.5, rowH)
add(topiary({ shape: 'spiral', height: 1.5, seed: 1 }), colW * 3 + 3, rowH)

// 10. Cactus
add(cactus({ height: 1, arms: 1, seed: 1 }), colW * 4, rowH)
add(cactus({ height: 1.5, arms: 3, seed: 3 }), colW * 4 + 2, rowH)

// ── Row 2: Ground cover ─────────────────────────

// 11. Bush — size and color variations
add(bush({ size: 0.4, seed: 1 }), 0, rowH * 2)
add(bush({ size: 0.7, seed: 2 }), 1.5, rowH * 2)
add(bush({ size: 0.5, color: [0.35, 0.25, 0.1], seed: 3 }), 3, rowH * 2)  // autumn

// 12. Fern
add(fern({ size: 0.6, fronds: 5, seed: 1 }), colW, rowH * 2)
add(fern({ size: 1, fronds: 9, seed: 3 }), colW + 2, rowH * 2)

// 13. Grass clump
add(grassClump({ blades: 8, height: 0.2, seed: 1 }), colW * 2, rowH * 2)
add(grassClump({ blades: 18, height: 0.4, spread: 0.2, seed: 3 }), colW * 2 + 1.5, rowH * 2)

// 14. Cattail
add(cattail({ stalks: 4, height: 0.8, seed: 1 }), colW * 3, rowH * 2)
add(cattail({ stalks: 8, height: 1.4, seed: 5 }), colW * 3 + 1.5, rowH * 2)

// 15. Flower — color variations
add(flower({ petalColor: [0.9, 0.2, 0.3], seed: 1 }), colW * 4, rowH * 2)        // red
add(flower({ petalColor: [0.95, 0.85, 0.2], petals: 8, seed: 2 }), colW * 4 + 1, rowH * 2)  // yellow
add(flower({ petalColor: [0.6, 0.3, 0.8], petals: 6, seed: 3 }), colW * 4 + 2, rowH * 2)  // purple

// ── Row 3: Props ────────────────────────────────

// 16. Mushroom — color/size variations
add(mushroom({ capColor: [0.7, 0.15, 0.1], seed: 1 }), 0, rowH * 3)                      // red
add(mushroom({ capColor: [0.85, 0.75, 0.5], capRadius: 0.08, height: 0.2, seed: 2 }), 1.2, rowH * 3) // beige small
add(mushroom({ capColor: [0.5, 0.3, 0.15], capRadius: 0.18, height: 0.35, seed: 3 }), 2.6, rowH * 3) // brown big

// 17. Stump
add(stump({ radius: 0.15, height: 0.15, seed: 1 }), colW, rowH * 3)
add(stump({ radius: 0.3, height: 0.35, seed: 5 }), colW + 1.5, rowH * 3)

// 18. Log
add(log({ length: 0.6, radius: 0.08, seed: 1 }), colW * 2, rowH * 3)
add(log({ length: 1.2, radius: 0.15, seed: 3 }), colW * 2 + 2, rowH * 3)

// 19. Mossy rock
add(mossyRock({ size: 0.2, seed: 1 }), colW * 3, rowH * 3)
add(mossyRock({ size: 0.4, mossAmount: 0.8, seed: 3 }), colW * 3 + 1.5, rowH * 3)

// 20. Succulent
add(succulent({ size: 0.2, seed: 1 }), colW * 4, rowH * 3)
add(succulent({ size: 0.3, layers: 4, seed: 5 }), colW * 4 + 1.5, rowH * 3)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()
