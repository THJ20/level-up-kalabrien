interface InstallPrompt extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios' | 'android' | 'desktop';

/**
 * Stand der Installation als App. Chrome und Edge bieten die Installation nur einmal beim Laden an,
 * deshalb fängt der App-Rahmen das Angebot ab und alle Seiten können es nutzen.
 */
export const installState = $state({
	/** Angebot des Browsers (Android, Desktop-Chrome), sonst null. */
	prompt: null as InstallPrompt | null,
	/** Läuft schon als installierte App. */
	standalone: false,
	platform: 'desktop' as Platform,
	/** Ohne HTTPS lässt sich nichts installieren. */
	secure: true
});

export function watchInstall(): () => void {
	const nav = navigator as Navigator & { standalone?: boolean };
	installState.standalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
	installState.platform = /iphone|ipad|ipod/i.test(navigator.userAgent)
		? 'ios'
		: /android/i.test(navigator.userAgent)
			? 'android'
			: 'desktop';
	installState.secure = window.isSecureContext;
	const capture = (event: Event) => {
		event.preventDefault();
		installState.prompt = event as InstallPrompt;
	};
	const installed = () => {
		installState.standalone = true;
		installState.prompt = null;
	};
	window.addEventListener('beforeinstallprompt', capture);
	window.addEventListener('appinstalled', installed);
	return () => {
		window.removeEventListener('beforeinstallprompt', capture);
		window.removeEventListener('appinstalled', installed);
	};
}

/** Zeigt den Installationsdialog des Browsers. Liefert true, wenn installiert wurde. */
export async function promptInstall(): Promise<boolean> {
	const prompt = installState.prompt;
	if (!prompt) return false;
	await prompt.prompt();
	const choice = await prompt.userChoice;
	installState.prompt = null;
	if (choice.outcome === 'accepted') installState.standalone = true;
	return choice.outcome === 'accepted';
}
