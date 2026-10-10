import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestContext, insertHunter } from '../testing';
import { hunters, settings } from '../db/schema';
import { ensureGoLiveDate, getGoLiveDate } from '../settings';
import { listFeed } from '../feed';
import { hashPassword, validatePassword, verifyPassword } from './password';
import { createInvite, ensureAdminInvite, redeemInvite } from './invites';
import { createSession, invalidateSession, validateSession } from './sessions';
import { LoginThrottle } from './throttle';
import { login } from './login';

const DAY = 86_400_000;
const PASSWORD = 'geheim-genug-123';

function registration(name = 'Tobias') {
	return { name, password: PASSWORD, color: '#a47cff' };
}

describe('Passwörter', () => {
	it('verlangt mindestens 10 Zeichen', () => {
		expect(() => validatePassword('kurz')).toThrow(/10 Zeichen/);
		expect(() => validatePassword(PASSWORD)).not.toThrow();
	});

	it('hasht und prüft Passwörter', async () => {
		const hash = await hashPassword(PASSWORD);
		expect(hash.startsWith('$argon2id$')).toBe(true);
		expect(await verifyPassword(hash, PASSWORD)).toBe(true);
		expect(await verifyPassword(hash, 'falsches-passwort')).toBe(false);
		expect(await verifyPassword('kein-hash', PASSWORD)).toBe(false);
	});
});

describe('Einladungen', () => {
	it('legt beim Einlösen einen Hunter mit Sitzung an', async () => {
		const ctx = createTestContext();
		const { token } = createInvite(ctx, null);
		const { hunter, session } = await redeemInvite(ctx, token, registration());
		expect(hunter).toMatchObject({ name: 'Tobias', role: 'hunter', active: true, registeredOn: '2026-10-12' });
		expect(validateSession(ctx, session.token)?.hunter.id).toBe(hunter.id);
		expect(listFeed(ctx, hunter.id).map((item) => item.type)).toEqual(['joined']);
	});

	it('lässt sich nur einmal und nur 7 Tage lang einlösen', async () => {
		const ctx = createTestContext();
		const first = createInvite(ctx, null);
		await redeemInvite(ctx, first.token, registration('Erster'));
		await expect(redeemInvite(ctx, first.token, registration('Zweiter'))).rejects.toMatchObject({
			code: 'unauthorized'
		});

		const expiring = createInvite(ctx, null);
		ctx.clock.advance(7 * DAY + 1);
		await expect(redeemInvite(ctx, expiring.token, registration('Später'))).rejects.toMatchObject({
			code: 'unauthorized'
		});
		await expect(redeemInvite(ctx, 'unbekannt', registration('Fremd'))).rejects.toMatchObject({
			code: 'unauthorized'
		});
	});

	it('prüft Name, Farbe und Passwort', async () => {
		const ctx = createTestContext();
		insertHunter(ctx, 'Niklas');
		const { token } = createInvite(ctx, null);
		await expect(redeemInvite(ctx, token, registration('niklas'))).rejects.toMatchObject({
			code: 'conflict'
		});
		await expect(
			redeemInvite(ctx, token, { ...registration('Ramzy'), color: '#000000' })
		).rejects.toMatchObject({ code: 'invalid_input' });
		await expect(
			redeemInvite(ctx, token, { ...registration('Ramzy'), password: 'kurz' })
		).rejects.toMatchObject({ code: 'invalid_input' });
		await expect(redeemInvite(ctx, token, registration('X'))).rejects.toMatchObject({
			code: 'invalid_input'
		});
	});

	it('erzeugt nur ohne Hunter eine Admin-Einladung', async () => {
		const ctx = createTestContext();
		const token = ensureAdminInvite(ctx);
		expect(token).toBeTypeOf('string');
		const { hunter } = await redeemInvite(ctx, token as string, registration());
		expect(hunter.role).toBe('admin');
		expect(ensureAdminInvite(ctx)).toBeNull();
	});
});

describe('Sitzungen', () => {
	it('sind 180 Tage gültig', () => {
		const ctx = createTestContext();
		const id = insertHunter(ctx, 'Tobias');
		const session = createSession(ctx, id);
		expect(validateSession(ctx, session.token)?.hunter.name).toBe('Tobias');
		ctx.clock.advance(180 * DAY);
		expect(validateSession(ctx, session.token)).toBeNull();
	});

	it('verlängern sich bei Nutzung', () => {
		const ctx = createTestContext();
		const session = createSession(ctx, insertHunter(ctx, 'Tobias'));
		ctx.clock.advance(31 * DAY);
		const validated = validateSession(ctx, session.token);
		expect(validated?.expiresAt.getTime()).toBe(ctx.clock.now().getTime() + 180 * DAY);
		ctx.clock.advance(170 * DAY);
		expect(validateSession(ctx, session.token)).not.toBeNull();
	});

	it('sind für deaktivierte Hunter und nach Abmeldung ungültig', () => {
		const ctx = createTestContext();
		const id = insertHunter(ctx, 'Tobias');
		const session = createSession(ctx, id);
		invalidateSession(ctx, session.token);
		expect(validateSession(ctx, session.token)).toBeNull();

		const second = createSession(ctx, id);
		ctx.db.update(hunters).set({ active: false }).where(eq(hunters.id, id)).run();
		expect(validateSession(ctx, second.token)).toBeNull();
	});
});

describe('Login', () => {
	async function setup() {
		const ctx = createTestContext();
		const { token } = createInvite(ctx, null);
		await redeemInvite(ctx, token, registration());
		return { ctx, throttle: new LoginThrottle(ctx.clock) };
	}

	it('meldet mit richtigen Daten an', async () => {
		const { ctx, throttle } = await setup();
		const result = await login(ctx, throttle, { name: 'tobias', password: PASSWORD, ip: '1.2.3.4' });
		expect(result.hunter.name).toBe('Tobias');
		expect(validateSession(ctx, result.session.token)).not.toBeNull();
	});

	it('sperrt nach 5 Fehlversuchen für 15 Minuten', async () => {
		const { ctx, throttle } = await setup();
		const wrong = { name: 'Tobias', password: 'falsch-falsch', ip: '1.2.3.4' };
		for (let attempt = 0; attempt < 5; attempt += 1) {
			await expect(login(ctx, throttle, wrong)).rejects.toMatchObject({ code: 'unauthorized' });
		}
		await expect(
			login(ctx, throttle, { ...wrong, password: PASSWORD })
		).rejects.toMatchObject({ code: 'locked' });
		ctx.clock.advance(15 * 60_000);
		await expect(login(ctx, throttle, { ...wrong, password: PASSWORD })).resolves.toBeDefined();
	});

	it('setzt den Zähler nach einem erfolgreichen Login zurück', async () => {
		const { ctx, throttle } = await setup();
		const wrong = { name: 'Tobias', password: 'falsch-falsch', ip: '1.2.3.4' };
		for (let attempt = 0; attempt < 4; attempt += 1) {
			await expect(login(ctx, throttle, wrong)).rejects.toMatchObject({ code: 'unauthorized' });
		}
		await login(ctx, throttle, { ...wrong, password: PASSWORD });
		for (let attempt = 0; attempt < 4; attempt += 1) {
			await expect(login(ctx, throttle, wrong)).rejects.toMatchObject({ code: 'unauthorized' });
		}
	});
});

describe('Go-live-Datum', () => {
	it('wird einmal gesetzt und danach nicht mehr verändert', () => {
		const ctx = createTestContext('2026-10-17T08:00:00Z');
		ctx.db.delete(settings).run();
		expect(ensureGoLiveDate(ctx)).toBe('2026-10-17');
		ctx.clock.advance(3 * DAY);
		expect(ensureGoLiveDate(ctx, '2026-11-01')).toBe('2026-10-17');
		expect(getGoLiveDate(ctx)).toBe('2026-10-17');
	});
});
