import dns from 'node:dns/promises';
import tls from 'node:tls';

export type DnsCheckResult = {
  ok: boolean;
  records: string[];
  error?: string;
};

export type TlsCheckResult = {
  ok: boolean;
  issuer?: string | null;
  validTo?: string | null;
  error?: string;
};

export type HomepageCheckResult = {
  ok: boolean;
  status?: number;
  title?: string | null;
  description?: string | null;
  isLowQuality: boolean;
  error?: string;
};

export type AuthorityCheckResult = {
  domainRating: number | null;
  error?: string;
};

const PARKED_PATTERNS = [
  /domain is for sale/i,
  /buy this domain/i,
  /this domain may be for sale/i,
  /sedo parking/i,
  /afternic/i,
  /dan\.com/i,
  /hugedomains/i,
  /parked free/i,
  /parkingcrew/i,
  /namecheap parking/i,
  /coming soon/i,
];

export async function checkDns(
  rootDomain: string,
  timeoutMs: number
): Promise<DnsCheckResult> {
  try {
    const records = await withTimeout(
      Promise.allSettled([
        dns.resolve4(rootDomain),
        dns.resolve6(rootDomain),
        dns.resolveCname(rootDomain),
      ]),
      timeoutMs,
      'dns_timeout'
    );
    const values = records.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : []
    );

    return {
      ok: values.length > 0,
      records: values,
      ...(values.length === 0 ? { error: 'no_dns_records' } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      records: [],
      error: error instanceof Error ? error.message : 'dns_failed',
    };
  }
}

export async function checkTls(
  rootDomain: string,
  timeoutMs: number
): Promise<TlsCheckResult> {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host: rootDomain,
      servername: rootDomain,
      port: 443,
      timeout: timeoutMs,
      rejectUnauthorized: true,
    });

    socket.once('secureConnect', () => {
      const certificate = socket.getPeerCertificate();
      socket.destroy();
      resolve({
        ok: true,
        issuer:
          typeof certificate.issuer?.O === 'string'
            ? certificate.issuer.O
            : null,
        validTo: certificate.valid_to || null,
      });
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve({ ok: false, error: 'tls_timeout' });
    });

    socket.once('error', (error) => {
      socket.destroy();
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : 'tls_failed',
      });
    });
  });
}

export async function checkHomepage(
  rootDomain: string,
  timeoutMs: number
): Promise<HomepageCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://${rootDomain}`, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent':
          'Mozilla/5.0 (compatible; SiteRiseBot/1.0; +https://siterisehq.com)',
      },
    });
    const text = await response.text();
    const title = extractTag(text, 'title');
    const description = extractMetaDescription(text);
    const isLowQuality = isLowQualityHomepage({
      status: response.status,
      html: text,
      title,
      description,
    });

    return {
      ok: response.status >= 200 && response.status < 400 && !isLowQuality,
      status: response.status,
      title,
      description,
      isLowQuality,
      ...(response.status < 200 || response.status >= 400
        ? { error: `http_${response.status}` }
        : {}),
    };
  } catch (error) {
    return {
      ok: false,
      isLowQuality: false,
      error: error instanceof Error ? error.message : 'homepage_failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAhrefsDomainRating(
  rootDomain: string
): Promise<AuthorityCheckResult> {
  const baseUrl =
    process.env.AHREFS_DR_BASE_URL ||
    'https://api.ahrefs.com/v3/public/domain-rating-free';
  const url = new URL(baseUrl);
  url.searchParams.set('target', rootDomain);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        accept: 'application/json,text/plain,*/*',
      },
      cache: 'no-store',
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        domainRating: null,
        error: `ahrefs_${response.status}`,
      };
    }

    return {
      domainRating: extractDomainRating(text),
    };
  } catch (error) {
    return {
      domainRating: null,
      error: error instanceof Error ? error.message : 'authority_failed',
    };
  }
}

function extractDomainRating(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown;
    return findNumericDomainRating(parsed);
  } catch {
    const match = text.match(
      /domain[_\s-]?rating["']?\s*[:=]\s*(\d+(?:\.\d+)?)/i
    );
    return match ? Number(match[1]) : null;
  }
}

function findNumericDomainRating(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const directCandidates = [
    record.domain_rating,
    record.domainRating,
    record.dr,
    record.rating,
    record.value,
    (record.metrics as Record<string, unknown> | undefined)?.domain_rating,
    (record.domain_rating as Record<string, unknown> | undefined)
      ?.domain_rating,
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  for (const nested of Object.values(record)) {
    const found = findNumericDomainRating(nested);
    if (found !== null) {
      return found;
    }
  }

  return null;
}

function isLowQualityHomepage({
  status,
  html,
  title,
  description,
}: {
  status: number;
  html: string;
  title: string | null;
  description: string | null;
}) {
  if (status < 200 || status >= 400) return true;
  const text = `${title || ''} ${description || ''} ${html.slice(0, 5000)}`;
  if (PARKED_PATTERNS.some((pattern) => pattern.test(text))) return true;

  const visibleText = text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title && visibleText.length < 120) return true;
  if (title && title.trim().length < 3 && visibleText.length < 200) return true;

  return false;
}

function extractTag(html: string, tag: string) {
  const match = html.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  );
  return match ? decodeHtml(match[1].trim()).slice(0, 160) : null;
}

function extractMetaDescription(html: string) {
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  return match ? decodeHtml(match[1].trim()).slice(0, 300) : null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
}
