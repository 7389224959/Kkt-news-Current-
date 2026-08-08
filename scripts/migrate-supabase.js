import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const TABLES = [
  'articles',
  'breaking_news',
  'trending_keywords',
  'site_settings',
  'workers',
  'worker_tasks',
  'worker_assets',
  'clients',
  'job_applications'
];

async function exportData(supabaseUrl, supabaseKey, outputFile = 'supabase-data-backup.json') {
  console.log(`Connecting to source Supabase: ${supabaseUrl}`);
  const client = createClient(supabaseUrl, supabaseKey);
  const backupData = {};

  for (const table of TABLES) {
    try {
      console.log(`Fetching rows from table '${table}'...`);
      const { data, error } = await client.from(table).select('*');
      if (error) {
        console.warn(`Could not fetch table '${table}': ${error.message}`);
        backupData[table] = [];
      } else {
        console.log(`Exported ${data?.length || 0} rows from '${table}'.`);
        backupData[table] = data || [];
      }
    } catch (e) {
      console.error(`Error exporting '${table}':`, e.message);
      backupData[table] = [];
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(backupData, null, 2));
  console.log(`\nData backup successfully written to ${outputFile}`);
}

async function importData(supabaseUrl, supabaseKey, backupFile = 'supabase-data-backup.json') {
  if (!fs.existsSync(backupFile)) {
    console.error(`Backup file ${backupFile} does not exist! Please ensure you have exported data first.`);
    return;
  }

  console.log(`Connecting to target Supabase: ${supabaseUrl}`);
  const client = createClient(supabaseUrl, supabaseKey);
  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

  for (const table of TABLES) {
    const rows = backupData[table] || [];
    if (rows.length === 0) {
      console.log(`No rows to import for '${table}'. Skipping.`);
      continue;
    }

    console.log(`Importing ${rows.length} rows into table '${table}'...`);
    // Insert in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await client.from(table).upsert(chunk);
      if (error) {
        console.error(`Error inserting into '${table}' (chunk ${i / chunkSize + 1}):`, error.message);
      }
    }
    console.log(`Finished importing '${table}'.`);
  }

  console.log('\nAll data import steps completed successfully!');
}

const mode = process.argv[2];
if (mode === 'export') {
  const url = process.argv[3] || process.env.OLD_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.argv[4] || process.env.OLD_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  exportData(url, key);
} else if (mode === 'import') {
  const url = process.argv[3] || process.env.VITE_SUPABASE_URL;
  const key = process.argv[4] || process.env.VITE_SUPABASE_ANON_KEY;
  importData(url, key);
} else {
  console.log(`Usage:
  To export from old account:
    node scripts/migrate-supabase.js export <OLD_SUPABASE_URL> <OLD_SUPABASE_ANON_KEY>

  To import into new account:
    node scripts/migrate-supabase.js import <NEW_SUPABASE_URL> <NEW_SUPABASE_ANON_KEY>
  `);
}
