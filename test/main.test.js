/**
 * ASCII Rat - Core Functionality Tests
 * 
 * Run with: npm test
 * 
 * Tests essential features to ensure the application works correctly.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

// Base URL for local testing
const BASE_URL = `file://${path.join(__dirname, '..', 'index.html')}`;

// Helper to wait for app initialization
test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.state !== undefined, { timeout: 10000 });
});

// ============================================================================
// MAIN PAGE TESTS
// ============================================================================

test.describe('Main Page', () => {
  test('hint bar shows only help hint', async ({ page }) => {
    const hintText = await page.$eval('.hint', el => el.textContent?.trim() || '');
    expect(hintText).toContain('? for help');
    expect(hintText).not.toContain('drag');
    expect(hintText).not.toContain('scroll');
  });

  test('no duplicate hint elements', async ({ page }) => {
    const hints = await page.$$('.hint');
    expect(hints.length).toBe(1);
  });

  test('notification button appears at top', async ({ page }) => {
    await page.waitForSelector('#notifHistoryBtn', { timeout: 5000 });
    const btnBox = await page.$eval('#notifHistoryBtn', el => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, right: rect.right };
    });
    
    expect(btnBox.top).toBeLessThan(100);
    expect(btnBox.top).toBeGreaterThan(0);
  });

  test('question mark key opens help', async ({ page }) => {
    await page.evaluate(() => {
      const help = document.getElementById('helpOverlay');
      if (help?.classList.contains('show')) {
        help.classList.remove('show');
      }
    });
    
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    
    const isShowing = await page.$eval('#helpOverlay', el => el.classList.contains('show'));
    expect(isShowing).toBe(true);
  });

  test('escape key closes help', async ({ page }) => {
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const isShowing = await page.$eval('#helpOverlay', el => el.classList.contains('show'));
    expect(isShowing).toBe(false);
  });

  test('help does not close on outside click', async ({ page }) => {
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    
    await page.click('#helpOverlay');
    await page.waitForTimeout(300);
    
    const isStillShowing = await page.$eval('#helpOverlay', el => el.classList.contains('show'));
    expect(isStillShowing).toBe(true);
  });
});

// ============================================================================
// SETTINGS TESTS
// ============================================================================

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.keyboard.press('s');
    await page.waitForTimeout(500);
    await page.waitForSelector('#setOverlay.show', { timeout: 5000 });
  });

  test('RAT COMPOSITION label exists in STYLE tab', async ({ page }) => {
    await page.click('#setTabs button[data-tab="STYLE"]');
    await page.waitForTimeout(300);
    
    const hasLabel = await page.$eval('#setPanels', (container) => {
      const headers = Array.from(container.querySelectorAll('.shead'));
      return headers.some(h => h.textContent.includes('RAT COMPOSITION'));
    });
    
    expect(hasLabel).toBe(true);
  });

  test('Share button exists in RAT tab', async ({ page }) => {
    await page.click('#setTabs button[data-tab="RAT"]');
    await page.waitForTimeout(300);
    
    const hasShareBtn = await page.$eval('#setPanels', (container) => {
      const buttons = Array.from(container.querySelectorAll('button'));
      return buttons.some(btn => btn.textContent.includes('[ SHARE ]'));
    });
    
    expect(hasShareBtn).toBe(true);
  });

  test('Share button navigates to SHARE tab', async ({ page }) => {
    await page.click('#setTabs button[data-tab="RAT"]');
    await page.waitForTimeout(300);
    
    await page.click('#setPanels button:has-text("[ SHARE ]")');
    await page.waitForTimeout(500);
    
    const currentTab = await page.$eval('.tab.active', el => el.textContent);
    expect(currentTab).toBe('SHARE');
  });

  test('ABOUT tab contains Diagnostics', async ({ page }) => {
    await page.click('#setTabs button[data-tab="ABOUT"]');
    await page.waitForTimeout(300);
    
    const hasAboutHeader = await page.$eval('#setPanels', (container) => {
      return container.textContent.includes('ABOUT ASCII RAT');
    });
    
    const hasDiagnostics = await page.$eval('#setPanels', (container) => {
      return container.textContent.includes('DIAGNOSTICS');
    });
    
    expect(hasAboutHeader).toBe(true);
    expect(hasDiagnostics).toBe(true);
  });

  test('SHARE tab does not contain Diagnostics', async ({ page }) => {
    await page.click('#setTabs button[data-tab="SHARE"]');
    await page.waitForTimeout(300);
    
    const hasDiagnostics = await page.$eval('#setPanels', (container) => {
      return container.textContent.includes('DIAGNOSTICS');
    });
    
    expect(hasDiagnostics).toBe(false);
  });

  test('speaker icon visible in PERFORMANCE tab', async ({ page }) => {
    await page.click('#setTabs button[data-tab="PERFORMANCE"]');
    await page.waitForTimeout(300);
    
    const speakerBtn = await page.$('.sfxSpeakerBtn');
    expect(speakerBtn).not.toBeNull();
  });

  test('volume slider visible in PERFORMANCE tab', async ({ page }) => {
    await page.click('#setTabs button[data-tab="PERFORMANCE"]');
    await page.waitForTimeout(300);
    
    const hasVolumeSlider = await page.$eval('#setPanels', (container) => {
      const sliders = Array.from(container.querySelectorAll('.srow'));
      return sliders.some(s => s.textContent.includes('SFX VOLUME'));
    });
    
    expect(hasVolumeSlider).toBe(true);
  });
});

// ============================================================================
// MAZE GAME TESTS
// ============================================================================

test.describe('Maze Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.keyboard.press('m');
    await page.waitForTimeout(500);
    await page.waitForSelector('#gameOverlay.show', { timeout: 5000 });
  });

  test('time and score display correctly', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const footText = await page.$eval('#gameFoot', el => el.textContent);
    
    expect(footText).not.toContain('TIME 0s');
    expect(footText).toContain('SCORE');
  });
});
