<script lang="ts">
	import type { DayStatus } from '#lib/domain/index.ts';

	let { status, progress }: { status: DayStatus | null; progress?: number } = $props();

	const view = $derived.by(() => {
		switch (status) {
			case 'fulfilled':
				return { label: 'CLEAR', tone: 'ok' };
			case 'sick':
				return { label: 'KRANK', tone: 'sick' };
			case 'missed':
				return { label: 'VERPASST', tone: 'warn' };
			case 'unscored':
				return { label: 'OHNE WERTUNG', tone: 'dim' };
			case 'open':
				return { label: `${progress ?? 0} / 300`, tone: progress ? 'mid' : 'warn' };
			default:
				return { label: 'NOCH NICHT', tone: 'dim' };
		}
	});
</script>

<span class="chip tone-{view.tone}">{view.label}</span>

<style>
	.chip {
		display: inline-block;
		padding: 2px 8px;
		border: 1px solid;
		font-family: var(--f-sys);
		font-weight: 600;
		font-size: 12px;
		letter-spacing: 0.06em;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.tone-ok {
		color: var(--ok);
		border-color: var(--ok);
		background: var(--ok-soft);
	}

	.tone-warn {
		color: var(--warn);
		border-color: var(--warn);
		background: var(--warn-soft);
	}

	.tone-sick {
		color: var(--sick);
		border-color: var(--sick);
		background: var(--sick-soft);
	}

	.tone-mid {
		color: var(--accent-text);
		border-color: var(--line-dim);
	}

	.tone-dim {
		color: var(--muted);
		border-color: var(--line-faint);
	}
</style>
