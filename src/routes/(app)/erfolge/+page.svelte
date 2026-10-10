<script lang="ts">
	import { BADGE_GROUPS } from '#lib/domain/index.ts';
	import { dayLabel, decimal } from '#lib/client/format.ts';
	import { localDateOf } from '#lib/domain/index.ts';
	import Avatar from '#lib/ui/Avatar.svelte';
	import BadgeCard from '#lib/ui/BadgeCard.svelte';
	import Panel from '#lib/ui/Panel.svelte';
	import ProgressBar from '#lib/ui/ProgressBar.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';
	import { BADGE_ICONS } from '#lib/ui/badge-icons.ts';

	let { data } = $props();

	type Filter = 'all' | 'earned' | 'open';
	let filter = $state<Filter>('all');
	let openId = $state<string | null>(null);
	let sheetOpen = $state(false);

	const overview = $derived(data.overview);
	const total = $derived(overview.badges.length);
	const meId = $derived(data.me.id);

	/** Je Badge: welche Hunter ihn wann bekommen haben. */
	const holdersById = $derived.by(() => {
		const map = new Map<string, { hunter: (typeof overview.hunters)[number]['hunter']; earnedAt: Date }[]>();
		for (const entry of overview.hunters) {
			for (const badge of entry.earned) {
				map.set(badge.badgeId, [...(map.get(badge.badgeId) ?? []), { hunter: entry.hunter, earnedAt: badge.earnedAt }]);
			}
		}
		return map;
	});

	const mine = $derived(
		new Map((overview.hunters.find((entry) => entry.hunter.id === meId)?.earned ?? []).map((badge) => [badge.badgeId, badge.earnedAt]))
	);

	const standings = $derived(
		[...overview.hunters].sort(
			(a, b) => b.earned.length - a.earned.length || a.hunter.name.localeCompare(b.hunter.name, 'de')
		)
	);

	const visible = $derived(
		overview.badges.filter((badge) =>
			filter === 'all' ? true : filter === 'earned' ? mine.has(badge.id) : !mine.has(badge.id)
		)
	);

	const selected = $derived(overview.badges.find((badge) => badge.id === openId) ?? null);
	const SelectedIcon = $derived(selected ? BADGE_ICONS[selected.icon] : null);

	function open(id: string) {
		openId = id;
		sheetOpen = true;
	}
</script>

<svelte:head><title>Erfolge · Level Up</title></svelte:head>

<div class="page">
	<h1 class="sys">Erfolge</h1>

	<Panel title="Stand der Hunter" aside="{mine.size} / {total} bei dir">
		<ul class="standings">
			{#each standings as entry (entry.hunter.id)}
				<li class:me={entry.hunter.id === meId}>
					<Avatar name={entry.hunter.name} color={entry.hunter.color} src={entry.hunter.avatarUrl} size={30} />
					<span class="who">{entry.hunter.name}{entry.hunter.id === meId ? ' (du)' : ''}</span>
					<span class="bar"><ProgressBar value={entry.earned.length / total} height={6} label="Badges von {entry.hunter.name}" /></span>
					<span class="count num">{entry.earned.length}</span>
				</li>
			{/each}
		</ul>
	</Panel>

	<div class="filter">
		<Segmented
			label="Badges filtern"
			bind:value={filter}
			options={[
				{ value: 'all', label: 'Alle' },
				{ value: 'earned', label: 'Erreicht' },
				{ value: 'open', label: 'Offen' }
			]}
		/>
	</div>

	{#each BADGE_GROUPS as group (group)}
		{@const badges = visible.filter((badge) => badge.group === group)}
		{#if badges.length > 0}
			<section>
				<h2 class="sys">{group}</h2>
				<div class="grid">
					{#each badges as badge (badge.id)}
						<BadgeCard
							{badge}
							earnedAt={mine.get(badge.id) ?? null}
							progress={overview.progress[badge.id] ?? null}
							holders={(holdersById.get(badge.id) ?? []).map((entry) => entry.hunter)}
							onOpen={() => open(badge.id)}
						/>
					{/each}
				</div>
			</section>
		{/if}
	{/each}
	{#if visible.length === 0}
		<p class="empty">{filter === 'earned' ? 'Noch kein Badge erreicht. Die erste Daily Quest bringt dir „Erwacht“.' : 'Du hast alle Badges. Respekt, Hunter.'}</p>
	{/if}
</div>

<Sheet bind:open={sheetOpen} title={selected?.name ?? 'Badge'}>
	{#if selected}
		{@const holders = holdersById.get(selected.id) ?? []}
		{@const progress = overview.progress[selected.id]}
		<div class="detail">
			<span class="emblem" class:earned={mine.has(selected.id)} aria-hidden="true">
				{#if SelectedIcon}<SelectedIcon size={34} strokeWidth={1.75} />{/if}
			</span>
			<p class="how">{selected.description}</p>
			{#if !mine.has(selected.id) && progress && selected.target > 1}
				<p class="mine num">
					Dein Stand: {decimal(Math.min(progress.current, progress.target))} von {decimal(progress.target)} {selected.unit}
				</p>
			{/if}
			<h3 class="sys">{holders.length === 0 ? 'Noch niemand' : `${holders.length} von ${overview.hunters.length} Huntern`}</h3>
			<ul class="holders">
				{#each overview.hunters as entry (entry.hunter.id)}
					{@const has = holders.find((holder) => holder.hunter.id === entry.hunter.id)}
					<li class:has>
						<Avatar name={entry.hunter.name} color={entry.hunter.color} src={entry.hunter.avatarUrl} size={28} />
						<span class="who">{entry.hunter.name}</span>
						<span class="when">{has ? `seit ${dayLabel(localDateOf(new Date(has.earnedAt)))}` : 'offen'}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</Sheet>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	h1 {
		font-size: 20px;
		letter-spacing: 0.2em;
	}

	h2 {
		margin-bottom: 10px;
		font-size: 13px;
		color: var(--dim);
		letter-spacing: 0.2em;
	}

	.standings {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.standings li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) minmax(60px, 2fr) auto;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		border-top: 1px solid var(--line-faint);
	}

	.standings li:first-child {
		border-top: none;
	}

	.standings li.me .who {
		color: var(--accent-text);
		font-weight: 600;
	}

	.who {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.count {
		min-width: 2ch;
		text-align: right;
		font-weight: 600;
	}

	.filter {
		max-width: 360px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 10px;
	}

	.empty {
		color: var(--muted);
	}

	.detail {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		text-align: center;
	}

	.emblem {
		display: grid;
		place-items: center;
		width: 76px;
		height: 76px;
		clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
		background: var(--unscored);
		color: var(--muted);
	}

	.emblem.earned {
		background: radial-gradient(circle at 50% 35%, rgba(var(--accent-rgb), 0.6), var(--rank-core) 75%);
		color: var(--text);
	}

	.how {
		font-size: 16px;
	}

	.mine {
		color: var(--accent-text);
		font-size: 14px;
	}

	h3 {
		align-self: stretch;
		margin-top: 8px;
		text-align: left;
		font-size: 12px;
		color: var(--dim);
	}

	.holders {
		align-self: stretch;
		list-style: none;
		margin: 0;
		padding: 0;
		text-align: left;
	}

	.holders li {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 42px;
		border-top: 1px solid var(--line-faint);
		color: var(--muted);
	}

	.holders li.has {
		color: var(--text);
	}

	.holders .who {
		flex: 1;
	}

	.when {
		font-size: 13px;
	}
</style>
