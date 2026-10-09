import { describe, expect, it } from 'vitest';
import { call, createTestApp } from '#lib/server/http-testing.ts';
import { validateSession } from '#lib/server/auth/sessions.ts';
import { createInvite } from '#lib/server/auth/invites.ts';
import { GET as inviteInfo } from './invite/+server';
import { POST as register } from './register/+server';
import { POST as login } from './login/+server';
import { POST as logout } from './logout/+server';

const PASSWORD = 'geheim-genug-123';

async function registerAdmin() {
	const test = createTestApp();
	const response = await call(register, {
		method: 'POST',
		path: '/api/auth/register',
		body: { token: test.adminToken, name: 'Tobias', password: PASSWORD, color: '#a47cff' }
	});
	return { ...test, response, token: response.cookies.get('session') as string };
}

describe('Auth-API', () => {
	it('prüft Einladungslinks', async () => {
		const { adminToken } = createTestApp();
		expect((await call(inviteInfo, { path: `/api/auth/invite?token=${adminToken}` })).body).toEqual({
			valid: true,
			role: 'admin'
		});
		expect((await call(inviteInfo, { path: '/api/auth/invite?token=falsch' })).body).toEqual({
			valid: false,
			role: null
		});
	});

	it('registriert über die Admin-Einladung und setzt das Sitzungs-Cookie', async () => {
		const { response, token, app } = await registerAdmin();
		expect(response.status).toBe(200);
		expect(response.body.hunter).toMatchObject({ name: 'Tobias', role: 'admin' });
		expect(validateSession(app.ctx, token)?.hunter.name).toBe('Tobias');
	});

	it('übersetzt Dienstfehler und ungültige Eingaben', async () => {
		const { app } = await registerAdmin();
		const invite = createInvite(app.ctx, null);
		const duplicate = await call(register, {
			method: 'POST',
			path: '/api/auth/register',
			body: { token: invite.token, name: 'tobias', password: PASSWORD, color: '#a47cff' }
		});
		expect(duplicate.status).toBe(409);
		expect(duplicate.body.error.code).toBe('conflict');

		const incomplete = await call(register, {
			method: 'POST',
			path: '/api/auth/register',
			body: { token: invite.token }
		});
		expect(incomplete.status).toBe(400);
		expect(incomplete.body.error).toMatchObject({ code: 'invalid_input' });
	});

	it('meldet an und ab', async () => {
		await registerAdmin();
		const wrong = await call(login, {
			method: 'POST',
			path: '/api/auth/login',
			body: { name: 'Tobias', password: 'falsch-falsch' }
		});
		expect(wrong.status).toBe(401);

		const right = await call(login, {
			method: 'POST',
			path: '/api/auth/login',
			body: { name: 'Tobias', password: PASSWORD }
		});
		expect(right.status).toBe(200);
		const token = right.cookies.get('session') as string;
		expect(token).toBeTruthy();

		expect((await call(logout, { method: 'POST', path: '/api/auth/logout' })).status).toBe(401);
		const out = await call(logout, { method: 'POST', path: '/api/auth/logout', token });
		expect(out.status).toBe(200);
		expect(out.cookies.get('session')).toBeUndefined();
		expect((await call(logout, { method: 'POST', path: '/api/auth/logout', token })).status).toBe(401);
	});
});
