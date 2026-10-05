import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const env = {};
fs.readFileSync(".env", "utf8").split("\n").forEach(l => {
  const [k, ...v] = l.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^[""]|[""]$/g, "");
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CASINO_DELEGATES = [
  { sno: 1,  name: "Saakshi Mohanty",       email: "saakshi.mohanty@gmail.com",       phone: "8660473698", committee: "IPC",       portfolio: "Xinhua News Agency" },
  { sno: 2,  name: "Yash Tadi",             email: "yashtadi17046@gmail.com",          phone: "7016553540", committee: "UNSC",      portfolio: "Somalia" },
  { sno: 3,  name: "Eshanaa Gangamma",      email: "eshanaagangamma@gmail.com",        phone: "9148029623", committee: "DISEC",     portfolio: "India" },
  { sno: 4,  name: "Atreya B Deshpande",   email: "atreyabdeshpande@gmail.com",       phone: "8050031005", committee: "UNHRC",     portfolio: "USA" },
  { sno: 5,  name: "Saisree Vaishnavi",     email: "saisreevaishnavi07@gmail.com",     phone: "9972346513", committee: "IPC",       portfolio: "Deutsche Welle (DW)" },
  { sno: 6,  name: "Abhay Anish Abraham",   email: "abhayanish007@gmail.com",          phone: "9611969808", committee: "UNHRC",     portfolio: "Cyprus" },
  { sno: 7,  name: "Ron Jais",              email: "ronjaisck@gmail.com",              phone: "9148892550", committee: "UNHRC",     portfolio: "Republic of Turkiye" },
  { sno: 8,  name: "Shloka Shetty",         email: "shlokashetty947@gmail.com",        phone: "7391829537", committee: "DISEC",     portfolio: "Canada" },
  { sno: 9,  name: "Parnika",               email: "parnikahallalli@gmail.com",        phone: "7996339319", committee: "UNODC",     portfolio: "Indonesia" },
  { sno: 10, name: "Pratham",               email: "pratkavi2006@gmail.com",           phone: "9535947221", committee: "UNODC",     portfolio: "China" },
  // S.No 11 is absent from the allocation list
  { sno: 12, name: "Aditya R",              email: "adityar.pes@gmail.com",            phone: "8792213129", committee: "DISEC",     portfolio: "Swiss Confederation" },
  { sno: 13, name: "Aaron G Sunil",         email: "aarongsunil19@gmail.com",          phone: "9148709221", committee: "UNSC",      portfolio: "Republic of the Sudan" },
  { sno: 14, name: "Neil Verma",            email: "neilv13579@gmail.com",             phone: "8310759535", committee: "Lok Sabha", portfolio: "Pralhad Joshi" },
];

const DELEGATION_ID = 96;

async function run() {
  console.log("Committing EC Casino Royale delegation allocations (" + CASINO_DELEGATES.length + " delegates)...");

  // Reactivate delegation 96
  const { data: updatedDel, error: reactErr } = await sb
    .from("delegations")
    .update({ status: "Verified" })
    .eq("id", DELEGATION_ID)
    .select("id, delegation_name, status")
    .single();

  if (reactErr) {
    console.warn("Could not reactivate delegation 96:", reactErr.message, "(continuing)");
  } else {
    console.log("Delegation " + DELEGATION_ID + " status -> " + updatedDel?.status + " (" + updatedDel?.delegation_name + ")");
  }

  const { data: delegation, error: delErr } = await sb
    .from("delegations")
    .select("*")
    .eq("id", DELEGATION_ID)
    .single();
  if (delErr) throw new Error("Could not fetch delegation: " + delErr.message);

  const members = delegation.roster_data || delegation.members || [];
  console.log("Delegation has " + members.length + " registered members in roster_data.");

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

  for (const del of CASINO_DELEGATES) {
    const cleanEmail = del.email.toLowerCase().trim();
    const cleanPhone = del.phone.replace(/[^0-9]/g, "").slice(-10);
    const cleanName  = del.name.toLowerCase().trim();

    let memberIdx = byEmail.get(cleanEmail) ?? byPhone.get(cleanPhone) ?? byName.get(cleanName);

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

  console.log("EC Casino Royale delegation: committed " + matched + "/" + CASINO_DELEGATES.length + " allocations.");
  if (unmatched.length > 0) {
    console.log("Not found in roster (committed as late additions):");
    unmatched.forEach(u => console.log("  - " + u.sno + ". " + u.name + " | " + u.email + " | " + u.phone));
  }
}

run().catch(console.error);
