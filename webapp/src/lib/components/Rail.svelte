<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { TreeDeciduous, Sprout, Mountain } from '@lucide/svelte';
	import { CATEGORIES, generatorsInCategory, type CategoryId } from '$lib/registry';

	let { active }: { active: CategoryId } = $props();

	const icons = { trees: TreeDeciduous, plants: Sprout, rocks: Mountain };
</script>

<nav class="flex w-15 shrink-0 flex-col items-center gap-1.5 border-r border-line bg-panel py-3">
	{#each CATEGORIES as c (c.id)}
		{@const CategoryIcon = icons[c.id]}
		<button
			type="button"
			class="relative grid size-10 place-items-center rounded-[11px] {active === c.id
				? 'bg-accent2 text-accent'
				: 'text-faint hover:bg-panel2 hover:text-ink'}"
			title={c.label}
			onclick={() => goto(resolve('/edit/[id]', { id: generatorsInCategory(c.id)[0].id }))}
		>
			{#if active === c.id}
				<span class="absolute top-2 bottom-2 -left-2.5 w-[3px] rounded-sm bg-accent"></span>
			{/if}
			<CategoryIcon size={20} />
		</button>
	{/each}
</nav>
