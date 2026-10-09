import { describe, expect, it } from 'vitest';
import { levelForQuests, levelProgress, questsForLevel, rankForLevel } from './level';

describe('Level-Kurve', () => {
	it.each([
		[0, 1],
		[1, 2],
		[12, 9],
		[13, 10],
		[42, 19],
		[43, 20],
		[84, 29],
		[85, 30],
		[135, 39],
		[136, 40],
		[194, 49],
		[195, 50],
		[201, 50],
		[202, 51]
	])('ergibt nach %i erfüllten Quests Level %i', (quests, level) => {
		expect(levelForQuests(quests)).toBe(level);
	});

	it('steigt am Anfang schneller als am Ende', () => {
		const early = questsForLevel(3) - questsForLevel(2);
		const late = questsForLevel(50) - questsForLevel(49);
		expect(early).toBeLessThan(1.5);
		expect(late).toBeGreaterThan(6);
	});

	it('erreicht den S-Rang genau mit Quest 195', () => {
		expect(questsForLevel(50)).toBe(195);
	});
});

describe('Rang', () => {
	it.each([
		[1, 'E'],
		[9, 'E'],
		[10, 'D'],
		[19, 'D'],
		[20, 'C'],
		[30, 'B'],
		[40, 'A'],
		[49, 'A'],
		[50, 'S'],
		[51, 'S']
	])('Level %i ist Rang %s', (level, rank) => {
		expect(rankForLevel(level)).toBe(rank);
	});
});

describe('Fortschritt', () => {
	it('startet auf Level 1 mit leerem Balken', () => {
		const progress = levelProgress(0);
		expect(progress).toMatchObject({ quests: 0, xp: 0, level: 1, rank: 'E', levelStartXp: 0 });
		expect(progress.progress).toBe(0);
	});

	it('zeigt den Fortschritt innerhalb eines Levels', () => {
		const progress = levelProgress(100);
		expect(progress.xp).toBe(10_000);
		expect(progress.level).toBe(levelForQuests(100));
		expect(progress.levelStartXp).toBeCloseTo(questsForLevel(progress.level) * 100, 6);
		expect(progress.nextLevelXp).toBeCloseTo(questsForLevel(progress.level + 1) * 100, 6);
		expect(progress.progress).toBeGreaterThan(0);
		expect(progress.progress).toBeLessThan(1);
	});

	it('ist auf Level 51 voll', () => {
		const progress = levelProgress(202);
		expect(progress.level).toBe(51);
		expect(progress.nextLevelXp).toBeNull();
		expect(progress.progress).toBe(1);
	});
});
