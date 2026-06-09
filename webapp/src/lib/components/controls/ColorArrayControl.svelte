<script lang="ts">
	import { Plus, X } from '@lucide/svelte';

	let {
		label,
		colors,
		min = 0,
		max = 6,
		onchange
	}: {
		label: string;
		colors: string[];
		min?: number;
		max?: number;
		onchange: (v: string[]) => void;
	} = $props();

	function setColor(i: number, c: string) {
		onchange(colors.map((x, j) => (j === i ? c : x)));
	}
	function remove(i: number) {
		onchange(colors.filter((_, j) => j !== i));
	}
	function add() {
		onchange([...colors, colors[colors.length - 1] ?? '#8a9078']);
	}
</script>

<div>
	<div class="mb-2 flex items-baseline justify-between">
		<span class="text-[12.5px] font-medium text-muted">{label}</span>
		{#if colors.length === 0}
			<span class="text-xs text-faint">off</span>
		{/if}
	</div>
	<div class="flex flex-wrap items-center gap-1.5">
		{#each colors as c, i (i)}
			<span class="group relative">
				<label
					class="block size-6.5 cursor-pointer rounded-[7px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
					style="background:{c}"
				>
					<input
						type="color"
						class="absolute inset-0 size-full cursor-pointer border-none p-0 opacity-0"
						value={c}
						oninput={(e) => setColor(i, e.currentTarget.value)}
					/>
				</label>
				{#if colors.length > min}
					<button
						type="button"
						class="absolute -top-1.5 -right-1.5 hidden size-4 place-items-center rounded-full bg-line2 text-muted group-hover:grid hover:text-ink"
						title="Remove color"
						onclick={() => remove(i)}
					>
						<X size={10} />
					</button>
				{/if}
			</span>
		{/each}
		{#if colors.length < max}
			<button
				type="button"
				class="grid size-6.5 place-items-center rounded-[7px] border border-dashed border-line2 text-muted hover:text-ink"
				title="Add color"
				onclick={add}
			>
				<Plus size={14} />
			</button>
		{/if}
	</div>
</div>
