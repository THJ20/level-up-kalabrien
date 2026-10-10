<script lang="ts">
	import { Lock } from '@lucide/svelte';
	import type { HunterRefView } from '#lib/shared/constants.ts';
	import { decimal } from '#lib/client/format.ts';
	import Avatar from './Avatar.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import { BADGE_ICONS } from './badge-icons';

	interface Badge {
		id: string;
		name: string;
		description: string;
		icon: string;
		target: number;
		unit: string;
	}

	let {
		badge,
		earnedAt,
		progress,
		holders,
		onOpen
	}: {
		badge: Badge;
		earnedAt: Date | null;
		progress: { current: number; target: number } | null;
		holders: HunterRefView[];
		onOpen: () => void;
	} = $props();

	const Icon = $derived(BADGE_ICONS[badge.icon]);
	const showProgress = $derived(!earnedAt && progress !== null && badge.target > 1);
</script>

<button type="button" class="card" class:earned={!!earnedAt} onclick={onOpen} aria-label="{badge.name}, {earnedAt ? 'erreicht' : 'noch offen'}. Details anzeigen">
	<span class="emblem" aria-hidden="true">
		{#if Icon}<Icon size={26} strokeWidth={1.75} />{/if}
		{#if !earnedAt}<span class="lock"><Lock size={12} /></span>{/if}
	</span>
	<span class="body">
		<span class="name sys">{badge.name}</span>
		<span class="desc">{badge.description}</span>
		{#if showProgress && progress}
			<span class="progress">
				<ProgressBar value={Math.min(1, progress.current / progress.target)} height={4} label="Fortschritt {badge.name}" />
				<span class="num">{decimal(Math.min(progress.current, progress.target))} / {decimal(progress.target)} {badge.unit}</span>
			</span>
		{/if}
		{#if holders.length > 0}
			<span class="holders">
				{#each holders.slice(0, 5) as hunter (hunter.id)}
					<Avatar name={hunter.name} color={hunter.color} src={hunter.avatarUrl} size={20} />
				{/each}
				{#if holders.length > 5}<span class="more">+{holders.length - 5}</span>{/if}
			</span>
		{/if}
	</span>
</button>

<style>
	.card {
		display: flex;
		gap: 12px;
		width: 100%;
		padding: 12px;
		border: 1px solid var(--line-faint);
		background: rgba(var(--accent-rgb), 0.03);
		color: var(--text);
		text-align: left;
		cursor: pointer;
		transition:
			border-color 0.15s,
			transform 0.1s;
	}

	.card:hover {
		border-color: var(--line-dim);
	}

	.card:active {
		transform: scale(0.99);
	}

	.card.earned {
		border-color: var(--line-dim);
		background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.16), rgba(var(--accent-rgb), 0.03) 70%);
	}

	.emblem {
		position: relative;
		flex: none;
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
		background: var(--unscored);
		color: var(--muted);
	}

	.earned .emblem {
		background: radial-gradient(circle at 50% 35%, rgba(var(--accent-rgb), 0.55), var(--rank-core) 75%);
		color: var(--text);
		filter: drop-shadow(0 0 8px var(--glow));
	}

	.lock {
		position: absolute;
		bottom: 8px;
		right: 12px;
		color: var(--muted);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.name {
		font-size: 13px;
		letter-spacing: 0.08em;
		color: var(--dim);
	}

	.earned .name {
		color: var(--accent-text);
	}

	.desc {
		font-size: 14px;
		color: var(--dim);
	}

	.earned .desc {
		color: var(--text);
	}

	.progress {
		display: flex;
		flex-direction: column;
		gap: 3px;
		margin-top: 4px;
		font-size: 12px;
		color: var(--muted);
	}

	.holders {
		display: flex;
		align-items: center;
		gap: 2px;
		margin-top: 6px;
	}

	.more {
		margin-left: 4px;
		font-size: 12px;
		color: var(--muted);
	}
</style>
