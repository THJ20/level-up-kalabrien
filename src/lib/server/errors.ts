export type ErrorCode =
	| 'invalid_input'
	| 'unauthorized'
	| 'forbidden'
	| 'not_found'
	| 'conflict'
	| 'locked';

export const ERROR_STATUS: Record<ErrorCode, number> = {
	invalid_input: 400,
	unauthorized: 401,
	forbidden: 403,
	not_found: 404,
	conflict: 409,
	locked: 429
};

export class ServiceError extends Error {
	constructor(
		readonly code: ErrorCode,
		message: string
	) {
		super(message);
		this.name = 'ServiceError';
	}
}

export function invalid(message: string): ServiceError {
	return new ServiceError('invalid_input', message);
}

export function notFound(message: string): ServiceError {
	return new ServiceError('not_found', message);
}

export function forbidden(message: string): ServiceError {
	return new ServiceError('forbidden', message);
}
