<script lang="ts">
	import { CHALLENGE_DAYS, CHALLENGE_START } from '#lib/domain/index.ts';
	import { dayLabel } from '#lib/client/format.ts';
	import ProgressBar from '../ProgressBar.svelte';

	let { daysLeft, dayNumber, today }: { daysLeft: number; dayNumber: number | null; today: string } = $props();

	const beforeStart = $derived(today < CHALLENGE_START);
</script>

<section class="hero" aria-label="Countdown bis Kalabrien">
	<p class="count num">{daysLeft}</p>
	<p class="label sys">{daysLeft === 1 ? 'Tag bis Kalabrien' : 'Tage bis Kalabrien'}</p>
	<div class="bar">
		<ProgressBar
			value={beforeStart ? 0 : (dayNumber ?? CHALLENGE_DAYS) / CHALLENGE_DAYS}
			height={4}
			label="Fortschritt der Challenge"
		/>
	</div>
	<p class="sub">
		{#if dayNumber}Tag {dayNumber} von {CHALLENGE_DAYS}{:else if beforeStart}Aufwärmphase · Start {dayLabel(CHALLENGE_START)}{:else}Challenge beendet{/if}
		· Abflug Do, 29.04.2027
	</p>
</section>

<style>
	.hero {
		text-align: center;
		padding: 6px 0 2px;
	}

	.count {
		font-size: clamp(64px, 18vw, 92px);
		font-weight: 700;
		line-height: 1;
		color: var(--accent-text);
		text-shadow:
			0 0 26px var(--glow),
			0 0 60px rgba(var(--glow-rgb), 0.35);
	}

	.label {
		margin-top: 6px;
		font-size: 13px;
		letter-spacing: 0.28em;
		color: var(--dim);
	}

	.bar {
		max-width: 360px;
		margin: 12px auto 6px;
	}

	.sub {
		font-size: 13px;
		color: var(--dim);
	}
</style>
