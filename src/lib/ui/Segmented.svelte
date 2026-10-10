<script lang="ts" generics="T extends string">
	let {
		options,
		value = $bindable(),
		label
	}: { options: { value: T; label: string }[]; value: T; label: string } = $props();
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
	{#each options as option (option.value)}
		<button
			type="button"
			role="radio"
			aria-checked={value === option.value}
			class:active={value === option.value}
			onclick={() => (value = option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>

<style>
	.segmented {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	button {
		flex: 1 1 auto;
		min-height: 36px;
		padding: 6px 10px;
		border: 1px solid var(--line-faint);
		background: rgba(164, 124, 255, 0.05);
		color: var(--dim);
		font-family: var(--f-sys);
		font-weight: 600;
		font-size: 13px;
		letter-spacing: 0.06em;
		cursor: pointer;
	}

	button.active {
		border-color: var(--line);
		color: var(--text);
		background: rgba(164, 124, 255, 0.16);
		box-shadow: 0 0 12px var(--glow-soft);
	}
</style>
