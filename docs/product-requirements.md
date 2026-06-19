# Website Opportunity Intelligence PRD

Last updated: 2026-06-10

## 1. Product Summary

Build a website opportunity intelligence product powered by Semrush Trends API. The product helps users discover, compare, and monitor websites by traffic growth, channel mix, keyword opportunities, and monetization signals.

The product should not position itself as another generic traffic checker. The core paid value is an opportunity discovery workflow:

- Discover fast-growing websites before competitors.
- Find new sites in a niche that are gaining traction.
- Compare competitors by traffic, source mix, and device split.
- Monitor selected domains and get change alerts.
- Evaluate whether a website or niche is worth copying, acquiring, partnering with, or competing against.

Working positioning:

> Discover fast-growing websites, SEO opportunities, and competitor movement before everyone else.

## 2. Context and Market Reference

Traffic.cv uses a free website traffic checker as the acquisition hook and sells access to leaderboard intelligence. Its paid page focuses on:

- Traffic leaderboards: New, Trending, Top websites.
- Revenue leaderboards: New, Trending, Top websites.
- Watchlist limits.
- Free tools such as single-domain checker, TLD checker, bulk checker, and keyword traffic analyzer.

This product should borrow the useful product pattern but improve differentiation through:

- Vertical/niche leaderboards instead of generic global lists only.
- Semrush-backed traffic data with visible confidence/accuracy.
- Clear opportunity scoring rather than raw traffic tables only.
- Watchlist monitoring and alerts as recurring-use product hooks.
- Monetization and technology signals as proprietary enrichment.

## 3. Target Users

### 3.1 Primary Users

1. Indie hackers and micro-SaaS builders
   - Need to find product ideas, validate demand, and monitor competitors.
   - Care about rising sites, monetization signals, and low-competition niches.

2. SEO operators and content site builders
   - Need keyword SERP research and competitor traffic comparison.
   - Care about organic traffic growth, top SERP domains, and repeatable content opportunities.

3. Growth marketers and founders
   - Need competitor monitoring and market trend awareness.
   - Care about traffic source shifts, country/device split, and monthly changes.

4. Agencies and consultants
   - Need client-ready exports and competitor reports.
   - Care about batch workflows, CSV exports, and saved reports.

### 3.2 Secondary Users

1. Investors and acquirers
   - Need to screen websites and niches.

2. Newsletter/curation operators
   - Need a stream of interesting fast-growing websites.

3. Domain investors
   - Need TLD and domain-extension insights.

## 4. Jobs To Be Done

1. When I am looking for new product ideas, I want to see websites that recently grew fast, so I can identify emerging demand.

2. When I am evaluating a niche, I want to see the top and fastest-growing competitors, so I can decide whether the niche is worth entering.

3. When I am doing SEO research, I want to enter a keyword and see the traffic profile of the top-ranking websites, so I can judge competition and upside.

4. When I am monitoring competitors, I want monthly changes and alerts, so I can react to market movement.

5. When I am prospecting, I want to export qualified websites, so I can build outreach, partnership, or acquisition lists.

## 5. Product Principles

1. Opportunity-first, not metric-first
   - The UI should answer "what should I pay attention to?" before showing every metric.

2. Explainability
   - Every score, estimate, and signal must show its inputs and confidence.

3. Data-source transparency
   - Traffic data should be marked as estimated third-party data, sourced from Semrush where applicable.

4. Compliance-aware
   - Respect Semrush API usage, caching, and redistribution limitations.

5. Focused MVP
   - Start with Semrush traffic summary, watchlist, and a small set of curated vertical leaderboards.

## 6. Scope

### 6.1 MVP Scope

MVP features:

- Single-domain traffic checker.
- Bulk domain traffic checker.
- Keyword SERP Top 10 traffic analyzer.
- Domain profile page.
- Three traffic leaderboards:
  - Top Websites by Traffic.
  - Trending Websites.
  - Newly Discovered Websites.
- Watchlist with monthly change tracking.
- Free and paid plan enforcement.
- Basic admin tools for usage and API cost visibility.

MVP data sources:

- Semrush Trends API for traffic metrics.
- SERP provider for keyword Top 10 results. Options: DataForSEO or SerpApi.
- RDAP/WHOIS for domain age and registration metadata.
- Lightweight page fetch for title, description, favicon, and canonical domain.

### 6.2 Post-MVP Scope

Post-MVP features:

- Vertical leaderboards:
  - AI tools.
  - SaaS.
  - Shopify stores.
  - Content sites.
  - Developer tools.
  - Chrome extensions.
  - Newsletters.
- Monetization signals:
  - Stripe.
  - Paddle.
  - Lemon Squeezy.
  - Shopify.
  - WooCommerce.
  - Google Ads.
  - Affiliate links.
  - Paid plan pages.
- Opportunity Score.
- Revenue estimate ranges.
- CSV export.
- Alerts via email.
- Saved reports.
- Team seats.
- Public API, only after data licensing is confirmed.

### 6.3 Explicit Non-Goals For MVP

- Do not build a full Similarweb replacement.
- Do not sell raw Semrush data as an API.
- Do not cache Semrush data beyond permitted terms without written consent.
- Do not claim estimated revenue is actual revenue.
- Do not scrape Traffic.cv or other competitors for data.

## 7. External Data and Compliance

### 7.1 Semrush Dependency

Primary traffic data source: Semrush Trends API.

Official docs:

- Semrush Trends API overview: https://developer.semrush.com/api/trends/overview/
- Trends API reference: https://developer.semrush.com/api/trends/api-reference/
- API usage restrictions: https://developer.semrush.com/api/introduction/api-usage-restrictions/

Key implementation assumptions:

- Traffic Summary endpoint: `GET https://api.semrush.com/analytics/ta/api/v3/summary`.
- Response format is CSV.
- `display_date` uses `YYYY-MM-01`; if omitted, previous month is returned.
- `country` uses ISO 3166-1 alpha-2 country codes; if omitted, global data is returned.
- `export_columns` controls returned columns.
- Semrush documentation indicates Trends API rate limit of up to 10 requests per second per account.
- Semrush documentation indicates API data cannot be cached for more than one month without express written consent.

### 7.2 Compliance Rules

MVP should implement the following safeguards:

1. Raw Semrush response cache TTL: 30 days or less.
2. Display a data-source disclaimer on traffic pages and reports.
3. Store API request metadata for cost and audit:
   - endpoint
   - target count
   - requested date
   - requested country
   - response status
   - units estimate
4. Do not expose a public API that returns Semrush-derived data until redistribution rights are reviewed.
5. Do not offer long-term historical Semrush-derived charts unless Semrush grants explicit permission.
6. Keep non-Semrush metadata separately:
   - domain profile
   - tags
   - user notes
   - manually curated categories
   - RDAP-derived fields

### 7.3 Open Legal Questions

These must be answered before public launch of paid leaderboards:

- Can Semrush-derived traffic data be shown in public SEO pages?
- Can Semrush-derived data be included in paid leaderboards?
- Can Semrush-derived data be exported as CSV by customers?
- Can derived metrics such as growth rate and opportunity score be retained beyond one month?
- Can monthly watchlist history be stored indefinitely if it is derived from Semrush data?

Until confirmed, product should use a conservative design:

- User-triggered query results cached for no more than 30 days.
- Public pages show limited teaser data.
- Paid historical views are marked as conditional on licensing approval.

## 8. Core Product Modules

### 8.1 Single Domain Traffic Checker

Route:

- `/traffic/[domain]` or `/[domain]` depending on final SEO routing.

Input:

- Domain or URL.
- Optional country.
- Optional month.

Output:

- Estimated monthly visits.
- Unique visitors.
- Desktop visits.
- Mobile visits.
- Bounce rate.
- Pages per visit.
- Time on site.
- Traffic channel breakdown if available in the subscribed Semrush plan.
- Accuracy/confidence if returned by Semrush.
- Domain registration age.
- Website title, description, favicon.
- Recent month-over-month change if compliant and available.

Primary CTA:

- Add to watchlist.
- Compare competitors.
- View related opportunities.

Empty/error states:

- No data available.
- Domain invalid.
- Semrush rate limit.
- Semrush quota exhausted.
- Data temporarily unavailable.

### 8.2 Bulk Domain Traffic Checker

Route:

- `/bulk`

Input:

- Textarea with domains, one per line.
- Max domains by plan:
  - Anonymous: 3.
  - Free logged-in: 10.
  - Pro: 100.
  - Growth: 200.

Output:

- Table sorted by visits by default.
- Columns:
  - domain
  - visits
  - users
  - desktop/mobile split
  - bounce rate
  - pages per visit
  - change if available
  - country
  - accuracy
- Actions:
  - add selected to watchlist
  - compare selected
  - export CSV for eligible plans

### 8.3 Keyword Traffic Analyzer

Route:

- `/keyword`

Input:

- Keyword.
- Country.
- Search engine locale.

Workflow:

1. Fetch SERP Top 10 organic results from selected SERP provider.
2. Normalize URLs to root domains.
3. Deduplicate domains.
4. Query Semrush Traffic Summary for each root domain.
5. Show ranking position plus traffic profile.

Output:

- Top 10 SERP result domains.
- Organic ranking URL/title.
- Domain estimated visits.
- Traffic source mix if available.
- Pages per visit, bounce rate, time on site.
- Opportunity notes:
  - high traffic but weak brand
  - low traffic SERP
  - niche dominated by forums
  - niche dominated by tools/products

Paid upgrade hooks:

- Export SERP competitors.
- Save keyword report.
- Track keyword monthly.
- Show historical movement.

### 8.4 TLD and Multi-TLD Checker

Route:

- `/tld`

Input:

- Base name, e.g. `example`.
- TLD list, e.g. `.com`, `.io`, `.ai`, `.co`.

Output:

- Traffic comparison by TLD.
- Domain availability can be deferred.
- Registration date.
- Opportunity note:
  - `.ai` variant growing faster than `.com`
  - non-`.com` has meaningful traction

MVP priority: lower than single-domain, bulk, keyword, and watchlist.

### 8.5 Traffic Leaderboards

Routes:

- `/leaderboard/traffic/top`
- `/leaderboard/traffic/trending`
- `/leaderboard/traffic/new`
- `/leaderboard/[category]/traffic/top`
- `/leaderboard/[category]/traffic/trending`

Top Websites:

- Sort by current monthly visits.
- Filter by category, country, traffic range, domain age.

Trending Websites:

- Sort by absolute visit growth and growth percentage.
- Use a minimum traffic threshold to avoid noisy tiny domains.

Newly Discovered Websites:

- Sort by first-seen date and current visits.
- Requires domain discovery pipeline.

Data restrictions:

- Public leaderboard should use teaser data until Semrush redistribution is approved.
- Paid leaderboard should still be reviewed for licensing before launch.

### 8.6 Watchlist

Routes:

- `/dashboard/watchlists`
- `/dashboard/watchlists/[id]`

User actions:

- Add domain.
- Remove domain.
- Group domains into folders.
- Set country and device preference.
- Add notes/tags.

Tracking:

- Run monthly refresh after Semrush previous-month data is available.
- Store snapshots according to licensing constraints.
- Show changes:
  - visits
  - users
  - mobile/desktop split
  - bounce rate
  - pages per visit
  - traffic channel if available

Alerts:

- Email when visits change by more than threshold.
- Email when a watched competitor enters a leaderboard.
- Email when source mix changes meaningfully.

Plan limits:

- Free: 5 domains.
- Pro: 100 domains.
- Growth: 500 domains.
- Agency: custom.

### 8.7 Opportunity Score

MVP score can be simple and explainable:

```
Opportunity Score =
  traffic_growth_score * 0.35 +
  search_dependency_score * 0.20 +
  monetization_signal_score * 0.20 +
  domain_age_score * 0.10 +
  competition_gap_score * 0.15
```

Inputs:

- Month-over-month growth.
- Absolute visits.
- Channel mix.
- Domain age.
- Tech/monetization signals.
- Category saturation.

Output:

- Score from 0 to 100.
- Explainable breakdown.
- Confidence badge:
  - High: Semrush data present, category known, monetization signals found.
  - Medium: Semrush data present, limited enrichment.
  - Low: sparse or noisy data.

MVP can launch with score hidden behind feature flag.

### 8.8 Revenue Estimate

Revenue Estimate should be post-MVP.

Principle:

- Always label as an estimate range.
- Never imply actual revenue unless self-reported or verified.

Models:

1. Content site
   - `visits * pageviews_per_visit * RPM / 1000`

2. SaaS/tool site
   - `visits * visitor_to_trial_rate * trial_to_paid_rate * ARPU`

3. Ecommerce
   - `visits * conversion_rate * AOV`

4. Affiliate site
   - `visits * clickout_rate * conversion_rate * commission`

Output:

- Low/medium/high estimate.
- Model assumptions shown.
- Confidence shown.

## 9. Plans and Pricing

### 9.1 Recommended Launch Plans

Free:

- 5 single-domain lookups/day.
- 1 bulk lookup/day, max 10 domains.
- 3 keyword reports/month.
- 5 watchlist domains.
- Teaser leaderboard access.

Pro: suggested `$29-$49/month`

- 200 lookups/month.
- Bulk up to 100 domains.
- 50 keyword reports/month.
- 100 watchlist domains.
- Full traffic leaderboards.
- Basic export.

Growth: suggested `$99-$149/month`

- 1,000 lookups/month.
- Bulk up to 200 domains.
- 300 keyword reports/month.
- 500 watchlist domains.
- Vertical leaderboards.
- Alerts.
- Saved reports.
- Advanced export.

Agency: suggested `$299+/month`

- Team seats.
- Higher quota.
- Client reports.
- Custom categories.
- Priority support.

### 9.2 Packaging Principles

- Free tier should be useful enough for SEO acquisition.
- Pro should unlock repeat workflows.
- Growth should unlock operational monitoring and exports.
- Agency should monetize teams and high-volume usage.

## 10. User Experience Requirements

### 10.1 Landing Page

Primary above-the-fold experience:

- Search bar for domain or URL.
- Clear message: "Discover fast-growing websites and competitor traffic opportunities."
- No generic marketing-only hero.

Primary sections:

- Single-domain checker.
- Trending website leaderboard preview.
- Keyword opportunity workflow.
- Watchlist monitoring.
- Pricing CTA.

### 10.2 Domain Result Page

Layout:

- Header summary: domain, favicon, title, traffic, change, confidence.
- Metric cards: visits, users, bounce, pages/session, duration, mobile/desktop.
- Chart area: only if compliant historical data is available.
- Source breakdown: if available.
- Domain metadata.
- Competitor suggestions.
- CTA panel: add to watchlist / compare / unlock full data.

### 10.3 Leaderboard Page

Layout:

- Sticky filters.
- Table/list hybrid with dense scan-friendly design.
- Each row:
  - rank
  - favicon
  - domain
  - description
  - visits
  - growth
  - category
  - country
  - registration date
  - opportunity score
  - save action

Filters:

- category
- country
- traffic range
- growth range
- domain age
- monetization signal
- technology signal

### 10.4 Dashboard

Navigation:

- Watchlist.
- Reports.
- Exports.
- Usage.
- Billing.

Watchlist table:

- domain
- current visits
- last change
- alert status
- category
- tags

## 11. Data Model Concept

### 11.1 Core Entities

`domains`

- id
- hostname
- normalized_host
- root_domain
- tld
- title
- description
- favicon_url
- first_seen_at
- last_seen_at
- created_at
- updated_at

`domain_snapshots`

- id
- domain_id
- snapshot_source
- snapshot_date
- country
- device_type
- raw_provider
- raw_provider_ref
- data_expires_at
- created_at

`traffic_monthly`

- id
- domain_id
- month
- country
- device_type
- visits
- users
- desktop_visits
- mobile_visits
- bounce_rate
- pages_per_visit
- time_on_site
- direct_visits
- organic_search_visits
- paid_search_visits
- referral_visits
- organic_social_visits
- paid_social_visits
- display_ads_visits
- email_visits
- accuracy
- provider
- provider_cached_until
- created_at

`leaderboard_entries`

- id
- leaderboard_type
- category
- country
- month
- domain_id
- rank
- current_visits
- previous_visits
- growth_abs
- growth_pct
- opportunity_score
- is_teaser_visible
- created_at

`watchlists`

- id
- user_id
- name
- created_at
- updated_at

`watchlist_items`

- id
- watchlist_id
- domain_id
- country
- tags
- notes
- alert_threshold_pct
- created_at
- updated_at

`api_usage_logs`

- id
- user_id
- provider
- endpoint
- target_count
- request_hash
- status
- units_estimated
- latency_ms
- error_code
- created_at

`keyword_reports`

- id
- user_id
- keyword
- country
- provider
- report_status
- created_at
- expires_at

`keyword_report_results`

- id
- keyword_report_id
- position
- url
- root_domain
- domain_id
- title
- snippet
- visits
- created_at

`domain_enrichment`

- id
- domain_id
- rdap_created_at
- rdap_expires_at
- nameservers
- technologies
- monetization_signals
- social_links
- pricing_page_url
- created_at
- updated_at

## 12. API Contract Concept

Public app APIs:

- `POST /api/traffic/lookup`
- `POST /api/traffic/bulk`
- `POST /api/keyword/analyze`
- `GET /api/domains/:domain`
- `GET /api/leaderboards`
- `POST /api/watchlists`
- `POST /api/watchlists/:id/items`
- `DELETE /api/watchlists/:id/items/:itemId`

Internal provider APIs:

- `semrushTrafficSummary(targets, options)`
- `fetchSerpTopResults(keyword, options)`
- `fetchDomainMetadata(domain)`
- `enrichDomain(domain)`

Example `POST /api/traffic/lookup` request:

```json
{
  "target": "example.com",
  "country": "US",
  "month": "2026-05-01"
}
```

Example response:

```json
{
  "domain": "example.com",
  "country": "US",
  "month": "2026-05-01",
  "source": "semrush",
  "cachedUntil": "2026-07-01T00:00:00.000Z",
  "metrics": {
    "visits": 1200000,
    "users": 830000,
    "desktopVisits": 420000,
    "mobileVisits": 780000,
    "bounceRate": 0.52,
    "pagesPerVisit": 2.4,
    "timeOnSite": 151,
    "accuracy": "medium"
  }
}
```

## 13. Quotas and Abuse Prevention

Anonymous:

- IP-based rate limit.
- Low daily lookup limit.
- No export.

Free logged-in:

- User-based quota.
- Watchlist limit.
- Basic history if compliant.

Paid:

- Monthly usage counters.
- Soft warning at 80% quota.
- Hard stop or upgrade prompt at 100%.

Provider protection:

- Request deduplication by `request_hash`.
- Cache before provider call.
- Queue bulk jobs.
- Enforce Semrush 10 RPS limit.
- Circuit breaker when provider errors spike.

## 14. Success Metrics

Acquisition:

- Organic clicks to free tools.
- Domain lookup conversion rate.
- Keyword report conversion rate.

Activation:

- First successful lookup.
- User adds first watchlist domain.
- User views first leaderboard.

Retention:

- Weekly active users.
- Monthly watchlist return rate.
- Alert email open rate.

Revenue:

- Free-to-paid conversion.
- MRR.
- ARPA.
- Churn.

Unit economics:

- Semrush cost per active user.
- Semrush cost per paid account.
- Gross margin after provider costs.

## 15. MVP Acceptance Criteria

The MVP is launchable when:

- A user can search a domain and receive normalized traffic metrics.
- A user can run a bulk domain query within plan limits.
- A user can enter a keyword and see Top 10 SERP domains with traffic metrics.
- A logged-in user can add and remove watchlist domains.
- The app logs provider API usage and estimated unit cost.
- Free and paid plan gates are enforced.
- Traffic data cache expires within the configured compliance window.
- Error states are clear and do not leak provider implementation details.
- Admin can see provider errors and usage.
- Product pages contain disclaimers that traffic data is estimated.

## 16. Open Decisions

- Product name and domain.
- Exact Semrush plan and available columns.
- SERP provider choice.
- Whether paid leaderboards are allowed under Semrush terms.
- Whether CSV export is allowed under Semrush terms.
- Whether historical snapshots may be retained beyond one month.
- Initial vertical categories.
- Pricing tier amounts.

