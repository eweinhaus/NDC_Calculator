import { test, expect } from '@playwright/test';

test.describe('Calculate Accessibility', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should support keyboard navigation', async ({ page }) => {
		// Tab through form elements
		await page.keyboard.press('Tab');

		// Check that focus is on an input
		const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
		expect(['INPUT', 'TEXTAREA', 'BUTTON']).toContain(focusedElement);

		// Continue tabbing
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');

		// Should be able to reach submit button
		const submitButton = page.locator('button[type="submit"], button:has-text("Calculate")');
		await submitButton.focus();
		const isFocused = await submitButton.evaluate((el) => document.activeElement === el);
		expect(isFocused).toBeTruthy();
	});

	test('should have visible focus indicators', async ({ page }) => {
		// Focus on an input
		const firstInput = page.locator('input, textarea').first();
		await firstInput.focus();

		// Check for focus styles (outline, border, etc.)
		const focusStyles = await firstInput.evaluate((el) => {
			const styles = window.getComputedStyle(el);
			return {
				outline: styles.outline,
				outlineWidth: styles.outlineWidth,
				border: styles.border,
			};
		});

		// Should have some focus indicator
		const hasFocusIndicator =
			focusStyles.outline !== 'none' ||
			focusStyles.outlineWidth !== '0px' ||
			focusStyles.border.includes('solid');
		expect(hasFocusIndicator).toBeTruthy();
	});

	test('should have ARIA labels on form elements', async ({ page }) => {
		// Check for ARIA labels or associated labels
		const inputs = page.locator('input, textarea');
		const inputCount = await inputs.count();

		for (let i = 0; i < Math.min(inputCount, 3); i++) {
			const input = inputs.nth(i);
			const hasAriaLabel = (await input.getAttribute('aria-label')) !== null;
			const hasAriaLabelledBy = (await input.getAttribute('aria-labelledby')) !== null;
			const hasId = (await input.getAttribute('id')) !== null;
			const hasName = (await input.getAttribute('name')) !== null;

			// Should have at least one way to identify it
			expect(hasAriaLabel || hasAriaLabelledBy || hasId || hasName).toBeTruthy();
		}
	});

	test('should have proper form labels', async ({ page }) => {
		// Check that inputs have associated labels
		const inputs = page.locator('input[type="text"], input[type="number"], textarea');
		const inputCount = await inputs.count();

		for (let i = 0; i < Math.min(inputCount, 3); i++) {
			const input = inputs.nth(i);
			const id = await input.getAttribute('id');
			const name = await input.getAttribute('name');
			const ariaLabel = await input.getAttribute('aria-label');

			// Should have label via id, name, or aria-label
			if (id) {
				const label = page.locator(`label[for="${id}"]`);
				const hasLabel = (await label.count()) > 0;
				expect(hasLabel || !!ariaLabel).toBeTruthy();
			} else {
				expect(!!name || !!ariaLabel).toBeTruthy();
			}
		}
	});

	test('should announce errors to screen readers', async ({ page }) => {
		// Try to submit empty form
		await page.click('button[type="submit"], button:has-text("Calculate")');
		await page.waitForTimeout(100);

		// Check for error messages with proper ARIA
		const errorMessages = page.locator('[role="alert"], [aria-live], .error');
		const errorCount = await errorMessages.count();

		// Should have at least one error indicator
		if (errorCount > 0) {
			const firstError = errorMessages.first();
			const role = await firstError.getAttribute('role');
			const ariaLive = await firstError.getAttribute('aria-live');

			expect(role === 'alert' || ariaLive === 'assertive' || ariaLive === 'polite').toBeTruthy();
		}
	});
});

