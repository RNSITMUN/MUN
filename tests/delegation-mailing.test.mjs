import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveCommitteeWhatsApp, isValidWhatsAppInvite, listMentionedCommittees } from '../lib/committees.js';

// 1. Every configured group link is a well-formed invite; the old fake fallback is rejected.
for (const c of ['UNSC', 'Lok Sabha', 'UNODC', 'UNHRC', 'IP', 'DISEC']) {
  const l = resolveCommitteeWhatsApp(c);
  assert.ok(isValidWhatsAppInvite(l), `${c} link invalid: ${l}`);
}
assert.equal(isValidWhatsAppInvite('https://chat.whatsapp.com/G5y1o155s6y9017'), false);

// 2. Unknown / placeholder / multi-committee values never resolve to a link.
assert.equal(resolveCommitteeWhatsApp('Institutional Delegation'), null);
assert.equal(resolveCommitteeWhatsApp(''), null);
assert.equal(resolveCommitteeWhatsApp('UNSC, DISEC'), null);
assert.deepEqual(listMentionedCommittees('UNSC, DISEC').sort(), ['DISEC', 'UNSC']);

// 3. No code path invents a fallback link or an "Institutional Delegation" committee.
for (const f of ['api/send-mail.js', 'api/admin-registrations.js', 'lib/admin-mail-log.js', 'admin.html']) {
  const src = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  assert.ok(!src.includes('G5y1o155s6y9017'), `${f} still has fake WhatsApp fallback`);
  assert.ok(!/\|\|\s*'Institutional Delegation'/.test(src), `${f} still defaults committee to Institutional`);
}

// 4. admin.html client resolver agrees with lib/committees.js.
const html = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const m = /const COMMITTEE_WHATSAPP_LINKS = (\{[\s\S]*?\});/.exec(html);
const client = Function('return ' + m[1])();
for (const [k, v] of Object.entries(client)) assert.equal(v, resolveCommitteeWhatsApp(k), `client/server mismatch for ${k}`);

// 5. Template picker is not overridden after manual choice.
assert.ok(html.includes('modalTemplateTouched') && html.includes('onModalTemplateUserChange'));
console.log('delegation-mailing tests passed');
