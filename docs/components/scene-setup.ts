export async function setupScene(canvasId: string, options?: {
  cameraPos?: [number, number, number]
  target?: [number, number, number]
  background?: number
}) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  if (!canvas) return null

  const THREE = await import('three')
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(options?.background ?? 0x2a2a3a)

  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
  const cp = options?.cameraPos ?? [3, 2, 4]
  camera.position.set(cp[0], cp[1], cp[2])

  const controls = new OrbitControls(camera, canvas)
  const t = options?.target ?? [0, 0.5, 0]
  controls.target.set(t[0], t[1], t[2])
  controls.enableDamping = true
  controls.update()

  // Lights
  scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3a5a2a, 0.6))
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.2)
  sun.position.set(5, 8, 5)
  scene.add(sun)


  function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  const ro = new ResizeObserver(() => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  })
  ro.observe(canvas)

  return { scene, camera, renderer, controls }
}
