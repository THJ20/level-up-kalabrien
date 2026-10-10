<script lang="ts">
	import type { HunterRefView } from '#lib/shared/constants.ts';
	import { Check } from '@lucide/svelte';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import { dayLabel } from '#lib/client/format.ts';
	import Avatar from '../Avatar.svelte';
	import Panel from '../Panel.svelte';

	interface Penalty {
		id: string;
		title: string;
		description: string;
	}

	interface Vote {
		id: string;
		date: string;
		offender: HunterRefView;
		voters: { hunter: HunterRefView; hasVoted: boolean }[];
		myBallot: string | null;
		options: Penalty[];
	}

	let { vote, meId }: { vote: Vote; meId: string } = $props();

	const isOffender = $derived(vote.offender.id === meId);
	const canVote = $derived(vote.voters.some((voter) => voter.hunter.id === meId));
	const votedCount = $derived(vote.voters.filter((voter) => voter.hasVoted).length);

	let busy = $state(false);
	let error = $state('');
	let proposing = $state(false);
	let title = $state('');
	let description = $state('');

	async function cast(penaltyId: string) {
		busy = true;
		error = '';
		try {
			await apiFetch(`/api/votes/${vote.id}/ballot`, { body: { penaltyId } });
			await refresh();
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}

	async function propose(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = '';
		try {
			await apiFetch(`/api/votes/${vote.id}/proposals`, { body: { title, description } });
			title = '';
			description = '';
			proposing = false;
			await refresh();
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}
</script>

<Panel tone="warn">
	<div class="head">
		<Avatar name={vote.offender.name} color={vote.offender.color} src={vote.offender.avatarUrl} size={40} />
		<div>
			<p class="who">{isOffender ? 'Deine Strafe' : vote.offender.name}</p>
			<p class="when sys">Daily Quest verpasst · {dayLabel(vote.date)}</p>
		</div>
	</div>

	<p class="progress">
		{votedCount} von {vote.voters.length} haben abgestimmt:
		{#each vote.voters as voter, index (voter.hunter.id)}
			<span class:voted={voter.hasVoted}>{voter.hunter.name}{voter.hasVoted ? ' ✓' : ''}</span>{index < vote.voters.length - 1 ? ', ' : ''}
		{/each}
	</p>

	{#if isOffender}
		<p class="note">Die anderen stimmen gerade über deine Strafe ab. Trägst du den Tag nach oder meldest dich krank, entfällt die Abstimmung.</p>
	{/if}

	{#if vote.options.length === 0}
		<p class="note">Im Strafkatalog ist noch nichts. Schlag die erste Strafe vor.</p>
	{:else}
		<ul class="options" role={canVote ? 'radiogroup' : undefined} aria-label="Strafen zur Wahl">
			{#each vote.options as option (option.id)}
				<li>
					{#if canVote}
						<button
							type="button"
							class="option"
							class:chosen={vote.myBallot === option.id}
							role="radio"
							aria-checked={vote.myBallot === option.id}
							disabled={busy}
							onclick={() => cast(option.id)}
						>
							<span class="mark">{#if vote.myBallot === option.id}<Check size={16} />{/if}</span>
							<span class="text">
								<b>{option.title}</b>
								{#if option.description}<span class="desc">{option.description}</span>{/if}
							</span>
						</button>
					{:else}
						<div class="option readonly">
							<span class="text">
								<b>{option.title}</b>
								{#if option.description}<span class="desc">{option.description}</span>{/if}
							</span>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if error}<p class="form-error" role="alert">{error}</p>{/if}

	{#if canVote}
		{#if proposing}
			<form class="propose" onsubmit={propose}>
				<label class="field">
					<span>Neue Strafe</span>
					<input class="input" id="proposal-title-{vote.id}" bind:value={title} maxlength="80" required />
				</label>
				<label class="field">
					<span>Beschreibung (optional)</span>
					<input class="input" id="proposal-description-{vote.id}" bind:value={description} maxlength="500" />
				</label>
				<div class="actions">
					<button class="btn btn-primary" type="submit" disabled={busy}>Vorschlagen</button>
					<button class="btn btn-ghost" type="button" onclick={() => (proposing = false)}>Abbrechen</button>
				</div>
			</form>
		{:else}
			<button class="btn btn-ghost btn-small" type="button" onclick={() => (proposing = true)}>
				Neue Strafe vorschlagen
			</button>
		{/if}
	{/if}
</Panel>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.who {
		font-weight: 600;
		font-size: 17px;
	}

	.when {
		font-size: 12px;
		color: var(--warn);
	}

	.progress,
	.note {
		margin-top: 10px;
		font-size: 14px;
		color: var(--dim);
	}

	.voted {
		color: var(--ok);
	}

	.options {
		list-style: none;
		margin: 12px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.option {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--line-faint);
		background: rgba(var(--accent-rgb), 0.04);
		color: var(--text);
		text-align: left;
		cursor: pointer;
	}

	.option.readonly {
		cursor: default;
	}

	.option.chosen {
		border-color: var(--line);
		background: rgba(var(--accent-rgb), 0.16);
		box-shadow: 0 0 12px var(--glow-soft);
	}

	.mark {
		flex: none;
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border: 1px solid var(--line-dim);
		border-radius: 50%;
		color: var(--ok);
	}

	.text {
		display: flex;
		flex-direction: column;
	}

	.desc {
		font-size: 14px;
		color: var(--dim);
	}

	.propose {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 12px;
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	:global(.panel) > .btn-small {
		margin-top: 10px;
	}
</style>
