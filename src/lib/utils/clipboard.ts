/**
 * Copy text to clipboard with fallback for older browsers
 * @param text - Text to copy to clipboard
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	if (!text) {
		return false;
	}

	// Try modern Clipboard API first
	if (navigator.clipboard && navigator.clipboard.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (error) {
			// Clipboard API failed, try fallback
			console.warn('Clipboard API failed, trying fallback:', error);
		}
	}

	// Fallback for older browsers
	try {
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.style.position = 'fixed';
		textArea.style.left = '-999999px';
		textArea.style.top = '-999999px';
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		const successful = document.execCommand('copy');
		document.body.removeChild(textArea);

		return successful;
	} catch (error) {
		console.error('Fallback copy failed:', error);
		return false;
	}
}

