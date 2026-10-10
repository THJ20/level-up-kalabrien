<script lang="ts">
	import { AVATAR_COLORS } from '#lib/shared/constants.ts';

	let { value = $bindable() }: { value: string } = $props();
</script>

<div class="colors" role="radiogroup" aria-label="Farbe">
	{#each AVATAR_COLORS as color (color)}
		<button
			type="button"
			role="radio"
			aria-checked={value === color}
			aria-label="Farbe {color}"
			class:active={value === color}
			style:--color={color}
			onclick={() => (value = color)}
		></button>
	{/each}
</div>

<style>
	.colors {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	button {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: 2px solid transparent;
		background: var(--color);
		cursor: pointer;
		box-shadow: inset 0 0 0 3px #0b0614;
	}

	button.active {
		border-color: var(--text);
		box-shadow:
			inset 0 0 0 3px #0b0614,
			0 0 14px var(--color);
	}
</style>
