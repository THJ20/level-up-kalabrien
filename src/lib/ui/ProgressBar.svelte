<script lang="ts">
	let {
		value,
		tone = 'accent',
		height = 5,
		label
	}: { value: number; tone?: 'accent' | 'ok' | 'warn' | 'sick'; height?: number; label?: string } = $props();

	const percent = $derived(Math.round(Math.min(1, Math.max(0, value)) * 1000) / 10);
</script>

<div
	class="track"
	style:height="{height}px"
	role="progressbar"
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={percent}
	aria-label={label}
>
	<div class="fill tone-{tone}" style:width="{percent}%"></div>
</div>

<style>
	.track {
		position: relative;
		width: 100%;
		background: var(--track);
		overflow: hidden;
	}

	.fill {
		position: absolute;
		inset: 0 auto 0 0;
		background: var(--line);
		box-shadow: 0 0 10px var(--glow);
		transition: width 0.45s ease-out;
	}

	.tone-ok {
		background: var(--ok);
		box-shadow: 0 0 10px rgba(126, 240, 208, 0.5);
	}

	.tone-warn {
		background: var(--warn);
		box-shadow: none;
	}

	.tone-sick {
		background: var(--sick);
		box-shadow: none;
	}
</style>
