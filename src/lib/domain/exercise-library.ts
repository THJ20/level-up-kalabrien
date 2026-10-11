import { matchExercise } from './plan-import';
import type { PlanItem, PlanUnit } from './plan';

export const MUSCLE_GROUPS = ['push', 'pull', 'shoulders', 'core', 'legs', 'glutes', 'cardio'] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
	push: 'Brust und Trizeps',
	pull: 'Rücken',
	shoulders: 'Schultern',
	core: 'Rumpf',
	legs: 'Oberschenkel',
	glutes: 'Po und Beinrückseite',
	cardio: 'Ausdauer'
};

/** Übung ohne Geräte mit Muskelgruppen und einem Startziel für 15 bis 30 Minuten am Tag. */
export interface LibraryExercise {
	name: string;
	/** Andere Schreibweisen, damit auch eigene Katalogübungen erkannt werden. */
	aliases: string[];
	/** Hauptgruppe zuerst. */
	groups: MuscleGroup[];
	kind: 'reps' | 'time';
	unit: PlanUnit;
	target: number;
	secondsPerRep: number | null;
	tracksDistance: boolean;
}

function reps(name: string, groups: MuscleGroup[], target: number, secondsPerRep: number, aliases: string[] = []) {
	return { name, aliases, groups, kind: 'reps', unit: 'reps', target, secondsPerRep, tracksDistance: false } as const;
}

function minutes(name: string, groups: MuscleGroup[], target: number, aliases: string[] = []) {
	return { name, aliases, groups, kind: 'time', unit: 'minutes', target, secondsPerRep: null, tracksDistance: false } as const;
}

/** Bibliothek für Vorschläge. Namen der Kernübungen stimmen mit dem Katalog überein. */
export const EXERCISE_LIBRARY: readonly LibraryExercise[] = [
	reps('Liegestütze', ['push', 'shoulders'], 50, 3, ['Push-ups']),
	reps('Diamond-Liegestütze', ['push'], 30, 3, ['Diamond Push-ups', 'Enge Liegestütze']),
	reps('Weite Liegestütze', ['push', 'shoulders'], 40, 3, ['Wide Push-ups']),
	reps('Stuhl-Dips', ['push'], 30, 3, ['Dips', 'Trizeps-Dips']),
	reps('Pike-Liegestütze', ['shoulders', 'push'], 25, 3, ['Pike Push-ups']),
	reps('Schulter-Taps', ['shoulders', 'core'], 40, 2, ['Shoulder Taps']),
	reps('Superman', ['pull', 'glutes'], 30, 2, ['Supermans', 'Rückenstrecker']),
	reps('Reverse Snow Angels', ['pull', 'shoulders'], 20, 3, ['Snow Angels']),
	reps('Y-T-W-Heben', ['pull', 'shoulders'], 30, 2, ['YTW', 'Y-Raises']),
	reps('Sit-ups/Crunches', ['core'], 60, 3, ['Sit-ups', 'Crunches']),
	minutes('Unterarmstütz', ['core', 'shoulders'], 3, ['Plank', 'Planke']),
	minutes('Seitstütz', ['core'], 2, ['Side Plank', 'Seitlicher Unterarmstütz']),
	reps('Mountain Climbers', ['core', 'cardio'], 60, 2, ['Bergsteiger']),
	reps('Beinheben', ['core'], 30, 3, ['Leg Raises']),
	reps('Russian Twists', ['core'], 40, 2, ['Russische Drehungen']),
	minutes('Hollow Hold', ['core'], 2, ['Hollow Body Hold']),
	reps('Kniebeugen', ['legs', 'glutes'], 80, 3, ['Squats', 'Air Squats']),
	reps('Ausfallschritte', ['legs', 'glutes'], 40, 3, ['Lunges']),
	reps('Jump Squats', ['legs', 'cardio'], 30, 3, ['Sprungkniebeugen']),
	minutes('Wandsitzen', ['legs'], 3, ['Wall Sit']),
	reps('Bulgarische Kniebeugen', ['legs', 'glutes'], 30, 4, ['Bulgarian Split Squats']),
	reps('Beckenheben', ['glutes'], 50, 3, ['Glute Bridges', 'Glute Bridge', 'Hip Bridges']),
	reps('Einbeiniges Beckenheben', ['glutes', 'core'], 30, 3, ['Single Leg Glute Bridges']),
	reps('Donkey Kicks', ['glutes'], 40, 2, ['Eselstritte']),
	reps('Wadenheben', ['legs'], 60, 2, ['Calf Raises']),
	reps('Burpees', ['cardio', 'push', 'legs'], 25, 4),
	reps('Hampelmänner', ['cardio'], 60, 2, ['Jumping Jacks', 'Hampelmann']),
	reps('High Knees', ['cardio', 'legs'], 60, 2, ['Kniehebelauf']),
	minutes('Seilspringen', ['cardio', 'legs'], 5, ['Springseil']),
	{
		name: 'Laufen/Joggen',
		aliases: ['Laufen', 'Joggen', 'Running'],
		groups: ['cardio', 'legs'],
		kind: 'time',
		unit: 'km',
		target: 2,
		secondsPerRep: null,
		tracksDistance: true
	}
];

const LOOKUP = EXERCISE_LIBRARY.map((entry, index) => ({ id: String(index), name: [entry.name, ...entry.aliases].join('/') }));

/** Bibliothekseintrag zu einem Übungsnamen, auch für eigene Schreibweisen. */
export function libraryEntry(name: string): LibraryExercise | null {
	for (const candidate of [name, ...name.split('/')]) {
		const id = matchExercise(candidate, LOOKUP);
		if (id !== null) return EXERCISE_LIBRARY[Number(id)];
	}
	return null;
}

export function groupsOf(name: string): MuscleGroup[] {
	return libraryEntry(name)?.groups ?? [];
}

export interface RotationSwap {
	replace: PlanItem;
	with: LibraryExercise;
	/** Muskelgruppe, die damit neu dazukommt. */
	group: MuscleGroup;
}

export interface RotationSuggestion {
	/** Muskelgruppen des aktuellen Plans. */
	trained: MuscleGroup[];
	/** Muskelgruppen, die der Vorschlag neu ins Spiel bringt. */
	focus: MuscleGroup[];
	swaps: RotationSwap[];
}

/**
 * Schlägt 1 bis 2 Tausche vor, die bisher wenig trainierte Muskelgruppen ins Spiel bringen.
 * Frühere Pläne zählen mit, damit nicht immer dieselben Gruppen vorgeschlagen werden.
 * Getauscht wird die Übung, deren Muskelgruppen im Plan am stärksten doppelt vorkommen.
 */
export function suggestRotation(input: {
	current: readonly PlanItem[];
	/** Ältere Planversionen, neueste zuerst. */
	history: readonly (readonly PlanItem[])[];
	maxSwaps?: number;
}): RotationSuggestion {
	const maxSwaps = input.maxSwaps ?? 2;
	const currentGroups = input.current.map((item) => groupsOf(item.name));
	const trained = MUSCLE_GROUPS.filter((group) => currentGroups.some((groups) => groups.includes(group)));

	const weight = new Map<MuscleGroup, number>(MUSCLE_GROUPS.map((group) => [group, 0]));
	currentGroups.forEach((groups) => groups.forEach((group, index) => weight.set(group, (weight.get(group) ?? 0) + (index === 0 ? 3 : 2))));
	input.history.slice(0, 4).forEach((items) =>
		items.forEach((item) => groupsOf(item.name).forEach((group) => weight.set(group, (weight.get(group) ?? 0) + 1)))
	);

	const usedNames = new Set(
		[...input.current, ...input.history.slice(0, 4).flat()].map((item) => libraryEntry(item.name)?.name ?? item.name)
	);
	const focusOrder = MUSCLE_GROUPS.filter((group) => !trained.includes(group)).sort(
		(a, b) => (weight.get(a) ?? 0) - (weight.get(b) ?? 0) || MUSCLE_GROUPS.indexOf(a) - MUSCLE_GROUPS.indexOf(b)
	);

	// Übungen nach Doppelung sortieren: Wessen Gruppen am häufigsten im Plan vorkommen, wird zuerst getauscht.
	const overlap = (index: number) =>
		currentGroups[index].reduce(
			(sum, group) => sum + currentGroups.filter((groups) => groups.includes(group)).length - 1 + (weight.get(group) ?? 0) / 10,
			0
		);
	const replaceOrder = input.current
		.map((item, index) => ({ item, index }))
		.sort((a, b) => overlap(b.index) - overlap(a.index) || a.index - b.index);

	const swaps: RotationSwap[] = [];
	for (const group of focusOrder) {
		if (swaps.length >= maxSwaps) break;
		const candidates = EXERCISE_LIBRARY.filter((entry) => entry.groups[0] === group && !usedNames.has(entry.name));
		const choice = candidates[0] ?? EXERCISE_LIBRARY.find((entry) => entry.groups[0] === group && !input.current.some((item) => libraryEntry(item.name)?.name === entry.name));
		const target = replaceOrder[swaps.length];
		if (!choice || !target) continue;
		swaps.push({ replace: target.item, with: choice, group });
		usedNames.add(choice.name);
	}
	return { trained, focus: swaps.map((swap) => swap.group), swaps };
}
