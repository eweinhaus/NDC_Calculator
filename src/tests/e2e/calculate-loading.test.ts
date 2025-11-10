import { test, expect } from '@playwright/test';

test.describe('Calculate Loading States', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should show loading state during calculation', async ({ page }) => {
		// Fill form
		await page.fill('input[name="drugInput"], input[placeholder*="Drug"]', 'Lisinopril');
		await page.fill('textarea[name="sig"], textarea[placeholder*="SIG"]', 'Take 1 tablet twice daily');
		await page.fill('input[name="daysSupply"], input[placeholder*="Days"]', '30');

		// Submit form
		await page.click('button[type="submit"], button:has-text("Calculate")');

		// Check for loading indicator (skeleton loader or spinner)
		const loadingIndicator = page.locator(
			'[data-testid="skeleton"], [data-testid="loading"], .skeleton, .loading, [aria-busy="true"]'
		);

		// Loading should appear quickly
		const hasLoading = await loadingIndicator.first().isVisible({ timeout: 1000 }).catch(() => false);
		expect(hasLoading).toBeTruthy();
	});

	test('should disable form during loading', async ({ page }) => {
		// Fill form
		await page.fill('input[name="drugInput"], input[placeholder*="Drug"]', 'Lisinopril');
		await page.fill('textarea[name="sig"], textarea[placeholder*="SIG"]', 'Take 1 tablet twice daily');
		await page.fill('input[name="daysSupply"], input[placeholder*="Days"]', '30');

		// Submit form
		const submitButton = page.locator('button[type="submit"], button:has-text("Calculate")');
		await submitButton.click();

		// Wait a moment for loading to start
		await page.waitForTimeout(100);

		// Check if submit button is disabled (might not be, but form should be in loading state)
		const isDisabled = await submitButton.isDisabled().catch(() => false);
		const hasLoading = await page
			.locator('[data-testid="skeleton"], [data-testid="loading"], [aria-busy="true"]')
			.isVisible()
			.catch(() => false);

		// At least one should be true
		expect(isDisabled || hasLoading).toBeTruthy();
	});

	test('should clear loading state after completion', async ({ page }) => {
		// Fill form
		await page.fill('input[name="drugInput"], input[placeholder*="Drug"]', 'Lisinopril');
		await page.fill('textarea[name="sig"], textarea[placeholder*="SIG"]', 'Take 1 tablet twice daily');
		await page.fill('input[name="daysSupply"], input[placeholder*="Days"]', '30');

		// Submit form
		await page.click('button[type="submit"], button:has-text("Calculate")');

		// Wait for loading to complete (either results or error)
		await page.waitForSelector(
			'[data-testid="results"], [data-testid="error"], .results, .error',
			{ timeout: 15000 }
		);

		// Loading indicator should be gone
		const loadingIndicator = page.locator(
			'[data-testid="skeleton"], [data-testid="loading"], [aria-busy="true"]'
		);
		const stillLoading = await loadingIndicator.first().isVisible().catch(() => false);
		expect(stillLoading).toBeFalsy();
	});
});

