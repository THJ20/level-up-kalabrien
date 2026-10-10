<script lang="ts">
	import type { HunterRefView } from '#lib/shared/constants.ts';
	import { dayLabel } from '#lib/client/format.ts';
	import Avatar from '../Avatar.svelte';

	interface Verdict {
		id: string;
		hunter: HunterRefView;
		date: string;
		penalty: { title: string; description: string };
		decidedByLot: boolean;
		status: 'imposed' | 'lifted';
		liftReason: 'backfill' | 'sick' | null;
	}

	let { verdicts, showHunter = true }: { verdicts: Verdict[]; showHunter?: boolean } = $props();
</script>

{#if verdicts.length === 0}
	<p class="empty">Noch keine Urteile. Hoffentlich bleibt das so.</p>
{:else}
	<ul>
		{#each verdicts as verdict (verdict.id)}
			<li class:lifted={verdict.status === 'lifted'}>
				{#if showHunter}<Avatar name={verdict.hunter.name} color={verdict.hunter.color} src={verdict.hunter.avatarUrl} size={30} />{/if}
				<div class="text">
					<span class="title">{verdict.penalty.title}</span>
					<span class="meta">
						{showHunter ? `${verdict.hunter.name} · ` : ''}{dayLabel(verdict.date)}{verdict.decidedByLot ? ' · per Los' : ''}
						{#if verdict.status === 'lifted'}
							· aufgehoben durch {verdict.liftReason === 'sick' ? 'Krankmeldung' : 'Nachtrag'}
						{/if}
					</span>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.empty {
		color: var(--muted);
		font-size: 14px;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 0;
		border-bottom: 1px solid var(--line-faint);
	}

	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.title {
		font-weight: 600;
	}

	.meta {
		font-size: 13px;
		color: var(--dim);
	}

	.lifted .title {
		text-decoration: line-through;
		color: var(--muted);
	}
</style>
