/** Werte, die Server und Oberfläche gemeinsam nutzen. */

export const AVATAR_COLORS = [
	'#a47cff',
	'#7ef0d0',
	'#ff7a45',
	'#4cc9ff',
	'#ff4f7b',
	'#f5c542',
	'#62f0a6',
	'#c9b2ff'
] as const;

export const REACTIONS = ['fire', 'muscle', 'laugh', 'eyes'] as const;
export type Reaction = (typeof REACTIONS)[number];

export const REACTION_EMOJI: Record<Reaction, string> = {
	fire: '🔥',
	muscle: '💪',
	laugh: '😂',
	eyes: '👀'
};

export const MIN_PASSWORD_LENGTH = 10;

/** Farbschemata: Shadow Monarch (dunkel und violett) und Gate (schwarz und orange). */
export const THEMES = ['monarch', 'gate'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, { name: string; description: string }> = {
	monarch: { name: 'Shadow Monarch', description: 'Dunkel und violett' },
	gate: { name: 'Gate', description: 'Schwarz und orange' }
};

/** Vorgefertigte Avatare unter `static/avatars/avatar-01.webp` bis `avatar-08.webp`. */
export const AVATAR_PRESETS = [
	{ id: '01', name: 'Shadow Lord' },
	{ id: '02', name: 'Shadow Knight' },
	{ id: '03', name: 'Insect Warrior' },
	{ id: '04', name: 'Blade Dancer' },
	{ id: '05', name: 'Flame Mage' },
	{ id: '06', name: 'Silent Assassin' },
	{ id: '07', name: 'Light Healer' },
	{ id: '08', name: 'Iron Tank' }
] as const;

export function presetAvatarUrl(id: string): string {
	return `/avatars/avatar-${id}.webp`;
}

/** URL zum gespeicherten Avatar-Wert (`preset:03` oder `upload:<datei>`), sonst null. */
export function avatarUrlOf(avatar: string | null): string | null {
	if (!avatar) return null;
	if (avatar.startsWith('preset:')) return presetAvatarUrl(avatar.slice('preset:'.length));
	if (avatar.startsWith('upload:')) return `/api/avatars/${avatar.slice('upload:'.length)}`;
	return null;
}
