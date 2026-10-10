<script lang="ts">
	import BoardPanel from '#lib/ui/quest/BoardPanel.svelte';
	import BonusPanel from '#lib/ui/quest/BonusPanel.svelte';
	import CountdownHero from '#lib/ui/quest/CountdownHero.svelte';
	import DayNav from '#lib/ui/quest/DayNav.svelte';
	import HunterCard from '#lib/ui/quest/HunterCard.svelte';
	import QuestPanel from '#lib/ui/quest/QuestPanel.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Quest · Level Up</title></svelte:head>

<div class="page">
	<div class="top">
		<CountdownHero daysLeft={data.summary.daysUntilDeparture} dayNumber={data.summary.dayNumber} />
		<HunterCard
			name={data.summary.hunter.name}
			level={data.summary.level}
			streak={data.summary.streak}
			bonusPoints={data.summary.bonusPoints}
		/>
	</div>

	{#if data.detail}
		<div class="columns">
			<div class="main">
				<DayNav date={data.date} today={data.summary.today} calendar={data.calendar} />
				{#key data.date}
					<QuestPanel date={data.date} isToday={data.isToday} day={data.detail.day} sets={data.detail.sets} />
				{/key}
				<BonusPanel
					date={data.date}
					entries={data.detail.bonus}
					overtimePoints={data.detail.day?.overtimePoints ?? 0}
					exercises={data.exercises}
				/>
			</div>
			<aside class="side">
				<BoardPanel rows={data.board} meId={data.summary.hunter.id} />
			</aside>
		</div>
	{:else}
		<p class="ended sys">Die Challenge ist vorbei. Ab nach Kalabrien.</p>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.top {
		display: grid;
		gap: 16px;
	}

	.columns {
		display: grid;
		gap: 16px;
	}

	.main,
	.side {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	.ended {
		text-align: center;
		padding: 40px 0;
		color: var(--accent-text);
	}

	@media (min-width: 1024px) {
		.top {
			grid-template-columns: 1fr minmax(320px, 420px);
			align-items: center;
		}

		.columns {
			grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
			align-items: start;
		}

		.side {
			position: sticky;
			top: 28px;
		}
	}
</style>
