import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { call, createTestApp } from '#lib/server/http-testing.ts';
import { createInvite } from '#lib/server/auth/invites.ts';
import { POST as register } from './auth/register/+server';
import { PATCH as patchMe } from './me/+server';
import { DELETE as deleteAvatar, POST as uploadAvatar, PUT as presetAvatar } from './me/avatar/+server';
import { GET as avatarFile } from './avatars/[file]/+server';
import { GET as getPlan, PUT as putPlan } from './plan/+server';
import { GET as badges } from './badges/+server';
import { GET as hunter } from './hunters/[id]/+server';
import { POST as addSet } from './sets/+server';

const PASSWORD = 'geheim-genug-123';

async function team() {
	const test = createTestApp('2026-10-14T10:00:00Z');
	const admin = await call(register, {
		method: 'POST',
		path: '/api/auth/register',
		body: { token: test.adminToken, name: 'Tobias', password: PASSWORD, color: '#a47cff' }
	});
	const invite = createInvite(test.app.ctx, null);
	const niklas = await call(register, {
		method: 'POST',
		path: '/api/auth/register',
		body: { token: invite.token, name: 'Niklas', password: PASSWORD, color: '#4cc9ff' }
	});
	return {
		...test,
		tobias: { id: admin.body.hunter.id as string, token: admin.cookies.get('session') as string },
		niklas: { id: niklas.body.hunter.id as string, token: niklas.cookies.get('session') as string }
	};
}

describe('Trainingsplan-API', () => {
	it('liefert den Startplan, speichert einen neuen Plan und zeigt ihn anderen', async () => {
		const { tobias, niklas } = await team();
		const initial = await call(getPlan, { path: '/api/plan', token: tobias.token });
		expect(initial.body.plan.current).toHaveLength(3);
		expect(initial.body.plan.nextStart).toBe('2026-10-09');

		const saved = await call(putPlan, {
			method: 'PUT',
			path: '/api/plan',
			token: tobias.token,
			body: {
				items: [
					{ exerciseId: 'pushups', unit: 'reps', target: 80 },
					{ newExercise: { name: 'Plank', kind: 'time' }, unit: 'minutes', target: 3 }
				]
			}
		});
		expect(saved.status).toBe(200);
		expect(saved.body.plan.current.map((item: { name: string }) => item.name)).toEqual(['Liegestütze', 'Plank']);

		const seen = await call(hunter, { path: `/api/hunters/${tobias.id}`, token: niklas.token, params: { id: tobias.id } });
		expect(seen.body.plan.current.map((item: { target: number }) => item.target)).toEqual([80, 3]);

		const plankId = saved.body.plan.current[1].exerciseId;
		const set = await call(addSet, {
			method: 'POST',
			path: '/api/sets',
			token: tobias.token,
			body: { date: '2026-10-14', exerciseId: plankId, value: 3 }
		});
		expect(set.status).toBe(200);

		const wrong = await call(putPlan, {
			method: 'PUT',
			path: '/api/plan',
			token: tobias.token,
			body: { items: [{ exerciseId: 'pushups', unit: 'km', target: 5 }] }
		});
		expect(wrong.status).toBe(400);
	});
});

describe('Profil-API', () => {
	it('setzt Spielername und Farbschema, wählt und löscht Avatare', async () => {
		const { tobias, niklas } = await team();
		const named = await call(patchMe, {
			method: 'PATCH',
			path: '/api/me',
			token: tobias.token,
			body: { displayName: 'Shadow Tobi', theme: 'gate' }
		});
		expect(named.body.hunter).toMatchObject({ name: 'Shadow Tobi', loginName: 'Tobias', theme: 'gate' });
		const clash = await call(patchMe, {
			method: 'PATCH',
			path: '/api/me',
			token: niklas.token,
			body: { displayName: 'shadow tobi' }
		});
		expect(clash.status).toBe(409);

		const preset = await call(presetAvatar, { method: 'PUT', path: '/api/me/avatar', token: tobias.token, body: { preset: '05' } });
		expect(preset.body.hunter.avatarUrl).toBe('/avatars/avatar-05.webp');

		const jpeg = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#ff8a3d' } }).jpeg().toBuffer();
		const uploaded = await call(uploadAvatar, {
			path: '/api/me/avatar',
			token: tobias.token,
			raw: { type: 'image/jpeg', bytes: new Uint8Array(jpeg) }
		});
		const url = uploaded.body.hunter.avatarUrl as string;
		expect(url).toMatch(/^\/api\/avatars\//);
		const file = url.split('/').at(-1) as string;
		const image = await call(avatarFile, { path: url, token: niklas.token, params: { file } });
		expect(image.status).toBe(200);
		expect((await sharp(image.body).metadata()).width).toBe(256);
		expect((await call(avatarFile, { path: url, params: { file } })).status).toBe(401);

		const text = await call(uploadAvatar, {
			path: '/api/me/avatar',
			token: tobias.token,
			raw: { type: 'text/plain', bytes: new TextEncoder().encode('hallo') }
		});
		expect(text.status).toBe(400);

		const cleared = await call(deleteAvatar, { method: 'DELETE', path: '/api/me/avatar', token: tobias.token });
		expect(cleared.body.hunter.avatarUrl).toBeNull();
	});

	it('liefert die Erfolge-Übersicht', async () => {
		const { tobias } = await team();
		const overview = await call(badges, { path: '/api/badges', token: tobias.token });
		expect(overview.body.badges).toHaveLength(28);
		expect(overview.body.hunters).toHaveLength(2);
		expect(overview.body.progress['double-dungeon']).toEqual({ current: 0, target: 7, earned: false });
	});
});
