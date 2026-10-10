<script lang="ts">
	import { dayLabel } from '#lib/client/format.ts';
	import Panel from '#lib/ui/Panel.svelte';
	import PenaltyCatalog from '#lib/ui/penalties/PenaltyCatalog.svelte';
	import VerdictList from '#lib/ui/penalties/VerdictList.svelte';
	import VoteCard from '#lib/ui/penalties/VoteCard.svelte';

	let { data } = $props();

	const names = $derived(Object.fromEntries(data.hunters.map((hunter) => [hunter.id, hunter.name])));
</script>

<svelte:head><title>Strafen · Level Up</title></svelte:head>

<div class="page">
	<h1 class="sys">Strafen</h1>

	<section class="section">
		<h2 class="sys">Offene Abstimmungen</h2>
		{#if data.openVotes.length === 0}
			<p class="empty">Keine offene Abstimmung. Alle haben durchgezogen.</p>
		{:else}
			<div class="votes">
				{#each data.openVotes as vote (vote.id)}
					<VoteCard {vote} meId={data.me.id} />
				{/each}
			</div>
		{/if}
	</section>

	<div class="columns">
		<Panel title="Strafbuch" aside="{data.verdicts.filter((verdict) => verdict.status === 'imposed').length} offen">
			<VerdictList verdicts={data.verdicts} />
			{#if data.pastVotes.some((vote) => vote.status === 'cancelled')}
				<p class="sub sys">Entfallene Abstimmungen</p>
				<ul class="cancelled">
					{#each data.pastVotes.filter((vote) => vote.status === 'cancelled') as vote (vote.id)}
						<li>{vote.offender.name} · {dayLabel(vote.date)}</li>
					{/each}
				</ul>
			{/if}
		</Panel>
		<PenaltyCatalog penalties={data.penalties} meId={data.me.id} {names} />
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	h1 {
		font-size: 20px;
		letter-spacing: 0.2em;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	h2 {
		font-size: 13px;
		letter-spacing: 0.18em;
		color: var(--dim);
	}

	.empty {
		color: var(--muted);
	}

	.votes {
		display: grid;
		gap: 16px;
	}

	.columns {
		display: grid;
		gap: 16px;
		align-items: start;
	}

	.sub {
		margin-top: 16px;
		font-size: 12px;
		color: var(--dim);
	}

	.cancelled {
		margin: 6px 0 0;
		padding-left: 18px;
		color: var(--muted);
		font-size: 14px;
	}

	@media (min-width: 1024px) {
		.votes {
			grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
		}

		.columns {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
