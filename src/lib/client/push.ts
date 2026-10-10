import { apiFetch } from './api';

export type PushSupport = 'unsupported' | 'needs-install' | 'denied' | 'ready';

export interface PushEnvironment {
	hasServiceWorker: boolean;
	hasPushManager: boolean;
	permission: NotificationPermission;
	isIos: boolean;
	standalone: boolean;
}

/** Ob Web Push auf diesem Gerät gehen kann. Auf dem iPhone nur aus der installierten App heraus. */
export function pushSupport(env: PushEnvironment): PushSupport {
	if (env.isIos && !env.standalone) return 'needs-install';
	if (!env.hasServiceWorker || !env.hasPushManager) return 'unsupported';
	if (env.permission === 'denied') return 'denied';
	return 'ready';
}

export function currentEnvironment(): PushEnvironment {
	const nav = navigator as Navigator & { standalone?: boolean };
	return {
		hasServiceWorker: 'serviceWorker' in navigator,
		hasPushManager: 'PushManager' in window,
		permission: 'Notification' in window ? Notification.permission : 'denied',
		isIos: /iphone|ipad|ipod/i.test(navigator.userAgent),
		standalone: window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
	};
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
	const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(padded);
	const bytes = new Uint8Array(new ArrayBuffer(raw.length));
	for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
	return bytes;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
	if (!('serviceWorker' in navigator)) return null;
	const registration = await navigator.serviceWorker.ready;
	return registration.pushManager.getSubscription();
}

/** Fragt die Erlaubnis an, abonniert Push und meldet das Abo beim Server an. */
export async function enablePush(): Promise<void> {
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt.');
	const { publicKey } = await apiFetch<{ publicKey: string }>('/api/push/key');
	const registration = await navigator.serviceWorker.ready;
	const subscription =
		(await registration.pushManager.getSubscription()) ??
		(await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(publicKey)
		}));
	const json = subscription.toJSON();
	await apiFetch('/api/push/subscription', {
		body: { endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } }
	});
}

export async function disablePush(): Promise<void> {
	const subscription = await currentSubscription();
	if (!subscription) return;
	await apiFetch('/api/push/subscription', { method: 'DELETE', body: { endpoint: subscription.endpoint } });
	await subscription.unsubscribe();
}
