/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    ...require('@playwright/test').devices['Desktop Chrome'],
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
};

module.exports = config;
