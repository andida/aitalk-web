'use client';

import { useState } from 'react';
import { normalizeDomain } from '@/features/traffic/domain';
import { ArrowRight, ChevronDown, Clock3, Search } from 'lucide-react';

import type { SiteRiseLandingCopy } from './site-rise-landing';

type LookupResult = {
  rootDomain: string;
  country: string;
  month: string | null;
  source: string;
  cached: boolean;
  cachedUntil: string;
  raw?: Record<string, unknown>;
  metrics: {
    visits: number | null;
    users: number | null;
    desktopVisits: number | null;
    mobileVisits: number | null;
    bounceRate: number | null;
    pagesPerVisit: number | null;
    timeOnSite: number | null;
    accuracy: string | null;
  };
};

type TrafficSourcePreview = {
  label: string;
  value: string;
  width: string;
};

function formatMetric(value: number | null, fallback = 'N/A') {
  if (value === null || Number.isNaN(value)) return fallback;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatDecimal(value: number | null, fallback = 'N/A') {
  if (value === null || Number.isNaN(value)) return fallback;
  return value.toFixed(value >= 10 ? 1 : 2);
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return 'N/A';
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

function formatDuration(value: number | null) {
  if (value === null || Number.isNaN(value)) return 'N/A';
  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
  });
}

function formatSource(value: string) {
  if (value === 'similarweb_public') return 'Public estimate';
  if (value === 'query_domains') return 'Domain dataset';
  if (value === 'similarweb_manual') return 'Imported dataset';
  return value;
}

function parseTrafficSourceValue(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.replace('%', '').trim());
  if (!Number.isFinite(parsed)) return null;
  return parsed > 1 ? parsed / 100 : parsed;
}

function getTrafficSourceMap(raw: LookupResult['raw']) {
  if (!raw || typeof raw !== 'object') return null;

  const payload = raw as {
    TrafficSources?: Record<string, unknown>;
    fullResponse?: {
      TrafficSources?: Record<string, unknown>;
    };
  };

  return payload.fullResponse?.TrafficSources || payload.TrafficSources || null;
}

function getSourceLabel(
  source: string,
  fallbackSources: { label: string; value: string }[]
) {
  const isChinese = fallbackSources.some((item) =>
    /[\u4e00-\u9fff]/.test(item.label)
  );
  const labels: Record<string, string | undefined> = {
    Search: fallbackSources[0]?.label,
    Direct: fallbackSources[1]?.label,
    Social: fallbackSources[2]?.label,
    Referrals: fallbackSources[3]?.label,
    'Paid Referrals': isChinese ? '付费推荐' : 'Paid referrals',
    Mail: isChinese ? '邮件' : 'Mail',
    Display: isChinese ? '展示广告' : 'Display',
  };

  return labels[source] || source;
}

function getTrafficSourcePreview(
  result: LookupResult | null,
  fallbackSources: { label: string; value: string }[]
): TrafficSourcePreview[] {
  const trafficSources = result ? getTrafficSourceMap(result.raw) : null;

  if (!trafficSources) {
    return fallbackSources.map((source) => ({
      ...source,
      width: source.value,
    }));
  }

  const sources = Object.entries(trafficSources)
    .map(([label, rawValue]) => {
      const value = parseTrafficSourceValue(rawValue);
      if (value === null) return null;
      const percent = Math.max(0, Math.min(100, value * 100));

      return {
        label: getSourceLabel(label, fallbackSources),
        value: `${Math.round(percent)}%`,
        width: `${Math.max(percent, 3)}%`,
      };
    })
    .filter((source): source is TrafficSourcePreview => Boolean(source))
    .sort((a, b) => Number.parseFloat(b.width) - Number.parseFloat(a.width))
    .slice(0, 4);

  return sources.length
    ? sources
    : fallbackSources.map((source) => ({
        ...source,
        width: source.value,
      }));
}

function PreviewMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border-r border-zinc-200 px-4 py-4 last:border-r-0">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold text-zinc-950">
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-500">{detail}</div>
    </div>
  );
}

function Pill({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm shadow-zinc-900/5 ${className}`}
    >
      {children}
    </span>
  );
}

export function TrafficLookupDemo({
  copy,
}: {
  copy: SiteRiseLandingCopy['hero'];
}) {
  const [target, setTarget] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      const normalizedTarget = normalizeDomain(target).rootDomain;
      setTarget(normalizedTarget);
      setIsLoading(true);

      const response = await fetch('/api/traffic/lookup', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          target: normalizedTarget,
          country: 'global',
        }),
      });
      const payload = await response.json();

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || copy.errorFallback);
      }

      setResult(payload.data);
    } catch (lookupError) {
      setResult(null);
      setError(
        lookupError instanceof Error ? lookupError.message : copy.errorFallback
      );
    } finally {
      setIsLoading(false);
    }
  }

  const preview = result
    ? {
        domain: result.rootDomain,
        meta: `${result.country} / ${formatDate(result.month)} / ${formatSource(
          result.source
        )}${result.cached ? ` / ${copy.cachedLabel}` : ''}`,
        growth: result.metrics.accuracy || copy.preview.growth,
        metrics: [
          {
            label: copy.preview.metrics[0]?.label || 'Visits',
            value: formatMetric(result.metrics.visits),
            detail: copy.preview.metrics[0]?.detail || '',
          },
          {
            label: copy.preview.metrics[1]?.label || 'Bounce',
            value: formatPercent(result.metrics.bounceRate),
            detail: copy.preview.metrics[1]?.detail || '',
          },
          {
            label: copy.preview.metrics[2]?.label || 'Pages / visit',
            value: formatDecimal(result.metrics.pagesPerVisit),
            detail: copy.preview.metrics[2]?.detail || '',
          },
          {
            label: copy.preview.metrics[3]?.label || 'Time on site',
            value: formatDuration(result.metrics.timeOnSite),
            detail: copy.preview.metrics[3]?.detail || '',
          },
        ],
        sourceRows: getTrafficSourcePreview(result, copy.preview.sources),
        updated: `${copy.preview.updated} / ${copy.cacheUntilLabel} ${formatDate(
          result.cachedUntil
        )}`,
      }
    : {
        domain: copy.preview.domain,
        meta: copy.preview.meta,
        growth: copy.preview.growth,
        metrics: copy.preview.metrics,
        sourceRows: getTrafficSourcePreview(null, copy.preview.sources),
        updated: copy.preview.updated,
      };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-zinc-200 bg-white/95 p-2 shadow-2xl shadow-zinc-900/12 backdrop-blur"
      >
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <label className="flex h-14 items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-3 focus-within:ring-emerald-500/10">
            <Search className="size-5 text-zinc-400" />
            <input
              aria-label={copy.inputLabel}
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
              placeholder={copy.inputPlaceholder}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="flex h-14 items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            {copy.country}
            <ChevronDown className="size-4 text-zinc-400" />
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-md bg-zinc-950 px-6 text-sm font-semibold text-white shadow-lg shadow-zinc-950/20 transition hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? copy.loading : copy.cta}
            <ArrowRight className="size-4" />
          </button>
        </div>
        {error && <div className="px-2 pt-3 text-sm text-red-600">{error}</div>}
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {copy.pills.map((pill) => (
          <Pill key={pill}>{pill}</Pill>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/10">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-zinc-950">
              {preview.domain}
            </div>
            <div className="text-xs text-zinc-500">{preview.meta}</div>
          </div>
          <Pill className="border-emerald-200 bg-emerald-50 font-mono text-emerald-800">
            {preview.growth}
          </Pill>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4">
          {preview.metrics.map((metric) => (
            <PreviewMetric
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
            />
          ))}
        </div>

        <div className="border-t border-zinc-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-zinc-950">
                {copy.preview.sourceTitle}
              </div>
              <div className="text-xs text-zinc-500">
                {copy.preview.sourceSubtitle}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Clock3 className="size-4" />
              {preview.updated}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {preview.sourceRows.map((source) => (
              <div
                key={source.label}
                className="rounded-md border border-zinc-200 bg-[#fbfcfa] p-3"
              >
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-600">
                  <span className="font-medium">{source.label}</span>
                  <span className="font-mono text-zinc-950">
                    {source.value}
                  </span>
                </div>
                <div
                  className="mt-3 h-1 rounded-sm bg-emerald-500"
                  style={{ width: source.width }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
