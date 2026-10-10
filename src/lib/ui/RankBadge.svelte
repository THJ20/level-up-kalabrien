<script lang="ts">
	let { rank, size = 56 }: { rank: string; size?: number } = $props();
</script>

<div class="rank rank-{rank.toLowerCase()}" style:--size="{size}px" aria-label="Rang {rank}">
	<span>{rank}</span>
</div>

<style>
	.rank {
		flex: none;
		width: var(--size);
		height: var(--size);
		display: grid;
		place-items: center;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: radial-gradient(circle, #2b1257 0%, rgba(20, 10, 36, 0.4) 75%);
		box-shadow:
			0 0 18px var(--glow-soft),
			inset 0 0 12px rgba(164, 124, 255, 0.25);
	}

	span {
		font-family: var(--f-sys);
		font-weight: 700;
		font-size: calc(var(--size) * 0.58);
		line-height: 1;
		color: var(--text);
		text-shadow: 0 0 14px var(--glow);
	}

	.rank-s {
		border-color: var(--gold);
		box-shadow:
			0 0 24px rgba(245, 197, 66, 0.35),
			inset 0 0 14px rgba(245, 197, 66, 0.25);
	}

	.rank-s span {
		color: #ffe9a8;
		text-shadow: 0 0 16px rgba(245, 197, 66, 0.8);
	}
</style>
