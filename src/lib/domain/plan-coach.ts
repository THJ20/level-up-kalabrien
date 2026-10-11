import { CHALLENGE_END, DEPARTURE, daysBetween, type LocalDate } from './challenge';
import { UNIT_LABELS, type PlanItem } from './plan';
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
}): string {
	const daysLeft = Math.max(0, daysBetween(input.today, CHALLENGE_END) + 1);
	const direction =
		input.rating === 'too_hard'
			? 'Mach ihn etwas leichter, aber so, dass ich trotzdem weiter Fortschritte mache.'
			: input.rating === 'too_easy'
				? 'Mach ihn deutlich fordernder.'
				: 'Mach ihn etwas fordernder, damit ich weiter Fortschritte mache.';
	const lines = [
		'Du bist mein Trainer. Passe meinen täglichen Trainingsplan an.',
		'',
		`Ziel: Ich trainiere jeden Tag bis zum ${CHALLENGE_END.split('-').reverse().join('.')} (noch ${daysLeft} Tage), am ${DEPARTURE.split('-').reverse().join('.')} fliege ich nach Kalabrien. Ich will stetig fitter und stärker werden.`,
		'',
		'Rahmen:',
		'- Jeden Tag dasselbe Programm, in 15 bis 30 Minuten machbar.',
		'- Nebenbei zu Hause oder draußen, ohne Geräte, keine Gym-Session.',
		'- Progressiv: Der neue Plan ist fordernder als der alte. Sobald 30 Minuten erreicht sind, lieber schwerere Varianten (z. B. Diamond-Liegestütze, Jump Squats, längere Halteübungen) statt immer mehr Wiederholungen.',
		'- Ausgewogen für Oberkörper, Beine und Rumpf, höchstens 12 Übungen.',
		'',
		'Mein aktueller Plan (Tagesziele):',
		...input.items.map((item) => `- ${item.name}: ${amount(item)}`),
		'',
		`Meine Einschätzung: ${input.rating ? RATING_LABELS[input.rating] : 'Passend'}. ${direction}`,
		input.scoredDays > 0
			? `In den letzten ${input.scoredDays} gewerteten Tagen habe ich den Plan an ${input.fulfilled} Tagen geschafft.`
			: 'Ich stehe noch am Anfang.'
	];
	const notes = input.notes.trim();
	if (notes) lines.push(`Hinweise von mir: ${notes}`);
	lines.push(
		'',
		'Antwort: Gib nur einen Codeblock aus, eine Zeile pro Übung im Format: Übung | Ziel | Einheit',
		`Einheit ist genau eines von: ${Object.values(UNIT_WORD).join(', ')}. Ziele sind Tagessummen, Sätze rechnest du zusammen (3 x 20 wird 60 Wdh). Kurze deutsche Übungsnamen.`
	);
	return lines.join('\n');
}
