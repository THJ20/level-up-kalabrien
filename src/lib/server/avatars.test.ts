import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestContext, insertHunter } from './testing';
import { choosePresetAvatar, clearAvatar, readUpload, uploadAvatar } from './avatars';
import { getHunter } from './hunters';
import { badgeOverview } from './badges';

const dirs: string[] = [];
afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function setup() {
	const dir = mkdtempSync(join(tmpdir(), 'lu-avatar-test-'));
	dirs.push(dir);
	const ctx = createTestContext();
	const tobias = insertHunter(ctx, 'Tobias');
	return { ctx, dir, tobias };
}

function photo(width = 800, height = 600): Promise<Buffer> {
	return sharp({ create: { width, height, channels: 3, background: '#a47cff' } }).jpeg().toBuffer();
}

describe('Profilbild', () => {
	it('wählt einen vorgefertigten Avatar', async () => {
		const { ctx, dir, tobias } = setup();
		expect((await choosePresetAvatar(ctx, dir, tobias, '03')).avatarUrl).toBe('/avatars/avatar-03.webp');
		await expect(choosePresetAvatar(ctx, dir, tobias, '99')).rejects.toMatchObject({ code: 'invalid_input' });
	});

	it('speichert ein Foto quadratisch als WebP und räumt das alte weg', async () => {
		const { ctx, dir, tobias } = setup();
		const first = await uploadAvatar(ctx, dir, tobias, await photo());
		expect(first.avatarUrl).toMatch(/^\/api\/avatars\/[a-f0-9-]+\.webp$/);
		const file = first.avatarUrl!.split('/').at(-1)!;
		const meta = await sharp(await readUpload(dir, file)).metadata();
		expect([meta.width, meta.height, meta.format]).toEqual([256, 256, 'webp']);

		await uploadAvatar(ctx, dir, tobias, await photo(300, 900));
		expect(readdirSync(dir)).toHaveLength(1);
		await choosePresetAvatar(ctx, dir, tobias, '01');
		expect(readdirSync(dir)).toHaveLength(0);
	});

	it('löscht das Bild und lehnt kaputte Dateien und fremde Pfade ab', async () => {
		const { ctx, dir, tobias } = setup();
		await uploadAvatar(ctx, dir, tobias, await photo());
		expect((await clearAvatar(ctx, dir, tobias)).avatarUrl).toBeNull();
		expect(readdirSync(dir)).toHaveLength(0);
		await expect(uploadAvatar(ctx, dir, tobias, new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
			code: 'invalid_input'
		});
		await expect(uploadAvatar(ctx, dir, tobias, new Uint8Array())).rejects.toMatchObject({ code: 'invalid_input' });
		await expect(readUpload(dir, '../app.db')).rejects.toMatchObject({ code: 'not_found' });
		expect(getHunter(ctx, tobias).avatarUrl).toBeNull();
	});
});

describe('Erfolge', () => {
	it('liefert Katalog, Badges aller Hunter und eigenen Fortschritt', () => {
		const { ctx, tobias } = setup();
		const niklas = insertHunter(ctx, 'Niklas');
		const overview = badgeOverview(ctx, tobias);
		expect(overview.badges).toHaveLength(28);
		expect(overview.badges[0]).toMatchObject({ id: 'awakened', icon: 'Sunrise', target: 1 });
		expect(overview.hunters.map((entry) => entry.hunter.id).sort()).toEqual([niklas, tobias].sort());
		expect(overview.progress.awakened).toEqual({ current: 0, target: 1, earned: false });
	});
});
