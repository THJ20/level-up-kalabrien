<script lang="ts">
	import { RATINGS, RATING_LABELS, type LocalDate, type ProgressionReason, type Rating } from '#lib/domain/index.ts';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import { dayLabel } from '#lib/client/format.ts';
	import Panel from '../Panel.svelte';

	interface Progression {
		rating: Rating | null;
		nextMonday: LocalDate | null;
		preview: { reason: ProgressionReason; step: number };
		fulfilledThisWeek: number;
		neededPerWeek: number;
		capped: boolean;
	}

	let {
		progression,
		title = 'Wie fühlt sich dein Plan an?',
		intro = 'Deine Bewertung sieht nur du. Sie bestimmt, wie stark dein Plan am Montag gesteigert wird.'
	}: { progression: Progression; title?: string; intro?: string } = $props();

	let busy = $state(false);
	let error = $state('');

	const percent = (step: number) => `${step > 0 ? '+' : '−'}${Math.round(Math.abs(step) * 100)} %`;

	const outlook = $derived.by(() => {
		const { nextMonday, preview, fulfilledThisWeek, neededPerWeek } = progression;
		if (!nextMonday) return 'Ab jetzt wird nicht mehr gesteigert. Die Challenge ist fast geschafft.';
		const when = `Ab ${dayLabel(nextMonday)}`;
		switch (preview.reason) {
			case 'weak_week':
				return `${when} bleibt dein Plan gleich. Für eine Steigerung brauchst du ${neededPerWeek} erfüllte Tage in der Woche, bisher sind es ${fulfilledThisWeek}.`;
			case 'capped':
				return `${when} bleibt dein Plan gleich. Er dauert schon rund 30 Minuten. Lass dir mit dem KI-Prompt unten schwerere Varianten geben.`;
			case 'reduced':
				return `${when} wird dein Plan etwas leichter (${percent(preview.step)}).`;
			default: {
				const missing = Math.max(0, neededPerWeek - fulfilledThisWeek);
				const harder = `${when} wird dein Plan schwerer (${percent(preview.step)})`;
				return missing > 0
					? `${harder}, wenn du diese Woche noch ${missing} ${missing === 1 ? 'Tag' : 'Tage'} erfüllst.`
					: `${harder}.`;
			}
		}
	});

	async function rate(rating: Rating) {
		busy = true;
		error = '';
		try {
			await apiFetch('/api/plan/rating', { method: 'PUT', body: { rating } });
			await refresh();
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}
</script>

<Panel {title}>
	<p class="intro">{intro}</p>
	<div class="ratings" role="radiogroup" aria-label="Bewertung deines Plans">
		{#each RATINGS as rating (rating)}
			<button
				type="button"
				class="rating r-{rating}"
				class:active={progression.rating === rating}
				role="radio"
				aria-checked={progression.rating === rating}
				disabled={busy}
				onclick={() => rate(rating)}
			>
				{RATING_LABELS[rating]}
			</button>
		{/each}
	</div>
	<p class="outlook">{outlook}</p>
	{#if !progression.rating && progression.nextMonday}
		<p class="hint">Ohne Bewertung zählt die Woche als passend.</p>
	{/if}
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}
</Panel>

<style>
	.intro {
		color: var(--dim);
		font-size: 14px;
	}

	.ratings {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
		margin: 12px 0;
	}

	.rating {
		min-height: 44px;
		padding: 8px 6px;
		border: 1px solid var(--line-dim);
		background: rgba(var(--accent-rgb), 0.05);
		color: var(--text);
		font-family: var(--f-sys);
		font-weight: 600;
		font-size: 13px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.rating.active {
		border-color: var(--line);
		background: rgba(var(--accent-rgb), 0.2);
		box-shadow: 0 0 12px var(--glow-soft);
	}

	.r-too_hard.active {
		border-color: var(--warn);
		background: var(--warn-soft);
	}

	.r-too_easy.active {
		border-color: var(--ok);
		background: var(--ok-soft);
	}

	.outlook {
		font-size: 14px;
	}
</style>
