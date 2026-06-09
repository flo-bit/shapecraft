<script lang="ts">
	import { ChevronDown, ChevronRight, RotateCcw, Search } from '@lucide/svelte';
	import type { OptionDef } from 'shapecraft/core/schema';
	import type { GeneratorEntry } from '$lib/registry';
	import { displayValue, getPreset, resetParams, setParam, setPreset } from '$lib/editor.svelte';
	import SliderControl from './controls/SliderControl.svelte';
	import ToggleControl from './controls/ToggleControl.svelte';
	import SelectControl from './controls/SelectControl.svelte';
	import ColorControl from './controls/ColorControl.svelte';
	import ColorArrayControl from './controls/ColorArrayControl.svelte';

	let { entry }: { entry: GeneratorEntry } = $props();

	const presetNames = $derived(Object.keys(entry.presets));

	let query = $state('');
	let collapsed = $state<Record<string, boolean>>({});

	interface Group {
		name: string;
		params: [string, OptionDef][];
	}

	// Groups in order of first appearance in the schema; search filters params
	// by label/key and overrides collapsing so matches are always visible.
	const groups = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const out: Group[] = [];
		for (const [key, def] of Object.entries(entry.schema)) {
			if (q && !(def.label ?? key).toLowerCase().includes(q) && !key.toLowerCase().includes(q))
				continue;
			const name = def.group ?? 'General';
			let group = out.find((g) => g.name === name);
			if (!group) {
				group = { name, params: [] };
				out.push(group);
			}
			group.params.push([key, def]);
		}
		return out;
	});

	const searching = $derived(query.trim() !== '');

	function isOpen(name: string) {
		return searching || !collapsed[`${entry.id}:${name}`];
	}
	function toggle(name: string) {
		if (searching) return;
		collapsed[`${entry.id}:${name}`] = !collapsed[`${entry.id}:${name}`];
	}
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
	<div
		class="mx-3.5 mb-3 flex h-9 items-center gap-2 rounded-[9px] border border-line2 bg-bg px-2.5"
	>
		<Search size={15} class="shrink-0 text-faint" />
		<input
			type="text"
			class="w-full border-none bg-transparent p-0 text-[13px] text-ink placeholder:text-faint focus:ring-0"
			placeholder="Search parameters…"
			bind:value={query}
		/>
	</div>
	{#if presetNames.length > 1}
		<div class="mx-3.5 mb-3">
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
	<div class="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
		{#each groups as group, gi (entry.id + ':' + group.name)}
			<div class={gi > 0 ? 'border-t border-line' : ''}>
				<button
					type="button"
					class="flex w-full items-center gap-2.5 px-2.5 py-3 text-left"
					onclick={() => toggle(group.name)}
				>
					<span class="text-faint">
						{#if isOpen(group.name)}
							<ChevronDown size={15} />
						{:else}
							<ChevronRight size={15} />
						{/if}
					</span>
					<span class="flex-1 text-[13px] font-bold">{group.name}</span>
					<span class="mono text-[11px] text-faint">{group.params.length}</span>
				</button>
				{#if isOpen(group.name)}
					<div class="flex flex-col gap-[13px] px-2.5 pt-0.5 pb-3.5">
						{#each group.params as [key, def] (entry.id + ':' + key)}
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
				{/if}
			</div>
		{:else}
			<div class="px-3 py-6 text-center text-[13px] text-faint">No matching parameters</div>
		{/each}
	</div>
</aside>
