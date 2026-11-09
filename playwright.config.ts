import { defineConfig, devices } from '@playwright/test';

// E2E runs against the dev server, which uses local D1 and the DEV_AUTH login
// shortcut from .dev.vars (see .dev.vars.example).
export default defineConfig({
	testDir: 'tests',
	testMatch: '**/*.e2e.ts',
	fullyParallel: false,
	use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	],
	webServer: {
		command: 'npm run db:migrate:local && npm run dev -- --port 5173',
		url: 'http://localhost:5173',
		reuseExistingServer: true,
		timeout: 120_000
	}
});
