export type Toast = { id: number; message: string; kind: 'success' | 'error' };

let nextId = 1;
export const toasts = $state<Toast[]>([]);

export function toast(message: string, kind: Toast['kind'] = 'success') {
	const id = nextId++;
	toasts.push({ id, message, kind });
	setTimeout(() => dismiss(id), 4000);
}

export function dismiss(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i !== -1) toasts.splice(i, 1);
}
