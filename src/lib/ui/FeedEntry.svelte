<script lang="ts">
	import { apiFetch } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import { describeFeedItem } from '#lib/client/feed-text.ts';
	import { relativeTime } from '#lib/client/format.ts';
	import { REACTIONS, REACTION_EMOJI, type Reaction } from '#lib/shared/constants.ts';
	import Avatar from './Avatar.svelte';

	interface Item {
		id: string;
		type: string;
		createdAt: Date;
		hunter: { id: string; name: string; color: string };
		payload: Record<string, unknown>;
		reactions: Record<Reaction, number>;
		myReactions: Reaction[];
	}

	let { item, viewerId, now, compact = false }: { item: Item; viewerId: string; now: Date; compact?: boolean } = $props();

	const text = $derived(describeFeedItem(item, viewerId));
	let busy = $state(false);

	async function react(reaction: Reaction) {
		if (busy) return;
		busy = true;
		try {
			await apiFetch(`/api/feed/${item.id}/reactions`, { body: { reaction } });
			await refresh();
		} finally {
			busy = false;
		}
	}
</script>

<article class="entry tone-{text.tone}" class:compact>
	<a class="avatar" href="/hunter/{item.hunter.id}" aria-label="Statusfenster von {item.hunter.name}">
		<Avatar name={item.hunter.name} color={item.hunter.color} size={compact ? 28 : 36} />
	</a>
	<div class="body">
		<p class="text">{text.text}</p>
		{#if text.detail}<p class="detail">{text.detail}</p>{/if}
		<p class="time"><time datetime={item.createdAt.toISOString()}>{relativeTime(item.createdAt, now)}</time></p>
		{#if !compact}
			<div class="reactions" role="group" aria-label="Reaktionen">
				{#each REACTIONS as reaction (reaction)}
					<button
						type="button"
						class:active={item.myReactions.includes(reaction)}
						aria-pressed={item.myReactions.includes(reaction)}
						aria-label="Reaktion {REACTION_EMOJI[reaction]}"
						onclick={() => react(reaction)}
					>
						<span aria-hidden="true">{REACTION_EMOJI[reaction]}</span>
						{#if item.reactions[reaction] > 0}<span class="num">{item.reactions[reaction]}</span>{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</article>

<style>
	.entry {
		display: flex;
		gap: 12px;
		padding: 12px 0 12px 12px;
		border-left: 3px solid var(--line-dim);
	}

	.compact {
		padding: 8px 0 8px 10px;
	}

	.tone-ok {
		border-left-color: var(--ok);
	}

	.tone-warn {
		border-left-color: var(--warn);
	}

	.tone-sick {
		border-left-color: var(--sick);
	}

	.tone-gold {
		border-left-color: var(--gold);
	}

	.avatar {
		text-decoration: none;
		align-self: flex-start;
	}

	.body {
		flex: 1;
		min-width: 0;
	}

	.text {
		overflow-wrap: anywhere;
	}

	.compact .text {
		font-size: 14px;
	}

	.detail {
		margin-top: 2px;
		font-size: 14px;
		color: var(--dim);
	}

	.time {
		margin-top: 2px;
		font-size: 12px;
		color: var(--muted);
	}

	.reactions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}

	.reactions button {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-height: 32px;
		padding: 2px 10px;
		border: 1px solid var(--line-faint);
		border-radius: 16px;
		background: rgba(164, 124, 255, 0.04);
		cursor: pointer;
		font-size: 14px;
	}

	.reactions button.active {
		border-color: var(--line);
		background: rgba(164, 124, 255, 0.18);
	}

	.reactions .num {
		font-size: 13px;
		color: var(--accent-text);
	}
</style>
