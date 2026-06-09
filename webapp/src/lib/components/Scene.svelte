<script lang="ts">
	import * as THREE from 'three';
	import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js';
	import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
	import { T, useThrelte } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import { plane } from 'shapecraft';
	import { fbm } from 'shapecraft/noise';
	import { heightGradient } from 'shapecraft/color';
	import { toThreeMesh } from 'shapecraft/three';

	let {
		model,
		viewDistance,
		showGrid,
		wireframe,
		showScale
	}: {
		model: THREE.Object3D | null;
		viewDistance: number;
		showGrid: boolean;
		wireframe: boolean;
		showScale: boolean;
	} = $props();

	const { scene, renderer, invalidate } = useThrelte();
	renderer.toneMappingExposure = 1.1;

	// Material mutation happens outside Threlte's prop system, so re-render manually.
	$effect(() => {
		if (model) {
			model.traverse((o) => {
				const mesh = o as THREE.Mesh;
				if (mesh.isMesh) (mesh.material as THREE.MeshStandardMaterial).wireframe = wireframe;
			});
			invalidate();
		}
	});
	scene.background = new THREE.Color(0x8eb3d9);
	scene.fog = new THREE.FogExp2(0x8eb3d9, 0.012);

	// Sky dome with a simple vertical gradient
	const skyGeo = new THREE.SphereGeometry(120, 16, 12);
	const skyPos = skyGeo.getAttribute('position');
	const skyColors = new Float32Array(skyPos.count * 3);
	for (let i = 0; i < skyPos.count; i++) {
		const t = Math.max(0, skyPos.getY(i) / 120);
		skyColors[i * 3] = 0.55 + (0.2 - 0.55) * t;
		skyColors[i * 3 + 1] = 0.7 + (0.35 - 0.7) * t;
		skyColors[i * 3 + 2] = 0.85 + (0.65 - 0.85) * t;
	}
	skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
	const sky = new THREE.Mesh(
		skyGeo,
		new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })
	);

	// HDR ambient lighting, diffuse-only: the env map is baked into a spherical-harmonics
	// light probe (colored sky/ground bounce, no specular sheen) and not shown as background.
	const ENV_LIGHT_INTENSITY = 0.3;
	let envProbe = $state<THREE.LightProbe | null>(null);
	new RGBELoader().load('/env/puresky_1k.hdr', (tex) => {
		const cubeRT = new THREE.WebGLCubeRenderTarget(256).fromEquirectangularTexture(renderer, tex);
		// fromCubeRenderTarget is sync in some three versions, async in others
		Promise.resolve(LightProbeGenerator.fromCubeRenderTarget(renderer, cubeRT)).then((probe) => {
			probe.intensity = ENV_LIGHT_INTENSITY;
			envProbe = probe;
			cubeRT.dispose();
			tex.dispose();
			invalidate();
		});
	});

	// Gently rolling ground, built with shapecraft itself
	const groundNoise = fbm({ seed: 7, octaves: 3, scale: 0.15, min: 0, max: 0.3 });
	const ground = toThreeMesh(
		plane({ size: 60, segments: 80 })
			.displace((pos: number[]) => groundNoise.get(pos[0], pos[2]))
			.vertexColor(
				heightGradient([
					[-0.05, [0.25, 0.38, 0.12]],
					[0.1, [0.3, 0.45, 0.15]],
					[0.25, [0.35, 0.42, 0.18]]
				])
			)
	);
	ground.receiveShadow = true;
	const modelY = groundNoise.get(0, 0);

	// Human-sized reference box (1 unit = 1 m), standing beside the model's bounding box.
	const HUMAN = { w: 0.45, h: 1.8, d: 0.25 } as const;
	const scalePos = $derived.by(() => {
		let x = 1;
		if (model) {
			const box = new THREE.Box3().setFromObject(model);
			if (!box.isEmpty()) x = Math.max(box.max.x, 0.3) + HUMAN.w / 2 + 0.35;
		}
		// Slightly behind the model so it reads as a backdrop reference, not a wall.
		const z = -0.6;
		return [x, groundNoise.get(x, z) + HUMAN.h / 2, z] as [number, number, number];
	});

	const camPos = $derived([viewDistance * 0.6, viewDistance * 0.5, viewDistance] as [
		number,
		number,
		number
	]);
	const target = $derived([0, viewDistance * 0.16, 0] as [number, number, number]);
</script>

<T.PerspectiveCamera makeDefault position={camPos} fov={50}>
	<OrbitControls enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2 - 0.05} {target} />
</T.PerspectiveCamera>

{#if envProbe}
	<T is={envProbe} />
{/if}

<T.HemisphereLight args={[0x87ceeb, 0x3a5a2a, 0.15]} />
<T.DirectionalLight
	position={[16, 24, 10]}
	intensity={1.4}
	color={0xfff4e0}
	castShadow
	oncreate={(sun: THREE.DirectionalLight) => {
		sun.shadow.mapSize.set(2048, 2048);
		sun.shadow.camera.left = -20;
		sun.shadow.camera.right = 20;
		sun.shadow.camera.top = 20;
		sun.shadow.camera.bottom = -20;
		sun.shadow.camera.near = 0.01;
		sun.shadow.camera.far = 80;
		sun.shadow.bias = -0.001;
	}}
/>
<T.DirectionalLight position={[-5, 4, -3]} intensity={0.3} color={0xb0c4de} />

<T is={sky} />
<T is={ground} />

{#if showGrid}
	<T.GridHelper args={[60, 60, 0xe8f0f8, 0xc4d2de]} position.y={0.32} />
{/if}

{#if model}
	<T is={model} position.y={modelY} castShadow receiveShadow />
{/if}

{#if showScale}
	<T.Mesh position={scalePos} castShadow>
		<T.BoxGeometry args={[HUMAN.w, HUMAN.h, HUMAN.d]} />
		<T.MeshStandardMaterial color="#e3e8ee" transparent opacity={0.75} roughness={0.9} />
	</T.Mesh>
{/if}
