import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Resolve project ref
const projectRef = 'dzrfgaymkznuzkuuakum';

// Resolve Supabase access token without hardcoding secrets in repo
let token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  // Check local gemini mcp_config.json if available
  const mcpConfigPath = path.resolve(os.homedir(), '.gemini', 'config', 'mcp_config.json');
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
      const args = mcpConfig?.mcpServers?.['supabase-mcp-server']?.args || [];
      const tokenIdx = args.indexOf('--access-token');
      if (tokenIdx !== -1 && args[tokenIdx + 1]) {
        token = args[tokenIdx + 1];
      }
    } catch {}
  }
}

if (!token) {
  console.error('Error: SUPABASE_ACCESS_TOKEN environment variable is required to run SQL against the remote database.');
  process.exit(1);
}

const sqlPath = path.resolve(process.cwd(), 'supabase', 'tests', 'test_second_migration_lockdown.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

console.log('Executing supabase/tests/test_second_migration_lockdown.sql on project', projectRef, '...');

async function run() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`HTTP ${res.status} error from Supabase API:`, errorText);
    process.exit(1);
  }

  const results = await res.json();
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
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
