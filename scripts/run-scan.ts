import { loadEnvConfig } from '@next/env';
import path from 'path';
loadEnvConfig(path.resolve(__dirname, '..'));

import { runFullScan, runDailyDigest } from '../src/lib/agent/proactiveScanner';

async function main() {
  console.log('Running daily digest...');
  await runDailyDigest();

  console.log('Running full scan...');
  const result = await runFullScan();
  console.log('Scan result:', JSON.stringify(result, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
