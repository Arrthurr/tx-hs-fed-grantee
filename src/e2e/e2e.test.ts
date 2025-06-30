/**
 * End-to-end tests for the Texas Head Start Map application
 * 
 * These tests verify that the application works correctly from a user's perspective
 * by simulating real user interactions with the application.
 * 
 * To run these tests:
 * 1. Start the development server: npm run dev
 * 2. In a separate terminal, run: npm run test:e2e
 */

import { test, expect } from '@playwright/test';

// Base URL for the application
const baseUrl = 'http://localhost:5173';

// Test suite for the Texas Head Start Map application
test.describe('Texas Head Start Map', () => {
  // Setup for each test
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(baseUrl);
    
    // Wait for the application to load
    await page.waitForSelector('h1:has-text("Texas Head Start Interactive Map")');
    
    // Wait for the map to load
    await page.waitForSelector('[data-testid="google-map"]', { timeout: 10000 });
  });
  
  // Test that the application loads correctly
  test('should load the application successfully', async ({ page }) => {
    // Check that the title is correct
    await expect(page).toHaveTitle(/Texas Interactive Map/);
    
    // Check that the header is visible
    await expect(page.locator('h1:has-text("Texas Head Start Interactive Map")')).toBeVisible();
    
    // Check that the map is visible
    await expect(page.locator('[data-testid="google-map"]')).toBeVisible();
    
    // Check that the map controls are visible
    await expect(page.locator('text=Map Controls')).toBeVisible();
  });
  
  // Test the search functionality
  test('should search for programs and display results', async ({ page }) => {
    // Type in the search box
    await page.fill('input[placeholder*="Search"]', 'Austin');
    
    // Wait for search results to appear
    await page.waitForSelector('text=Found', { timeout: 5000 });
    
    // Check that search results are displayed
    await expect(page.locator('text=Found')).toBeVisible();
    
    // Click on a search result
    await page.click('button:has-text("Austin")');
    
    // Check that the info window is displayed
    await page.waitForSelector('[data-testid="info-window"]');
    await expect(page.locator('[data-testid="info-window"]')).toBeVisible();
  });
  
  // Test the layer toggle functionality
  test('should toggle map layers', async ({ page }) => {
    // Check that the Head Start Programs layer is enabled by default
    await expect(page.locator('button:has-text("Head Start Programs")')).toHaveClass(/bg-headstart-accent/);
    
    // Toggle the Congressional Districts layer
    await page.click('button:has-text("Congressional Districts")');
    
    // Check that the Congressional Districts layer is now enabled
    await expect(page.locator('button:has-text("Congressional Districts")')).toHaveClass(/bg-district-accent/);
    
    // Toggle the Head Start Programs layer off
    await page.click('button:has-text("Head Start Programs")');
    
    // Check that the Head Start Programs layer is now disabled
    await expect(page.locator('button:has-text("Head Start Programs")')).not.toHaveClass(/bg-headstart-accent/);
  });
  
  // Test the map controls
  test('should use map controls to navigate', async ({ page }) => {
    // Click the zoom in button
    await page.click('button[title="Zoom In"]');
    
    // Click the zoom out button
    await page.click('button[title="Zoom Out"]');
    
    // Click the reset view button
    await page.click('button[title="Reset to Texas View"]');
    
    // Click the fit markers button
    await page.click('button[title="Fit All Markers"]');
    
    // All of these actions should not cause errors
    await expect(page.locator('text=Error')).not.toBeVisible();
  });
  
  // Test marker interaction
  test('should display info window when clicking on a marker', async ({ page }) => {
    // Wait for markers to load
    await page.waitForSelector('[data-testid="advanced-marker"]');
    
    // Click on a marker
    await page.click('[data-testid="advanced-marker"]');
    
    // Check that the info window is displayed
    await page.waitForSelector('[data-testid="info-window"]');
    await expect(page.locator('[data-testid="info-window"]')).toBeVisible();
    
    // Close the info window
    await page.click('[data-testid="info-window"]');
    
    // Check that the info window is closed
    await expect(page.locator('[data-testid="info-window"]')).not.toBeVisible();
  });
  
  // Test error handling
  test('should handle API errors gracefully', async ({ page }) => {
    // Simulate an API error by setting an invalid API key
    await page.evaluate(() => {
      localStorage.setItem('MOCK_API_ERROR', 'true');
      window.location.reload();
    });
    
    // Wait for the error display
    await page.waitForSelector('text=Failed to load Google Maps API');
    
    // Check that the error display is shown
    await expect(page.locator('text=Failed to load Google Maps API')).toBeVisible();
    
    // Check that the retry button is available
    await expect(page.locator('button:has-text("Retry Loading")')).toBeVisible();
    
    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('MOCK_API_ERROR');
    });
  });
  
  // Test responsive design
  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test on mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1:has-text("Texas Head Start Interactive Map")')).toBeVisible();
    
    // Test on tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1:has-text("Texas Head Start Interactive Map")')).toBeVisible();
    
    // Test on desktop size
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('h1:has-text("Texas Head Start Interactive Map")')).toBeVisible();
  });
  
  // Test accessibility
  test('should be accessible', async ({ page }) => {
    // Check that all interactive elements have accessible names
    const buttons = await page.locator('button:not([aria-hidden="true"])').all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      expect(ariaLabel || textContent?.trim()).toBeTruthy();
    }
    
    // Check that all images have alt text
    const images = await page.locator('img:not([aria-hidden="true"])').all();
    for (const image of images) {
      const alt = await image.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });
});