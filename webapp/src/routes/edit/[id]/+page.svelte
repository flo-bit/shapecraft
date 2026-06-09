<script lang="ts">
	import type * as THREE from 'three';
	import { page } from '$app/state';
	import { toThree } from 'shapecraft/three';
	import { getGenerator } from '$lib/registry';
	import { buildOptions, displayValue, getStyle, randomizeSeed } from '$lib/editor.svelte';
	import { exportGLB } from '$lib/export-glb';
	import TopBar from '$lib/components/TopBar.svelte';
	import Rail from '$lib/components/Rail.svelte';
	import TypeList from '$lib/components/TypeList.svelte';
	import Viewport from '$lib/components/Viewport.svelte';
	import ParamPanel from '$lib/components/ParamPanel.svelte';

	const entry = $derived(getGenerator(page.params.id!)!);

	// toThree (not toThreeMesh): keeps per-part materials, so a style's shading
	// model (e.g. ghibli's smooth shading) survives into the viewport and export.
	const result = $derived.by(() => {
		try {
			const model = toThree(entry.gen(buildOptions(entry)), {
				castShadow: true,
				receiveShadow: true
			});
			return { model, error: null };
		} catch (e) {
			return { model: null, error: e instanceof Error ? e.message : String(e) };
		}
	});
	const model = $derived(result.model);
	const tris = $derived.by(() => {
		let n = 0;
		model?.traverse((o) => {
			const mesh = o as THREE.Mesh;
			if (mesh.isMesh)
				n += (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
		});
		return n;
	});
	const seed = $derived(displayValue(entry, 'seed') as number | undefined);

	function dice() {
		randomizeSeed(entry);
	}
	function doExport() {
		if (model) exportGLB(model, `${entry.id}-${getStyle()}-seed-${seed ?? 0}`);
	}
</script>

<svelte:head>
	<title>{entry.label} · shapecraft</title>
</svelte:head>

<div class="flex h-dvh flex-col">
	<TopBar {entry} ondice={dice} onexport={doExport} />
	<div class="flex min-h-0 flex-1">
		<Rail active={entry.category} />
		<TypeList {entry} />
		<Viewport {model} {entry} {seed} {tris} error={result.error} />
		<ParamPanel {entry} />
	</div>
</div>
