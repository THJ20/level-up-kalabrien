<script lang="ts">
	import { Lock, Medal } from '@lucide/svelte';
	import { BADGES, type BadgeGroup } from '#lib/domain/index.ts';

	let { earned }: { earned: { badgeId: string; earnedAt: Date }[] } = $props();

	const earnedIds = $derived(new Set(earned.map((badge) => badge.badgeId)));
	const groups: BadgeGroup[] = ['Durchhalten', 'Rang', 'Volumen', 'Bonus', 'Spaß'];
</script>

<div class="groups">
	{#each groups as group (group)}
		<section>
			<h3 class="sys">{group}</h3>
			<ul>
				{#each BADGES.filter((badge) => badge.group === group) as badge (badge.id)}
					{@const has = earnedIds.has(badge.id)}
					<li class:has title={badge.description}>
						<span class="icon" aria-hidden="true">
							{#if has}<Medal size={18} />{:else}<Lock size={14} />{/if}
						</span>
						<span class="text">
							<span class="name">{badge.name}</span>
							<span class="desc">{badge.description}</span>
						</span>
						<span class="visually-hidden">{has ? 'erreicht' : 'noch gesperrt'}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<style>
	.groups {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	h3 {
		font-size: 12px;
		color: var(--dim);
		margin-bottom: 6px;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 8px;
	}

	li {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border: 1px solid var(--line-faint);
		background: rgba(10, 6, 20, 0.6);
		opacity: 0.5;
	}

	li.has {
		opacity: 1;
		border-color: var(--line);
		background: rgba(164, 124, 255, 0.12);
		box-shadow: 0 0 12px var(--glow-soft);
	}

	.icon {
		flex: none;
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(164, 124, 255, 0.1);
		color: var(--muted);
	}

	.has .icon {
		color: var(--gold);
		background: rgba(245, 197, 66, 0.14);
	}

	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.name {
		font-size: 14px;
		font-weight: 600;
	}

	.desc {
		font-size: 12px;
		color: var(--dim);
	}
</style>
