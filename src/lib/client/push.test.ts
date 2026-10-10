import { describe, expect, it } from 'vitest';
import { pushSupport, urlBase64ToUint8Array } from './push';

describe('VAPID-Schlüssel', () => {
	it('wandelt base64url in Bytes um', () => {
		expect([...urlBase64ToUint8Array('AQID_-8')]).toEqual([1, 2, 3, 255, 239]);
	});
});

describe('Push-Unterstützung', () => {
	const base = { hasServiceWorker: true, hasPushManager: true, permission: 'default' as const };

	it('erkennt fehlende Unterstützung', () => {
		expect(pushSupport({ ...base, hasPushManager: false, isIos: false, standalone: false })).toBe('unsupported');
	});

	it('verlangt auf dem iPhone die Installation auf dem Homescreen', () => {
		expect(pushSupport({ ...base, hasPushManager: false, isIos: true, standalone: false })).toBe('needs-install');
		expect(pushSupport({ ...base, isIos: true, standalone: true })).toBe('ready');
	});

	it('meldet eine verweigerte Erlaubnis', () => {
		expect(pushSupport({ ...base, permission: 'denied', isIos: false, standalone: false })).toBe('denied');
	});
});
