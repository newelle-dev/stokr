import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// Load untracked environment variables from .env.local or .env
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
  console.error(
    'Error: DATABASE_URL (or SUPABASE_DB_URL / POSTGRES_URL) is required in .env.local to run raw SQL suite via database connection.'
  );
  process.exit(1);
}

const sqlPath = path.resolve(process.cwd(), 'supabase', 'tests', 'test_second_migration_lockdown.sql');

console.log('Executing test_second_migration_lockdown.sql via database connection...');

try {
  const output = execSync(
    `npx supabase db query --db-url "${dbUrl}" --file "${sqlPath}" --output-format json`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'inherit'] }
  );

  const results = JSON.parse(output);
  console.log(`\n=== SECOND MIGRATION LOCKDOWN TESTS: RAW RESULTS (${results.length} cases evaluated) ===\n`);
  let allPassed = true;
  for (const row of results) {
    const isPass = row.status === 'PASS';
    if (!isPass) allPassed = false;
    console.log(`[${row.status}] #${row.id} [${row.category}] ${row.test_name}`);
    console.log(`       detail: ${row.detail}`);
  }

  if (!allPassed) {
    console.error('\nOne or more lockdown tests failed!');
    process.exit(1);
  } else {
    console.log(`\n=== ALL ${results.length} LOCKDOWN TESTS PASSED ===\n`);
  }
} catch (err) {
  console.error('Test execution failed:', err.message);
  process.exit(1);
}
