import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { oldUrl, oldKey } = req.body || {};

  if (!oldUrl || !oldKey) {
    return res.status(400).json({ error: 'Both oldUrl and oldKey are required.' });
  }

  const cleanUrl = oldUrl.trim().replace(/\/+$/, '');
  const cleanKey = oldKey.trim();

  const tables = [
    'site_settings',
    'articles',
    'breaking_news',
    'trending_keywords',
    'workers',
    'worker_tasks',
    'worker_assets',
    'clients',
    'job_applications'
  ];

  const exportedData = {};
  const statusLog = [];

  try {
    // Create Supabase client with 10s fetch timeout
    const oldClient = createClient(cleanUrl, cleanKey, {
      global: {
        fetch: (url, options) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
        }
      }
    });

    for (const table of tables) {
      try {
        const { data, error, status } = await oldClient.from(table).select('*');
        if (error) {
          statusLog.push(`Table '${table}' failed (Status ${status}): ${error.message}`);
          exportedData[table] = [];
        } else {
          statusLog.push(`Table '${table}': fetched ${data?.length || 0} rows.`);
          exportedData[table] = data || [];
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          statusLog.push(`Table '${table}' timed out (Connection to old Supabase restricted/blocked).`);
        } else {
          statusLog.push(`Table '${table}' error: ${err.message}`);
        }
        exportedData[table] = [];
      }
    }

    const totalRowsFetched = Object.values(exportedData).reduce((acc, curr) => acc + curr.length, 0);

    return res.status(200).json({
      success: true,
      data: exportedData,
      log: statusLog,
      totalRows: totalRowsFetched
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to communicate with Old Supabase: ' + err.message
    });
  }
}
