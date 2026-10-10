<script lang="ts">
	import type { DayStatus } from '#lib/domain/index.ts';
	import Avatar from '../Avatar.svelte';
	import Panel from '../Panel.svelte';
	import StatusChip from '../StatusChip.svelte';

	interface Row {
		hunter: { id: string; name: string; color: string };
		status: DayStatus | null;
		progress: number;
	}

	let { rows, meId }: { rows: Row[]; meId: string } = $props();

	const cleared = $derived(rows.filter((row) => row.status === 'fulfilled').length);
</script>

<Panel title="Hunter heute" aside="{cleared} / {rows.length} clear">
	<ul>
		{#each rows as row (row.hunter.id)}
			<li>
				<a href="/hunter/{row.hunter.id}">
					<Avatar name={row.hunter.name} color={row.hunter.color} size={30} />
					<span class="name">{row.hunter.name}{row.hunter.id === meId ? ' (du)' : ''}</span>
					<StatusChip status={row.status} progress={row.progress} />
				</a>
			</li>
		{/each}
	</ul>
</Panel>

<style>
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li + li {
		border-top: 1px solid var(--line-faint);
	}

	a {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 46px;
		color: inherit;
		text-decoration: none;
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
