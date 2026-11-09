import { readFileSync, readdirSync } from 'node:fs';
import { getPlatformProxy } from 'wrangler';
import { getDb } from '../db/index.ts';

/**
 * A real, in-memory D1 database (via wrangler) with all migrations from ./drizzle applied.
 * Call `dispose()` in `afterAll`.
 */
export async function createTestDb() {
	const proxy = await getPlatformProxy<Env>({ persist: false });
	for (const file of readdirSync('drizzle')
		.filter((f) => f.endsWith('.sql'))
		.sort()) {
		for (const stmt of readFileSync(`drizzle/${file}`, 'utf8').split('--> statement-breakpoint')) {
			if (stmt.trim()) await proxy.env.DB.prepare(stmt).run();
		}
	}
	return { db: getDb(proxy.env.DB), dispose: () => proxy.dispose() };
}
