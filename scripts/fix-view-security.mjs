import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// We need to recreate the view with security_invoker = true.
// Supabase JS client doesn't have a direct .rpc for DDL, so we use the REST SQL endpoint.
const sql = `
DROP VIEW IF EXISTS public.delegate_allocations_view;
CREATE OR REPLACE VIEW public.delegate_allocations_view
  WITH (security_invoker = true)
AS
SELECT
    'IND-' || r.id::text AS allocation_id,
    'Individual' AS registration_type,
    r.id AS record_id,
    0 AS member_index,
    r.name AS delegate_name,
    r.email AS email,
    r.phone AS phone,
    COALESCE(r.institution, 'RNSIT') AS institution,
    r.delegate_type AS delegate_category,
    'Individual' AS delegation_name,
    COALESCE(cp.allocated_committee, r.committee1, 'Unassigned') AS allocated_committee,
    COALESCE(cp.allocated_portfolio, r.portfolio1_1, 'Unassigned') AS allocated_portfolio,
    r.status AS registration_status,
    cp.redeemed_at AS allocated_at
FROM public.registrations r
LEFT JOIN public.delegate_checkpoints cp
    ON cp.record_type = 'individual'
    AND cp.record_id = r.id::text
    AND cp.member_index = 0
    AND cp.checkpoint_key = 'allocation'

UNION ALL

SELECT
    'DEL-' || d.id::text || '-' || LPAD(((m.ordinality - 1) + 1)::text, 2, '0') AS allocation_id,
    'Delegation Member' AS registration_type,
    d.id AS record_id,
    (m.ordinality - 1)::int AS member_index,
    COALESCE(m.member->>'name', d.head_name) AS delegate_name,
    COALESCE(m.member->>'email', d.email) AS email,
    COALESCE(m.member->>'phone', d.phone) AS phone,
    d.delegation_name AS institution,
    d.delegation_type AS delegate_category,
    d.delegation_name AS delegation_name,
    COALESCE(cp.allocated_committee, m.member->>'allocated_committee', m.member->>'committee', 'Institutional Delegation') AS allocated_committee,
    COALESCE(cp.allocated_portfolio, m.member->>'allocated_portfolio', m.member->>'portfolio', 'Assigned Delegate') AS allocated_portfolio,
    d.status AS registration_status,
    cp.redeemed_at AS allocated_at
FROM public.delegations d
CROSS JOIN LATERAL jsonb_array_elements(d.roster_data) WITH ORDINALITY AS m(member, ordinality)
LEFT JOIN public.delegate_checkpoints cp
    ON cp.record_type = 'delegation'
    AND cp.record_id = d.id::text
    AND cp.member_index = (m.ordinality - 1)::int
    AND cp.checkpoint_key = 'allocation';
`;

// Execute via Supabase REST SQL endpoint (requires service role key)
const url = env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/exec_sql';

// Use the pg REST endpoint directly
const pgUrl = env.SUPABASE_URL.replace(/\/$/, '') + '/pg';

// Actually use fetch to POST to /sql endpoint
const response = await fetch(env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/exec_ddl', {
  method: 'POST',
  headers: {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ sql })
});

if (!response.ok) {
  const text = await response.text();
  // exec_ddl might not exist — try a different approach
  console.log('exec_ddl not available, trying direct view recreation via rpc...');
  console.log('Response:', text);
  
  // Fallback: Try via the Management API
  const mgmtUrl = `https://api.supabase.com/v1/projects/${extractProjectId(env.SUPABASE_URL)}/database/query`;
  const mgmtResp = await fetch(mgmtUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (!mgmtResp.ok) {
    const mgmtText = await mgmtResp.text();
    console.log('Management API also failed:', mgmtText);
    console.log('\n--- MANUAL STEPS ---');
    console.log('Please run the following SQL in the Supabase SQL Editor:');
    console.log(sql);
  } else {
    const mgmtData = await mgmtResp.json();
    console.log('Success via Management API:', mgmtData);
  }
} else {
  const data = await response.json();
  console.log('Success:', data);
}

function extractProjectId(url) {
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  return match ? match[1] : null;
}
