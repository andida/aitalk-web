import type { NormalizedDomain } from '@/features/traffic/domain';

export type DiscoverySource =
  | 'product_hunt'
  | 'hacker_news'
  | 'similarweb_csv'
  | 'certstream'
  | 'candidate_file';

export type DiscoveryCandidate = {
  rootDomain: string;
  hostname: string;
  url: string;
  source: DiscoverySource;
  sourceUrl?: string;
  title?: string;
  description?: string;
  category?: string;
  country?: string;
  metadata?: Record<string, unknown>;
};

export type NormalizedDiscoveryCandidate = DiscoveryCandidate & {
  normalized: NormalizedDomain;
};

export type DiscoveryFilterReason =
  | 'duplicate'
  | 'blocked'
  | 'invalid_domain'
  | 'dns_failed'
  | 'https_failed'
  | 'homepage_failed'
  | 'parked_or_low_quality'
  | 'registration_missing'
  | 'registration_too_old'
  | 'domain_rating_unavailable'
  | 'domain_rating_too_low'
  | 'traffic_failed'
  | 'traffic_too_low'
  | 'saved'
  | 'dry_run';

export type DiscoveryDecision = {
  candidate: DiscoveryCandidate;
  accepted: boolean;
  reason: DiscoveryFilterReason;
  rootDomain?: string;
  visits?: number | null;
  registeredAt?: string | null;
  domainRating?: number | null;
  details?: Record<string, unknown>;
};

export type DiscoveryRuntimeOptions = {
  days: number;
  candidateLimit: number;
  trafficLimit: number;
  minVisits: number;
  minDomainRating: number;
  country: string;
  dryRun: boolean;
  buildLeaderboard: boolean;
  dnsTimeoutMs: number;
  httpTimeoutMs: number;
  productHuntEnabled: boolean;
  hackerNewsEnabled: boolean;
  similarwebCsvFile?: string;
  candidateFile?: string;
};
