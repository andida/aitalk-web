export type TrafficSummaryRequest = {
  target: string;
  country?: string;
  displayDate?: string;
};

export type TrafficSummaryMetrics = {
  visits: number | null;
  users: number | null;
  desktopVisits: number | null;
  mobileVisits: number | null;
  bounceRate: number | null;
  pagesPerVisit: number | null;
  timeOnSite: number | null;
  accuracy: string | null;
};

export type TrafficDataSource =
  | 'similarweb_manual'
  | 'similarweb_public'
  | 'query_domains';

export type TrafficSummaryResult = {
  domain: string;
  country: string;
  month: string | null;
  source: TrafficDataSource;
  cached: boolean;
  cachedUntil: string;
  metrics: TrafficSummaryMetrics;
  raw: Record<string, unknown>;
};

export class TrafficProviderError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 500) {
    super(message);
    this.name = 'TrafficProviderError';
    this.code = code;
    this.status = status;
  }
}
