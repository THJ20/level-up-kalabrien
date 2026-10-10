<script lang="ts">
	let {
		name,
		color,
		src = null,
		size = 32
	}: { name: string; color: string; src?: string | null; size?: number } = $props();

	let failed = $state(false);

	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);
</script>

{#if src && !failed}
	<img
		class="avatar photo"
		{src}
		alt=""
		width={size}
		height={size}
		loading="lazy"
		style:--color={color}
		style:--size="{size}px"
		onerror={() => (failed = true)}
	/>
{:else}
	<span class="avatar" style:--color={color} style:--size="{size}px" aria-hidden="true">{initials}</span>
{/if}

<style>
	.avatar {
		flex: none;
		display: inline-grid;
		place-items: center;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background: color-mix(in srgb, var(--color) 22%, var(--bg-deep));
		border: 1px solid var(--color);
		color: var(--color);
		font-family: var(--f-sys);
		font-weight: 700;
		font-size: calc(var(--size) * 0.4);
		letter-spacing: 0.02em;
	}

	.photo {
		object-fit: cover;
		box-shadow: 0 0 0 1px var(--color);
		border: none;
	}
</style>
