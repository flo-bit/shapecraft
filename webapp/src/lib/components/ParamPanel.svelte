<script lang="ts">
	import { Download, RotateCcw } from '@lucide/svelte';
	import type { GeneratorEntry } from '$lib/registry';
	import { displayValue, getPreset, resetParams, setParam, setPreset } from '$lib/editor.svelte';
	import SliderControl from './controls/SliderControl.svelte';
	import ToggleControl from './controls/ToggleControl.svelte';
	import SelectControl from './controls/SelectControl.svelte';
	import ColorControl from './controls/ColorControl.svelte';
	import ColorArrayControl from './controls/ColorArrayControl.svelte';

	let { entry, onexport }: { entry: GeneratorEntry; onexport: () => void } = $props();

	const presetNames = $derived(Object.keys(entry.presets));
</script>

<aside class="flex w-84 shrink-0 flex-col border-l border-line bg-panel">
	<div class="flex items-center justify-between px-4 pt-[15px] pb-[11px]">
		<h3 class="text-[15px] font-bold tracking-tight">Parameters</h3>
		<button
			type="button"
			class="grid size-7.5 place-items-center rounded-[9px] border border-line2 bg-panel2 text-muted hover:text-ink"
			title="Reset to defaults"
			onclick={() => resetParams(entry.id)}
		>
			<RotateCcw size={15} />
		</button>
	</div>
	{#if presetNames.length > 1}
		<div class="mx-3.5 mb-3.5">
			<select
				class="h-9.5 w-full rounded-[9px] border-line2 bg-panel2 text-[13px] font-semibold text-ink focus:border-accent focus:ring-0"
				value={getPreset(entry.id)}
				onchange={(e) => setPreset(entry.id, e.currentTarget.value)}
			>
				{#each presetNames as p (p)}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/if}
	<div class="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 pb-4">
		{#each Object.entries(entry.schema) as [key, def] (entry.id + ':' + key)}
			{#if def.type === 'range'}
				<SliderControl
					label={def.label ?? key}
					value={displayValue(entry, key) as number | [number, number]}
					min={def.min}
					max={def.max}
					step={def.step ?? 0.01}
					onchange={(v) => setParam(entry.id, key, v)}
				/>
			{:else if def.type === 'integer'}
				<SliderControl
					label={def.label ?? key}
					value={displayValue(entry, key) as number | [number, number]}
					min={def.min}
					max={def.max}
					step={1}
					onchange={(v) => setParam(entry.id, key, v)}
				/>
			{:else if def.type === 'boolean'}
				<ToggleControl
					label={def.label ?? key}
					value={displayValue(entry, key) as boolean}
					onchange={(v) => setParam(entry.id, key, v)}
				/>
			{:else if def.type === 'select'}
				<SelectControl
					label={def.label ?? key}
					value={displayValue(entry, key) as string}
					options={def.options}
					onchange={(v) => setParam(entry.id, key, v)}
				/>
			{:else if def.type === 'color'}
				<ColorControl
					label={def.label ?? key}
					value={displayValue(entry, key) as string}
					onchange={(v) => setParam(entry.id, key, v)}
				/>
			{:else if def.type === 'color-array'}
				<ColorArrayControl
					label={def.label ?? key}
					colors={displayValue(entry, key) as string[]}
					min={def.min}
					max={def.max}
					onchange={(v) => setParam(entry.id, key, v)}
				/>
			{/if}
		{/each}
	</div>
	<div class="flex flex-col gap-[7px] border-t border-line px-3.5 py-3">
		<button
			type="button"
			class="flex h-10 w-full items-center justify-center gap-1.5 rounded-[9px] bg-accent text-[13px] font-bold text-accent-ink hover:bg-[#b6f37e]"
			onclick={onexport}
		>
			<Download size={17} />Export GLB
		</button>
		<div class="mono text-center text-[11px] text-faint">binary glTF · vertex colors</div>
	</div>
</aside>
