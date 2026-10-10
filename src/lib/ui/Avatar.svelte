<script lang="ts">
	let { name, color, size = 32 }: { name: string; color: string; size?: number } = $props();

	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);
</script>

<span class="avatar" style:--color={color} style:--size="{size}px" aria-hidden="true">{initials}</span>

<style>
	.avatar {
		flex: none;
		display: inline-grid;
		place-items: center;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background: color-mix(in srgb, var(--color) 22%, #0b0614);
		border: 1px solid var(--color);
		color: var(--color);
		font-family: var(--f-sys);
		font-weight: 700;
		font-size: calc(var(--size) * 0.4);
		letter-spacing: 0.02em;
	}
</style>
