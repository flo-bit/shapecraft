<script lang="ts">
	import type * as THREE from 'three';
	import { Canvas } from '@threlte/core';
	import { Box, Grid3x3, TreeDeciduous, Sprout, Mountain } from '@lucide/svelte';
	import type { GeneratorEntry } from '$lib/registry';
	import Scene from './Scene.svelte';

	let {
		model,
		entry,
		seed,
		tris,
		error
	}: {
		model: THREE.Mesh | null;
		entry: GeneratorEntry;
		seed: number | undefined;
		tris: number;
		error: string | null;
	} = $props();

	let showGrid = $state(false);
	let wireframe = $state(false);

	const icons = { trees: TreeDeciduous, plants: Sprout, rocks: Mountain };
	const CategoryIcon = $derived(icons[entry.category]);

	const float =
		'absolute rounded-xl border border-white/10 bg-[rgba(16,18,22,0.66)] backdrop-blur-[10px]';
</script>

<div class="relative min-w-0 flex-1 overflow-hidden">
	<Canvas>
		<Scene {model} viewDistance={entry.viewDistance} {showGrid} {wireframe} />
	</Canvas>

	<!-- title card -->
	<div class="{float} top-4 left-4 flex items-center gap-2.5 px-3.5 py-2.5">
		<span class="grid size-7.5 place-items-center rounded-lg bg-accent2 text-accent">
			<CategoryIcon size={17} />
		</span>
		<div>
			<h4 class="text-sm font-bold text-white">{entry.label}</h4>
			<div class="mono text-[11px] text-white/60">
				seed {seed ?? '–'} · {tris.toLocaleString()} tris
			</div>
		</div>
	</div>

	<!-- view tools -->
	<div class="{float} top-4 right-4 flex flex-col gap-[3px] p-[5px]">
		<button
			type="button"
			class="grid size-8.5 place-items-center rounded-lg {showGrid
				? 'bg-accent text-accent-ink'
				: 'text-white/70 hover:bg-white/10 hover:text-white'}"
			title="Toggle grid"
			onclick={() => (showGrid = !showGrid)}
		>
			<Grid3x3 size={17} />
		</button>
		<button
			type="button"
			class="grid size-8.5 place-items-center rounded-lg {wireframe
				? 'bg-accent text-accent-ink'
				: 'text-white/70 hover:bg-white/10 hover:text-white'}"
			title="Toggle wireframe"
			onclick={() => (wireframe = !wireframe)}
		>
			<Box size={17} />
		</button>
	</div>

	{#if error}
		<div class="{float} bottom-4 left-4 flex items-center gap-2.5 px-3 py-[7px]">
			<span class="size-1.5 rounded-full bg-red-400"></span>
			<span class="mono text-[11px] text-red-300">{error}</span>
		</div>
	{/if}
</div>
