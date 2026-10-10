import { randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { AVATAR_PRESETS } from '../shared/constants';
import type { ServiceContext } from './context';
import { invalid, notFound } from './errors';
import { getHunter, setAvatar, type HunterProfile } from './hunters';

export const AVATAR_SIZE = 256;
/** Der Browser verkleinert vorher, das ist nur die Obergrenze für Ausreißer. */
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const FILE_PATTERN = /^[a-f0-9-]{8,80}\.webp$/;

/** Wandelt ein hochgeladenes Bild in ein quadratisches WebP mit 256 px und speichert es. */
async function storeUpload(dir: string, hunterId: string, bytes: Uint8Array): Promise<string> {
	if (bytes.byteLength === 0) throw invalid('Die Datei ist leer.');
	if (bytes.byteLength > MAX_UPLOAD_BYTES) throw invalid('Das Bild ist zu groß (höchstens 6 MB).');
	let output: Buffer;
	try {
		output = await sharp(bytes, { failOn: 'error' })
			.rotate()
			.resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'attention' })
			.webp({ quality: 82 })
			.toBuffer();
	} catch {
		throw invalid('Das Bild konnte nicht gelesen werden. Erlaubt sind JPG, PNG und WebP.');
	}
	const file = `${hunterId}-${randomBytes(6).toString('hex')}.webp`;
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, file), output);
	return `upload:${file}`;
}

async function removeUpload(dir: string, avatar: string | null): Promise<void> {
	if (!avatar?.startsWith('upload:')) return;
	const file = avatar.slice('upload:'.length);
	if (!FILE_PATTERN.test(file)) return;
	await unlink(join(dir, file)).catch(() => {});
}

export async function uploadAvatar(
	ctx: ServiceContext,
	dir: string,
	hunterId: string,
	bytes: Uint8Array
): Promise<HunterProfile> {
	getHunter(ctx, hunterId);
	const value = await storeUpload(dir, hunterId, bytes);
	await removeUpload(dir, setAvatar(ctx, hunterId, value));
	return getHunter(ctx, hunterId);
}

export async function choosePresetAvatar(
	ctx: ServiceContext,
	dir: string,
	hunterId: string,
	presetId: string
): Promise<HunterProfile> {
	if (!AVATAR_PRESETS.some((preset) => preset.id === presetId)) throw invalid('Diesen Avatar gibt es nicht.');
	await removeUpload(dir, setAvatar(ctx, hunterId, `preset:${presetId}`));
	return getHunter(ctx, hunterId);
}

export async function clearAvatar(ctx: ServiceContext, dir: string, hunterId: string): Promise<HunterProfile> {
	await removeUpload(dir, setAvatar(ctx, hunterId, null));
	return getHunter(ctx, hunterId);
}

/** Liest ein hochgeladenes Profilbild. Nur Dateinamen im erwarteten Format, kein Pfad. */
export async function readUpload(dir: string, file: string): Promise<Buffer> {
	if (!FILE_PATTERN.test(file)) throw notFound('Dieses Bild gibt es nicht.');
	try {
		return await readFile(join(dir, file));
	} catch {
		throw notFound('Dieses Bild gibt es nicht.');
	}
}
