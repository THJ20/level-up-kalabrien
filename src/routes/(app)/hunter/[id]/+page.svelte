<script lang="ts">
	import { BADGES } from '#lib/domain/index.ts';
	import { count, points } from '#lib/client/format.ts';
	import Avatar from '#lib/ui/Avatar.svelte';
	import BadgeGrid from '#lib/ui/BadgeGrid.svelte';
	import DayGrid from '#lib/ui/DayGrid.svelte';
	import Panel from '#lib/ui/Panel.svelte';
	import ProgressBar from '#lib/ui/ProgressBar.svelte';
	import RankBadge from '#lib/ui/RankBadge.svelte';
	import VerdictList from '#lib/ui/penalties/VerdictList.svelte';

	let { data } = $props();

	const summary = $derived(data.profile.summary);
	const latestBadge = $derived(summary.badges.at(-1));
	const title = $derived(
		latestBadge ? (BADGES.find((badge) => badge.id === latestBadge.badgeId)?.name ?? '') : 'Noch kein Titel'
	);
	const stats = $derived([
		{ label: 'Quests erfüllt', value: count(summary.level.quests) },
		{ label: 'Streak', value: `${summary.streak.current}` },
		{ label: 'Längster Streak', value: `${summary.streak.longest}` },
		{ label: 'Bonuspunkte', value: points(summary.bonusPoints) },
		{ label: 'Liegestütze', value: count(data.profile.volume.pushups) },
		{ label: 'Kniebeugen', value: count(data.profile.volume.squats) },
		{ label: 'Sit-ups', value: count(data.profile.volume.situps) },
		{ label: 'Verpasst', value: `${data.profile.missedDays}` },
		{ label: 'Krank', value: `${data.profile.sickDays}` }
	]);
</script>

<svelte:head><title>{summary.hunter.name} · Status · Level Up</title></svelte:head>

<div class="page">
	<Panel>
		<p class="kicker sys">[ Status ]</p>
		<div class="status">
			<RankBadge rank={summary.level.rank} size={84} />
			<div class="who">
				<div class="name">
					<Avatar name={summary.hunter.name} color={summary.hunter.color} size={26} />
					<h1>{summary.hunter.name}</h1>
				</div>
				<p class="line sys">Level <b class="num">{summary.level.level}</b> · {summary.level.rank}-Rank Hunter</p>
				<p class="line sys">Title: <b>{title}</b></p>
				<div class="xp"><ProgressBar value={summary.level.progress} label="Fortschritt bis zum nächsten Level" /></div>
				<p class="xptext num">{count(summary.level.xp)} XP</p>
			</div>
		</div>
		<dl class="stats">
			{#each stats as stat (stat.label)}
				<div>
					<dt>{stat.label}</dt>
					<dd class="num">{stat.value}</dd>
				</div>
			{/each}
		</dl>
	</Panel>

	<div class="columns">
		<Panel title="Badges" aside="{summary.badges.length} / {BADGES.length}">
			<BadgeGrid earned={summary.badges} />
		</Panel>
		<div class="stack">
			<Panel title="Kalender">
				<DayGrid days={data.profile.calendar} />
			</Panel>
			<Panel title="Strafbuch">
				<VerdictList verdicts={data.profile.verdicts} showHunter={false} />
			</Panel>
		</div>
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.kicker {
		text-align: center;
		font-size: 12px;
		letter-spacing: 0.32em;
		color: var(--dim);
		margin-bottom: 14px;
	}

	.status {
		display: flex;
		gap: 18px;
		align-items: center;
	}

	.who {
		flex: 1;
		min-width: 0;
	}

	.name {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	h1 {
		font-size: 22px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.line {
		margin-top: 4px;
		font-size: 13px;
		color: var(--dim);
		letter-spacing: 0.1em;
	}

	.line b {
		color: var(--text);
	}

	.xp {
		margin-top: 10px;
	}

	.xptext {
		margin-top: 4px;
		font-size: 12px;
		color: var(--muted);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		margin: 18px 0 0;
		padding-top: 14px;
		border-top: 1px solid var(--line-faint);
	}

	.stats div {
		min-width: 0;
	}

	dt {
		font-size: 12px;
		color: var(--dim);
	}

	dd {
		margin: 2px 0 0;
		font-size: 20px;
		font-weight: 700;
		color: var(--accent-text);
	}

	.columns {
		display: grid;
		gap: 16px;
		align-items: start;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	@media (min-width: 1024px) {
		.columns {
			grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
		}

		.stats {
			grid-template-columns: repeat(9, minmax(0, 1fr));
		}
	}
</style>
