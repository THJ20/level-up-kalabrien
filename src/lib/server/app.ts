import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomIndex } from '#lib/domain/index.ts';
import { ensureAdminInvite } from './auth/invites';
import { LoginThrottle } from './auth/throttle';
import { simulatedClock, systemClock, type Clock } from './clock';
import { loadConfig, type AppConfig } from './config';
import { createChangeBus, type Notifier, type ServiceContext } from './context';
import { openDatabase } from './db/client';
import { PushNotifier, webPushTransport, type PushTransport } from './push';
import { startScheduler } from './scheduler';
import { ensureStartPlans } from './plans';
import { ensureGoLiveDate } from './settings';
import { ensureVapidKeys, type VapidKeys } from './vapid';
import { evaluateAllHunters } from './votes';

export interface App {
	config: AppConfig;
	ctx: ServiceContext;
	throttle: LoginThrottle;
	vapid: VapidKeys;
	notifier: PushNotifier;
	stop(): void;
}

export interface AppDeps {
	clock?: Clock;
	transport?: PushTransport;
	startJobs?: boolean;
	log?: (line: string) => void;
	generateVapidKeys?: () => VapidKeys;
}

/** Baut die laufende Anwendung: Datenbank, Dienste, Push, Admin-Einladung, Nachholen und Zeitsteuerung. */
export function createApp(config: AppConfig, deps: AppDeps = {}): App {
	const log = deps.log ?? ((line: string) => console.log(line));
	const clock = deps.clock ?? (config.simulatedNow ? simulatedClock(config.simulatedNow) : systemClock);
	if (!deps.clock && config.simulatedNow) log(`Achtung: simulierte Uhrzeit ab ${config.simulatedNow.toISOString()}`);
	if (config.databasePath !== ':memory:') mkdirSync(dirname(config.databasePath), { recursive: true });

	const db = openDatabase(config.databasePath, clock.now());
	const ctx: ServiceContext = {
		db,
		clock,
		bus: createChangeBus(),
		random: randomIndex,
		notifier: { notify: () => {} } satisfies Notifier
	};
	ensureGoLiveDate(ctx, config.goLiveDate ?? undefined);
	ensureStartPlans(ctx);
	const vapid = ensureVapidKeys(ctx, deps.generateVapidKeys);
	const notifier = new PushNotifier(
		ctx,
		deps.transport ?? webPushTransport(vapid, config.vapidSubject),
		log
	);
	ctx.notifier = notifier;

	const adminToken = ensureAdminInvite(ctx);
	if (adminToken) {
		log(`Admin-Einladung (7 Tage gültig): ${config.origin ?? 'http://localhost:5173'}/register?token=${adminToken}`);
	}
	evaluateAllHunters(ctx);

	const stopJobs = deps.startJobs === false ? () => {} : startScheduler(ctx, { backupDir: config.backupDir, log });
	return {
		config,
		ctx,
		throttle: new LoginThrottle(clock),
		vapid,
		notifier,
		stop() {
			stopJobs();
			if (db.$client.open) db.$client.close();
		}
	};
}

// Global abgelegt, damit Modul-Neuladungen im Dev-Server keine zweite Datenbankverbindung
// und keinen zweiten Scheduler erzeugen.
const holder = globalThis as typeof globalThis & { __levelUpApp?: App | null };

export function getApp(): App {
	holder.__levelUpApp ??= createApp(loadConfig(process.env));
	return holder.__levelUpApp;
}

export function setApp(app: App | null): void {
	holder.__levelUpApp = app;
}
