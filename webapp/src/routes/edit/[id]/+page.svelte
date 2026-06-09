<script lang="ts">
	import { page } from '$app/state';
	import { toThreeMesh } from 'shapecraft/three';
	import { getGenerator } from '$lib/registry';
	import { buildOptions, displayValue, randomizeSeed } from '$lib/editor.svelte';
	import { exportGLB } from '$lib/export-glb';
	import TopBar from '$lib/components/TopBar.svelte';
	import Rail from '$lib/components/Rail.svelte';
	import TypeList from '$lib/components/TypeList.svelte';
	import Viewport from '$lib/components/Viewport.svelte';
	import ParamPanel from '$lib/components/ParamPanel.svelte';

	const entry = $derived(getGenerator(page.params.id!)!);

	const result = $derived.by(() => {
		try {
			return { model: toThreeMesh(entry.gen(buildOptions(entry))), error: null };
		} catch (e) {
			return { model: null, error: e instanceof Error ? e.message : String(e) };
		}
	});
	const model = $derived(result.model);
	const tris = $derived(
		model ? (model.geometry.index?.count ?? model.geometry.getAttribute('position').count) / 3 : 0
	);
	const seed = $derived(displayValue(entry, 'seed') as number | undefined);

	function dice() {
		randomizeSeed(entry);
	}
	function doExport() {
		if (model) exportGLB(model, `${entry.id}-seed-${seed ?? 0}`);
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
