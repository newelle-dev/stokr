import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

for (const envFile of ['.env.local', '.env']) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error('Error: DATABASE_URL is required in .env.local');
  process.exit(1);
}

const sqlPath = path.resolve(process.cwd(), 'supabase', 'tests', 'unit4_red_tests.sql');

console.log('Executing unit4_red_tests.sql via database connection...');

try {
  const output = execSync(
    `npx supabase db query --db-url "${dbUrl}" --file "${sqlPath}" --output-format json`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'inherit'] }
  );

  const results = JSON.parse(output);
  console.log(`\n=== UNIT 4 RED TESTS: RAW RESULTS (${results.length} cases evaluated) ===\n`);
  for (const row of results) {
    console.log(`[${row.status}] #${row.id} ${row.test_name}`);
    console.log(`       detail: ${row.detail}`);
  }
} catch (err) {
  console.error('Red test execution failed:', err.message);
  process.exit(1);
}
