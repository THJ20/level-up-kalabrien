import { CHALLENGE_START, localDateOf, type LocalDate } from '#lib/domain/index.ts';
import type { Clock } from './clock';
import {
	createChangeBus,
	type ChangeTopic,
	type Notification,
	type NotificationKind,
	type Notifier,
	type ServiceContext
} from './context';
import { openDatabase } from './db/client';
import { hunters, questSets, settings } from './db/schema';

export class FakeClock implements Clock {
	private current: number;

	constructor(iso: string) {
		this.current = Date.parse(iso);
	}

	now(): Date {
		return new Date(this.current);
	}

	set(iso: string): void {
		this.current = Date.parse(iso);
	}

	advance(ms: number): void {
		this.current += ms;
	}
}

export class RecordingNotifier implements Notifier {
	readonly sent: { hunterIds: string[]; notification: Notification; kind: NotificationKind }[] = [];

	notify(hunterIds: readonly string[], notification: Notification, kind: NotificationKind): void {
		this.sent.push({ hunterIds: [...hunterIds], notification, kind });
	}
}

export interface TestContext extends ServiceContext {
	clock: FakeClock;
	notifier: RecordingNotifier;
	published: ChangeTopic[][];
}

/** Kontext mit Speicher-Datenbank, steuerbarer Uhr und Go-live am Challenge-Start. */
export function createTestContext(nowIso = '2026-10-09T10:00:00Z'): TestContext {
	const clock = new FakeClock(nowIso);
	const db = openDatabase(':memory:', clock.now());
	db.insert(settings).values({ key: 'go_live_date', value: CHALLENGE_START }).run();
	const bus = createChangeBus();
	const published: ChangeTopic[][] = [];
	bus.subscribe((topics) => published.push([...topics]));
	return { db, clock, notifier: new RecordingNotifier(), bus, published, random: () => 0 };
}

export interface TestHunterOptions {
	role?: 'admin' | 'hunter';
	registeredOn?: LocalDate;
	color?: string;
	active?: boolean;
}

/** Trägt eine erfüllte Daily Quest direkt in die Datenbank ein (ohne Pipeline). */
export function seedFullDay(ctx: ServiceContext, hunterId: string, date: LocalDate): void {
	ctx.db
		.insert(questSets)
		.values(
			(['pushups', 'squats', 'situps'] as const).map((exercise) => ({
				id: crypto.randomUUID(),
				hunterId,
				date,
				exercise,
				reps: 100,
				recordedAt: ctx.clock.now()
			}))
		)
		.run();
}

/** Legt einen Hunter direkt an (ohne Passwort-Hashing) und liefert seine ID. */
export function insertHunter(
	ctx: ServiceContext,
	name: string,
	options: TestHunterOptions = {}
): string {
	const id = crypto.randomUUID();
	ctx.db
		.insert(hunters)
		.values({
			id,
			name,
			nameKey: name.toLowerCase(),
			color: options.color ?? '#a47cff',
			passwordHash: 'test',
			role: options.role ?? 'hunter',
			active: options.active ?? true,
			registeredOn: options.registeredOn ?? localDateOf(ctx.clock.now()),
			createdAt: ctx.clock.now()
		})
		.run();
	return id;
}
