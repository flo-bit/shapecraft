<script lang="ts">
	import { Check } from '@lucide/svelte';

	let {
		label,
		value,
		onchange
	}: { label: string; value: boolean; onchange: (v: boolean) => void } = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={value}
	class="flex items-center gap-2.5 py-0.5"
	onclick={() => onchange(!value)}
>
	<span
		class="grid size-4.5 place-items-center rounded-md border-[1.5px] {value
			? 'border-accent bg-accent text-accent-ink'
			: 'border-line2 text-transparent'}"
	>
		<Check size={13} strokeWidth={3} />
	</span>
	<span class="text-[13px] font-semibold">{label}</span>
</button>
