<script lang="ts">
	import { Sparkles, Dices, Download } from '@lucide/svelte';
	import { styles } from 'shapecraft/style';
	import { CATEGORIES, type GeneratorEntry } from '$lib/registry';
	import { getStyle, setStyle } from '$lib/editor.svelte';

	let {
		entry,
		ondice,
		onexport
	}: { entry: GeneratorEntry; ondice: () => void; onexport: () => void } = $props();

	const category = $derived(CATEGORIES.find((c) => c.id === entry.category)!);
	const styleList = Object.values(styles);
</script>

<header class="flex h-13 shrink-0 items-center gap-3.5 border-b border-line bg-panel px-4">
	<div class="flex items-center gap-2 font-bold tracking-tight">
		<span
			class="grid size-6 place-items-center rounded-[7px] bg-gradient-to-br from-accent to-[#6db83e] text-accent-ink"
		>
			<Sparkles size={15} strokeWidth={2} />
		</span>
		shapecraft
	</div>
	<div class="h-5.5 w-px bg-line2"></div>
	<div class="flex items-center gap-2 text-[13px] text-muted">
		<b class="font-semibold text-ink">{category.label}</b>
		<span class="text-faint">/</span>
		<b class="font-semibold text-accent">{entry.label}</b>
	</div>
	<div class="flex-1"></div>
	<div
		class="flex h-8.5 items-center gap-[3px] rounded-[9px] border border-line2 bg-panel2 p-[3px]"
		role="radiogroup"
		aria-label="Art style"
	>
		{#each styleList as style (style.name)}
			<button
				type="button"
				role="radio"
				aria-checked={getStyle() === style.name}
				class="h-full rounded-[6px] px-3 text-[12px] font-semibold {getStyle() === style.name
					? 'bg-accent text-accent-ink'
					: 'text-muted hover:text-ink'}"
				onclick={() => setStyle(style.name)}
			>
				{style.label}
			</button>
		{/each}
	</div>
	<button
		type="button"
		class="grid size-8.5 place-items-center rounded-[9px] border border-line2 bg-panel2 text-muted hover:border-[#3c424d] hover:text-ink"
		title="Randomize seed"
		onclick={ondice}
	>
		<Dices size={18} />
	</button>
	<button
		type="button"
		class="flex h-8.5 items-center gap-1.5 rounded-[9px] bg-accent px-3.5 text-[13px] font-semibold text-accent-ink hover:bg-[#b6f37e]"
		onclick={onexport}
	>
		<Download size={16} />Export GLB
	</button>
</header>
