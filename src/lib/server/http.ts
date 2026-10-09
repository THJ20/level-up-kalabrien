import { json, type RequestEvent } from '@sveltejs/kit';
import { ZodError, type z } from 'zod';
import { getApp } from './app';
import { validateSession, type SessionToken } from './auth/sessions';
import { ERROR_STATUS, ServiceError, invalid, type ErrorCode } from './errors';
import type { HunterProfile } from './hunters';

export const SESSION_COOKIE = 'session';

export function errorResponse(code: ErrorCode | 'internal', message: string): Response {
	const status = code === 'internal' ? 500 : ERROR_STATUS[code];
	return json({ error: { code, message } }, { status });
}

function toErrorResponse(error: unknown): Response {
	if (error instanceof ServiceError) return errorResponse(error.code, error.message);
	if (error instanceof ZodError) {
		const issue = error.issues[0];
		const field = issue?.path.join('.') || 'Eingabe';
		return errorResponse('invalid_input', `Ungültige Eingabe bei „${field}“.`);
	}
	console.error(error);
	return errorResponse('internal', 'Da ist etwas schiefgelaufen. Bitte versuch es noch einmal.');
}

type Handler = (event: RequestEvent) => unknown | Promise<unknown>;

/** Endpunkt ohne Login-Pflicht. Rückgabewerte werden zu JSON, Fehler zu Fehlerantworten. */
export function publicApi(handler: Handler): (event: RequestEvent) => Promise<Response> {
	return async (event) => {
		try {
			const result = await handler(event);
			if (result instanceof Response) return result;
			return json(result ?? { ok: true });
		} catch (error) {
			return toErrorResponse(error);
		}
	};
}

/** Endpunkt mit Login-Pflicht. Ohne gültige Sitzung gibt es 401. */
export function api(
	handler: (event: RequestEvent, hunter: HunterProfile) => unknown | Promise<unknown>
): (event: RequestEvent) => Promise<Response> {
	return publicApi((event) => {
		const hunter = event.locals.hunter;
		if (!hunter) throw new ServiceError('unauthorized', 'Bitte melde dich an.');
		return handler(event, hunter);
	});
}

export async function parseJson<T extends z.ZodType>(event: RequestEvent, schema: T): Promise<z.infer<T>> {
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw invalid('Die Anfrage enthält kein gültiges JSON.');
	}
	return schema.parse(body);
}

export function parseQuery<T extends z.ZodType>(event: RequestEvent, schema: T): z.infer<T> {
	return schema.parse(Object.fromEntries(event.url.searchParams));
}

export function setSessionCookie(event: RequestEvent, session: SessionToken): void {
	event.cookies.set(SESSION_COOKIE, session.token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: session.expiresAt
	});
}

export function clearSessionCookie(event: RequestEvent): void {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Liest das Sitzungs-Cookie, prüft es und füllt `event.locals`. */
export function authenticate(event: RequestEvent): void {
	const token = event.cookies.get(SESSION_COOKIE) ?? null;
	const validated = token ? validateSession(getApp().ctx, token) : null;
	event.locals.hunter = validated?.hunter ?? null;
	event.locals.sessionToken = validated ? token : null;
	if (validated && token) setSessionCookie(event, { token, expiresAt: validated.expiresAt });
}
