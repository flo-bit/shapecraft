<script lang="ts">
	let { label, value, onchange }: { label: string; value: string; onchange: (v: string) => void } =
		$props();
</script>

<div class="flex items-center justify-between">
	<span class="text-[12.5px] font-medium text-muted">{label}</span>
	<div class="flex items-center gap-2">
		<span class="mono text-xs text-faint">{value}</span>
		<label
			class="relative block size-6.5 cursor-pointer rounded-[7px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
			style="background:{value}"
		>
			<input
				type="color"
				class="absolute inset-0 size-full cursor-pointer border-none p-0 opacity-0"
				{value}
				oninput={(e) => onchange(e.currentTarget.value)}
			/>
		</label>
	</div>
</div>
