<script lang="ts">
	import BoardPanel from '#lib/ui/quest/BoardPanel.svelte';
	import BonusPanel from '#lib/ui/quest/BonusPanel.svelte';
	import CountdownHero from '#lib/ui/quest/CountdownHero.svelte';
	import DayNav from '#lib/ui/quest/DayNav.svelte';
	import HunterCard from '#lib/ui/quest/HunterCard.svelte';
	import QuestPanel from '#lib/ui/quest/QuestPanel.svelte';
	import FeedEntry from '#lib/ui/FeedEntry.svelte';
	import Panel from '#lib/ui/Panel.svelte';

	let { data } = $props();

	let now = $state(new Date());
	$effect(() => {
		const timer = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(timer);
	});
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
				{#if data.feed.length > 0}
					<Panel title="Neueste Aktivität">
						<div class="feed">
							{#each data.feed as item (item.id)}
								<FeedEntry {item} viewerId={data.summary.hunter.id} {now} compact />
							{/each}
						</div>
						<a class="more" href="/feed">Zum Feed</a>
					</Panel>
				{/if}
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

	.feed {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.more {
		display: inline-block;
		margin-top: 10px;
		font-size: 14px;
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
