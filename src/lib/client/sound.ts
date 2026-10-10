import type { SystemMessageKind } from './progress';

let context: AudioContext | null = null;

const MELODIES: Record<SystemMessageKind, number[]> = {
	quest_complete: [523.25, 659.25, 783.99],
	level_up: [392, 523.25, 659.25, 1046.5],
	rank_up: [261.63, 392, 523.25, 783.99, 1046.5],
	badge: [659.25, 987.77],
	warning: [220, 174.61]
};

/** Kurzer synthetischer Ton zur System-Meldung. Scheitert still, wenn der Browser Audio blockiert. */
export function playChime(kind: SystemMessageKind): void {
	try {
		context ??= new AudioContext();
		const start = context.currentTime + 0.02;
		MELODIES[kind].forEach((frequency, index) => {
			const oscillator = context!.createOscillator();
			const gain = context!.createGain();
			oscillator.type = kind === 'warning' ? 'sawtooth' : 'triangle';
			oscillator.frequency.value = frequency;
			const at = start + index * 0.11;
			gain.gain.setValueAtTime(0, at);
			gain.gain.linearRampToValueAtTime(0.12, at + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
			oscillator.connect(gain).connect(context!.destination);
			oscillator.start(at);
			oscillator.stop(at + 0.5);
		});
	} catch {
		// Ton ist optional.
	}
}
