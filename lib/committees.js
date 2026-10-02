/**
 * Single Canonical Committee Lookup & Normalization Module
 * RNS MUN 2026
 *
 * Source of truth for all committee WhatsApp links, background guides,
 * and venue chambers across frontend, backend API, and CLI dispatchers.
 */

export const COMMITTEES = {
  'UNSC': {
    code: 'UNSC',
    name: 'UNSC',
    fullName: 'United Nations Security Council',
    whatsapp_link: 'https://chat.whatsapp.com/LSB4bvcexqoK3JkmQyYqCx',
    bg_guide_url: 'https://drive.google.com/drive/folders/1B7PFiz_J2mTs0U__33MRS_Y5BMcsVsWY',
    chamber: 'Council Chamber • MBA Seminar Hall (2nd Floor)'
  },
  'LOK SABHA': {
    code: 'Lok Sabha',
    name: 'Lok Sabha',
    fullName: 'Lok Sabha — House of the People',
    whatsapp_link: 'https://chat.whatsapp.com/BA9IXk3MU8c6oEH69noPf5',
    bg_guide_url: 'https://drive.google.com/drive/folders/1B7PFiz_J2mTs0U__33MRS_Y5BMcsVsWY',
    chamber: 'Central Plenary Hall • Chanakya Block'
  },
  'UNODC': {
    code: 'UNODC',
    name: 'UNODC',
    fullName: 'United Nations Office on Drugs and Crime',
    whatsapp_link: 'https://chat.whatsapp.com/IcgBAXEcbO8F9UCf0DiFJm',
    bg_guide_url: 'https://drive.google.com/drive/folders/1B7PFiz_J2mTs0U__33MRS_Y5BMcsVsWY',
    chamber: 'Committee Room 301 • ECE Seminar Hall'
  },
  'UNHRC': {
    code: 'UNHRC',
    name: 'UNHRC',
    fullName: 'United Nations Human Rights Council',
    whatsapp_link: 'https://chat.whatsapp.com/Kqgvxt2yVwsGGDcWAaC1sC',
    bg_guide_url: 'https://drive.google.com/drive/folders/1B7PFiz_J2mTs0U__33MRS_Y5BMcsVsWY',
    chamber: 'Committee Room 102 • Mech Seminar Hall'
  },
  'IP': {
    code: 'IP',
    name: 'IP',
    fullName: 'International Press Corps',
    whatsapp_link: 'https://chat.whatsapp.com/Id2vun9PhQhGlRFTQZKoZm',
    bg_guide_url: 'https://drive.google.com/drive/folders/1B7PFiz_J2mTs0U__33MRS_Y5BMcsVsWY',
    chamber: 'Press Bureau & Media Lab • Academic Block 1'
  },
  'DISEC': {
    code: 'DISEC',
    name: 'DISEC',
    fullName: 'Disarmament and International Security Committee',
    whatsapp_link: 'https://chat.whatsapp.com/ChdeFdrcg0U88lUuaMLrI2',
    bg_guide_url: 'https://drive.google.com/drive/folders/1B7PFiz_J2mTs0U__33MRS_Y5BMcsVsWY',
    chamber: 'Committee Room 204 • Civil Seminar Hall'
  }
};

/**
 * Normalizes an arbitrary committee string:
 * - Trims whitespace and collapses consecutive spaces
 * - Performs case-insensitive matching against known variations (including 'IPC', 'IP', 'Lok Sabha', 'Parliament', etc.)
 *
 * @param {string} rawName
 * @returns {string|null} Normalized canonical committee code (e.g. 'UNSC', 'Lok Sabha', 'IP') or null if unrecognized
 */
export function normalizeCommitteeName(rawName) {
  if (!rawName) return null;
  const cleaned = String(rawName).trim().replace(/\s+/g, ' ');
  const lower = cleaned.toLowerCase();

  if (lower.includes('lok') || lower.includes('sabha') || lower.includes('parliament')) {
    return 'Lok Sabha';
  }
  if (lower.includes('disec') || lower.includes('disarmament')) {
    return 'DISEC';
  }
  if (lower.includes('unsc') || lower.includes('security')) {
    return 'UNSC';
  }
  if (lower.includes('unhrc') || lower.includes('human')) {
    return 'UNHRC';
  }
  if (lower.includes('unodc') || lower.includes('drugs')) {
    return 'UNODC';
  }
  if (lower === 'ip' || lower === 'ipc' || lower.includes('press')) {
    return 'IP';
  }

  // Exact uppercase match fallback
  const upper = cleaned.toUpperCase();
  if (COMMITTEES[upper]) {
    return COMMITTEES[upper].code;
  }

  return null;
}

/**
 * Retrieves the full configuration object for a committee.
 *
 * @param {string} rawName
 * @returns {object|null} Committee configuration or null if not found
 */
export function getCommitteeConfig(rawName) {
  const normalized = normalizeCommitteeName(rawName);
  if (!normalized) return null;
  const upperKey = normalized === 'Lok Sabha' ? 'LOK SABHA' : normalized.toUpperCase();
  return COMMITTEES[upperKey] || null;
}

/**
 * Resolves a verified WhatsApp invite link for a committee.
 * NEVER invents or synthesizes links.
 *
 * @param {string} rawName
 * @returns {string|null} WhatsApp link or null if none configured
 */
export function resolveCommitteeWhatsApp(rawName) {
  const config = getCommitteeConfig(rawName);
  return config ? config.whatsapp_link : null;
}

/**
 * Resolves background guide URL for a committee.
 *
 * @param {string} rawName
 * @returns {string} Background guide URL
 */
export function resolveCommitteeBgGuide(rawName) {
  const config = getCommitteeConfig(rawName);
  return config ? config.bg_guide_url : 'https://drive.google.com/drive/folders/1B7PFiz_J2mTs0U__33MRS_Y5BMcsVsWY';
}

/**
 * Resolves physical chamber venue for a committee.
 *
 * @param {string} rawName
 * @returns {string} Session chamber description
 */
export function resolveCommitteeChamber(rawName) {
  const config = getCommitteeConfig(rawName);
  return config ? config.chamber : 'Main Plenary Hall • Academic Block 2';
}
