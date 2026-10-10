import { describe, expect, it } from 'vitest';
import { call, createTestApp } from '#lib/server/http-testing.ts';
import { createInvite } from '#lib/server/auth/invites.ts';
import { evaluateAllHunters } from '#lib/server/votes.ts';
import { POST as register } from './auth/register/+server';
import { GET as me } from './me/+server';
import { GET as board } from './board/+server';
import { GET as day } from './days/[date]/+server';
import { POST as addSet } from './sets/+server';
import { PUT as reportSick } from './sick/[date]/+server';
import { GET as exercises } from './exercises/+server';
import { POST as addBonus } from './bonus/+server';
import { POST as createPenalty } from './penalties/+server';
import { GET as votes } from './votes/+server';
import { POST as ballot } from './votes/[id]/ballot/+server';
import { GET as feed } from './feed/+server';
import { POST as react } from './feed/[id]/reactions/+server';
import { GET as leaderboard } from './leaderboard/+server';
import { GET as stats } from './stats/+server';
import { POST as invite } from './admin/invites/+server';
import { GET as pushKey } from './push/key/+server';
import { POST as subscribe } from './push/subscription/+server';

const PASSWORD = 'geheim-genug-123';

async function team(nowIso = '2026-10-12T10:00:00Z') {
	const test = createTestApp(nowIso);
	const admin = await call(register, {
		method: 'POST',
		path: '/api/auth/register',
		body: { token: test.adminToken, name: 'Tobias', password: PASSWORD, color: '#a47cff' }
	});
	const niklasInvite = createInvite(test.app.ctx, null);
	const niklas = await call(register, {
		method: 'POST',
		path: '/api/auth/register',
		body: { token: niklasInvite.token, name: 'Niklas', password: PASSWORD, color: '#4cc9ff' }
	});
	return {
		...test,
		tobias: { id: admin.body.hunter.id as string, token: admin.cookies.get('session') as string },
		niklas: { id: niklas.body.hunter.id as string, token: niklas.cookies.get('session') as string }
	};
}

describe('Fach-API', () => {
	it('erfasst Sätze und liefert Tagesdetail, Zusammenfassung und Board', async () => {
		const { tobias } = await team();
		for (const exercise of ['pushups', 'squats', 'situps']) {
			const response = await call(addSet, {
				method: 'POST',
				path: '/api/sets',
				token: tobias.token,
				body: { date: '2026-10-12', exerciseId: exercise, value: 100 }
			});
			expect(response.status).toBe(200);
		}
		const detail = await call(day, { path: '/api/days/2026-10-12', token: tobias.token, params: { date: '2026-10-12' } });
		expect(detail.body.day.status).toBe('fulfilled');
		expect(detail.body.sets).toHaveLength(3);

		const summary = await call(me, { path: '/api/me', token: tobias.token });
		expect(summary.body.summary.level).toMatchObject({ level: 2, rank: 'E' });
		expect(summary.body.settings.reminderTime).toBe('20:00');

		const rows = (await call(board, { path: '/api/board', token: tobias.token })).body.board;
		expect(rows.find((row: { hunter: { name: string } }) => row.hunter.name === 'Tobias').progress).toBe(1);

		const invalid = await call(addSet, {
			method: 'POST',
			path: '/api/sets',
			token: tobias.token,
			body: { date: '2026-10-12', exerciseId: 'burpees', value: 10 }
		});
		expect(invalid.status).toBe(400);
	});

	it('meldet krank, trägt Bonus ein und filtert Rangliste und Statistik', async () => {
		const { tobias, niklas } = await team('2026-10-13T10:00:00Z');
		expect(
			(await call(reportSick, { method: 'PUT', path: '/api/sick/2026-10-13', token: niklas.token, params: { date: '2026-10-13' } }))
				.status
		).toBe(200);

		const catalog = (await call(exercises, { path: '/api/exercises', token: tobias.token })).body.exercises;
		const run = catalog.find((exercise: { name: string }) => exercise.name === 'Laufen/Joggen');
		const bonus = await call(addBonus, {
			method: 'POST',
			path: '/api/bonus',
			token: tobias.token,
			body: { exerciseId: run.id, date: '2026-10-13', minutes: 30, effort: 'moderate', distanceKm: 5 }
		});
		expect(bonus.body.entry.bonusPoints).toBe(150);

		const board = (await call(leaderboard, { path: '/api/leaderboard?from=2026-10-13&to=2026-10-13', token: tobias.token }))
			.body;
		expect(board.bonus[0]).toMatchObject({ hunter: { name: 'Tobias' }, periodBonusPoints: 150 });

		const series = (await call(stats, { path: `/api/stats?from=2026-10-13&to=2026-10-13&hunters=${niklas.id}`, token: tobias.token }))
			.body.series;
		expect(series).toHaveLength(1);
		expect(series[0].days[0].status).toBe('sick');
		expect((await call(stats, { path: '/api/stats?from=kaputt&to=2026-10-13', token: tobias.token })).status).toBe(400);
	});

	it('führt durch Strafe, Abstimmung und Feed-Reaktion', async () => {
		const { app, clock, tobias, niklas } = await team('2026-10-12T10:00:00Z');
		clock.set('2026-10-13T10:00:00Z');
		evaluateAllHunters(app.ctx);
		const penalty = (
			await call(createPenalty, { method: 'POST', path: '/api/penalties', token: tobias.token, body: { title: '50 Burpees' } })
		).body.penalty;
		const open = (await call(votes, { path: '/api/votes', token: tobias.token })).body.votes;
		const tobiasVote = open.find((vote: { offender: { id: string } }) => vote.offender.id === niklas.id);
		const closed = await call(ballot, {
			method: 'POST',
			path: `/api/votes/${tobiasVote.id}/ballot`,
			token: tobias.token,
			params: { id: tobiasVote.id },
			body: { penaltyId: penalty.id }
		});
		expect(closed.body.vote).toMatchObject({ status: 'closed', winner: { title: '50 Burpees' } });

		const items = (await call(feed, { path: '/api/feed?limit=5', token: niklas.token })).body.items;
		expect(items.length).toBeGreaterThan(0);
		const reaction = await call(react, {
			method: 'POST',
			path: `/api/feed/${items[0].id}/reactions`,
			token: niklas.token,
			params: { id: items[0].id },
			body: { reaction: 'fire' }
		});
		expect(reaction.body).toEqual({ active: true });
	});

	it('erlaubt Einladungen nur dem Admin und speichert Push-Abos', async () => {
		const { tobias, niklas } = await team();
		const created = await call(invite, { method: 'POST', path: '/api/admin/invites', token: tobias.token, body: {} });
		expect(created.body.link).toMatch(/^https:\/\/lvl\.test\/register\?token=/);
		expect((await call(invite, { method: 'POST', path: '/api/admin/invites', token: niklas.token, body: {} })).status).toBe(403);

		expect((await call(pushKey, { path: '/api/push/key' })).body).toEqual({ publicKey: 'test-public-key' });
		const saved = await call(subscribe, {
			method: 'POST',
			path: '/api/push/subscription',
			token: niklas.token,
			body: { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } }
		});
		expect(saved.status).toBe(200);
		expect((await call(subscribe, { method: 'POST', path: '/api/push/subscription', body: {} })).status).toBe(401);
	});
});
