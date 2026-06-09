<script lang="ts">
	import { Search } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { CATEGORIES, generatorsInCategory, type GeneratorEntry } from '$lib/registry';

	let { entry }: { entry: GeneratorEntry } = $props();

	let query = $state('');

	const category = $derived(CATEGORIES.find((c) => c.id === entry.category)!);
	const all = $derived(generatorsInCategory(entry.category));
	const types = $derived(all.filter((g) => g.label.toLowerCase().includes(query.toLowerCase())));

	const hues: Record<string, number> = { trees: 120, plants: 95, rocks: 30 };
</script>

<aside class="flex w-57 shrink-0 flex-col border-r border-line bg-panel">
	<div class="flex items-center justify-between px-4 pt-4 pb-2.5">
		<h3 class="text-[15px] font-bold tracking-tight">{category.label}</h3>
		<span class="rounded-full border border-line2 bg-panel2 px-2 py-0.5 text-[11px] text-muted">
			{all.length} types
		</span>
	</div>
	<div
		class="mx-3 mb-2.5 flex h-8.5 items-center gap-2 rounded-[9px] border border-line2 bg-bg px-2.5"
	>
		<Search size={15} class="shrink-0 text-faint" />
		<input
			type="text"
			class="w-full border-none bg-transparent p-0 text-[13px] text-ink placeholder:text-faint focus:ring-0"
			placeholder="Search types…"
			bind:value={query}
		/>
	</div>
	<div class="flex min-h-0 flex-col gap-[3px] overflow-y-auto px-2 py-1">
		{#each types as g, i (g.id)}
			<a
				href={resolve('/edit/[id]', { id: g.id })}
				class="flex items-center gap-2.5 rounded-[10px] px-2 py-[7px] {g.id === entry.id
					? 'bg-panel2 shadow-[inset_0_0_0_1px_var(--color-line2)]'
					: 'hover:bg-panel2'}"
			>
				<span
					class="mono grid h-7.5 w-9.5 shrink-0 place-items-center rounded-[7px] text-[9px] font-semibold text-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
					style="background:linear-gradient(135deg, hsl({hues[g.category]} 28% {40 -
						i * 2}%), hsl({hues[g.category]} 34% {24 - i}%))"
				>
					{g.label.slice(0, 3).toUpperCase()}
				</span>
				<span>
					<span class="block text-[13.5px] font-semibold {g.id === entry.id ? 'text-accent' : ''}">
						{g.label}
					</span>
					<span class="mono block text-[11px] text-faint">
						{Object.keys(g.schema).length} params
					</span>
				</span>
			</a>
		{/each}
	</div>
</aside>
