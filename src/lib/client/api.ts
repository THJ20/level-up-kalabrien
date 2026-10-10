export class ApiError extends Error {
	constructor(
		readonly code: string,
		message: string,
		readonly status: number
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/** Ruft die JSON-API auf. Fehler kommen als `ApiError` mit deutscher Meldung zurück. */
export async function apiFetch<T = unknown>(
	path: string,
	options: { method?: string; body?: unknown } = {}
): Promise<T> {
	const response = await fetch(path, {
		method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
		headers: options.body !== undefined ? { 'content-type': 'application/json' } : undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
		credentials: 'same-origin'
	});
	const data = await response.json().catch(() => null);
	if (!response.ok) {
		throw new ApiError(
			data?.error?.code ?? 'internal',
			data?.error?.message ?? 'Da ist etwas schiefgelaufen. Bitte versuch es noch einmal.',
			response.status
		);
	}
	return data as T;
}

/** `fetch` wirft `TypeError`, wenn kein Netz da ist. */
export function isNetworkError(error: unknown): boolean {
	return error instanceof TypeError;
}

export function errorMessage(error: unknown): string {
	if (error instanceof ApiError) return error.message;
	if (isNetworkError(error)) return 'Keine Verbindung. Bitte prüf dein Netz.';
	return 'Da ist etwas schiefgelaufen. Bitte versuch es noch einmal.';
}
