<script lang="ts">
	import { serverNow } from '#lib/client/server-clock.svelte.ts';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import FeedEntry from '#lib/ui/FeedEntry.svelte';
	import Panel from '#lib/ui/Panel.svelte';

	let { data } = $props();

	type Item = (typeof data.items)[number];

	let older = $state<Item[]>([]);
	let exhausted = $state(false);
	let busy = $state(false);
	let error = $state('');
	let now = $state(new Date(serverNow()));

	$effect(() => {
		const timer = setInterval(() => (now = new Date(serverNow())), 60_000);
		return () => clearInterval(timer);
	});

	const items = $derived.by(() => {
		const known = new Set(data.items.map((item) => item.id));
		return [...data.items, ...older.filter((item) => !known.has(item.id))];
	});

	async function loadMore() {
		const last = items.at(-1);
		if (!last) return;
		busy = true;
		error = '';
		try {
			const { items: next } = await apiFetch<{ items: (Omit<Item, 'createdAt'> & { createdAt: string })[] }>(
				`/api/feed?before=${new Date(last.createdAt).getTime()}&limit=30`
			);
			older = [...older, ...next.map((item) => ({ ...item, createdAt: new Date(item.createdAt) }))];
			if (next.length < 30) exhausted = true;
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Feed · Level Up</title></svelte:head>

<div class="page">
	<h1 class="sys">Feed</h1>
	<Panel>
		{#if items.length === 0}
			<p class="empty">Hier erscheint alles, was die Hunter eintragen, schaffen und verpassen.</p>
		{:else}
			<div class="list">
				{#each items as item (item.id)}
					<FeedEntry {item} viewerId={data.me.id} {now} />
				{/each}
			</div>
			{#if error}<p class="form-error" role="alert">{error}</p>{/if}
			{#if !exhausted && items.length >= 30}
				<button class="btn btn-block more" type="button" disabled={busy} onclick={loadMore}>
					{busy ? 'Lade …' : 'Ältere Einträge laden'}
				</button>
			{/if}
		{/if}
	</Panel>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-width: 760px;
	}

	h1 {
		font-size: 20px;
		letter-spacing: 0.2em;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.empty {
		color: var(--muted);
	}

	.more {
		margin-top: 12px;
	}
</style>
