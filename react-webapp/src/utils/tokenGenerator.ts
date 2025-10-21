// Mirrors n8n Code node logic for generating tokens and mapping plan features

export const DEFAULT_PACKAGE = 'basic';
export const DEFAULT_TYPE = 'monthly';

// ------------------ helpers ------------------
function randStr(len = 20) {
  let out = '';
  while (out.length < len) out += Math.random().toString(36).slice(2);
  return out.slice(0, len);
}

export function normalizePackage(p?: string) {
  return String(p || '').trim().toLowerCase();
}

function packageCode(p?: string) {
  const n = normalizePackage(p);
  const cleaned = n.replace(/[^a-z0-9]/gi, '');
  return (cleaned.slice(0, 4) || 'pkg').toUpperCase();
}

export function generateToken(pkgName?: string) {
  const ts = Date.now().toString(36);
  const rnd = randStr(16);
  const salt = randStr(6);
  const pfx = packageCode(pkgName);
  return `${pfx}-${ts}-${rnd}${salt}`;
}

// ------------------ feature catalog ------------------
export const FEATURE_UNITS = {
  line_chat: 'flag',
  facebook_chat: 'flag',
  rag_files: 'files',
  calendar_agent: 'flag',
  gdrive_agent: 'flag',
} as const;

export type FeatureUnit = typeof FEATURE_UNITS[keyof typeof FEATURE_UNITS];

export interface PlanFeature {
  feature_key: keyof typeof FEATURE_UNITS | string;
  unit: FeatureUnit | string;
  value: number | null;
}

export const PLAN_FEATURES: Record<string, PlanFeature[]> = {
  basic: [
    { feature_key: 'line_chat', unit: FEATURE_UNITS.line_chat, value: null },
    { feature_key: 'rag_files', unit: FEATURE_UNITS.rag_files, value: 3 },
  ],
  standard: [
    { feature_key: 'line_chat', unit: FEATURE_UNITS.line_chat, value: null },
    { feature_key: 'facebook_chat', unit: FEATURE_UNITS.facebook_chat, value: null },
    { feature_key: 'rag_files', unit: FEATURE_UNITS.rag_files, value: 5 },
  ],
  enterprise: [
    { feature_key: 'line_chat', unit: FEATURE_UNITS.line_chat, value: null },
    { feature_key: 'facebook_chat', unit: FEATURE_UNITS.facebook_chat, value: null },
    { feature_key: 'calendar_agent', unit: FEATURE_UNITS.calendar_agent, value: null },
    { feature_key: 'gdrive_agent', unit: FEATURE_UNITS.gdrive_agent, value: null },
    { feature_key: 'rag_files', unit: FEATURE_UNITS.rag_files, value: 10 },
  ],
};

// ------------------ expiration helper ------------------
export function calcExpiry(type = DEFAULT_TYPE) {
  const now = new Date();
  const expiry = new Date(now);
  if (type.toLowerCase() === 'monthly') expiry.setMonth(now.getMonth() + 1);
  else if (type.toLowerCase() === 'yearly') expiry.setFullYear(now.getFullYear() + 1);
  return expiry.toISOString();
}

// ------------------ main generator ------------------
export function composeToken(pkg?: string, type?: string) {
  const cleanPkg = normalizePackage(pkg || DEFAULT_PACKAGE);
  const token = generateToken(cleanPkg);
  const features = PLAN_FEATURES[cleanPkg] || PLAN_FEATURES[DEFAULT_PACKAGE];
  const expiredAt = calcExpiry(type || DEFAULT_TYPE);

  return {
    package: cleanPkg,
    token,
    status: 'inactive', // will be set to active when persisted
    type: (type || DEFAULT_TYPE).toLowerCase(),
    features,
    addons: [] as any[],
    expiredAt,
  };
}
