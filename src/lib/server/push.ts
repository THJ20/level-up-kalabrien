import { and, eq, inArray } from 'drizzle-orm';
import webpush from 'web-push';
import type { Notification, NotificationKind, Notifier, ServiceContext } from './context';
import { hunters, pushSubscriptions } from './db/schema';
import { invalid } from './errors';
import type { VapidKeys } from './vapid';

export interface PushSubscriptionInput {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

export interface PushTransport {
	send(subscription: PushSubscriptionInput, payload: string): Promise<{ statusCode: number }>;
}

const TWELVE_HOURS = 12 * 60 * 60;

export function webPushTransport(vapid: VapidKeys, subject: string): PushTransport {
	return {
		async send(subscription, payload) {
			try {
				const result = await webpush.sendNotification(subscription, payload, {
					TTL: TWELVE_HOURS,
					vapidDetails: { subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey }
				});
				return { statusCode: result.statusCode };
			} catch (error) {
				if (error && typeof error === 'object' && 'statusCode' in error) {
					return { statusCode: Number((error as { statusCode: unknown }).statusCode) };
				}
				throw error;
			}
		}
	};
}

export function savePushSubscription(
	ctx: ServiceContext,
	hunterId: string,
	input: PushSubscriptionInput
): void {
	if (!input.endpoint.startsWith('https://') || !input.keys.p256dh || !input.keys.auth) {
		throw invalid('Ungültiges Push-Abo.');
	}
	ctx.db
		.insert(pushSubscriptions)
		.values({
			id: crypto.randomUUID(),
			hunterId,
			endpoint: input.endpoint,
			p256dh: input.keys.p256dh,
			auth: input.keys.auth,
			createdAt: ctx.clock.now()
		})
		.onConflictDoUpdate({
			target: pushSubscriptions.endpoint,
			set: { hunterId, p256dh: input.keys.p256dh, auth: input.keys.auth }
		})
		.run();
}

export function removePushSubscription(ctx: ServiceContext, hunterId: string, endpoint: string): void {
	ctx.db
		.delete(pushSubscriptions)
		.where(and(eq(pushSubscriptions.hunterId, hunterId), eq(pushSubscriptions.endpoint, endpoint)))
		.run();
}

/** Verschickt Benachrichtigungen per Web Push an alle Geräte der Empfänger, die das erlauben. */
export class PushNotifier implements Notifier {
	private readonly pending = new Set<Promise<void>>();

	constructor(
		private readonly ctx: ServiceContext,
		private readonly transport: PushTransport,
		private readonly log: (line: string) => void = (line) => console.error(line)
	) {}

	notify(hunterIds: readonly string[], notification: Notification, kind: NotificationKind): void {
		if (hunterIds.length === 0) return;
		const kindAllowed = kind === 'reminder' ? hunters.reminderEnabled : hunters.votePushEnabled;
		const targets = this.ctx.db
			.select({ subscription: pushSubscriptions })
			.from(pushSubscriptions)
			.innerJoin(hunters, eq(pushSubscriptions.hunterId, hunters.id))
			.where(
				and(
					inArray(pushSubscriptions.hunterId, [...hunterIds]),
					eq(hunters.active, true),
					eq(hunters.pushEnabled, true),
					eq(kindAllowed, true)
				)
			)
			.all();
		const payload = JSON.stringify(notification);
		for (const { subscription } of targets) {
			const task = this.deliver(subscription, payload);
			this.pending.add(task);
			void task.finally(() => this.pending.delete(task));
		}
	}

	private async deliver(subscription: typeof pushSubscriptions.$inferSelect, payload: string): Promise<void> {
		try {
			const { statusCode } = await this.transport.send(
				{ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
				payload
			);
			if (statusCode === 404 || statusCode === 410) {
				this.ctx.db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id)).run();
			}
		} catch (error) {
			this.log(
				`Push an ${subscription.endpoint} fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/** Wartet, bis alle laufenden Zustellungen fertig sind. */
	async flush(): Promise<void> {
		await Promise.all([...this.pending]);
	}
}
