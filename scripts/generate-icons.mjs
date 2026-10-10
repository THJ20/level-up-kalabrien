// Erzeugt die App-Icons aus einem SVG-Emblem (Sechseck mit zwei Aufwärts-Pfeilen).
// Aufruf: node scripts/generate-icons.mjs
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

function emblem({ scale = 1 } = {}) {
	const content = `
		<g transform="translate(256 256) scale(${scale}) translate(-256 -256)" filter="url(#glow)">
			<polygon points="256,84 405,170 405,342 256,428 107,342 107,170" fill="rgba(60,25,120,0.35)" stroke="#a47cff" stroke-width="14" stroke-linejoin="round"/>
			<path d="M170 318 L256 232 L342 318" fill="none" stroke="url(#arrow)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
			<path d="M170 248 L256 162 L342 248" fill="none" stroke="url(#arrow)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>
		</g>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
		<defs>
			<radialGradient id="bg" cx="50%" cy="38%" r="72%">
				<stop offset="0" stop-color="#2c1260"/>
				<stop offset="0.6" stop-color="#0d0720"/>
				<stop offset="1" stop-color="#05030a"/>
			</radialGradient>
			<linearGradient id="arrow" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0" stop-color="#8b5cf6"/>
				<stop offset="1" stop-color="#efe7ff"/>
			</linearGradient>
			<filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="9" result="blur"/>
				<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
			</filter>
		</defs>
		<rect width="512" height="512" fill="url(#bg)"/>
		${content}
	</svg>`;
}

const out = 'static/icons';
mkdirSync(out, { recursive: true });

const targets = [
	{ file: 'icon-192.png', size: 192, scale: 1 },
	{ file: 'icon-512.png', size: 512, scale: 1 },
	{ file: 'icon-maskable-512.png', size: 512, scale: 0.78 },
	{ file: 'apple-touch-icon.png', size: 180, scale: 0.9 },
	{ file: 'favicon.png', size: 64, scale: 1.05 },
	{ file: 'badge-96.png', size: 96, scale: 1.1 }
];

for (const { file, size, scale } of targets) {
	await sharp(Buffer.from(emblem({ scale }))).resize(size, size).png().toFile(`${out}/${file}`);
	console.log(`${out}/${file}`);
}
