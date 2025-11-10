import { writable } from 'svelte/store';

export interface ToastState {
	message: string;
	type: 'success' | 'error';
	duration?: number;
}

export const toast = writable<ToastState | null>(null);

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, type: 'success' | 'error' = 'success', duration = 3000) {
	// Clear existing timeout
	if (toastTimeout) {
		clearTimeout(toastTimeout);
	}

	// Set new toast
	toast.set({ message, type, duration });

	// Auto-hide after duration
	toastTimeout = setTimeout(() => {
		hideToast();
	}, duration);
}

export function hideToast() {
	toast.set(null);
	if (toastTimeout) {
		clearTimeout(toastTimeout);
		toastTimeout = null;
	}
}

