// Schneidet die Avatare aus einem Raster-Bild (4 Spalten, 2 Zeilen) und speichert sie als WebP.
// Aufruf: node scripts/cut-avatars.mjs [Quelle] [Zielordner]
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const [source = 'assets/avatars/avatar-sheet.png', target = 'static/avatars'] = process.argv.slice(2);
const COLUMNS = 4;
const ROWS = 2;
const SIZE = 256;
const THRESHOLD = 140;
const MARGIN = 4;

const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const brightness = (x, y) => {
	const i = (y * info.width + x) * info.channels;
	return Math.max(data[i], data[i + 1], data[i + 2]);
};

/** Kleinster Rahmen um alle hellen Pixel einer Kachel, damit der Leuchtring mittig sitzt. */
function brightBox(left, top, width, height) {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (let y = top; y < top + height; y++) {
		for (let x = left; x < left + width; x++) {
			if (brightness(x, y) < THRESHOLD) continue;
			minX = Math.min(minX, x);
			maxX = Math.max(maxX, x);
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
		}
	}
	return { minX, minY, maxX, maxY };
}

await mkdir(target, { recursive: true });
const tileWidth = info.width / COLUMNS;
const tileHeight = info.height / ROWS;
for (let row = 0; row < ROWS; row++) {
	for (let column = 0; column < COLUMNS; column++) {
		const left = Math.round(column * tileWidth);
		const top = Math.round(row * tileHeight);
		const box = brightBox(left, top, Math.floor(tileWidth), Math.floor(tileHeight));
		const side = Math.max(box.maxX - box.minX, box.maxY - box.minY) + 1 + 2 * MARGIN;
		const centerX = (box.minX + box.maxX) / 2;
		const centerY = (box.minY + box.maxY) / 2;
		const cropLeft = Math.max(0, Math.round(centerX - side / 2));
		const cropTop = Math.max(0, Math.round(centerY - side / 2));
		const extract = {
			left: cropLeft,
			top: cropTop,
			width: Math.min(side, info.width - cropLeft),
			height: Math.min(side, info.height - cropTop)
		};
		const number = String(row * COLUMNS + column + 1).padStart(2, '0');
		const file = join(target, `avatar-${number}.webp`);
		await sharp(source).extract(extract).resize(SIZE, SIZE, { fit: 'cover' }).webp({ quality: 86 }).toFile(file);
		console.log(file, extract);
	}
}
