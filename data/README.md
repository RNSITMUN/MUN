# RNS MUN '26 — Master Allocations Database

This directory contains the canonical master allocations records for all confirmed delegates across both **Individual Registrations** and **Institutional Delegations**.

---

## Files

1. **`allocations.json`**:
   Full programmatic JSON database with all 172 individual and delegation delegate allocations. Contains HMAC pass tokens, committee assignments, portfolio mappings, session chambers, and official WhatsApp community invite URLs.

2. **`allocations.csv`**:
   Standardized UTF-8 CSV spreadsheet formatted with byte order mark (BOM) for direct opening in Microsoft Excel, Google Sheets, or Apple Numbers.

---

## Schema

Each record contains:

| Field | Type | Description |
| :--- | :--- | :--- |
| `allocation_id` | String | Unique identifier: `IND-{id}` for individuals, `DEL-{delId}-{seq}` for delegation members |
| `registration_type` | String | `Individual` or `Delegation Member` |
| `record_id` | Number | Database record ID in `registrations` or `delegations` |
| `member_index` | Number | `0` for individual delegate or delegation head; `1..N` for roster members |
| `delegate_name` | String | Full legal / registered name of the delegate |
| `email` | String | Contact email address |
| `phone` | String | Contact phone number |
| `institution` | String | College, school, or university |
| `delegate_category` | String | Registration category (e.g. `Internal (RNSIT)`, `External`, `External Delegation`) |
| `delegation_name` | String | `Individual` or specific institutional delegation name |
| `allocated_committee`| String | Assigned UN committee or chamber (e.g. `UNSC`, `Lok Sabha`, `DISEC`, `UNHRC`, `UNODC`, `IP`) |
| `allocated_portfolio`| String | Assigned nation, cabinet minister, or press bureau role |
| `session_chamber` | String | Venue building and chamber hall on the RNSIT campus |
| `whatsapp_community_url` | String | Direct invite link for this delegate's specific committee caucus |
| `hub_pass_url` | String | Cryptographically signed digital delegate credential pass link (`/hub?t=...`) |
| `qr_badge_path` | String | Path to the high-resolution printable QR pass badge |
| `allocation_status` | String | `Confirmed` or `Pending` |
| `payment_status` | String | `Confirmed` or `Pending Verification` |

---

## How to Synchronize or Re-generate

To pull the latest allocations from the live Supabase database and re-generate both `allocations.json` and `allocations.csv`, run:

```bash
node scripts/generate-master-allocations.mjs
```

This will automatically:
1. Fetch all live registrations from `public.registrations`.
2. Fetch all delegation rosters from `public.delegations`.
3. Fetch confirmed assignments from `public.delegate_checkpoints`.
4. Generate secure HMAC tokens and Hub links for any newly added delegates.
5. Update `data/allocations.json`, `data/allocations.csv`, and public download copies at `/allocations.json` and `/allocations.csv`.
