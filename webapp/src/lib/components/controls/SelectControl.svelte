<script lang="ts">
	let {
		label,
		value,
		options,
		onchange
	}: { label: string; value: string; options: string[]; onchange: (v: string) => void } = $props();
</script>

<div class="flex items-center justify-between gap-3">
	<span class="text-[12.5px] font-medium text-muted">{label}</span>
	<select
		class="h-8 min-w-28 rounded-lg border-line2 bg-panel2 py-0 pl-3 text-[13px] font-semibold text-ink focus:border-accent focus:ring-0"
		{value}
		onchange={(e) => onchange(e.currentTarget.value)}
	>
		{#each options as o (o)}
			<option value={o}>{o}</option>
		{/each}
	</select>
</div>
