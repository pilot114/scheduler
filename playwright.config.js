// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  projects: [
    {
      name: 'scheduler',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8080',
      },
      testDir: './tests',
    },
  ],

  webServer: {
    command: 'npx http-server src -p 8080 --silent',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
});
