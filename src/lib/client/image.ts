/** Längste Kante, auf die Fotos vor dem Hochladen verkleinert werden. */
export const UPLOAD_MAX_EDGE = 1024;

function loadWithImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(url);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Bild nicht lesbar'));
		};
		image.src = url;
	});
}

/**
 * Verkleinert ein Foto im Browser auf höchstens 1024 px und macht ein JPEG daraus.
 * Das hält Uploads klein und wandelt nebenbei iPhone-Fotos (HEIC) um, die der Browser anzeigen kann.
 */
export async function shrinkImage(file: File, maxEdge = UPLOAD_MAX_EDGE): Promise<Blob> {
	let source: ImageBitmap | HTMLImageElement;
	try {
		source = await createImageBitmap(file);
	} catch {
		source = await loadWithImage(file);
	}
	const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
	const width = Math.max(1, Math.round(source.width * scale));
	const height = Math.max(1, Math.round(source.height * scale));
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.getContext('2d')?.drawImage(source, 0, 0, width, height);
	if ('close' in source) source.close();
	return new Promise((resolve, reject) =>
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Bild nicht lesbar'))), 'image/jpeg', 0.88)
	);
}
