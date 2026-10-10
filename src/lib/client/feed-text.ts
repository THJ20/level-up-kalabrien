import { BADGES, localDateOf, type LocalDate } from '#lib/domain/index.ts';
import { dayLabel, points } from './format';

export interface FeedItemLike {
	type: string;
	payload: Record<string, unknown>;
	createdAt: Date;
	hunter: { id: string; name: string; color: string };
}

export type FeedTone = 'accent' | 'ok' | 'warn' | 'sick' | 'gold';

export interface FeedText {
	text: string;
	detail?: string;
	tone: FeedTone;
}

const REP_NAMES: Record<string, string> = {
	pushups: 'Liegestütze',
	squats: 'Kniebeugen',
	situps: 'Sit-ups'
};

interface BonusActivity {
	exercise: string;
	minutes: number | null;
	reps: number | null;
	points: number;
}

function joinList(parts: string[]): string {
	if (parts.length <= 1) return parts.join('');
	return `${parts.slice(0, -1).join(', ')} und ${parts.at(-1)}`;
}

/** Feed-Eintrag als deutscher Satz, für den Betrachter selbst in der Du-Form. */
export function describeFeedItem(item: FeedItemLike, viewerId: string): FeedText {
	const self = item.hunter.id === viewerId;
	const who = self ? 'Du' : item.hunter.name;
	const hat = self ? 'hast' : 'hat';
	const ist = self ? 'bist' : 'ist';
	const payload = item.payload;
	const date = payload.date as LocalDate | undefined;
	const day = date ? dayLabel(date) : '';

	switch (item.type) {
		case 'joined':
			return { text: `${who} ${ist} der Challenge beigetreten.`, tone: 'accent' };
		case 'activity': {
			const reps = (payload.reps ?? {}) as Record<string, number>;
			const bonus = (payload.bonus ?? []) as BonusActivity[];
			const parts = [
				...Object.entries(REP_NAMES)
					.filter(([key]) => (reps[key] ?? 0) > 0)
					.map(([key, name]) => `${reps[key]} ${name}`),
				...bonus.map(
					(entry) =>
						`${entry.exercise} (${entry.minutes !== null ? `${entry.minutes} Min.` : `${entry.reps} Wdh.`}, +${points(entry.points)} BP)`
				)
			];
			const forDay = date && date !== localDateOf(item.createdAt) ? ` für ${day}` : '';
			return { text: `${who} ${hat} ${joinList(parts)}${forDay} eingetragen.`, tone: 'accent' };
		}
		case 'quest_complete':
			return payload.backfilled
				? { text: `${who} ${hat} die Daily Quest vom ${day} nachgetragen.`, tone: 'ok' }
				: { text: `${who} ${hat} die Daily Quest erfüllt.`, tone: 'ok' };
		case 'level_up':
			return { text: `${who} ${ist} auf Level ${payload.level} aufgestiegen.`, tone: 'accent' };
		case 'rank_up':
			return { text: `${who} ${ist} jetzt ${payload.rank}-Rang Hunter.`, tone: 'gold' };
		case 'badge': {
			const badge = BADGES.find((entry) => entry.id === payload.badgeId);
			return {
				text: `${who} ${hat} den Badge „${badge?.name ?? payload.badgeId}“ erhalten.`,
				detail: badge?.description,
				tone: 'accent'
			};
		}
		case 'missed':
			return {
				text: `${who} ${hat} die Daily Quest am ${day} verpasst.`,
				detail: payload.voteId ? 'Die Strafabstimmung läuft.' : undefined,
				tone: 'warn'
			};
		case 'sick':
			return { text: `${who} ${hat} sich für ${day} krank gemeldet.`, tone: 'sick' };
		case 'missed_lifted': {
			const how =
				payload.reason === 'sick' ? `sich für den ${day} nachträglich krank gemeldet` : `den ${day} nachgetragen`;
			const consequence = payload.verdictLifted ? 'Die Strafe ist aufgehoben.' : 'Die Abstimmung entfällt.';
			return { text: `${who} ${hat} ${how}. ${consequence}`, tone: 'ok' };
		}
		case 'verdict':
			return {
				text: `Urteil für ${self ? 'dich' : item.hunter.name} wegen ${day}: ${payload.penaltyTitle}${payload.decidedByLot ? ' (per Los)' : ''}.`,
				tone: 'warn'
			};
		default:
			return { text: `${who} ${hat} etwas gemacht.`, tone: 'accent' };
	}
}
