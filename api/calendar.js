export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const query = req.query || {};
  const name = String(query.name || 'Delegate').trim();
  const comm = String(query.committee || query.comm || 'General Assembly').trim();
  const port = String(query.portfolio || query.port || 'General Delegate').trim();
  const venue = String(query.venue || 'RNSIT Campus, Bengaluru').trim();
  const token = String(query.token || 'rnsmun2026').trim();
  const host = req.headers['host'] || 'mun.rnsit.ac.in';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const passUrl = `${proto}://${host}/hub?t=${encodeURIComponent(token)}`;

  // Escape special chars for RFC 5545
  const escapeIcs = (str) =>
    String(str || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');

  const safeName = escapeIcs(name);
  const safeComm = escapeIcs(comm);
  const safePort = escapeIcs(port);
  const safeVenue = escapeIcs(venue);
  const fullLocation = escapeIcs(`RNS Institute of Technology, Dr. Vishnuvardhan Road, Channasandra, RR Nagar, Bengaluru 560098 (${venue})`);

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RNSMUN 2026//Delegate Pass System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:RNSMUN 2026',
    'X-WR-TIMEZONE:Asia/Kolkata',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Kolkata',
    'TZURL:http://tzurl.org/zoneinfo-outlook/Asia/Kolkata',
    'X-LIC-LOCATION:Asia/Kolkata',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0530',
    'TZOFFSETTO:+0530',
    'TZNAME:IST',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:rnsmun2026-day1-${token}@mun.rnsit.ac.in`,
    'DTSTAMP:20260901T000000Z',
    'DTSTART:20261006T030000Z',
    'DTEND:20261006T120000Z',
    'SUMMARY:RNSMUN 2026 — Day 1: Registration & Committee Session',
    `LOCATION:${fullLocation}`,
    `DESCRIPTION:Official Delegate Pass for ${safeName}\\nCommittee: ${safeComm}\\nPortfolio: ${safePort}\\nSession Chamber: ${safeVenue}\\nReporting Time: 08:30 AM IST.\\nDigital Pass & QR: ${passUrl}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT12H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: RNSMUN 2026 starts tomorrow at 08:30 AM!',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: RNSMUN 2026 reporting time is 08:30 AM today!',
    'END:VALARM',
    'END:VEVENT',
    'BEGIN:VEVENT',
    `UID:rnsmun2026-day2-${token}@mun.rnsit.ac.in`,
    'DTSTAMP:20260901T000000Z',
    'DTSTART:20261007T030000Z',
    'DTEND:20261007T123000Z',
    'SUMMARY:RNSMUN 2026 — Day 2: Resolutions & Plenary Adjournment',
    `LOCATION:${fullLocation}`,
    `DESCRIPTION:Day 2 Committee Plenary for ${safeName} (${safeComm}). Reporting Time: 08:30 AM IST.\\nDigital Pass & QR: ${passUrl}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: RNSMUN 2026 Day 2 begins at 08:30 AM today!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const icsBody = icsLines.join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="rnsmun-2026.ics"');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send(icsBody);
}
