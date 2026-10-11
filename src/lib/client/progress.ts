import { BADGES, RANKS, type LocalDate, type Rank } from '#lib/domain/index.ts';
import { dayLabel } from './format';

export type SystemMessageKind = 'quest_complete' | 'level_up' | 'rank_up' | 'badge' | 'warning' | 'quest_upgrade';

export interface SystemMessage {
	id: string;
	kind: SystemMessageKind;
	title: string;
	subtitle?: string;
	body?: string;
}

export interface ProgressSnapshot {
	quests: number;
	level: number;
	rank: Rank;
	badges: string[];
}

export interface MissedNotice {
	id: string;
	hunterName: string;
	date: LocalDate;
}

/** System-Meldungen aus dem Vergleich zweier Fortschrittsstände (vorher, nachher). */
export function progressMessages(before: ProgressSnapshot | null, after: ProgressSnapshot): SystemMessage[] {
	if (!before) return [];
	const messages: SystemMessage[] = [];
	if (after.quests > before.quests) {
		messages.push({
			id: `quest-${after.quests}`,
			kind: 'quest_complete',
			title: 'QUEST COMPLETE',
			subtitle: 'DAILY QUEST CLEARED',
			body: 'Belohnung: 100 XP. Weiter so, Hunter.'
		});
	}
	if (after.level > before.level) {
		messages.push({
			id: `level-${after.level}`,
			kind: 'level_up',
			title: 'LEVEL UP!',
			subtitle: `LV. ${before.level} → ${after.level}`
		});
	}
	if (RANKS.indexOf(after.rank) > RANKS.indexOf(before.rank)) {
		messages.push({
			id: `rank-${after.rank}`,
			kind: 'rank_up',
			title: 'RANK UP',
			subtitle: `${after.rank}-RANK HUNTER`,
			body: 'Alle Hunter sehen deinen neuen Rang.'
		});
	}
	const known = new Set(before.badges);
	for (const badgeId of after.badges) {
		if (known.has(badgeId)) continue;
		const badge = BADGES.find((entry) => entry.id === badgeId);
		messages.push({
			id: `badge-${badgeId}`,
			kind: 'badge',
			title: 'NEW BADGE',
			subtitle: badge?.name ?? badgeId,
			body: badge?.description
		});
	}
	return messages;
}

/** Meldung, wenn der eigene Plan zum Wochenstart automatisch angepasst wurde. */
export function upgradeMessage(notice: { validFrom: LocalDate; step: number }): SystemMessage {
	const percent = Math.round(Math.abs(notice.step) * 100);
	return notice.step >= 0
		? {
				id: `upgrade-${notice.validFrom}`,
				kind: 'quest_upgrade',
				title: 'QUEST UPGRADED',
				subtitle: `DAILY QUEST +${percent} %`,
				body: 'Neue Woche, neues Level. Dein Trainingsplan ist ab heute schwerer.'
			}
		: {
				id: `upgrade-${notice.validFrom}`,
				kind: 'quest_upgrade',
				title: 'QUEST ADJUSTED',
				subtitle: `DAILY QUEST −${percent} %`,
				body: 'Dein Trainingsplan ist ab heute etwas leichter. Bleib dran, Hunter.'
			};
}

/** Warnungen für verpasste Tage anderer Hunter, die noch nicht angezeigt wurden. */
export function warningMessages(missed: MissedNotice[], seen: ReadonlySet<string>): SystemMessage[] {
	return missed
		.filter((notice) => !seen.has(notice.id))
		.map((notice) => ({
			id: `warning-${notice.id}`,
			kind: 'warning' as const,
			title: 'WARNING',
			subtitle: 'DAILY QUEST FAILED',
			body: `${notice.hunterName} hat die Daily Quest am ${dayLabel(notice.date)} nicht geschafft. Die Strafabstimmung läuft.`
		}));
}
