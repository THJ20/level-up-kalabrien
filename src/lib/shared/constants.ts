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
