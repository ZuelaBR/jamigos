import { defineConfig } from 'drizzle-kit';

// Only used to generate SQL migrations into ./drizzle.
// Migrations are applied with wrangler: `npm run db:migrate:local` / `npm run db:migrate:remote`.
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	verbose: true,
	strict: true
});
