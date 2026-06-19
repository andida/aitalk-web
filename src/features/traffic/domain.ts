export type NormalizedDomain = {
  input: string;
  hostname: string;
  rootDomain: string;
};

const MULTI_PART_TLDS = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'net.au',
  'org.au',
  'com.br',
  'com.cn',
  'com.hk',
  'co.jp',
  'co.kr',
  'co.nz',
]);

function stripCommonPrefix(hostname: string) {
  return hostname.replace(/^www\./, '');
}

export function normalizeDomain(input: string): NormalizedDomain {
  const raw = String(input || '').trim();

  if (!raw) {
    throw new Error('Domain is required.');
  }

  const value = raw.includes('://') ? raw : `https://${raw}`;
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Invalid domain or URL.');
  }

  let hostname = parsed.hostname.toLowerCase();
  hostname = hostname.replace(/\.$/, '');
  hostname = stripCommonPrefix(hostname);

  if (!hostname || hostname === 'localhost') {
    throw new Error('Invalid public domain.');
  }

  if (hostname.includes('_') || !/^[a-z0-9.-]+$/.test(hostname)) {
    throw new Error('Invalid domain format.');
  }

  const parts = hostname.split('.').filter(Boolean);
  if (parts.length < 2) {
    throw new Error('Domain must include a valid TLD.');
  }

  const suffix2 = parts.slice(-2).join('.');
  const rootDomain = MULTI_PART_TLDS.has(suffix2)
    ? parts.slice(-3).join('.')
    : suffix2;

  if (MULTI_PART_TLDS.has(suffix2) && parts.length < 3) {
    throw new Error('Domain must include a second-level name.');
  }

  return {
    input: raw,
    hostname,
    rootDomain,
  };
}
