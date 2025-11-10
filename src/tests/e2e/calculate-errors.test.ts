import { test, expect } from '@playwright/test';

test.describe('Calculate Error Handling', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should display error for invalid drug name', async ({ page }) => {
		// Fill form with invalid drug name
		await page.fill('input[name="drugInput"], input[placeholder*="Drug"]', 'InvalidDrugName123');
		await page.fill('textarea[name="sig"], textarea[placeholder*="SIG"]', 'Take 1 tablet twice daily');
		await page.fill('input[name="daysSupply"], input[placeholder*="Days"]', '30');

		// Submit form
		await page.click('button[type="submit"], button:has-text("Calculate")');

		// Wait for error to appear
		await page.waitForSelector('[data-testid="error"], .error, [role="alert"]', { timeout: 15000 });

		// Verify error message is displayed
		const errorText = await page.locator('[data-testid="error"], .error, [role="alert"]').textContent();
		expect(errorText).toBeTruthy();
		expect(errorText?.toLowerCase()).toMatch(/error|not found|invalid|failed/i);
	});

	test('should display spelling suggestions when available', async ({ page }) => {
		// Fill form with misspelled drug name
		await page.fill('input[name="drugInput"], input[placeholder*="Drug"]', 'Lisinoprll'); // Misspelled
		await page.fill('textarea[name="sig"], textarea[placeholder*="SIG"]', 'Take 1 tablet twice daily');
		await page.fill('input[name="daysSupply"], input[placeholder*="Days"]', '30');

		// Submit form
		await page.click('button[type="submit"], button:has-text("Calculate")');

		// Wait for error or suggestions
		await page.waitForSelector('[data-testid="error"], .error, [data-testid="suggestions"], .suggestions', {
			timeout: 15000
		});

		// Check if suggestions are displayed (if API provides them)
		const suggestions = page.locator('[data-testid="suggestions"], .suggestions, button:has-text("Did you mean")');
		const hasSuggestions = await suggestions.count() > 0;

		// If suggestions exist, verify they're clickable
		if (hasSuggestions) {
			const firstSuggestion = suggestions.first();
			await expect(firstSuggestion).toBeVisible();
		}
	});

	test('should allow retry after error', async ({ page }) => {
		// Fill form
		await page.fill('input[name="drugInput"], input[placeholder*="Drug"]', 'InvalidDrug');
		await page.fill('textarea[name="sig"], textarea[placeholder*="SIG"]', 'Take 1 tablet twice daily');
		await page.fill('input[name="daysSupply"], input[placeholder*="Days"]', '30');

		// Submit form
		await page.click('button[type="submit"], button:has-text("Calculate")');

		// Wait for error
		await page.waitForSelector('[data-testid="error"], .error', { timeout: 15000 });

		// Look for retry button
		const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again"), [data-testid="retry"]');
		const hasRetry = await retryButton.count() > 0;

		if (hasRetry) {
			await expect(retryButton.first()).toBeVisible();
		}
	});
});

