import { describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { createTestContext, insertHunter, seedFullDay, type TestContext } from './testing';
import { missedDays, votes } from './db/schema';
import { listFeed } from './feed';
import { updateSettings } from './hunters';
import { addSet, deleteSet, listSets, reportSick } from './quest';
import { archivePenalty, createPenalty, listPenalties, updatePenalty } from './penalties';
import {
	castBallot,
	evaluateAllHunters,
	listVerdicts,
	listVotes,
	pendingVoteReminders,
	proposePenalty,
	recentMissedNotices
} from './votes';
import { deactivateHunter } from './admin';

const DAYS = ['2026-10-12', '2026-10-13', '2026-10-14'];

/** Drei Hunter am 12.10.2026. Niklas und Ramzy haben alle Tage erfüllt, Tobias keinen. */
function setup() {
	const ctx = createTestContext('2026-10-15T10:00:00Z');
	const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12', role: 'admin' });
	const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-12' });
	const ramzy = insertHunter(ctx, 'Ramzy', { registeredOn: '2026-10-12' });
	for (const date of DAYS) {
		seedFullDay(ctx, niklas, date);
		seedFullDay(ctx, ramzy, date);
	}
	return { ctx, tobias, niklas, ramzy };
}

function activeMissedDates(ctx: TestContext, hunterId: string): string[] {
	return ctx.db
		.select({ date: missedDays.date })
		.from(missedDays)
		.where(and(eq(missedDays.hunterId, hunterId), eq(missedDays.status, 'active')))
		.all()
		.map((row) => row.date)
		.sort();
}

function openVoteFor(ctx: TestContext, viewerId: string, date: string) {
	const vote = listVotes(ctx, viewerId, { status: 'open' }).find((item) => item.date === date);
	if (!vote) throw new Error(`Keine offene Abstimmung für ${date}`);
	return vote;
}

function completeDay(ctx: TestContext, hunterId: string, date: string) {
	for (const exercise of ['pushups', 'squats', 'situps'] as const) {
		addSet(ctx, hunterId, { date, exerciseId: exercise, value: 100 });
	}
}

describe('Auswertung verpasster Tage', () => {
	it('legt verpasste Tage mit Abstimmung, Feed und Push an', () => {
		const { ctx, tobias, niklas, ramzy } = setup();
		evaluateAllHunters(ctx);

		expect(activeMissedDates(ctx, tobias)).toEqual(DAYS);
		expect(activeMissedDates(ctx, niklas)).toEqual([]);
		const open = listVotes(ctx, niklas, { status: 'open' });
		expect(open.map((vote) => vote.date).sort()).toEqual(DAYS);
		expect(open[0].voters.map((voter) => voter.hunter.id).sort()).toEqual([niklas, ramzy].sort());
		expect(listFeed(ctx, tobias).filter((item) => item.type === 'missed')).toHaveLength(3);
		expect(ctx.notifier.sent).toHaveLength(3);
		expect(ctx.notifier.sent[0]).toMatchObject({ kind: 'vote' });
		expect(ctx.notifier.sent[0].hunterIds.sort()).toEqual([niklas, ramzy].sort());

		evaluateAllHunters(ctx);
		expect(listVotes(ctx, niklas, { status: 'all' })).toHaveLength(3);
		expect(ctx.notifier.sent).toHaveLength(3);
	});

	it('wertet weder Tage vor dem Wertungsbeginn noch den heutigen Tag', () => {
		const ctx = createTestContext('2026-10-15T10:00:00Z');
		const late = insertHunter(ctx, 'Spät', { registeredOn: '2026-10-14' });
		insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-15' });
		evaluateAllHunters(ctx);
		expect(activeMissedDates(ctx, late)).toEqual(['2026-10-14']);
	});

	it('legt bei nur einem Hunter keine Abstimmung an', () => {
		const ctx = createTestContext('2026-10-13T10:00:00Z');
		const solo = insertHunter(ctx, 'Solo', { registeredOn: '2026-10-12' });
		evaluateAllHunters(ctx);
		expect(activeMissedDates(ctx, solo)).toEqual(['2026-10-12']);
		expect(ctx.db.select().from(votes).all()).toHaveLength(0);
		expect(listFeed(ctx, solo).find((item) => item.type === 'missed')?.payload).toEqual({
			date: '2026-10-12',
			voteId: null
		});
	});
});

describe('Aufheben', () => {
	it('hebt Tag und offene Abstimmung nach einem Nachtrag auf', () => {
		const { ctx, tobias, niklas } = setup();
		evaluateAllHunters(ctx);
		completeDay(ctx, tobias, '2026-10-12');

		expect(activeMissedDates(ctx, tobias)).toEqual(['2026-10-13', '2026-10-14']);
		const cancelled = listVotes(ctx, niklas, { status: 'all' }).find((vote) => vote.date === '2026-10-12');
		expect(cancelled?.status).toBe('cancelled');
		expect(listFeed(ctx, tobias).find((item) => item.type === 'missed_lifted')?.payload).toEqual({
			date: '2026-10-12',
			reason: 'backfill',
			verdictLifted: false
		});
	});

	it('hebt eine verhängte Strafe nach einer Krankmeldung auf', () => {
		const { ctx, tobias, niklas, ramzy } = setup();
		evaluateAllHunters(ctx);
		const penalty = createPenalty(ctx, niklas, { title: 'Runde Getränke' });
		const vote = openVoteFor(ctx, niklas, '2026-10-13');
		castBallot(ctx, niklas, vote.id, penalty.id);
		castBallot(ctx, ramzy, vote.id, penalty.id);
		expect(listVerdicts(ctx, { hunterId: tobias })[0]).toMatchObject({ status: 'imposed', date: '2026-10-13' });

		reportSick(ctx, tobias, '2026-10-13');
		expect(listVerdicts(ctx, { hunterId: tobias })[0]).toMatchObject({ status: 'lifted', liftReason: 'sick' });
		expect(listFeed(ctx, tobias).find((item) => item.type === 'missed_lifted')?.payload).toEqual({
			date: '2026-10-13',
			reason: 'sick',
			verdictLifted: true
		});
	});

	it('startet eine neue Abstimmung, wenn ein Tag wieder unter die Pflicht fällt', () => {
		const { ctx, tobias, niklas } = setup();
		evaluateAllHunters(ctx);
		completeDay(ctx, tobias, '2026-10-12');
		const [firstSet] = listSets(ctx, tobias, '2026-10-12');
		deleteSet(ctx, tobias, firstSet.id);

		expect(activeMissedDates(ctx, tobias)).toContain('2026-10-12');
		const forDay = listVotes(ctx, niklas, { status: 'all' }).filter((vote) => vote.date === '2026-10-12');
		expect(forDay.map((vote) => vote.status).sort()).toEqual(['cancelled', 'open']);
	});
});

describe('Abstimmung', () => {
	it('lässt nur Stimmberechtigte mit gültigen Strafen abstimmen', () => {
		const { ctx, tobias, niklas } = setup();
		evaluateAllHunters(ctx);
		const penalty = createPenalty(ctx, niklas, { title: '50 Burpees' });
		const archived = createPenalty(ctx, niklas, { title: 'Alt' });
		archivePenalty(ctx, niklas, archived.id);
		const vote = openVoteFor(ctx, niklas, '2026-10-12');

		expect(() => castBallot(ctx, tobias, vote.id, penalty.id)).toThrow(
			expect.objectContaining({ code: 'forbidden' })
		);
		expect(() => castBallot(ctx, niklas, vote.id, archived.id)).toThrow(
			expect.objectContaining({ code: 'invalid_input' })
		);
		expect(() => castBallot(ctx, niklas, vote.id, 'unbekannt')).toThrow(
			expect.objectContaining({ code: 'not_found' })
		);
	});

	it('endet erst nach allen Stimmen und zeigt die Zählung erst dann', () => {
		const { ctx, tobias, niklas, ramzy } = setup();
		evaluateAllHunters(ctx);
		const burpees = createPenalty(ctx, niklas, { title: '50 Burpees' });
		const drinks = createPenalty(ctx, ramzy, { title: 'Runde Getränke' });
		const vote = openVoteFor(ctx, niklas, '2026-10-12');

		let view = castBallot(ctx, niklas, vote.id, burpees.id);
		expect(view).toMatchObject({ status: 'open', myBallot: burpees.id, counts: null });
		view = castBallot(ctx, niklas, vote.id, drinks.id);
		expect(view.myBallot).toBe(drinks.id);

		view = castBallot(ctx, ramzy, vote.id, drinks.id);
		expect(view).toMatchObject({ status: 'closed', decidedByLot: false, counts: { [drinks.id]: 2 } });
		expect(view.winner?.title).toBe('Runde Getränke');
		expect(listVerdicts(ctx)[0]).toMatchObject({ hunter: { id: tobias }, penalty: { title: 'Runde Getränke' } });
		expect(listFeed(ctx, tobias).find((item) => item.type === 'verdict')?.payload).toMatchObject({
			date: '2026-10-12',
			penaltyTitle: 'Runde Getränke',
			decidedByLot: false
		});
		expect(() => castBallot(ctx, niklas, vote.id, burpees.id)).toThrow(
			expect.objectContaining({ code: 'conflict' })
		);
	});

	it('entscheidet einen Gleichstand per Los', () => {
		const { ctx, niklas, ramzy } = setup();
		evaluateAllHunters(ctx);
		const burpees = createPenalty(ctx, niklas, { title: '50 Burpees' });
		const drinks = createPenalty(ctx, ramzy, { title: 'Runde Getränke' });
		const vote = openVoteFor(ctx, niklas, '2026-10-12');
		castBallot(ctx, niklas, vote.id, burpees.id);
		const view = castBallot(ctx, ramzy, vote.id, drinks.id);
		expect(view.status).toBe('closed');
		expect(view.decidedByLot).toBe(true);
		expect([burpees.id, drinks.id]).toContain(view.winner?.id);
	});

	it('nimmt vorgeschlagene Strafen in den Katalog auf', () => {
		const { ctx, tobias, niklas } = setup();
		evaluateAllHunters(ctx);
		const vote = openVoteFor(ctx, niklas, '2026-10-12');
		const proposed = proposePenalty(ctx, niklas, vote.id, { title: 'Kalte Dusche', description: '5 Minuten' });
		expect(listPenalties(ctx).map((penalty) => penalty.title)).toContain('Kalte Dusche');
		expect(castBallot(ctx, niklas, vote.id, proposed.id).myBallot).toBe(proposed.id);
		expect(() => proposePenalty(ctx, tobias, vote.id, { title: 'Nix' })).toThrow(
			expect.objectContaining({ code: 'forbidden' })
		);
	});
});

describe('Strafkatalog', () => {
	it('lässt nur den Ersteller ändern und archivieren', () => {
		const { ctx, niklas, ramzy } = setup();
		const penalty = createPenalty(ctx, niklas, { title: '  Liegestütze  ', description: '200 Stück' });
		expect(penalty).toMatchObject({ title: 'Liegestütze', description: '200 Stück', archived: false });
		expect(() => updatePenalty(ctx, ramzy, penalty.id, { title: 'Anders' })).toThrow(
			expect.objectContaining({ code: 'forbidden' })
		);
		expect(() => archivePenalty(ctx, ramzy, penalty.id)).toThrow(expect.objectContaining({ code: 'forbidden' }));
		expect(updatePenalty(ctx, niklas, penalty.id, { title: '300 Liegestütze' }).title).toBe('300 Liegestütze');
		expect(() => createPenalty(ctx, niklas, { title: '' })).toThrow(
			expect.objectContaining({ code: 'invalid_input' })
		);
		archivePenalty(ctx, niklas, penalty.id);
		expect(listPenalties(ctx)).toEqual([]);
		expect(listPenalties(ctx, { includeArchived: true })).toHaveLength(1);
	});
});

describe('Deaktivierung', () => {
	it('beendet Abstimmungen des Deaktivierten und entfernt ihn als Stimmberechtigten', () => {
		const ctx = createTestContext('2026-10-13T10:00:00Z');
		const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12', role: 'admin' });
		const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-12' });
		const ramzy = insertHunter(ctx, 'Ramzy', { registeredOn: '2026-10-12' });
		seedFullDay(ctx, tobias, '2026-10-12');
		seedFullDay(ctx, ramzy, '2026-10-12');
		evaluateAllHunters(ctx);

		const penalty = createPenalty(ctx, tobias, { title: '50 Burpees' });
		const vote = openVoteFor(ctx, tobias, '2026-10-12');
		castBallot(ctx, tobias, vote.id, penalty.id);
		deactivateHunter(ctx, tobias, ramzy);
		const closed = listVotes(ctx, tobias, { status: 'all' })[0];
		expect(closed.status).toBe('closed');
		expect(closed.voters.map((voter) => voter.hunter.id)).toEqual([tobias]);

		expect(() => deactivateHunter(ctx, niklas, tobias)).toThrow(expect.objectContaining({ code: 'forbidden' }));
		expect(() => deactivateHunter(ctx, tobias, tobias)).toThrow(
			expect.objectContaining({ code: 'invalid_input' })
		);
	});

	it('lässt offene Abstimmungen über einen deaktivierten Hunter entfallen', () => {
		const { ctx, tobias, niklas } = setup();
		evaluateAllHunters(ctx);
		const admin = insertHunter(ctx, 'Admin', { registeredOn: '2026-10-15', role: 'admin' });
		deactivateHunter(ctx, admin, tobias);
		expect(listVotes(ctx, niklas, { status: 'open' })).toEqual([]);
	});
});

describe('Warnungen', () => {
	it('liefern frische, noch aktive verpasste Tage anderer', () => {
		const { ctx, tobias, niklas } = setup();
		evaluateAllHunters(ctx);
		expect(recentMissedNotices(ctx, niklas).map((notice) => notice.hunterName)).toEqual([
			'Tobias',
			'Tobias',
			'Tobias'
		]);
		expect(recentMissedNotices(ctx, tobias)).toEqual([]);
		completeDay(ctx, tobias, '2026-10-12');
		expect(recentMissedNotices(ctx, niklas)).toHaveLength(2);
		ctx.clock.advance(4 * 86_400_000);
		expect(recentMissedNotices(ctx, niklas)).toEqual([]);
	});
});

describe('Erinnerungen', () => {
	it('listet nur Stimmberechtigte ohne Stimme mit aktivem Abstimmungs-Push', () => {
		const { ctx, niklas, ramzy } = setup();
		evaluateAllHunters(ctx);
		const penalty = createPenalty(ctx, niklas, { title: '50 Burpees' });
		castBallot(ctx, niklas, openVoteFor(ctx, niklas, '2026-10-12').id, penalty.id);

		const reminders = pendingVoteReminders(ctx);
		expect(reminders.find((entry) => entry.hunterId === niklas)?.voteIds).toHaveLength(2);
		expect(reminders.find((entry) => entry.hunterId === ramzy)?.voteIds).toHaveLength(3);

		updateSettings(ctx, ramzy, { votePushEnabled: false });
		expect(pendingVoteReminders(ctx).map((entry) => entry.hunterId)).toEqual([niklas]);
	});
});
