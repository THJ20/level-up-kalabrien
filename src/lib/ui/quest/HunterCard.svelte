<script lang="ts">
	import { Flame, Sparkles } from '@lucide/svelte';
	import type { LevelProgress, StreakInfo } from '#lib/domain/index.ts';
	import { count, points } from '#lib/client/format.ts';
	import Avatar from '../Avatar.svelte';
	import Panel from '../Panel.svelte';
	import ProgressBar from '../ProgressBar.svelte';
	import RankBadge from '../RankBadge.svelte';

	let {
		name,
		color,
		avatarUrl,
		level,
		streak,
		bonusPoints
	}: {
		name: string;
		color: string;
		avatarUrl: string | null;
		level: LevelProgress;
		streak: StreakInfo;
		bonusPoints: number;
	} = $props();

	const xpText = $derived(
		level.xpToNext === null
			? `${count(level.xp)} XP · Maximales Level erreicht`
			: `${count(level.xp)} XP · noch ${count(level.xpToNext)} XP bis Lv. ${level.level + 1}`
	);
</script>

<Panel>
	<div class="card">
		<RankBadge rank={level.rank} size={60} />
		<div class="info">
			<p class="name"><Avatar {name} {color} src={avatarUrl} size={24} /><span>{name}</span></p>
			<p class="lvl sys">Lv. {level.level} · {level.rank}-Rank Hunter</p>
			<div class="xp"><ProgressBar value={level.progress} label="Fortschritt bis zum nächsten Level" /></div>
			<p class="xptext num">{xpText}</p>
		</div>
	</div>
	<div class="stats">
		<span class="stat"><Flame size={16} /> <span class="num">{streak.current}</span> Tage Streak</span>
		<span class="stat"><Sparkles size={16} /> <span class="num">{points(bonusPoints)}</span> BP</span>
	</div>
</Panel>

<style>
	.card {
		display: flex;
		gap: 14px;
		align-items: center;
	}

	.info {
		flex: 1;
		min-width: 0;
	}

	.name {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		font-size: 18px;
	}

	.name span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lvl {
		font-size: 12px;
		color: var(--dim);
		letter-spacing: 0.1em;
		margin: 2px 0 8px;
	}

	.xptext {
		margin-top: 5px;
		font-size: 12px;
		color: var(--muted);
	}

	.stats {
		display: flex;
		gap: 18px;
		margin-top: 12px;
		padding-top: 10px;
		border-top: 1px solid var(--line-faint);
		font-size: 14px;
		color: var(--dim);
	}

	.stat {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.stat :global(svg) {
		color: var(--line);
	}

	.stat .num {
		color: var(--text);
		font-weight: 600;
	}
</style>
