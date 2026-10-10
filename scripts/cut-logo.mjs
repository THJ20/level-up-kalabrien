// Zerlegt das KI-Logoblatt in drei saubere Quellbilder unter assets/logo.
// Links das violette Logo, rechts oben die weiße Silhouette (Schachbrett nur gemalt), rechts unten die orange Variante.
// Aufruf: node scripts/cut-logo.mjs [Quelle]
import sharp from 'sharp';

const source = process.argv[2] ?? 'assets/logo/logo-sheet.png';
const OUT = 'assets/logo';
const SIZE = 1024;
const PANELS = {
	violet: { left: 0, top: 0, width: 832, height: 1254, background: { r: 3, g: 1, b: 10 } },
	silhouette: { left: 833, top: 0, width: 421, height: 625 },
	orange: { left: 833, top: 625, width: 421, height: 629, background: { r: 0, g: 0, b: 0 } }
};

const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const pixel = (x, y) => {
	const i = (y * info.width + x) * info.channels;
	return [data[i], data[i + 1], data[i + 2]];
};

/** Rahmen um alle Pixel eines Bereichs, die `test` erfüllen. */
function box(panel, test) {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (let y = panel.top; y < panel.top + panel.height; y++) {
		for (let x = panel.left; x < panel.left + panel.width; x++) {
			if (!test(pixel(x, y))) continue;
			minX = Math.min(minX, x);
			maxX = Math.max(maxX, x);
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
		}
	}
	return { minX, minY, maxX, maxY };
}

/** Quadratischer Ausschnitt um den Rahmen. Was über das Panel hinausragt, wird mit der Hintergrundfarbe aufgefüllt. */
async function squareAround(panel, bounds, margin) {
	const side = Math.ceil(Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * (1 + 2 * margin));
	const centerX = (bounds.minX + bounds.maxX) / 2;
	const centerY = (bounds.minY + bounds.maxY) / 2;
	const wantLeft = Math.round(centerX - side / 2);
	const wantTop = Math.round(centerY - side / 2);
	const left = Math.max(panel.left, wantLeft);
	const top = Math.max(panel.top, wantTop);
	const right = Math.min(panel.left + panel.width, wantLeft + side);
	const bottom = Math.min(panel.top + panel.height, wantTop + side);
	const piece = await sharp(source)
		.extract({ left, top, width: right - left, height: bottom - top })
		.png()
		.toBuffer();
	return sharp({ create: { width: side, height: side, channels: 3, background: panel.background } })
		.composite([{ input: piece, left: left - wantLeft, top: top - wantTop }])
		.png()
		.toBuffer();
}

for (const name of ['violet', 'orange']) {
	const panel = PANELS[name];
	const bounds = box(panel, (rgb) => Math.max(...rgb) > 80);
	const square = await squareAround(panel, bounds, 0.04);
	await sharp(square).resize(SIZE, SIZE).png().toFile(`${OUT}/logo-${name}.png`);
	console.log(`${OUT}/logo-${name}.png`, bounds);
}

// Silhouette: Weiß wird deckend, das gemalte graue Schachbrett durchsichtig.
const panel = PANELS.silhouette;
const bounds = box(panel, (rgb) => Math.min(...rgb) > 190);
const pad = Math.round(Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.04);
const side = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) + 1 + 2 * pad;
const rgba = Buffer.alloc(side * side * 4, 0);
const offsetX = Math.round((bounds.minX + bounds.maxX) / 2 - side / 2);
const offsetY = Math.round((bounds.minY + bounds.maxY) / 2 - side / 2);
for (let y = 0; y < side; y++) {
	for (let x = 0; x < side; x++) {
		const sx = offsetX + x;
		const sy = offsetY + y;
		if (sx < panel.left || sy < panel.top || sx >= panel.left + panel.width || sy >= panel.top + panel.height) continue;
		const light = Math.min(...pixel(sx, sy));
		const alpha = Math.max(0, Math.min(1, (light - 150) / 60));
		const i = (y * side + x) * 4;
		rgba[i] = 255;
		rgba[i + 1] = 255;
		rgba[i + 2] = 255;
		rgba[i + 3] = Math.round(alpha * 255);
	}
}
await sharp(rgba, { raw: { width: side, height: side, channels: 4 } })
	.resize(SIZE, SIZE)
	.png()
	.toFile(`${OUT}/logo-silhouette.png`);
console.log(`${OUT}/logo-silhouette.png`, bounds);
