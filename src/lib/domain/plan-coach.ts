import { CHALLENGE_END, DEPARTURE, daysBetween, type LocalDate } from './challenge';
import { MAX_PLAN_ITEMS, MIN_PLAN_ITEMS, UNIT_LABELS, type PlanItem } from './plan';
import { RATING_LABELS, type Rating } from './progression';

const UNIT_WORD: Record<PlanItem['unit'], string> = { reps: 'Wdh', minutes: 'Min', km: 'km' };

function amount(item: PlanItem): string {
	return `${String(item.target).replace('.', ',')} ${UNIT_LABELS[item.unit].short}`;
}

/**
 * Prompt für die eigene KI: Sie soll den Plan anpassen und fordernder machen, im Rahmen von 15 bis 30 Minuten.
 * Die Antwort hat das Format, das der Import versteht.
 */
export function coachPrompt(input: {
	items: readonly PlanItem[];
	rating: Rating | null;
	notes: string;
	/** Erfüllte Tage in den letzten 14 Tagen und wie viele davon gewertet wurden. */
	fulfilled: number;
	scoredDays: number;
	today: LocalDate;
	/** Wöchentlicher Wechsel: bisher trainierte und neu vorgeschlagene Muskelgruppen. */
	focus?: { trained: readonly string[]; suggested: readonly string[] };
}): string {
	const daysLeft = Math.max(0, daysBetween(input.today, CHALLENGE_END) + 1);
	const direction =
		input.rating === 'too_hard'
			? 'Mach ihn etwas leichter, aber so, dass ich trotzdem weiter Fortschritte mache.'
			: input.rating === 'too_easy'
				? 'Mach ihn deutlich fordernder, über mehr Wiederholungen oder schwerere Varianten, nicht über mehr Übungen.'
				: 'Mach ihn etwas fordernder, damit ich weiter Fortschritte mache.';
	const count = Math.min(MAX_PLAN_ITEMS, Math.max(MIN_PLAN_ITEMS, input.items.length));
	const lines = [
		'Du bist mein Trainer. Passe meinen täglichen Trainingsplan an.',
		'',
		`Ziel: Ich trainiere jeden Tag bis zum ${CHALLENGE_END.split('-').reverse().join('.')} (noch ${daysLeft} Tage), am ${DEPARTURE.split('-').reverse().join('.')} fliege ich nach Kalabrien. Ich will stetig fitter und stärker werden.`,
		'',
		'Rahmen:',
		'- Jeden Tag dasselbe Programm, in 15 bis 30 Minuten machbar.',
		'- Nebenbei zu Hause oder draußen, ohne Geräte, keine Gym-Session.',
		`- Genau ${MIN_PLAN_ITEMS} bis ${MAX_PLAN_ITEMS} Übungen. Mein Plan hat gerade ${input.items.length}, bleib möglichst bei ${count}. Mehr Übungen sind keine Steigerung.`,
		'- Progressiv über mehr Wiederholungen, längere Zeiten oder eine schwerere Variante derselben Bewegung (z. B. Diamond-Liegestütze statt Liegestütze, Jump Squats statt Kniebeugen). Sobald 30 Minuten erreicht sind, nur noch schwerere Varianten.',
		'- Ausgewogen für Oberkörper, Beine und Rumpf.',
		'',
		'Mein aktueller Plan (Tagesziele):',
		...input.items.map((item) => `- ${item.name}: ${amount(item)}`),
		'',
		`Meine Einschätzung: ${input.rating ? RATING_LABELS[input.rating] : 'Passend'}. ${direction}`,
		input.scoredDays > 0
			? `In den letzten ${input.scoredDays} gewerteten Tagen habe ich den Plan an ${input.fulfilled} Tagen geschafft.`
			: 'Ich stehe noch am Anfang.'
	];
	if (input.focus) {
		lines.push(
			input.focus.suggested.length > 0
				? `Fokus diese Woche: Bring neue Muskelgruppen rein, vor allem ${input.focus.suggested.join(' und ')}. Bisher trainiert: ${input.focus.trained.join(', ')}. Tausche dafür 1 bis 2 Übungen, der Rest bleibt.`
				: 'Fokus diese Woche: Mein Plan deckt schon alle Muskelgruppen ab. Tausche 1 bis 2 Übungen gegen Varianten, die ich noch nicht gemacht habe, der Rest bleibt.'
		);
	}
	const notes = input.notes.trim();
	if (notes) lines.push(`Hinweise von mir: ${notes}`);
	lines.push(
		'',
		'Antwort: Gib nur einen Codeblock aus, eine Zeile pro Übung im Format: Übung | Ziel | Einheit',
		`Einheit ist genau eines von: ${Object.values(UNIT_WORD).join(', ')}. Ziele sind Tagessummen, Sätze rechnest du zusammen (3 x 20 wird 60 Wdh). Kurze deutsche Übungsnamen.`
	);
	return lines.join('\n');
}
