import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const env = {};
fs.readFileSync(".env", "utf8").split("\n").forEach(l => {
  const [k, ...v] = l.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^[""]|[""]$/g, "");
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Potentia - MITB (delegation ID: 100) — 18 delegates
const MIT_DELEGATES = [
  { sno: 1,  name: "Anant Mishra",         email: "anant.mitblr2025@learner.manipal.edu",         phone: "7303754765", committee: "Lok Sabha", portfolio: "Shashi Tharoor" },
  { sno: 2,  name: "Angelyn Vijay",         email: "angelyn.mitblr2026@learner.manipal.edu",       phone: "8870979973", committee: "UNSC",      portfolio: "Panama" },
  { sno: 3,  name: "Ayan Dutta",            email: "ayan.mitblr2026@learner.manipal.edu",          phone: "8584010910", committee: "DISEC",     portfolio: "Republic of Turkiye" },
  { sno: 4,  name: "Syed Hussain Haider",   email: "syed3.mitblr2026@learner.manipal.edu",         phone: "9580388801", committee: "IPC",       portfolio: "Al Jazeera" },
  { sno: 5,  name: "Sachi Patil",           email: "sachi.mitblr2026@learner.manipal.edu",         phone: "8217490618", committee: "UNSC",      portfolio: "Republic of Colombia" },
  { sno: 6,  name: "Atharv Pandey",         email: "atharv.mitblr2026@learner.manipal.edu",        phone: "8178977195", committee: "UNODC",     portfolio: "Kingdom of Saudi Arabia" },
  { sno: 7,  name: "Naveen Shiju",          email: "naveen.mitblr2026@learner.manipal.edu",        phone: "7736074904", committee: "UNHRC",     portfolio: "Arab Republic of Egypt" },
  { sno: 8,  name: "Saket Yavagal",         email: "saket.mitblr2026@learner.manipal.edu",         phone: "9900093419", committee: "UNSC",      portfolio: "Kingdom of Bahrain" },
  { sno: 9,  name: "Varnika Chaudhary",     email: "varnika.mitblr2026@learner.manipal.edu",       phone: "9082196736", committee: "UNSC",      portfolio: "Republic of Latvia" },
  { sno: 10, name: "Karthik SR Samudrala",  email: "srinivas.mitblr2026@learner.manipal.edu",      phone: "9227032008", committee: "Lok Sabha", portfolio: "Dimple Yadav" },
  { sno: 11, name: "Pramitha Moodbidri",    email: "pramitha.mitblr2026@learner.manipal.edu",      phone: "9606802064", committee: "DISEC",     portfolio: "Iran" },
  { sno: 12, name: "Medhasri Reddy R",      email: "medhasri.mitblr2026@learner.manipal.edu",      phone: "9986181720", committee: "IPC",       portfolio: "The New York Times" },
  { sno: 13, name: "Yash Jaiswal",          email: "yash6.mitblr2025@learner.manipal.edu",         phone: "9830140014", committee: "IPC",       portfolio: "ANI" },
  { sno: 14, name: "Sai Akul Jallipalli",   email: "saiakuljallipalli.mitblr2026@learner.manipal.edu", phone: "8884779879", committee: "DISEC", portfolio: "South Africa" },
  { sno: 15, name: "Shivani Thapa",         email: "shivani.mitblr2026@learner.manipal.edu",       phone: "8287045579", committee: "UNHRC",     portfolio: "Palestine" },
  { sno: 16, name: "Tanmay Jain",           email: "tanmay.mitblr2026@learner.manipal.edu",        phone: "8240541566", committee: "UNHRC",     portfolio: "Ukraine" },
  { sno: 17, name: "Nandini Naredi",        email: "nandini2.mitblr2026@learner.manipal.edu",      phone: "6200255905", committee: "Lok Sabha", portfolio: "K C Venugopal" },
  { sno: 18, name: "Zayaan Husain Azad",    email: "zayaan.mitblr2026@learner.manipal.edu",        phone: "7709724661", committee: "UNSC",      portfolio: "Islamic Republic of Pakistan" },
];

const DELEGATION_ID = 100;

async function run() {
  console.log("Committing Potentia - MITB delegation allocations (" + MIT_DELEGATES.length + " delegates)...");

  const { data: delegation, error: delErr } = await sb
    .from("delegations")
    .select("*")
    .eq("id", DELEGATION_ID)
    .single();
  if (delErr) throw new Error("Could not fetch delegation: " + delErr.message);

  const members = delegation.roster_data || delegation.members || [];
  console.log("Delegation \"" + delegation.delegation_name + "\" has " + members.length + " registered members in roster_data.");

  const byEmail = new Map();
  const byPhone = new Map();
  const byName  = new Map();

  members.forEach((m, idx) => {
    const email = (m.email || m.emailAddress || m["Email Address"] || "").toLowerCase().trim();
    const phone = (m.phone || m.mobileNumber || m["WhatsApp / Mobile Number"] || "").replace(/[^0-9]/g, "").slice(-10);
    const name  = (m.name || m.delegateName || m["Delegate Name"] || "").toLowerCase().trim();
    if (email) byEmail.set(email, idx);
    if (phone) byPhone.set(phone, idx);
    if (name)  byName.set(name, idx);
  });

  const localPath = path.resolve(process.cwd(), ".data", "checkpoints.json");
  let localData = {};
  if (fs.existsSync(localPath)) {
    try { localData = JSON.parse(fs.readFileSync(localPath, "utf8")) || {}; } catch (e) {}
  }

  let matched = 0;
  let lateCount = 0;
  const unmatched = [];

  for (const del of MIT_DELEGATES) {
    const cleanEmail = del.email.toLowerCase().trim();
    const cleanPhone = del.phone.replace(/[^0-9]/g, "").slice(-10);
    const cleanName  = del.name.toLowerCase().trim();

    let memberIdx = byEmail.get(cleanEmail) ?? byPhone.get(cleanPhone) ?? byName.get(cleanName);

    // Fuzzy name match
    if (memberIdx === undefined) {
      for (const [rName, idx] of byName.entries()) {
        if (rName.startsWith(cleanName) || cleanName.startsWith(rName) ||
            cleanName.split(" ")[0] === rName.split(" ")[0]) {
          memberIdx = idx;
          break;
        }
      }
    }

    const isLate = memberIdx === undefined;
    const finalIdx = isLate ? (members.length + lateCount) : memberIdx;

    if (isLate) {
      lateCount++;
      unmatched.push(del);
      console.log("[" + del.sno + "] LATE ADD: " + del.name + " -> member_index " + finalIdx + " | " + del.committee + " : " + del.portfolio);
    } else {
      const rName = members[memberIdx].name || members[memberIdx].delegateName || members[memberIdx]["Delegate Name"] || "?";
      console.log("[" + del.sno + "] matched: " + del.name + " -> member[" + memberIdx + "]: " + rName + " | " + del.committee + " : " + del.portfolio);
    }

    const { error: cpErr } = await sb
      .from("delegate_checkpoints")
      .upsert({
        record_type: "delegation",
        record_id: String(DELEGATION_ID),
        member_index: finalIdx,
        checkpoint_key: "allocation",
        allocated_committee: del.committee,
        allocated_portfolio: del.portfolio,
        redeemed: true,
        redeemed_at: new Date().toISOString(),
        redeemed_by: "Organizer",
        notes: isLate ? ("Late addition: " + del.name + " (" + del.email + " / " + del.phone + ")") : undefined
      }, { onConflict: "record_type,record_id,member_index,checkpoint_key" });

    if (cpErr) console.warn("  Supabase warning [member " + finalIdx + "]:", cpErr.message);

    const k = "delegation_" + DELEGATION_ID;
    if (!localData[k]) localData[k] = { members: {} };
    if (!localData[k].members) localData[k].members = {};
    localData[k].members[String(finalIdx)] = {
      allocation: { redeemed: true, allocated_committee: del.committee, allocated_portfolio: del.portfolio },
      ...(isLate ? { name: del.name, email: del.email, phone: del.phone, late_addition: true } : {})
    };

    matched++;
  }

  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, JSON.stringify(localData, null, 2), "utf8");

  console.log("Potentia - MITB: committed " + matched + "/" + MIT_DELEGATES.length + " allocations.");
  if (unmatched.length > 0) {
    console.log("Not found in roster (committed as late additions):");
    unmatched.forEach(u => console.log("  - " + u.sno + ". " + u.name + " | " + u.email + " | " + u.phone));
  }
}

run().catch(console.error);
