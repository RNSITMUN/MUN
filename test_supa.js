import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const {data, error} = await supabase.from('delegations').select('*');
  console.log('Error:', error);
  console.log('Count:', data?.length);
  console.log('Data:', data?.map(d => d.delegation_name + ' - ' + d.status));
}

test();
