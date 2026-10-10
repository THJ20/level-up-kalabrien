// Erzeugt die App-Icons aus dem Logo unter assets/logo (vorher mit scripts/cut-logo.mjs zuschneiden).
// Das Status-Icon für Android-Benachrichtigungen ist eine vereinfachte Silhouette, weil das volle Logo bei 24 px verschwimmt.
// Aufruf: node scripts/generate-icons.mjs
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const LOGO = 'assets/logo/logo-violet.png';
const out = 'static/icons';
mkdirSync(out, { recursive: true });

/** Farbe der Logo-Ecke, damit Ränder beim Verkleinern nahtlos anschließen. */
async function cornerColor() {
	const { data } = await sharp(LOGO).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
	return { r: data[0], g: data[1], b: data[2] };
}

/** Logo auf `scale` der Kantenlänge verkleinert und mittig auf den Logo-Hintergrund gesetzt. */
async function icon(size, scale, background) {
	const inner = Math.round(size * scale);
	const logo = await sharp(LOGO).resize(inner, inner).png().toBuffer();
	const offset = Math.round((size - inner) / 2);
	return sharp({ create: { width: size, height: size, channels: 3, background } })
		.composite([{ input: logo, left: offset, top: offset }])
		.png();
}

const BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
	<g fill="none" stroke="#fff" stroke-linecap="square" stroke-linejoin="miter">
		<path d="M22 46 L48 20 L74 46" stroke-width="13"/>
		<path d="M30 66 L48 48 L66 66" stroke-width="11"/>
		<path d="M48 70 L48 86" stroke-width="7"/>
	</g>
</svg>`;

const background = await cornerColor();
const targets = [
	{ file: 'icon-192.png', size: 192, scale: 1 },
	{ file: 'icon-512.png', size: 512, scale: 1 },
	{ file: 'icon-maskable-512.png', size: 512, scale: 0.74 },
	{ file: 'apple-touch-icon.png', size: 180, scale: 0.9 },
	{ file: 'favicon.png', size: 64, scale: 1 }
];
for (const { file, size, scale } of targets) {
	await (await icon(size, scale, background)).toFile(`${out}/${file}`);
	console.log(`${out}/${file}`);
}

await sharp(Buffer.from(BADGE_SVG)).resize(96, 96).png().toFile(`${out}/badge-96.png`);
console.log(`${out}/badge-96.png`);
