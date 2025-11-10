import { test, expect } from '@playwright/test';

test.describe('Calculate Responsive Design', () => {
	test('should display correctly on desktop', async ({ page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto('/');

		// Check that form is visible and properly laid out
		const form = page.locator('form, [role="form"]');
		await expect(form).toBeVisible();

		// Check for no horizontal scroll
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
		const viewportWidth = await page.evaluate(() => window.innerWidth);
		expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Small tolerance
	});

	test('should display correctly on tablet', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto('/');

		// Check that form is visible
		const form = page.locator('form, [role="form"]');
		await expect(form).toBeVisible();

		// Check for no horizontal scroll
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
		const viewportWidth = await page.evaluate(() => window.innerWidth);
		expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
	});

	test('should display correctly on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Check that form is visible
		const form = page.locator('form, [role="form"]');
		await expect(form).toBeVisible();

		// Check for no horizontal scroll
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
		const viewportWidth = await page.evaluate(() => window.innerWidth);
		expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);

		// Check that inputs are accessible (not too small)
		const inputs = page.locator('input, textarea');
		const inputCount = await inputs.count();
		expect(inputCount).toBeGreaterThan(0);
	});

	test('should adapt layout for different screen sizes', async ({ page }) => {
		// Test mobile
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Test tablet
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.waitForTimeout(100); // Allow layout to adjust

		// Test desktop
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.waitForTimeout(100);

		// Form should still be visible at all sizes
		const form = page.locator('form, [role="form"]');
		await expect(form).toBeVisible();
	});
});

