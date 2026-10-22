// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Не 8080: его на этой машине держит рабочий докер (sw_workspace), а reuseExistingServer
// молча прогонял бы тесты по чужой странице.
const PORT = Number(process.env.PORT) || 8096;

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
        baseURL: `http://localhost:${PORT}`,
      },
      testDir: './tests',
    },
  ],

  webServer: {
    command: `npx http-server src -p ${PORT} --silent`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
