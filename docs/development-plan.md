# Website Opportunity Intelligence Development Plan

Last updated: 2026-06-12

## 1. Current Codebase Context

The repository contains a Next.js 16 application template with:

- App Router under `src/app`.
- i18n via `next-intl`.
- Drizzle ORM schemas under `src/config/db`.
- Supabase Postgres as the primary business database.
- Auth via Better Auth. Supabase Auth is not used.
- Payment integrations including Stripe, PayPal, and Creem.
- Dashboard/admin layouts already present.
- UI components under `src/shared/components/ui`.
- Pricing and landing content stored in locale JSON.

This means the fastest path is to extend the existing SaaS template rather than start from scratch.

## 2. Engineering Goals

1. Integrate Semrush Trends API as the primary traffic data provider.
2. Build reusable data provider boundaries so Semrush can be swapped or supplemented later.
3. Implement traffic lookup, bulk lookup, keyword analyzer, leaderboards, and watchlist.
4. Enforce plan quotas and provider-cost controls from day one.
5. Keep Semrush-derived data cache compliant with provider restrictions.
6. Add enough admin observability to avoid runaway API costs.

## 3. Suggested Architecture

### 3.1 Logical Layers

Presentation:

- Landing pages.
- Tool pages.
- Dashboard pages.
- Admin pages.

Application services:

- `TrafficLookupService`
- `BulkTrafficService`
- `KeywordAnalyzerService`
- `LeaderboardService`
- `WatchlistService`
- `QuotaService`
- `ProviderUsageService`

Provider adapters:

- `SemrushTrendsProvider`
- `SerpProvider`
- `DomainMetadataProvider`
- `DomainEnrichmentProvider`

Persistence:

- Drizzle tables for domains, traffic snapshots, watchlists, keyword reports, provider logs, and quotas.

Background jobs:

- Bulk traffic refresh.
- Watchlist monthly refresh.
- Leaderboard rebuild.
- Domain enrichment.
- Alert delivery.

### 3.2 Recommended Folder Structure

```text
src/features/traffic/
  components/
  services/
  providers/
  types.ts
  validators.ts

src/features/keyword/
  components/
  services/
  providers/
  types.ts

src/features/leaderboard/
  components/
  services/
  types.ts

src/features/watchlist/
  components/
  services/
  types.ts

src/features/billing/
  quota.ts

src/app/[locale]/(landing)/traffic/[domain]/page.tsx
src/app/[locale]/(landing)/bulk/page.tsx
src/app/[locale]/(landing)/keyword/page.tsx
src/app/[locale]/(landing)/leaderboard/traffic/top/page.tsx
src/app/[locale]/(landing)/leaderboard/traffic/trending/page.tsx
src/app/[locale]/(landing)/leaderboard/traffic/new/page.tsx
src/app/[locale]/(landing)/dashboard/watchlists/page.tsx

src/app/api/traffic/lookup/route.ts
src/app/api/traffic/bulk/route.ts
src/app/api/keyword/analyze/route.ts
src/app/api/watchlists/route.ts
src/app/api/watchlists/[id]/items/route.ts
```

If the team prefers fewer folders, `src/shared/services` can be used initially, but feature folders will scale better.

## 4. Environment Variables

Add:

```text
SEMRUSH_API_KEY=
SEMRUSH_TRENDS_BASE_URL=https://api.semrush.com/analytics/ta/api/v3
SEMRUSH_CACHE_TTL_DAYS=30
SEMRUSH_MAX_RPS=10
SERP_PROVIDER=dataforseo
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
SERPAPI_KEY=
ENABLE_PUBLIC_LEADERBOARDS=false
ENABLE_CSV_EXPORT=false
ENABLE_REVENUE_ESTIMATES=false
```

Feature flags should default to conservative values until data licensing is confirmed.

## 5. Database Plan

The active schema export in `src/config/db/schema.ts` points to `schema.postgres.ts`. Use Supabase Postgres as the primary database, with Better Auth tables (`user`, `session`, `account`, `verification`) managed through the same Drizzle schema.

### 5.1 Phase 1 Tables

Implemented SiteRise tables use the `siterise_` prefix:

- `siterise_domain`
- `siterise_traffic_snapshot`
- `siterise_watchlist`
- `siterise_traffic_query_log`

Still add later:

- `keyword_reports`
- `keyword_report_results`

### 5.2 Phase 2 Tables

Implemented leaderboard foundations:

- `siterise_leaderboard_run`
- `siterise_leaderboard_entry`

Still add later:

- `domain_enrichment`
- `domain_snapshots`
- `user_usage_quotas`
- `saved_reports`
- `alert_rules`
- `alert_events`

### 5.3 Indexes

Required indexes:

- `siterise_domain.root_domain` unique.
- `siterise_traffic_snapshot(domain_id, display_date, country, device_type, source)` unique.
- `siterise_traffic_query_log(user_id, created_at)`.
- `siterise_watchlist(user_id, root_domain, country)` unique.
- `siterise_leaderboard_entry(run_id, rank)`.
- `keyword_reports(user_id, created_at)`.

## 6. Provider Integration Plan

### 6.1 Semrush Trends Provider

Create a provider wrapper with these responsibilities:

- Build query string safely.
- Normalize target domains.
- Enforce max targets per request.
- Enforce 10 RPS account limit.
- Parse CSV response into typed objects.
- Log every request.
- Map provider errors to internal error codes.

Initial method:

```ts
type TrafficSummaryRequest = {
  targets: string[];
  displayDate?: string;
  country?: string;
  deviceType?: "desktop" | "mobile";
  columns?: string[];
};

type TrafficSummaryRow = {
  target: string;
  displayDate?: string;
  country?: string;
  visits?: number;
  users?: number;
  desktopVisits?: number;
  mobileVisits?: number;
  bounceRate?: number;
  pagesPerVisit?: number;
  timeOnSite?: number;
  accuracy?: string | number;
  raw: Record<string, string>;
};
```

Default columns for MVP:

```text
target,display_date,country,visits,users,desktop_visits,mobile_visits,bounce_rate,pages_per_visit,time_on_site,accuracy
```

If available in the subscribed plan, add:

```text
direct,search_organic,search_paid,referral,social_organic,social_paid,display_ads,email
```

### 6.2 Cache Strategy

Cache key:

```text
semrush:summary:{targetsHash}:{displayDate}:{country}:{deviceType}:{columnsHash}
```

Rules:

- Raw provider cache TTL must be <= `SEMRUSH_CACHE_TTL_DAYS`.
- `traffic_monthly.provider_cached_until` must be set.
- Any Semrush-derived row older than the configured TTL must be hidden, refreshed, or removed unless licensing allows longer retention.
- User-owned metadata and watchlist membership can be stored indefinitely.

### 6.3 CSV Parsing

Semrush responses are CSV. Implement parser with:

- Header row validation.
- Semicolon/comma delimiter detection if needed.
- Empty value handling.
- Numeric conversion.
- Row-level validation.

Do not parse CSV with brittle split logic if quoted fields are possible. Use a small CSV parser dependency or a tested utility.

### 6.4 SERP Provider

Recommended MVP: DataForSEO or SerpApi.

Responsibilities:

- Fetch organic Top 10.
- Normalize URLs.
- Extract root domains.
- Save title/snippet/position.
- Deduplicate domains before Semrush call.

## 7. API Routes

### 7.1 `POST /api/traffic/lookup`

Request:

```json
{
  "target": "example.com",
  "country": "US",
  "month": "2026-05-01"
}
```

Behavior:

1. Validate domain.
2. Check user/IP quota.
3. Check cache/database.
4. Call Semrush if cache miss.
5. Save provider usage log.
6. Return normalized response.

### 7.2 `POST /api/traffic/bulk`

Request:

```json
{
  "targets": ["example.com", "competitor.com"],
  "country": "US",
  "month": "2026-05-01"
}
```

Behavior:

1. Normalize and deduplicate targets.
2. Enforce plan limit.
3. Chunk targets according to provider limits.
4. Query cache first.
5. Fetch missing rows from Semrush.
6. Return table rows and partial error list.

### 7.3 `POST /api/keyword/analyze`

Request:

```json
{
  "keyword": "ai resume builder",
  "country": "US"
}
```

Behavior:

1. Enforce keyword quota.
2. Fetch SERP Top 10.
3. Normalize result domains.
4. Fetch traffic summary for those domains.
5. Save report.
6. Return joined SERP + traffic data.

### 7.4 Watchlist APIs

Routes:

- `GET /api/watchlists`
- `POST /api/watchlists`
- `POST /api/watchlists/:id/items`
- `DELETE /api/watchlists/:id/items/:itemId`

Plan enforcement:

- Check max watchlist domains by active subscription.
- Return upgrade-required error when exceeded.

## 8. Frontend Plan

### 8.1 Core Components

Create reusable components:

- `DomainSearchForm`
- `TrafficMetricCards`
- `TrafficSummaryTable`
- `TrafficSourceBreakdown`
- `DeviceSplitChart`
- `DomainHeader`
- `LeaderboardFilters`
- `LeaderboardTable`
- `WatchlistTable`
- `KeywordReportTable`
- `QuotaUsageBadge`

Use existing shadcn-style UI components from `src/shared/components/ui`.

### 8.2 Pages

MVP pages:

- Home page with domain search.
- Domain result page.
- Bulk checker page.
- Keyword analyzer page.
- Traffic leaderboard pages.
- Dashboard watchlist page.
- Pricing page.

### 8.3 UX States

Every data page must include:

- Loading skeleton.
- Empty state.
- Provider unavailable state.
- Quota exceeded state.
- Upgrade prompt.
- Data-source disclaimer.
- Last updated timestamp.

## 9. Billing and Quotas

### 9.1 Plan Entitlements

Use existing subscription/payment system and add entitlement mapping:

```ts
type PlanEntitlements = {
  dailyLookups: number;
  monthlyLookups: number;
  bulkMaxTargets: number;
  monthlyKeywordReports: number;
  watchlistDomains: number;
  leaderboards: "teaser" | "full";
  exportCsv: boolean;
  alerts: boolean;
};
```

Suggested defaults:

Free:

- 5 daily lookups.
- 10 bulk max targets.
- 3 keyword reports/month.
- 5 watchlist domains.
- leaderboard teaser only.
- no export.

Pro:

- 200 monthly lookups.
- 100 bulk max targets.
- 50 keyword reports/month.
- 100 watchlist domains.
- full traffic leaderboards.
- basic export, if allowed.

Growth:

- 1,000 monthly lookups.
- 200 bulk max targets.
- 300 keyword reports/month.
- 500 watchlist domains.
- vertical leaderboards.
- alerts.
- advanced export, if allowed.

### 9.2 Usage Counting

Count user actions and provider calls separately:

User usage:

- lookup count.
- bulk target count.
- keyword report count.
- export count.

Provider usage:

- Semrush request count.
- Semrush target count.
- estimated units.
- SERP request count.

This is required to manage margin.

## 10. Background Jobs

The project does not appear to include a dedicated queue yet. Options:

1. MVP: Vercel/Cloudflare cron + database job table.
2. Later: BullMQ + Redis, Inngest, Trigger.dev, or Cloudflare Queues.

### 10.1 Job Types

`refresh_watchlist_monthly`

- Runs after Semrush previous-month data is available.
- Refreshes active watchlist domains.
- Creates alert events.

`rebuild_leaderboards`

- Runs monthly or manually.
- Queries curated seed domains.
- Computes top/trending/new rankings.

`enrich_domain`

- Fetches RDAP/WHOIS.
- Fetches title/description/favicon.
- Detects monetization and tech signals.

`cleanup_provider_cache`

- Deletes or expires provider-derived cached data according to configured TTL.

## 11. Leaderboard Data Strategy

### 11.1 MVP Seed Sources

Use legally safe seed sources:

- User-submitted domains.
- Manual curated lists.
- Public domain lists such as Tranco, subject to their terms.
- Product directories where allowed.
- Internal saved watchlist domains, aggregated only if terms/privacy permit.

### 11.2 Ranking Formulas

Top:

```text
rank by current_visits desc
```

Trending:

```text
growth_abs = current_visits - previous_visits
growth_pct = growth_abs / previous_visits
score = log(current_visits) * 0.4 + normalized(growth_abs) * 0.35 + normalized(growth_pct) * 0.25
```

New:

```text
first_seen_at within recent window
rank by current_visits desc and growth score
```

Noise filters:

- exclude domains below minimum traffic threshold.
- exclude parked domains.
- exclude adult/spam/malware domains.
- exclude domains with very low data accuracy if Semrush returns accuracy.

## 12. Testing Strategy

### 12.1 Unit Tests

Test:

- domain normalization.
- CSV parsing.
- Semrush response mapping.
- quota checks.
- entitlement checks.
- cache key generation.
- leaderboard scoring.

### 12.2 Integration Tests

Test:

- lookup API with mocked Semrush response.
- bulk API with partial cache hit.
- keyword analyzer with mocked SERP + Semrush.
- watchlist add/remove limits.

### 12.3 Manual QA

Pages:

- Home domain search.
- Domain result.
- Bulk checker.
- Keyword analyzer.
- Leaderboard.
- Watchlist.
- Pricing/checkout.

Scenarios:

- anonymous quota.
- free quota.
- paid quota.
- invalid domain.
- no Semrush data.
- provider rate limit.
- provider quota exhausted.
- slow provider response.

## 13. Observability

Admin dashboard should show:

- Semrush requests today/month.
- Estimated units used.
- Provider error rate.
- Slowest endpoints.
- Cache hit rate.
- Top users by provider cost.
- Failed watchlist refresh jobs.

Logs should include:

- request id.
- user id when available.
- provider.
- endpoint.
- target count.
- response status.
- latency.
- error code.

Do not log API keys or full provider credentials.

## 14. Milestones

### Milestone 0: Product and Compliance Setup, 2-3 days

Tasks:

- Confirm Semrush plan and available columns.
- Confirm cache/redistribution/export permissions.
- Choose SERP provider.
- Finalize product name and routes.
- Add environment variables.

Acceptance:

- External dependency decisions documented.
- Feature flags configured.
- Launch constraints understood.

### Milestone 1: Data Foundation, 1 week

Tasks:

- Add database tables.
- Implement domain normalization.
- Implement Semrush provider wrapper.
- Implement CSV parser.
- Implement provider usage logging.
- Implement cache TTL logic.
- Add mocked provider tests.

Acceptance:

- `semrushTrafficSummary()` returns typed rows from mocked CSV.
- Provider calls are logged.
- Cache TTL does not exceed configured limit.
- Invalid domains are rejected.

### Milestone 2: Single Domain Lookup, 1 week

Tasks:

- Build `POST /api/traffic/lookup`.
- Build domain result page.
- Add metric cards and disclaimer.
- Add quota enforcement for anonymous/free users.
- Add error states.

Acceptance:

- User can search a domain and see metrics.
- Cached results are returned without provider call.
- Quota exceeded state is shown.
- Provider error state is handled.

### Milestone 3: Bulk Lookup, 1 week

Tasks:

- Build `POST /api/traffic/bulk`.
- Implement target chunking.
- Build bulk checker UI.
- Add plan-based bulk limits.
- Add partial failure reporting.

Acceptance:

- User can submit a list of domains.
- App returns sortable comparison table.
- Plan limits are enforced.
- Provider cost logs reflect target count.

### Milestone 4: Keyword Analyzer, 1 week

Tasks:

- Integrate SERP provider.
- Build `POST /api/keyword/analyze`.
- Build keyword analyzer page.
- Save keyword reports.
- Join SERP positions with traffic rows.

Acceptance:

- User enters keyword and gets Top 10 domains with traffic.
- Duplicate domains are deduped.
- Keyword quota is enforced.
- Report can be revisited within allowed cache window.

### Milestone 5: Watchlist, 1 week

Tasks:

- Build watchlist tables and APIs.
- Build dashboard watchlist page.
- Add add/remove from domain page.
- Enforce watchlist limits.
- Add manual refresh action.

Acceptance:

- User can add/remove domains.
- User sees watchlist table.
- Free/paid limits work.
- Manual refresh respects quota and cache.

### Milestone 6: Leaderboard MVP, 1-2 weeks

Tasks:

- Create seed domain list.
- Implement leaderboard rebuild job or script.
- Build Top, Trending, New leaderboard pages.
- Add filters.
- Add teaser vs full access.

Acceptance:

- Leaderboards render from stored entries.
- Public users see teaser view.
- Paid users see full view.
- Admin can rebuild leaderboard manually.

### Milestone 7: Billing, Pricing, and Launch Polish, 1 week

Tasks:

- Update pricing page copy.
- Map products to entitlements.
- Add upgrade prompts.
- Add usage page.
- Add landing page copy.
- Add SEO metadata.
- Add docs/disclaimers.

Acceptance:

- Free-to-paid flow works.
- Paid entitlements unlock features.
- Usage limits are visible.
- Pages have production-ready metadata.

## 15. Suggested Sprint Breakdown

Sprint 1:

- Data model.
- Semrush provider.
- Single domain lookup API.
- Domain result UI.

Sprint 2:

- Bulk checker.
- Quotas.
- Provider logs/admin visibility.
- Cache cleanup.

Sprint 3:

- SERP provider.
- Keyword analyzer.
- Watchlist APIs.
- Watchlist UI.

Sprint 4:

- Leaderboards.
- Pricing/entitlements.
- Landing page.
- QA and launch.

## 16. Risk Register

1. Semrush data redistribution risk
   - Impact: high.
   - Mitigation: get written approval before paid leaderboards, exports, or long historical storage.

2. Provider cost overrun
   - Impact: high.
   - Mitigation: quotas, cache, rate limits, admin usage dashboard.

3. Low data coverage for small sites
   - Impact: medium.
   - Mitigation: show no-data states, use enrichment, focus on domains with measurable traffic.

4. Noisy trending rankings
   - Impact: medium.
   - Mitigation: minimum traffic thresholds, accuracy filters, combined growth score.

5. SEO acquisition takes time
   - Impact: medium.
   - Mitigation: build keyword pages, publish niche reports, use communities and outbound.

6. User confusion around estimated data
   - Impact: medium.
   - Mitigation: clear disclaimers and confidence labels.

## 17. Launch Checklist

Product:

- Landing page live.
- Pricing page live.
- Domain lookup live.
- Bulk lookup live.
- Keyword analyzer live.
- Watchlist live.
- Leaderboard teaser live.

Engineering:

- Provider API key configured.
- Cache TTL configured.
- Rate limiting configured.
- Quotas configured.
- Provider logs visible.
- Error monitoring enabled.
- Database migrations applied.

Compliance:

- Semrush cache limits respected.
- Data-source disclaimer visible.
- Export feature disabled unless approved.
- Public leaderboard strategy reviewed.

Analytics:

- Lookup events tracked.
- Signup events tracked.
- Add-to-watchlist events tracked.
- Upgrade click events tracked.
- Checkout events tracked.

## 18. First Implementation Tasks

1. Add `SEMRUSH_API_KEY` and provider config to env handling.
2. Add domain normalization utility.
3. Add Semrush CSV parser.
4. Add provider usage log table.
5. Add `traffic_monthly` and `domains` tables.
6. Build `POST /api/traffic/lookup`.
7. Build domain result page.
8. Add free quota check.
9. Add provider cache lookup.
10. Add admin usage table.
