<script lang="ts">
	import { Flame } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { points } from '#lib/client/format.ts';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Panel from '#lib/ui/Panel.svelte';
	import RankBadge from '#lib/ui/RankBadge.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';

	let { data } = $props();

	type Tab = 'gesamt' | 'bonus' | 'streak';
	type Period = 'woche' | 'monat' | 'gesamt';

	const tab = $derived(data.tab);
	const period = $derived(data.period);

	function show(nextTab: Tab, nextPeriod: Period) {
		const params = new URLSearchParams();
		if (nextTab !== 'gesamt') params.set('wertung', nextTab);
		if (nextTab === 'bonus' && nextPeriod !== 'woche') params.set('zeitraum', nextPeriod);
		goto(`/rangliste${params.size ? `?${params}` : ''}`, { replace: true, reset: false });
	}

	const rows = $derived(tab === 'gesamt' ? data.board.overall : tab === 'bonus' ? data.board.bonus : data.board.streaks);
</script>

<svelte:head><title>Rangliste · Level Up</title></svelte:head>

<div class="page">
	<h1 class="sys">Rangliste</h1>
	<Segmented
		label="Wertung"
		value={tab}
		onchange={(next) => show(next as Tab, period)}
		options={[
			{ value: 'gesamt', label: 'Gesamt' },
			{ value: 'bonus', label: 'Bonus' },
			{ value: 'streak', label: 'Streak' }
		]}
	/>
	{#if tab === 'bonus'}
		<Segmented
			label="Zeitraum"
			value={period}
			onchange={(next) => show(tab, next as Period)}
			options={[
				{ value: 'woche', label: 'Diese Woche' },
				{ value: 'monat', label: '30 Tage' },
				{ value: 'gesamt', label: 'Gesamt' }
			]}
		/>
	{/if}

	<Panel>
		<p class="explain">
			{#if tab === 'gesamt'}
				Sortiert nach Level, bei Gleichstand nach Bonuspunkten.
			{:else if tab === 'bonus'}
				Bonuspunkte {data.period === 'gesamt' ? 'seit Start' : data.period === 'monat' ? 'der letzten 30 Tage' : 'dieser Woche'}. Zusatzsport und Wiederholungen über 100.
			{:else}
				Erfüllte Tage am Stück. Kranktage pausieren den Streak.
			{/if}
		</p>
		<ol class="list">
			{#each rows as row, index (row.hunter.id)}
				<li class:me={row.hunter.id === data.me.id}>
					<span class="pos num pos-{index + 1}">{index + 1}</span>
					<a class="who" href="/hunter/{row.hunter.id}">
						<Avatar name={row.hunter.name} color={row.hunter.color} src={row.hunter.avatarUrl} size={34} />
						<span class="name">{row.hunter.name}</span>
					</a>
					{#if tab === 'gesamt'}
						<span class="rank"><RankBadge rank={row.rank} size={30} /></span>
						<span class="metric">
							<b class="num">Lv. {row.level}</b>
							<span class="sub num">{points(row.bonusPoints)} BP</span>
						</span>
					{:else if tab === 'bonus'}
						<span class="metric">
							<b class="num">{points(row.periodBonusPoints)}</b>
							<span class="sub">BP</span>
						</span>
					{:else}
						<span class="metric">
							<b class="num"><Flame size={15} /> {row.streak.current}</b>
							<span class="sub num">Bestwert {row.streak.longest}</span>
						</span>
					{/if}
				</li>
			{/each}
		</ol>
	</Panel>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-width: 760px;
	}

	h1 {
		font-size: 20px;
		letter-spacing: 0.2em;
	}

	.explain {
		font-size: 13px;
		color: var(--dim);
		margin-bottom: 8px;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 60px;
		border-bottom: 1px solid var(--line-faint);
	}

	li.me {
		background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.12), transparent);
	}

	.pos {
		width: 28px;
		text-align: center;
		font-size: 18px;
		font-weight: 700;
		color: var(--muted);
	}

	.pos-1 {
		color: var(--gold);
		text-shadow: 0 0 10px rgba(245, 197, 66, 0.6);
	}

	.pos-2 {
		color: #d6d3e6;
	}

	.pos-3 {
		color: #e0a473;
	}

	.who {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 10px;
		color: inherit;
		text-decoration: none;
	}

	.name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.metric {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		min-width: 76px;
	}

	.metric b {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 17px;
	}

	.metric :global(svg) {
		color: #ff9a4f;
	}

	.sub {
		font-size: 12px;
		color: var(--dim);
	}
</style>
