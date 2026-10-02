import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function inspect() {
  // Get all delegations
  const { data: dels, error } = await sb.from('delegations').select('*').order('id');
  if (error) throw error;

  console.log(`Total delegations: ${dels.length}\n`);
  for (const d of dels) {
    const memberKeys = Object.keys(d).filter(k => k !== 'id' && k !== 'created_at');
    console.log(`ID ${d.id}: "${d.delegation_name || d.name}" | Columns: ${memberKeys.join(', ')}`);
    // Print all column values for first delegation to understand structure
    if (d.id === 47) {
      console.log('\n--- Full CMS record (id=47) ---');
      for (const [k, v] of Object.entries(d)) {
        const display = Array.isArray(v) ? `Array(${v.length})` : typeof v === 'object' && v ? JSON.stringify(v).substring(0, 200) : String(v).substring(0, 200);
        console.log(`  ${k}: ${display}`);
      }
    }
  }
}

inspect().catch(console.error);
