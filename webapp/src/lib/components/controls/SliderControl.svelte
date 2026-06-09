<script lang="ts">
	let {
		label,
		value,
		min,
		max,
		step = 0.01,
		onchange
	}: {
		label: string;
		value: number | [number, number];
		min: number;
		max: number;
		step?: number;
		onchange: (v: number | [number, number]) => void;
	} = $props();

	const isRange = $derived(Array.isArray(value));
	const lo = $derived(Array.isArray(value) ? value[0] : value);
	const hi = $derived(Array.isArray(value) ? value[1] : value);

	const pct = (v: number) => ((v - min) / (max - min)) * 100;

	const decimals = $derived(step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3);
	const fmt = (v: number) => v.toFixed(decimals);
</script>

<div>
	<div class="mb-2 flex items-baseline justify-between">
		<span class="text-[12.5px] font-medium text-muted">{label}</span>
		<span class="mono text-xs text-ink">{isRange ? `${fmt(lo)} – ${fmt(hi)}` : fmt(lo)}</span>
	</div>
	<div class="rng" class:single={!isRange}>
		<div class="rng-track"></div>
		<div class="rng-fill" style="left:{isRange ? pct(lo) : 0}%; right:{100 - pct(hi)}%"></div>
		{#if isRange}
			<input
				type="range"
				{min}
				{max}
				{step}
				value={lo}
				oninput={(e) => onchange([Math.min(+e.currentTarget.value, hi), hi])}
			/>
			<input
				type="range"
				{min}
				{max}
				{step}
				value={hi}
				oninput={(e) => onchange([lo, Math.max(+e.currentTarget.value, lo)])}
			/>
		{:else}
			<input
				type="range"
				{min}
				{max}
				{step}
				value={lo}
				oninput={(e) => onchange(+e.currentTarget.value)}
			/>
		{/if}
	</div>
</div>

<style>
	.rng {
		position: relative;
		height: 22px;
	}
	.rng-track {
		position: absolute;
		left: 0;
		right: 0;
		top: 9px;
		height: 4px;
		border-radius: 3px;
		background: var(--color-line2);
	}
	.rng-fill {
		position: absolute;
		top: 9px;
		height: 4px;
		border-radius: 3px;
		background: var(--color-accent);
	}
	.rng input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		position: absolute;
		inset: 0;
		width: 100%;
		height: 22px;
		margin: 0;
		padding: 0;
		background: transparent;
		pointer-events: none;
	}
	.rng.single input[type='range'] {
		pointer-events: auto;
	}
	.rng input[type='range']:focus {
		outline: none;
		box-shadow: none;
	}
	.rng input[type='range']::-webkit-slider-runnable-track {
		background: transparent;
		height: 22px;
	}
	.rng input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		pointer-events: auto;
		width: 14px;
		height: 14px;
		margin-top: 4px;
		border-radius: 50%;
		border: none;
		background: #eaf6dc;
		box-shadow:
			0 0 0 3px rgb(166 232 106 / 0.25),
			0 1px 3px rgb(0 0 0 / 0.45);
		cursor: grab;
	}
	.rng input[type='range']:active::-webkit-slider-thumb {
		cursor: grabbing;
	}
	.rng input[type='range']::-moz-range-thumb {
		pointer-events: auto;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: none;
		background: #eaf6dc;
		box-shadow: 0 0 0 3px rgb(166 232 106 / 0.25);
		cursor: grab;
	}
</style>
