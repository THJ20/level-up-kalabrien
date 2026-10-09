import type { ChangeBus } from './context';

/**
 * Server-Sent-Events-Strom: zuerst `ready`, danach bei jeder Änderung `change` mit den Themen als JSON,
 * dazwischen ein Kommentar als Herzschlag, damit Proxies die Verbindung offen halten.
 */
export function createEventStream(
	bus: ChangeBus,
	signal: AbortSignal,
	heartbeatMs = 25_000
): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	let stop = () => {};

	return new ReadableStream<Uint8Array>({
		start(controller) {
			let closed = false;
			const send = (text: string) => {
				if (!closed) controller.enqueue(encoder.encode(text));
			};
			const unsubscribe = bus.subscribe((topics) => send(`event: change\ndata: ${JSON.stringify(topics)}\n\n`));
			const timer = setInterval(() => send(': ping\n\n'), heartbeatMs);
			stop = () => {
				if (closed) return;
				closed = true;
				unsubscribe();
				clearInterval(timer);
			};
			signal.addEventListener(
				'abort',
				() => {
					stop();
					controller.close();
				},
				{ once: true }
			);
			send('retry: 5000\nevent: ready\ndata: {}\n\n');
		},
		cancel() {
			stop();
		}
	});
}
