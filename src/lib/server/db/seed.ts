import { CORE_EXERCISES } from '#lib/domain/index.ts';
import type { AppDb } from './client';
import { exercises } from './schema';

interface CatalogSeed {
	name: string;
	kind: 'time' | 'reps';
	secondsPerRep?: number;
	tracksDistance?: boolean;
	isRunning?: boolean;
}

export const START_CATALOG: readonly CatalogSeed[] = [
	{ name: 'Laufen/Joggen', kind: 'time', tracksDistance: true, isRunning: true },
	{ name: 'Radfahren', kind: 'time', tracksDistance: true },
	{ name: 'Schwimmen', kind: 'time', tracksDistance: true },
	{ name: 'Krafttraining/Gym', kind: 'time' },
	{ name: 'HIIT/Zirkeltraining', kind: 'time' },
	{ name: 'Fußball/Teamsport', kind: 'time' },
	{ name: 'Klettern/Bouldern', kind: 'time' },
	{ name: 'Wandern', kind: 'time', tracksDistance: true },
	{ name: 'Yoga/Mobility', kind: 'time' },
	{ name: 'Rudern', kind: 'time', tracksDistance: true },
	{ name: 'Seilspringen', kind: 'time' },
	{ name: 'Klimmzüge', kind: 'reps', secondsPerRep: 4 },
	{ name: 'Dips', kind: 'reps', secondsPerRep: 3 },
	{ name: 'Burpees', kind: 'reps', secondsPerRep: 4 },
	{ name: 'Ausfallschritte', kind: 'reps', secondsPerRep: 3 }
];

/**
 * Legt die Kernübungen der Daily Quest mit festen IDs an, falls sie fehlen,
 * und spielt den Startkatalog der Zusatzübungen ein, solange der Katalog leer ist.
 */
export function seedCatalog(db: AppDb, now: Date): void {
	const empty = db.select({ id: exercises.id }).from(exercises).limit(1).all().length === 0;
	db.insert(exercises)
		.values(
			CORE_EXERCISES.map((entry) => ({
				id: entry.id,
				name: entry.name,
				kind: 'reps' as const,
				secondsPerRep: entry.secondsPerRep,
				createdBy: null,
				createdAt: now
			}))
		)
		.onConflictDoNothing()
		.run();
	if (!empty) return;
	db.insert(exercises)
		.values(
			START_CATALOG.map((entry) => ({
				id: crypto.randomUUID(),
				name: entry.name,
				kind: entry.kind,
				secondsPerRep: entry.secondsPerRep ?? null,
				tracksDistance: entry.tracksDistance ?? false,
				isRunning: entry.isRunning ?? false,
				createdBy: null,
				createdAt: now
			}))
		)
		.run();
}
