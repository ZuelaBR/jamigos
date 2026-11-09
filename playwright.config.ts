import { defineConfig, devices } from '@playwright/test';

// E2E tests run against their own dev server (port 5174) with a throwaway local D1
// database in .wrangler/e2e, recreated on every run so tests never touch your dev data.
// The database is filled with real itch.io jams from src/lib/jams/fixtures (see global-setup.ts).
const PORT = 5174;
const STATE_DIR = '.wrangler/e2e';

export default defineConfig({
	testDir: 'tests',
	testMatch: '**/*.e2e.ts',
	globalSetup: './tests/global-setup.ts',
	use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
	projects: [
		// Each project uses a different real jam so the parallel runs don't see each other's posts.
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] }, metadata: { jam: 'gmtk-2027' } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] }, metadata: { jam: 'brackeys-17' } }
	],
	webServer: {
		command: [
			`rm -rf ${STATE_DIR}`,
			`npx wrangler d1 migrations apply jammates --local --persist-to ${STATE_DIR}`,
			`npx vite dev --port ${PORT} --strictPort`
		].join(' && '),
		env: { E2E_STATE_DIR: STATE_DIR },
		url: `http://localhost:${PORT}`,
		// Always start fresh so every run begins with an empty, known database.
		reuseExistingServer: false,
		timeout: 120_000
	}
});
