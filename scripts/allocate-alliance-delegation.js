import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    const envPaths = ['.env.local', '.env'];
    for (const file of envPaths) {
      const fullPath = path.resolve(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIdx = trimmed.indexOf('=');
          const k = trimmed.substring(0, eqIdx).trim();
          let v = trimmed.substring(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.substring(1, v.length - 1);
          }
          process.env[k] = v;
          if (k === key) return v;
        }
      }
    }
  } catch (e) {}
  return process.env[key] || '';
}

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || '';
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY') || '';

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase credentials missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const ALLIANCE_ALLOCATIONS = [
  {
    sNo: 1,
    name: 'Mridusha Chetry (Head of Delegation)',
    email: 'misathapa25@gmail.com',
    phone: '7501057300',
    committee: 'IP',
    portfolio: 'Reuters'
  },
  {
    sNo: 2,
    name: 'Mohammad Nezal Arshad',
    email: 'arshadnezal070@gmail.com',
    phone: '9939578431',
    committee: 'Lok Sabha',
    portfolio: 'G Kishan Reddy'
  },
  {
    sNo: 3,
    name: 'Yashti R Surti',
    email: 'yashtisurti211@gmail.com',
    phone: '9537533559',
    committee: 'Lok Sabha',
    portfolio: 'Brijmohan Agarwal'
  },
  {
    sNo: 4,
    name: 'R.Joel Shalom',
    email: 'joelshalompillai@gmail.com',
    phone: '9849035124',
    committee: 'UNODC',
    portfolio: 'India'
  },
  {
    sNo: 5,
    name: 'Sukrithi kallurmath',
    email: 'sukrithi.kallurmath08@gmail.com',
    phone: '9910126118',
    committee: 'Lok Sabha',
    portfolio: 'Mahua Moitra'
  },
  {
    sNo: 6,
    name: 'Shravya s',
    email: 'shravya.sen25@gmail.com',
    phone: '7899271118',
    committee: 'UNODC',
    portfolio: 'Bhutan'
  },
  {
    sNo: 7,
    name: 'Pranesh AS',
    email: 'hppaperproducts@gmail.com',
    phone: '8778052930',
    committee: 'UNSC',
    portfolio: 'Ethiopia'
  },
  {
    sNo: 8,
    name: 'Danda Shanyuth',
    email: 'shanyuthdanda@gmail.com',
    phone: '9246408888',
    committee: 'UNODC',
    portfolio: 'Japan'
  },
  {
    sNo: 9,
    name: 'Hansiga devendra',
    email: 'jghansiga@gmail.com',
    phone: '7710019635',
    committee: 'UNODC',
    portfolio: 'Myanmar'
  },
  {
    sNo: 10,
    name: 'Prithvi KF',
    email: 'prithvifattepur@gmail.com',
    phone: '9901254158',
    committee: 'Lok Sabha',
    portfolio: 'Manish Tewari'
  },
  {
    sNo: 11,
    name: 'Vishal Manjunath',
    email: 'vishal.manjunath1234@gmail.com',
    phone: '9538204486',
    committee: 'Lok Sabha',
    portfolio: 'Surendra Prasad Yadav'
  },
  {
    sNo: 12,
    name: 'Keerthan Kariappa O L',
    email: 'myselfolkk@gmail.com',
    phone: '9148287586',
    committee: 'Lok Sabha',
    portfolio: 'Arvind Sawant'
  },
  {
    sNo: 13,
    name: 'Adrito Jasu',
    email: 'adritojasu04122007@gmail.com',
    phone: '9007013077',
    committee: 'UNHRC',
    portfolio: 'Ghana'
  },
  {
    sNo: 14,
    name: 'Devang',
    email: 'devangdhoka123@gmail.com',
    phone: '6360914486',
    committee: 'UNHRC',
    portfolio: 'Mexico'
  },
  {
    sNo: 15,
    name: 'Muhammed Salman',
    email: 'salmanmain77@gmail.com',
    phone: '9744303911',
    committee: 'UNSC',
    portfolio: 'Denmark'
  },
  {
    sNo: 16,
    name: 'Kushaal S Patil',
    email: 'kushaalp12@gmail.com',
    phone: '8867800574',
    committee: 'UNSC',
    portfolio: 'Iraq'
  },
  {
    sNo: 17,
    name: 'Madhura Meenakshi Tanikella',
    email: 'meenakshi.tanikella@gmail.com',
    phone: '8309624491',
    committee: 'UNHRC',
    portfolio: 'Kuwait'
  },
  {
    sNo: 18,
    name: 'Prachurya Roy',
    email: 'prachurya9532@gmail.com',
    phone: '8597143313',
    committee: 'DISEC',
    portfolio: 'Finland'
  },
  {
    sNo: 19,
    name: 'Sai Lochan',
    email: 'sailochan8@gmail.com',
    phone: '7353473569',
    committee: 'DISEC',
    portfolio: 'Ukraine'
  },
  {
    sNo: 20,
    name: 'Moogambika',
    email: 'moogambika.official@gmail.com',
    phone: '8056640488',
    committee: 'UNSC',
    portfolio: 'Yemen'
  }
];

async function main() {
  console.log('Fetching Alliance delegation (ID 67)...');
  const { data: delegation, error } = await supabase
    .from('delegations')
    .select('*')
    .eq('id', 67)
    .single();

  if (error || !delegation) {
    console.error('Failed to fetch delegation:', error);
    process.exit(1);
  }

  console.log(`Found: "${delegation.delegation_name}", current member_count: ${delegation.member_count}`);

  const existingRoster = Array.isArray(delegation.roster_data) ? delegation.roster_data : [];
  const updatedRoster = [];

  for (let i = 0; i < ALLIANCE_ALLOCATIONS.length; i++) {
    const alloc = ALLIANCE_ALLOCATIONS[i];
    const existing = existingRoster[i] || {};

    const memberObj = {
      ...existing,
      'S.No': String(alloc.sNo),
      name: alloc.name,
      delegateName: alloc.name,
      'Delegate Name': alloc.name,
      email: alloc.email,
      emailAddress: alloc.email,
      'Email Address': alloc.email,
      phone: alloc.phone,
      mobileNumber: alloc.phone,
      'WhatsApp / Mobile Number': alloc.phone,
      committee: alloc.committee,
      committee1: alloc.committee,
      allocated_committee: alloc.committee,
      allocatedCommittee: alloc.committee,
      allotted_committee: alloc.committee,
      'Committee Allotted': alloc.committee,
      portfolio: alloc.portfolio,
      portfolio1_1: alloc.portfolio,
      allocated_portfolio: alloc.portfolio,
      allocatedPortfolio: alloc.portfolio,
      allotted_portfolio: alloc.portfolio,
      'Portfolio Allotmented': alloc.portfolio,
      institution: 'Alliance delegation',
      'Institution / College Name': 'Alliance delegation'
    };

    if (!memberObj.sheetUrl) {
      memberObj.sheetUrl = 'https://docs.google.com/spreadsheets/d/1SWutsfeMpv8_asVPXrx0Whuz9goUTBzS1_bxaOKQasY/edit?usp=drivesdk';
    }
    if (!memberObj.googleSheetLink) {
      memberObj.googleSheetLink = 'https://docs.google.com/spreadsheets/d/1SWutsfeMpv8_asVPXrx0Whuz9goUTBzS1_bxaOKQasY/edit?usp=drivesdk';
    }

    updatedRoster.push(memberObj);
  }

  console.log(`Updating delegations row 67 with 20 members...`);
  const { data: updatedDelegation, error: updateError } = await supabase
    .from('delegations')
    .update({
      member_count: 20,
      roster_data: updatedRoster
    })
    .eq('id', 67)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating delegations row:', updateError);
    process.exit(1);
  }

  console.log('Successfully updated delegations table. Now upserting checkpoints...');

  for (let idx = 0; idx < ALLIANCE_ALLOCATIONS.length; idx++) {
    const alloc = ALLIANCE_ALLOCATIONS[idx];
    const cpPayload = {
      record_type: 'delegation',
      record_id: '67',
      member_index: idx,
      checkpoint_key: 'allocation',
      redeemed: true,
      redeemed_at: new Date().toISOString(),
      redeemed_by: 'Secretariat Admin',
      allocated_committee: alloc.committee,
      allocated_portfolio: alloc.portfolio,
      notes: `Allocated to ${alloc.committee} (${alloc.portfolio})`
    };

    const { error: cpErr } = await supabase
      .from('delegate_checkpoints')
      .upsert(cpPayload, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });

    if (cpErr) {
      console.warn(`Checkpoint upsert warning for member ${idx} (${alloc.name}):`, cpErr.message);
    }
  }

  console.log('Checkpoint upserts completed.');

  // Update local cache if available
  try {
    const lp = path.resolve(process.cwd(), '.data', 'checkpoints.json');
    if (fs.existsSync(lp)) {
      const localData = JSON.parse(fs.readFileSync(lp, 'utf8')) || {};
      for (let idx = 0; idx < ALLIANCE_ALLOCATIONS.length; idx++) {
        const alloc = ALLIANCE_ALLOCATIONS[idx];
        const k = `delegation_67_${idx}`;
        if (!localData[k]) localData[k] = {};
        localData[k].allocation = {
          redeemed: true,
          allocated_committee: alloc.committee,
          allocated_portfolio: alloc.portfolio
        };
      }
      fs.writeFileSync(lp, JSON.stringify(localData, null, 2), 'utf8');
      console.log('Local store .data/checkpoints.json updated.');
    }
  } catch (err) {
    console.warn('Local cache update skipped:', err.message);
  }

  console.log('Allocation complete! Fetching verification summary:');
  const { data: verifyData } = await supabase
    .from('delegations')
    .select('id, delegation_name, member_count, roster_data')
    .eq('id', 67)
    .single();

  console.log(`Delegation: ${verifyData.delegation_name} | Members: ${verifyData.member_count}`);
  verifyData.roster_data.forEach((m, idx) => {
    console.log(`${idx + 1}. [${m.committee}] ${m.name} -> ${m.portfolio} (${m.email} | ${m.phone})`);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
