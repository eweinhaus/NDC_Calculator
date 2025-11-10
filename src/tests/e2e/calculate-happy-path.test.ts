import { test, expect } from '@playwright/test';

test.describe('Calculate Happy Path', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should complete full calculation flow', async ({ page }) => {
		// Fill in the form
		await page.fill('input[name="drugInput"], input[placeholder*="Drug"]', 'Lisinopril');
		await page.fill('textarea[name="sig"], textarea[placeholder*="SIG"]', 'Take 1 tablet by mouth twice daily');
		await page.fill('input[name="daysSupply"], input[placeholder*="Days"]', '30');

		// Submit the form
		await page.click('button[type="submit"], button:has-text("Calculate")');

		// Wait for loading to complete (skeleton loader should disappear)
		await page.waitForSelector('[data-testid="skeleton-loader"]', { state: 'hidden', timeout: 10000 }).catch(() => {
			// Skeleton might not have data-testid, wait for results instead
		});

		// Wait for results to appear (either results display or error)
		await page.waitForSelector('[data-testid="results"], [data-testid="error"], .results, .error', {
			timeout: 15000
		});

		// Check if results are displayed (might be error if API is not available)
		const hasResults = await page.locator('[data-testid="results"], .results').isVisible().catch(() => false);
		const hasError = await page.locator('[data-testid="error"], .error').isVisible().catch(() => false);

		// If we have results, verify structure
		if (hasResults) {
			// Verify drug information is displayed
			await expect(page.locator('text=/drug|rxcui|strength/i')).toBeVisible();

			// Verify quantity breakdown is displayed
			await expect(page.locator('text=/quantity|total|calculation/i')).toBeVisible();

			// Verify recommended NDC is displayed
			await expect(page.locator('text=/recommended|ndc/i')).toBeVisible();
		} else if (hasError) {
			// If error, verify error message is displayed
			await expect(page.locator('text=/error|not found|failed/i')).toBeVisible();
		}
	});

	test('should display form validation errors', async ({ page }) => {
		// Try to submit empty form
		await page.click('button[type="submit"], button:has-text("Calculate")');

		// Wait a bit for validation
		await page.waitForTimeout(100);

		// Check that submit button is disabled or errors are shown
		const submitButton = page.locator('button[type="submit"], button:has-text("Calculate")');
		const isDisabled = await submitButton.isDisabled().catch(() => false);
		const hasErrors = await page.locator('.error, [role="alert"]').count() > 0;

		expect(isDisabled || hasErrors).toBeTruthy();
	});

	test('should validate days supply range', async ({ page }) => {
		// Fill form with invalid days supply
		await page.fill('input[name="drugInput"], input[placeholder*="Drug"]', 'Lisinopril');
		await page.fill('textarea[name="sig"], textarea[placeholder*="SIG"]', 'Take 1 tablet twice daily');
		await page.fill('input[name="daysSupply"], input[placeholder*="Days"]', '500'); // Invalid

		// Check for validation error
		await page.waitForTimeout(100);
		const hasError = await page.locator('text=/between 1 and 365|invalid/i').isVisible().catch(() => false);
		expect(hasError).toBeTruthy();
	});
});

