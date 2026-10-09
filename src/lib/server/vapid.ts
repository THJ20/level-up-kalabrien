import { eq } from 'drizzle-orm';
import webpush from 'web-push';
import type { ServiceContext } from './context';
import { settings } from './db/schema';

export interface VapidKeys {
	publicKey: string;
	privateKey: string;
}

const PUBLIC_KEY = 'vapid_public_key';
const PRIVATE_KEY = 'vapid_private_key';

function readSetting(ctx: ServiceContext, key: string): string | undefined {
	return ctx.db.select().from(settings).where(eq(settings.key, key)).get()?.value;
}

/** Liefert die VAPID-Schlüssel für Web Push und erzeugt sie beim ersten Start. */
export function ensureVapidKeys(
	ctx: ServiceContext,
	generate: () => VapidKeys = () => webpush.generateVAPIDKeys()
): VapidKeys {
	const publicKey = readSetting(ctx, PUBLIC_KEY);
	const privateKey = readSetting(ctx, PRIVATE_KEY);
	if (publicKey && privateKey) return { publicKey, privateKey };

	const keys = generate();
	ctx.db
		.insert(settings)
		.values([
			{ key: PUBLIC_KEY, value: keys.publicKey },
			{ key: PRIVATE_KEY, value: keys.privateKey }
		])
		.onConflictDoNothing()
		.run();
	return keys;
}
