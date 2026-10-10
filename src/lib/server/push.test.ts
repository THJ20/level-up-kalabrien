import { describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { FakeClock, createTestContext, insertHunter, seedFullDay } from './testing';
import { simulatedClock } from './clock';
import { loadConfig } from './config';
import { ensureVapidKeys } from './vapid';
import { PushNotifier, removePushSubscription, savePushSubscription, type PushTransport } from './push';
import { sendEveningReminders, sendVoteReminders } from './reminders';
import { updateSettings } from './hunters';
import { reportSick } from './quest';
import { evaluateAllHunters } from './votes';
import { pushSubscriptions } from './db/schema';

function recordingTransport(statusFor: (endpoint: string) => number = () => 201) {
	const sent: { endpoint: string; payload: unknown }[] = [];
	const transport: PushTransport = {
		async send(subscription, payload) {
			sent.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload) });
			return { statusCode: statusFor(subscription.endpoint) };
		}
	};
	return { sent, transport };
}

function subscribe(ctx: ReturnType<typeof createTestContext>, hunterId: string, endpoint: string) {
	savePushSubscription(ctx, hunterId, { endpoint, keys: { p256dh: 'p', auth: 'a' } });
}

describe('Konfiguration', () => {
	it('hat Standardwerte und prüft das Go-live-Datum', () => {
		expect(loadConfig({})).toEqual({
			databasePath: 'data/app.db',
			backupDir: join('data', 'backups'),
			avatarDir: join('data', 'avatars'),
			goLiveDate: null,
			origin: null,
			vapidSubject: 'mailto:level-up@example.invalid',
			simulatedNow: null
		});
		expect(loadConfig({ ORIGIN: 'https://levelup.example.de/', GO_LIVE_DATE: '2026-10-17' })).toMatchObject({
			origin: 'https://levelup.example.de',
			vapidSubject: 'https://levelup.example.de',
			goLiveDate: '2026-10-17'
		});
		expect(() => loadConfig({ GO_LIVE_DATE: '14.10.2026' })).toThrow(/GO_LIVE_DATE/);
		expect(loadConfig({ SIMULATED_NOW: '2026-10-20T18:00:00+02:00' }).simulatedNow?.toISOString()).toBe(
			'2026-10-20T16:00:00.000Z'
		);
		expect(() => loadConfig({ SIMULATED_NOW: 'morgen' })).toThrow(/SIMULATED_NOW/);
		const real = new FakeClock('2026-10-11T10:00:00Z');
		const clock = simulatedClock(new Date('2026-10-20T16:00:00Z'), real);
		real.advance(60_000);
		expect(clock.now().toISOString()).toBe('2026-10-20T16:01:00.000Z');
	});
});

describe('VAPID-Schlüssel', () => {
	it('werden einmal erzeugt und danach wiederverwendet', () => {
		const ctx = createTestContext();
		const generate = vi.fn(() => ({ publicKey: 'pub', privateKey: 'priv' }));
		expect(ensureVapidKeys(ctx, generate)).toEqual({ publicKey: 'pub', privateKey: 'priv' });
		expect(ensureVapidKeys(ctx, generate)).toEqual({ publicKey: 'pub', privateKey: 'priv' });
		expect(generate).toHaveBeenCalledTimes(1);
	});
});

describe('Push-Abos', () => {
	it('werden gespeichert, aktualisiert und nur vom Besitzer gelöscht', () => {
		const ctx = createTestContext();
		const tobias = insertHunter(ctx, 'Tobias');
		const niklas = insertHunter(ctx, 'Niklas');
		subscribe(ctx, tobias, 'https://push/1');
		subscribe(ctx, niklas, 'https://push/1');
		let rows = ctx.db.select().from(pushSubscriptions).all();
		expect(rows).toHaveLength(1);
		expect(rows[0].hunterId).toBe(niklas);
		removePushSubscription(ctx, tobias, 'https://push/1');
		expect(ctx.db.select().from(pushSubscriptions).all()).toHaveLength(1);
		removePushSubscription(ctx, niklas, 'https://push/1');
		rows = ctx.db.select().from(pushSubscriptions).all();
		expect(rows).toEqual([]);
		expect(() =>
			savePushSubscription(ctx, tobias, { endpoint: 'kein-link', keys: { p256dh: 'p', auth: 'a' } })
		).toThrow(expect.objectContaining({ code: 'invalid_input' }));
	});
});

describe('PushNotifier', () => {
	it('schickt nur an Hunter mit passender Einstellung und entfernt abgelaufene Abos', async () => {
		const ctx = createTestContext();
		const tobias = insertHunter(ctx, 'Tobias');
		const niklas = insertHunter(ctx, 'Niklas');
		const ramzy = insertHunter(ctx, 'Ramzy');
		subscribe(ctx, tobias, 'https://push/tobias');
		subscribe(ctx, niklas, 'https://push/niklas');
		subscribe(ctx, ramzy, 'https://push/ramzy-alt');
		updateSettings(ctx, niklas, { votePushEnabled: false });

		const { sent, transport } = recordingTransport((endpoint) => (endpoint.endsWith('alt') ? 410 : 201));
		const notifier = new PushNotifier(ctx, transport, () => {});
		notifier.notify([tobias, niklas, ramzy], { title: 'T', body: 'B', url: '/strafen' }, 'vote');
		await notifier.flush();

		expect(sent.map((entry) => entry.endpoint).sort()).toEqual(['https://push/ramzy-alt', 'https://push/tobias']);
		expect(sent[0].payload).toMatchObject({ title: 'T', body: 'B', url: '/strafen' });
		const remaining = ctx.db.select().from(pushSubscriptions).all().map((row) => row.endpoint).sort();
		expect(remaining).toEqual(['https://push/niklas', 'https://push/tobias']);
	});

	it('wirft nie, auch wenn der Versand scheitert', async () => {
		const ctx = createTestContext();
		const tobias = insertHunter(ctx, 'Tobias');
		subscribe(ctx, tobias, 'https://push/tobias');
		const errors: string[] = [];
		const notifier = new PushNotifier(
			ctx,
			{ send: async () => Promise.reject(new Error('offline')) },
			(line) => errors.push(line)
		);
		notifier.notify([tobias], { title: 'T', body: 'B', url: '/' }, 'reminder');
		await notifier.flush();
		expect(errors[0]).toMatch(/offline/);
	});
});

describe('Erinnerungen', () => {
	it('erinnern abends genau einmal an eine offene Daily Quest', () => {
		const ctx = createTestContext('2026-10-15T17:59:00Z');
		const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12' });
		const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-12' });
		const ramzy = insertHunter(ctx, 'Ramzy', { registeredOn: '2026-10-12' });
		seedFullDay(ctx, niklas, '2026-10-15');
		reportSick(ctx, ramzy, '2026-10-15');

		expect(sendEveningReminders(ctx)).toEqual([]);
		ctx.clock.set('2026-10-15T18:00:00Z');
		expect(sendEveningReminders(ctx)).toEqual([tobias]);
		expect(ctx.notifier.sent.at(-1)).toMatchObject({ hunterIds: [tobias], kind: 'reminder' });
		ctx.clock.advance(60_000);
		expect(sendEveningReminders(ctx)).toEqual([]);

		ctx.clock.set('2026-10-16T18:00:00Z');
		updateSettings(ctx, tobias, { reminderEnabled: false });
		expect(sendEveningReminders(ctx).sort()).toEqual([niklas, ramzy].sort());
	});

	it('erinnert an offene Abstimmungen', () => {
		const ctx = createTestContext('2026-10-13T16:00:00Z');
		insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12' });
		const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-12' });
		seedFullDay(ctx, niklas, '2026-10-12');
		evaluateAllHunters(ctx);
		expect(sendVoteReminders(ctx)).toEqual([niklas]);
		expect(ctx.notifier.sent.at(-1)).toMatchObject({ hunterIds: [niklas], kind: 'vote' });
	});
});
