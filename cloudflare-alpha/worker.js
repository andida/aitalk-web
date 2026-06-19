const DEFAULT_BASE_URL = 'https://api.semrush.com/analytics/ta/api/v3';
const DEFAULT_CACHE_TTL_DAYS = 30;
const MAX_BULK_DOMAINS = 10;
const DEFAULT_COLUMNS = [
  'target',
  'display_date',
  'country',
  'visits',
  'users',
  'desktop_visits',
  'mobile_visits',
  'bounce_rate',
  'pages_per_visit',
  'time_on_site',
  'accuracy',
];

const trafficCache = new Map();
const rateLimitStore = new Map();
let semrushLastRequestAt = 0;

const SITE_RISE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="SiteRise">
  <defs>
    <linearGradient id="siterise-surface" x1="188" y1="116" x2="836" y2="908" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1b1f1b"/>
      <stop offset="1" stop-color="#0f1110"/>
    </linearGradient>
    <linearGradient id="siterise-accent" x1="236" y1="704" x2="814" y2="224" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0f7a4f"/>
      <stop offset="1" stop-color="#18c985"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="220" fill="url(#siterise-surface)"/>
  <path d="M254 314c0-37 30-67 67-67h382c37 0 67 30 67 67v396c0 37-30 67-67 67H321c-37 0-67-30-67-67V314Z" fill="#fbfcfa" opacity=".08"/>
  <rect x="258" y="596" width="116" height="210" rx="40" fill="#fbfcfa" opacity=".9"/>
  <rect x="454" y="500" width="116" height="306" rx="40" fill="#fbfcfa" opacity=".9"/>
  <rect x="650" y="360" width="116" height="446" rx="40" fill="#fbfcfa" opacity=".9"/>
  <path d="M248 650c86-86 173-57 257-145 64-67 94-118 151-151 48-28 88-55 150-115" fill="none" stroke="url(#siterise-accent)" stroke-width="82" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M706 238h101v101" fill="none" stroke="#18c985" stroke-width="82" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const copy = {
  en: {
    nav: {
      features: 'Features',
      leaderboards: 'Leaderboards',
      pricing: 'Pricing',
      language: '中文',
      languageUrl: '/zh',
    },
    hero: {
      eyebrow: 'Website opportunity intelligence',
      title: 'Find websites that are starting to rise.',
      description:
        'SiteRise turns traffic trends, growth signals, SERP results, and monetization clues into a focused opportunity workflow.',
      inputLabel: 'Search a domain',
      inputPlaceholder: 'Enter a domain, e.g. notion.so',
      country: 'Global',
      cta: 'Analyze',
      loading: 'Loading',
      errorFallback: 'Traffic lookup failed.',
      cachedLabel: 'updated',
      cacheUntilLabel: 'data through',
      pills: [
        'Traffic checker',
        'Trending leaderboards',
        'Keyword SERP analyzer',
      ],
      preview: {
        domain: 'promptkit.ai',
        meta: 'AI tools / United States / May 2026',
        growth: '+186% MoM',
        metrics: [
          ['Visits', '2.4M', '+1.5M this month'],
          ['Users', '1.8M', 'Medium accuracy'],
          ['Mobile', '64%', 'Device split'],
          ['Score', '92', 'Opportunity'],
        ],
        sourceTitle: 'Traffic sources',
        sourceSubtitle: 'See key acquisition channels and traffic mix',
        updated: 'Updated Jun 2026',
        sources: [
          ['Organic search', '49%'],
          ['Direct', '27%'],
          ['Social', '15%'],
          ['Referral', '9%'],
        ],
      },
    },
    stats: [
      ['4.8M', 'domains in seed pools'],
      ['30d', 'trend window'],
      ['10+', 'markets to compare'],
      ['5', 'core workflows'],
    ],
    tools: {
      countryLabel: 'Country',
      monthLabel: 'Month',
      monthPlaceholder: 'Latest available',
      countryOptions: [
        ['global', 'Global'],
        ['US', 'United States'],
        ['CN', 'China'],
        ['GB', 'United Kingdom'],
        ['IN', 'India'],
        ['JP', 'Japan'],
        ['DE', 'Germany'],
      ],
      bulkTitle: 'Compare domains',
      bulkDescription:
        'Paste up to 10 domains and compare them with the same market and month filters.',
      bulkLabel: 'Domains',
      bulkPlaceholder: 'notion.so\nlinear.app\nfigma.com',
      compareCta: 'Compare',
      bulkLoading: 'Comparing',
      bulkLimit: 'Up to 10 domains',
      bulkEmpty:
        'Run a comparison to see visits, users, accuracy, and trend status here.',
      resultDomain: 'Domain',
      resultVisits: 'Visits',
      resultUsers: 'Users',
      resultAccuracy: 'Accuracy',
      resultStatus: 'Status',
      watchTitle: 'Watchlist',
      watchDescription:
        'Save domains in this browser while accounts and alerts are still being built.',
      addWatch: 'Add current domain',
      watchEmpty: 'No saved domains yet.',
      remove: 'Remove',
      lookup: 'Analyze',
      saved: 'Saved',
      noResult: 'Analyze a domain first.',
      healthOk: 'Provider configured',
      healthMissing: 'Traffic data unavailable',
    },
    features: {
      eyebrow: 'Product System',
      title: 'A complete workflow for website opportunity discovery.',
      description:
        'Each module answers a different question: what is growing, why it matters, where the traffic comes from, and whether it is worth tracking.',
      cards: [
        [
          'Traffic Checker',
          'Validate any domain with estimated visits, users, device split, engagement, and accuracy.',
        ],
        [
          'Leaderboards',
          'Rank top, new, and trending websites by category, country, traffic range, and growth.',
        ],
        [
          'Keyword Analyzer',
          'Turn SERP Top 10 into a traffic table with competition notes and opportunity gaps.',
        ],
        [
          'Watchlist',
          'Monitor selected domains and get alerts when competitors rise, fall, or enter a leaderboard.',
        ],
      ],
    },
    leaderboard: {
      eyebrow: 'Discovery engine',
      title: 'Find fast-moving websites before they become obvious.',
      description:
        'Start with traffic lookup and preview leaderboards. Upgrade to unlock vertical leaderboards, saved filters, alerts, and exports.',
      columns: ['Rank', 'Domain', 'Visits', 'Growth', 'Signal', 'Score'],
      rows: [
        ['01', 'promptkit.ai', '2.4M', '+186%', 'AI workflow', '92'],
        ['02', 'briefy.ai', '840K', '+122%', 'Chrome extension', '87'],
        ['03', 'founderpal.ai', '410K', '+78%', 'Pricing page', '81'],
      ],
    },
    pricing: {
      eyebrow: 'Pricing',
      title: 'Package the product around repeated discovery.',
      description:
        'Free tools create acquisition. Paid tiers unlock leaderboards, watchlists, alerts, exports, and vertical intelligence.',
      monthSuffix: '/mo',
      recommended: 'Recommended',
      freeCta: 'Start free',
      paidCta: 'Unlock plan',
      plans: [
        [
          'Free',
          '$0',
          'For quick checks and early validation.',
          false,
          [
            '5 lookups per day',
            '10 bulk domains',
            '3 keyword reports',
            '5 watchlist domains',
          ],
        ],
        [
          'Pro',
          '$39',
          'For founders, SEO operators, and builders.',
          true,
          [
            '200 lookups per month',
            'Full traffic leaderboards',
            '100 watchlist domains',
            'CSV export',
          ],
        ],
        [
          'Growth',
          '$129',
          'For teams monitoring markets every month.',
          false,
          [
            '1,000 lookups per month',
            'Vertical leaderboards',
            'Alerts and saved reports',
            '500 watchlist domains',
          ],
        ],
      ],
    },
    compliance: {
      title: 'Find more website opportunities.',
      description: '',
      cta: 'Buy a plan',
    },
  },
  zh: {
    nav: {
      features: '功能',
      leaderboards: '榜单',
      pricing: '价格',
      language: 'English',
      languageUrl: '/en',
    },
    hero: {
      eyebrow: '网站机会发现引擎',
      title: '发现正在增长的网站。',
      description:
        'SiteRise 将流量趋势、增长信号、SERP 结果和变现线索组合成一套可执行的网站机会发现工作流。',
      inputLabel: '搜索域名',
      inputPlaceholder: '输入域名，例如 notion.so',
      country: '全球',
      cta: '开始分析',
      loading: '加载中',
      errorFallback: '流量查询失败。',
      cachedLabel: '已更新',
      cacheUntilLabel: '数据至',
      pills: ['流量查询', '增长榜单', '关键词 SERP 分析'],
      preview: {
        domain: 'promptkit.ai',
        meta: 'AI 工具 / 美国 / 2026 年 5 月',
        growth: '环比 +186%',
        metrics: [
          ['访问量', '2.4M', '本月新增 +1.5M'],
          ['用户数', '1.8M', '中等准确度'],
          ['移动端', '64%', '设备占比'],
          ['评分', '92', '机会分'],
        ],
        sourceTitle: '流量来源',
        sourceSubtitle: '查看主要获客渠道和流量结构',
        updated: '更新于 2026 年 6 月',
        sources: [
          ['自然搜索', '49%'],
          ['直接访问', '27%'],
          ['社交流量', '15%'],
          ['推荐流量', '9%'],
        ],
      },
    },
    stats: [
      ['4.8M', '候选域名池'],
      ['30天', '趋势观察周期'],
      ['10+', '可对比市场'],
      ['5', '核心工作流'],
    ],
    tools: {
      countryLabel: '国家',
      monthLabel: '月份',
      monthPlaceholder: '最新可用',
      countryOptions: [
        ['global', '全球'],
        ['US', '美国'],
        ['CN', '中国'],
        ['GB', '英国'],
        ['IN', '印度'],
        ['JP', '日本'],
        ['DE', '德国'],
      ],
      bulkTitle: '批量对比域名',
      bulkDescription: '一次粘贴最多 10 个域名，用同一国家和月份筛选条件进行对比。',
      bulkLabel: '域名列表',
      bulkPlaceholder: 'notion.so\nlinear.app\nfigma.com',
      compareCta: '开始对比',
      bulkLoading: '对比中',
      bulkLimit: '最多 10 个域名',
      bulkEmpty: '运行一次对比后，这里会展示访问量、用户数、准确度和趋势状态。',
      resultDomain: '域名',
      resultVisits: '访问量',
      resultUsers: '用户数',
      resultAccuracy: '准确度',
      resultStatus: '状态',
      watchTitle: '监控列表',
      watchDescription: '账号系统和提醒功能上线前，先在当前浏览器保存关注域名。',
      addWatch: '保存当前域名',
      watchEmpty: '还没有保存域名。',
      remove: '移除',
      lookup: '分析',
      saved: '已保存',
      noResult: '请先分析一个域名。',
      healthOk: '数据源已配置',
      healthMissing: '流量数据暂不可用',
    },
    features: {
      eyebrow: '产品系统',
      title: '一套完整的网站机会发现工作流。',
      description:
        '每个模块回答一个关键问题：什么在增长、为什么值得关注、流量来自哪里、是否值得持续跟踪。',
      cards: [
        [
          '流量查询',
          '输入任意域名，查看估算访问量、用户数、设备占比、互动指标和准确度。',
        ],
        [
          '网站榜单',
          '按分类、国家、流量区间和增长速度生成 Top、New、Trending 网站榜单。',
        ],
        [
          '关键词分析',
          '将 SERP Top 10 转化成流量表格，帮助判断竞争强度和内容机会。',
        ],
        [
          '竞品监控',
          '保存域名，当竞品上涨、下跌或进入榜单时触发提醒。',
        ],
      ],
    },
    leaderboard: {
      eyebrow: '发现引擎',
      title: '在趋势变明显前发现快速增长的网站。',
      description:
        '先用流量查询和榜单预览发现机会，升级后解锁垂直榜单、保存筛选、提醒和导出。',
      columns: ['排名', '域名', '访问量', '增长', '信号', '评分'],
      rows: [
        ['01', 'promptkit.ai', '2.4M', '+186%', 'AI 工作流', '92'],
        ['02', 'briefy.ai', '840K', '+122%', 'Chrome 插件', '87'],
        ['03', 'founderpal.ai', '410K', '+78%', '价格页', '81'],
      ],
    },
    pricing: {
      eyebrow: '价格',
      title: '围绕持续发现价值来设计套餐。',
      description:
        '免费工具负责获客，付费套餐解锁榜单、监控、提醒、导出和垂直行业情报。',
      monthSuffix: '/月',
      recommended: '推荐',
      freeCta: '免费开始',
      paidCta: '解锁套餐',
      plans: [
        [
          'Free',
          '$0',
          '适合快速查询和早期验证。',
          false,
          ['每天 5 次查询', '批量最多 10 个域名', '每月 3 个关键词报告', '5 个监控域名'],
        ],
        [
          'Pro',
          '$39',
          '适合创始人、SEO 运营和独立开发者。',
          true,
          ['每月 200 次查询', '完整流量榜单', '100 个监控域名', '支持 CSV 导出'],
        ],
        [
          'Growth',
          '$129',
          '适合需要持续监控市场的团队。',
          false,
          ['每月 1,000 次查询', '垂直行业榜单', '提醒和保存报告', '500 个监控域名'],
        ],
      ],
    },
    compliance: {
      title: '发现更多网站商机。',
      description: '',
      cta: '立即购买服务',
    },
  },
};

function html(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function normalizeLocale(pathname, acceptLanguage = '') {
  const first = pathname.split('/').filter(Boolean)[0];
  if (first === 'zh' || first === 'en') return first;
  return /\bzh\b|zh-|zh_/i.test(acceptLanguage) ? 'zh' : 'en';
}

function normalizePath(pathname) {
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

function pageHtml(locale, variant = 'home') {
  const t = copy[locale] || copy.en;
  const lang = locale === 'zh' ? 'zh-CN' : 'en';
  const title =
    variant === 'pricing'
      ? `${t.pricing.title} | SiteRise`
      : 'SiteRise | Website opportunity intelligence';
  const description = t.hero.description;
  const preview = t.hero.preview;
  const initialData = JSON.stringify({
    locale,
    errorFallback: t.hero.errorFallback,
    cachedLabel: t.hero.cachedLabel,
    cacheUntilLabel: t.hero.cacheUntilLabel,
    updated: preview.updated,
    metricLabels: preview.metrics.map((item) => item[0]),
    metricDetails: preview.metrics.map((item) => item[2]),
    tools: t.tools,
  }).replaceAll('<', '\\u003c');

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${html(title)}</title>
  <meta name="description" content="${html(description)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="alternate icon" href="/favicon.ico">
  <meta name="theme-color" content="#111113">
  <style>
    :root {
      color-scheme: light;
      --ink: #111113;
      --muted: #5f6568;
      --line: #dfe3e0;
      --paper: #fbfcfa;
      --panel: #ffffff;
      --soft: #f1f4f2;
      --green: #0f7a4f;
      --green-2: #11a36b;
      --amber: #b66a00;
      --blue: #1d5c96;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    a { color: inherit; text-decoration: none; }
    .wrap { width: min(1180px, calc(100vw - 32px)); margin: 0 auto; }
    .nav {
      position: sticky;
      top: 0;
      z-index: 20;
      border-bottom: 1px solid rgba(20, 25, 23, 0.08);
      background: rgba(251, 252, 250, 0.92);
      backdrop-filter: blur(16px);
    }
    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 68px;
      gap: 18px;
    }
    .brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; }
    .mark { display: inline-flex; width: 34px; height: 34px; flex: 0 0 auto; }
    .mark svg { display: block; width: 100%; height: 100%; }
    .nav-links { display: flex; align-items: center; gap: 18px; color: var(--muted); font-size: 14px; }
    .nav-links a:hover { color: var(--ink); }
    .hero {
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid var(--line);
      background:
        linear-gradient(to right, rgba(17,17,19,0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(17,17,19,0.05) 1px, transparent 1px),
        #fbfcfa;
      background-size: 42px 42px;
      padding: 86px 0 78px;
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 0.9fr 1.1fr;
      align-items: end;
      gap: 42px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 28px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fff;
      padding: 5px 11px;
      color: #3f4547;
      font-size: 12px;
      font-weight: 650;
      box-shadow: 0 8px 20px rgba(17, 17, 19, 0.04);
    }
    .dot { width: 8px; height: 8px; border-radius: 99px; background: var(--green-2); }
    h1 {
      margin: 26px 0 0;
      max-width: 760px;
      font-size: clamp(46px, 7vw, 82px);
      line-height: 1.02;
      letter-spacing: 0;
    }
    .lead {
      margin: 24px 0 0;
      max-width: 640px;
      color: var(--muted);
      font-size: 18px;
      line-height: 1.7;
    }
    .lookup {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--panel);
      box-shadow: 0 22px 70px rgba(17, 17, 19, 0.12);
    }
    .lookup-form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 150px 160px auto;
      gap: 8px;
      padding: 8px;
      border-bottom: 1px solid var(--line);
    }
    .field, .select, .month, .button {
      min-height: 54px;
      border-radius: 8px;
      font: inherit;
      letter-spacing: 0;
    }
    .field {
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid var(--line);
      background: var(--soft);
      padding: 0 14px;
    }
    .field input, .month {
      width: 100%;
      min-width: 0;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--ink);
      font-size: 16px;
    }
    .select, .month {
      border: 1px solid var(--line);
      background: #fff;
      padding: 0 14px;
      color: #3f4547;
      font-weight: 650;
    }
    .select { appearance: none; cursor: pointer; }
    .month { color-scheme: light; }
    .button {
      border: 1px solid #111113;
      background: #111113;
      color: #fff;
      padding: 0 20px;
      font-weight: 700;
      cursor: pointer;
    }
    .ghost-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: #303638;
      padding: 0 12px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .button:disabled { cursor: wait; opacity: 0.65; }
    .lookup-pills { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 16px 0; }
    .preview-head, .source-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 18px 20px;
    }
    .preview-head { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); margin-top: 16px; }
    .domain { font-weight: 750; }
    .meta, .small { color: var(--muted); font-size: 12px; margin-top: 4px; }
    .badge { border-color: #b9e5cf; background: #ecf9f2; color: #0a663f; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-bottom: 1px solid var(--line);
    }
    .metric { min-height: 108px; border-right: 1px solid var(--line); padding: 18px 20px; }
    .metric:last-child { border-right: 0; }
    .metric-label { color: var(--muted); font-size: 11px; font-weight: 750; text-transform: uppercase; }
    .metric-value { margin-top: 10px; font-size: 28px; font-weight: 760; }
    .metric-detail { margin-top: 5px; color: var(--muted); font-size: 12px; }
    .source { padding-bottom: 20px; }
    .bars { display: grid; gap: 12px; padding: 0 20px; }
    .bar-label { display: flex; justify-content: space-between; color: #4b5254; font-size: 12px; margin-bottom: 6px; }
    .bar { height: 8px; border-radius: 999px; background: #edf0ee; overflow: hidden; }
    .bar span { display: block; height: 100%; border-radius: inherit; background: var(--green-2); }
    .error { display: none; padding: 0 16px 12px; color: #b42318; font-size: 14px; }
    .tool-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 14px;
      padding: 0 16px 16px;
    }
    .tool-panel {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 16px;
    }
    .tool-panel h3 { margin: 0; font-size: 16px; }
    .tool-panel p { margin: 8px 0 0; color: var(--muted); font-size: 13px; line-height: 1.55; }
    .field-stack { display: grid; gap: 8px; margin-top: 14px; }
    .field-stack label { color: #394043; font-size: 12px; font-weight: 750; }
    textarea.bulk-input {
      width: 100%;
      min-height: 118px;
      resize: vertical;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--soft);
      color: var(--ink);
      padding: 12px;
      font: inherit;
      line-height: 1.45;
      outline: 0;
    }
    textarea.bulk-input:focus,
    .field input:focus,
    .select:focus,
    .month:focus {
      border-color: #91c9ad;
      box-shadow: 0 0 0 3px rgba(17, 163, 107, 0.15);
    }
    .tool-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
    }
    .hint { color: var(--muted); font-size: 12px; }
    .result-list, .watch-list { display: grid; gap: 8px; margin-top: 14px; }
    .empty-state {
      border: 1px dashed #cfd7d2;
      border-radius: 8px;
      padding: 14px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }
    .result-row, .watch-row {
      display: grid;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      background: #fbfcfa;
      font-size: 13px;
    }
    .result-row {
      grid-template-columns: minmax(120px, 1fr) repeat(3, minmax(78px, auto));
    }
    .watch-row { grid-template-columns: minmax(0, 1fr) auto auto; }
    .result-row strong, .watch-row strong { font-size: 14px; }
    .result-row span { color: var(--muted); }
    .row-error { color: #b42318; font-weight: 700; }
    .health-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 14px;
      color: var(--muted);
      font-size: 12px;
    }
    .health-status { font-weight: 800; color: var(--green); }
    .health-status.missing { color: #b42318; }
    .stats { border-bottom: 1px solid var(--line); background: #fff; padding: 30px 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
    .stat { border-left: 1px solid var(--line); padding-left: 18px; }
    .stat strong { display: block; font-size: 32px; }
    .stat span { display: block; margin-top: 4px; color: var(--muted); font-size: 14px; }
    section.block { padding: 86px 0; }
    .section-head { max-width: 760px; margin: 0 auto 42px; text-align: center; }
    .eyebrow { color: var(--green); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    h2 { margin: 12px 0 0; font-size: clamp(32px, 4vw, 52px); line-height: 1.08; letter-spacing: 0; }
    .section-head p, .split-copy p { color: var(--muted); line-height: 1.7; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .card, .plan, .table-shell {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 10px 30px rgba(17, 17, 19, 0.05);
    }
    .card { padding: 22px; min-height: 210px; }
    .icon {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: #ebf7f1;
      color: var(--green);
      font-weight: 800;
    }
    .card h3, .plan h3 { margin: 18px 0 0; font-size: 18px; }
    .card p, .plan p { color: var(--muted); line-height: 1.6; }
    .band { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: #fff; }
    .split { display: grid; grid-template-columns: 0.42fr 0.58fr; gap: 42px; align-items: start; }
    .table-shell { overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 15px 16px; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
    th { color: var(--muted); font-size: 11px; text-transform: uppercase; }
    tr:last-child td { border-bottom: 0; }
    .growth { color: var(--green); font-weight: 750; }
    .plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .plan { position: relative; padding: 24px; }
    .plan.featured { border-color: #111113; box-shadow: 0 18px 60px rgba(17, 17, 19, 0.14); }
    .price { margin-top: 18px; font-size: 44px; font-weight: 800; }
    .price span { color: var(--muted); font-size: 15px; font-weight: 600; }
    .features { display: grid; gap: 10px; margin: 22px 0; padding: 0; list-style: none; color: #363d40; }
    .features li { display: flex; gap: 9px; }
    .features li:before { content: "•"; color: var(--green); font-weight: 900; }
    .plan .button { display: inline-flex; align-items: center; justify-content: center; width: 100%; }
    .compliance {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 28px;
      border-top: 1px solid var(--line);
      padding: 38px 0 54px;
    }
    .compliance p { max-width: 700px; color: var(--muted); line-height: 1.7; }
    footer { border-top: 1px solid var(--line); padding: 26px 0; color: var(--muted); font-size: 13px; }
    @media (max-width: 920px) {
      .hero-grid, .split, .plans { grid-template-columns: 1fr; }
      .cards, .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .lookup-form { grid-template-columns: 1fr; }
      .tool-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .nav-links { gap: 10px; font-size: 13px; }
      .nav-links a:nth-child(1), .nav-links a:nth-child(2) { display: none; }
      .hero { padding: 58px 0 54px; }
      .metrics, .cards, .stats-grid { grid-template-columns: 1fr; }
      .metric { border-right: 0; border-bottom: 1px solid var(--line); }
      .metric:last-child { border-bottom: 0; }
      .tool-grid { padding: 0 10px 10px; }
      .tool-actions { align-items: stretch; flex-direction: column; }
      .tool-actions .button, .tool-actions .ghost-button { width: 100%; }
      .result-row { grid-template-columns: 1fr; }
      .watch-row { grid-template-columns: 1fr; }
      .compliance { align-items: flex-start; flex-direction: column; }
      table { min-width: 620px; }
      .table-shell { overflow-x: auto; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="wrap nav-inner">
      <a class="brand" href="/${locale}"><span class="mark" aria-hidden="true">${SITE_RISE_ICON_SVG}</span><span>SiteRise</span></a>
      <div class="nav-links">
        <a href="/${locale}#features">${html(t.nav.features)}</a>
        <a href="/${locale}#leaderboards">${html(t.nav.leaderboards)}</a>
        <a href="/${locale}/pricing">${html(t.nav.pricing)}</a>
        <a href="${html(t.nav.languageUrl)}">${html(t.nav.language)}</a>
      </div>
    </div>
  </nav>

  <main>
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <span class="pill"><span class="dot"></span>${html(t.hero.eyebrow)}</span>
          <h1>${html(t.hero.title)}</h1>
          <p class="lead">${html(t.hero.description)}</p>
        </div>
        <div class="lookup" id="lookup-card">
          <form class="lookup-form" id="lookup-form">
            <label class="field" aria-label="${html(t.hero.inputLabel)}">
              <span>⌕</span>
              <input id="domain-input" autocomplete="off" placeholder="${html(t.hero.inputPlaceholder)}">
            </label>
            <select class="select" id="country-select" aria-label="${html(t.tools.countryLabel)}">
              ${t.tools.countryOptions
                .map(([value, label]) => `<option value="${html(value)}">${html(label)}</option>`)
                .join('')}
            </select>
            <input class="month" id="month-input" type="month" aria-label="${html(t.tools.monthLabel)}" title="${html(t.tools.monthPlaceholder)}">
            <button class="button" id="submit-button" type="submit">${html(t.hero.cta)} →</button>
          </form>
          <div class="error" id="lookup-error"></div>
          <div class="lookup-pills">${t.hero.pills.map((item) => `<span class="pill">${html(item)}</span>`).join('')}</div>
          <div class="preview-head">
            <div>
              <div class="domain" id="preview-domain">${html(preview.domain)}</div>
              <div class="meta" id="preview-meta">${html(preview.meta)}</div>
            </div>
            <span class="pill badge" id="preview-growth">${html(preview.growth)}</span>
          </div>
          <div class="metrics" id="metrics">
            ${preview.metrics
              .map(
                ([label, value, detail]) => `<div class="metric">
                  <div class="metric-label">${html(label)}</div>
                  <div class="metric-value">${html(value)}</div>
                  <div class="metric-detail">${html(detail)}</div>
                </div>`
              )
              .join('')}
          </div>
          <div class="source">
            <div class="source-head">
              <div>
                <div class="domain">${html(preview.sourceTitle)}</div>
                <div class="small">${html(preview.sourceSubtitle)}</div>
              </div>
              <div class="small" id="preview-updated">${html(preview.updated)}</div>
            </div>
            <div class="bars">
              ${preview.sources
                .map(
                  ([label, value]) => `<div>
                    <div class="bar-label"><span>${html(label)}</span><span>${html(value)}</span></div>
                    <div class="bar"><span style="width:${html(value)}"></span></div>
                  </div>`
                )
                .join('')}
            </div>
          </div>
          <div class="tool-grid">
            <section class="tool-panel" aria-labelledby="bulk-title">
              <h3 id="bulk-title">${html(t.tools.bulkTitle)}</h3>
              <p>${html(t.tools.bulkDescription)}</p>
              <div class="field-stack">
                <label for="bulk-input">${html(t.tools.bulkLabel)}</label>
                <textarea class="bulk-input" id="bulk-input" spellcheck="false" placeholder="${html(t.tools.bulkPlaceholder)}"></textarea>
              </div>
              <div class="tool-actions">
                <span class="hint">${html(t.tools.bulkLimit)}</span>
                <button class="button" id="bulk-button" type="button">${html(t.tools.compareCta)} →</button>
              </div>
              <div class="error" id="bulk-error"></div>
              <div class="result-list" id="bulk-results">
                <div class="empty-state">${html(t.tools.bulkEmpty)}</div>
              </div>
            </section>
            <section class="tool-panel" aria-labelledby="watch-title">
              <h3 id="watch-title">${html(t.tools.watchTitle)}</h3>
              <p>${html(t.tools.watchDescription)}</p>
              <div class="tool-actions">
                <span class="hint" id="watch-count">0</span>
                <button class="ghost-button" id="watch-add" type="button">${html(t.tools.addWatch)}</button>
              </div>
              <div class="error" id="watch-error"></div>
              <div class="watch-list" id="watch-list">
                <div class="empty-state">${html(t.tools.watchEmpty)}</div>
              </div>
              <div class="health-line">
                <span>API</span>
                <span class="health-status" id="health-status">...</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>

    <section class="stats">
      <div class="wrap stats-grid">
        ${t.stats.map(([value, label]) => `<div class="stat"><strong>${html(value)}</strong><span>${html(label)}</span></div>`).join('')}
      </div>
    </section>

    <section class="block" id="features">
      <div class="wrap">
        <div class="section-head">
          <div class="eyebrow">${html(t.features.eyebrow)}</div>
          <h2>${html(t.features.title)}</h2>
          <p>${html(t.features.description)}</p>
        </div>
        <div class="cards">
          ${t.features.cards
            .map(
              ([titleText, body], index) => `<article class="card">
                <div class="icon">${index + 1}</div>
                <h3>${html(titleText)}</h3>
                <p>${html(body)}</p>
              </article>`
            )
            .join('')}
        </div>
      </div>
    </section>

    <section class="block band" id="leaderboards">
      <div class="wrap split">
        <div class="split-copy">
          <span class="pill">${html(t.leaderboard.eyebrow)}</span>
          <h2>${html(t.leaderboard.title)}</h2>
          <p>${html(t.leaderboard.description)}</p>
        </div>
        <div class="table-shell">
          <table>
            <thead><tr>${t.leaderboard.columns.map((item) => `<th>${html(item)}</th>`).join('')}</tr></thead>
            <tbody>
              ${t.leaderboard.rows
                .map(
                  (row) => `<tr>
                    <td>${html(row[0])}</td>
                    <td><strong>${html(row[1])}</strong></td>
                    <td>${html(row[2])}</td>
                    <td class="growth">${html(row[3])}</td>
                    <td>${html(row[4])}</td>
                    <td>${html(row[5])}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="block" id="pricing">
      <div class="wrap">
        <div class="section-head">
          <div class="eyebrow">${html(t.pricing.eyebrow)}</div>
          <h2>${html(t.pricing.title)}</h2>
          <p>${html(t.pricing.description)}</p>
        </div>
        <div class="plans">
          ${t.pricing.plans
            .map(([name, price, planDescription, featured, features]) => {
              const suffix = name === 'Free' ? '' : t.pricing.monthSuffix;
              const cta = name === 'Free' ? t.pricing.freeCta : t.pricing.paidCta;
              return `<article class="plan ${featured ? 'featured' : ''}">
                ${featured ? `<span class="pill badge">${html(t.pricing.recommended)}</span>` : ''}
                <h3>${html(name)}</h3>
                <p>${html(planDescription)}</p>
                <div class="price">${html(price)}<span>${html(suffix)}</span></div>
                <ul class="features">${features.map((item) => `<li>${html(item)}</li>`).join('')}</ul>
                <a class="button" href="mailto:support@siterisehq.com?subject=SiteRise%20${encodeURIComponent(name)}">${html(cta)}</a>
              </article>`;
            })
            .join('')}
        </div>
      </div>
    </section>

    <div class="wrap compliance">
      <div>
        <h2>${html(t.compliance.title)}</h2>
        ${t.compliance.description ? `<p>${html(t.compliance.description)}</p>` : ''}
      </div>
      <a class="pill" href="/${locale}/pricing">${html(t.compliance.cta)} →</a>
    </div>
  </main>

  <footer>
    <div class="wrap">SiteRise Alpha / Website opportunity intelligence</div>
  </footer>

  <script>
    window.__SITERISE__ = ${initialData};
    const state = window.__SITERISE__;
    const tools = state.tools || {};
    const form = document.getElementById('lookup-form');
    const input = document.getElementById('domain-input');
    const countrySelect = document.getElementById('country-select');
    const monthInput = document.getElementById('month-input');
    const button = document.getElementById('submit-button');
    const errorBox = document.getElementById('lookup-error');
    const domainEl = document.getElementById('preview-domain');
    const metaEl = document.getElementById('preview-meta');
    const growthEl = document.getElementById('preview-growth');
    const metricsEl = document.getElementById('metrics');
    const updatedEl = document.getElementById('preview-updated');
    const bulkInput = document.getElementById('bulk-input');
    const bulkButton = document.getElementById('bulk-button');
    const bulkError = document.getElementById('bulk-error');
    const bulkResults = document.getElementById('bulk-results');
    const watchAdd = document.getElementById('watch-add');
    const watchError = document.getElementById('watch-error');
    const watchList = document.getElementById('watch-list');
    const watchCount = document.getElementById('watch-count');
    const healthStatus = document.getElementById('health-status');
    const watchKey = 'siterise.watchlist.v1';
    let lastResult = null;

    function formatMetric(value, fallback) {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback || 'N/A';
      const number = Number(value);
      if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
      if (number >= 1000) return Math.round(number / 1000) + 'K';
      return String(number);
    }
    function formatPercent(value) {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
      const number = Number(value);
      return Math.round(number <= 1 ? number * 100 : number) + '%';
    }
    function formatDate(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleDateString(state.locale === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short' });
    }
    function getDisplayMonth() {
      return monthInput.value ? monthInput.value + '-01' : '';
    }
    function requestFilters() {
      return {
        country: countrySelect.value || 'global',
        month: getDisplayMonth(),
      };
    }
    function setError(box, message) {
      box.textContent = message || '';
      box.style.display = message ? 'block' : 'none';
    }
    function renderMetric(label, value, detail) {
      const div = document.createElement('div');
      div.className = 'metric';
      div.innerHTML = '<div class="metric-label"></div><div class="metric-value"></div><div class="metric-detail"></div>';
      div.children[0].textContent = label;
      div.children[1].textContent = value;
      div.children[2].textContent = detail;
      return div;
    }
    function renderLookup(data) {
      lastResult = data;
      domainEl.textContent = data.rootDomain || data.domain;
      metaEl.textContent = [data.country, formatDate(data.month), data.cached ? state.cachedLabel : ''].filter(Boolean).join(' / ');
      growthEl.textContent = data.metrics.accuracy || 'traffic estimate';
      metricsEl.replaceChildren(
        renderMetric(state.metricLabels[0] || 'Visits', formatMetric(data.metrics.visits), state.metricDetails[0] || ''),
        renderMetric(state.metricLabels[1] || 'Users', formatMetric(data.metrics.users), state.metricDetails[1] || ''),
        renderMetric(state.metricLabels[2] || 'Mobile', formatMetric(data.metrics.mobileVisits), state.metricDetails[2] || ''),
        renderMetric(state.metricLabels[3] || 'Bounce', formatPercent(data.metrics.bounceRate), state.metricDetails[3] || '')
      );
      updatedEl.textContent = state.updated + ' / ' + state.cacheUntilLabel + ' ' + formatDate(data.cachedUntil);
    }
    function parseBulkDomains(value) {
      return Array.from(new Set(String(value || '').split(/[\\n,;\\s]+/).map((item) => item.trim()).filter(Boolean))).slice(0, 10);
    }
    function emptyNode(message) {
      const div = document.createElement('div');
      div.className = 'empty-state';
      div.textContent = message;
      return div;
    }
    function renderBulkRows(rows) {
      if (!rows.length) {
        bulkResults.replaceChildren(emptyNode(tools.bulkEmpty || 'No results yet.'));
        return;
      }
      bulkResults.replaceChildren(...rows.map((row) => {
        const div = document.createElement('div');
        div.className = 'result-row';
        const status = row.ok ? (row.data.cached ? state.cachedLabel : 'ok') : (row.message || 'error');
        div.innerHTML = '<strong></strong><span></span><span></span><span></span>';
        div.children[0].textContent = row.domain || row.input || '';
        div.children[1].textContent = row.ok ? formatMetric(row.data.metrics.visits) : '-';
        div.children[2].textContent = row.ok ? formatMetric(row.data.metrics.users) : '-';
        div.children[3].textContent = row.ok ? (row.data.metrics.accuracy || status) : status;
        if (!row.ok) div.children[3].className = 'row-error';
        return div;
      }));
    }
    function readWatchlist() {
      try {
        const value = JSON.parse(localStorage.getItem(watchKey) || '[]');
        return Array.isArray(value) ? value.filter(Boolean).slice(0, 50) : [];
      } catch {
        return [];
      }
    }
    function writeWatchlist(items) {
      localStorage.setItem(watchKey, JSON.stringify(items.slice(0, 50)));
    }
    function renderWatchlist() {
      const items = readWatchlist();
      watchCount.textContent = String(items.length);
      if (!items.length) {
        watchList.replaceChildren(emptyNode(tools.watchEmpty || 'No saved domains yet.'));
        return;
      }
      watchList.replaceChildren(...items.map((item) => {
        const row = document.createElement('div');
        row.className = 'watch-row';
        row.innerHTML = '<strong></strong><button class="ghost-button" type="button"></button><button class="ghost-button" type="button"></button>';
        row.children[0].textContent = item.domain;
        row.children[1].textContent = tools.lookup || 'Analyze';
        row.children[2].textContent = tools.remove || 'Remove';
        row.children[1].addEventListener('click', () => {
          input.value = item.domain;
          form.requestSubmit();
        });
        row.children[2].addEventListener('click', () => {
          writeWatchlist(readWatchlist().filter((saved) => saved.domain !== item.domain));
          renderWatchlist();
        });
        return row;
      }));
    }
    async function checkHealth() {
      try {
        const response = await fetch('/api/health');
        const payload = await response.json();
        const configured = Boolean(payload.semrushConfigured);
        healthStatus.textContent = configured ? (tools.healthOk || 'Configured') : (tools.healthMissing || 'Missing key');
        healthStatus.classList.toggle('missing', !configured);
      } catch {
        healthStatus.textContent = 'Unavailable';
        healthStatus.classList.add('missing');
      }
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError(errorBox, '');
      button.disabled = true;
      button.textContent = '${html(t.hero.loading)}';
      try {
        const filters = requestFilters();
        const response = await fetch('/api/traffic/lookup', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ target: input.value, country: filters.country, month: filters.month }),
        });
        const payload = await response.json();
        if (!response.ok || payload.code !== 0) {
          throw new Error(payload.message || state.errorFallback);
        }
        renderLookup(payload.data);
      } catch (error) {
        setError(errorBox, error instanceof Error ? error.message : state.errorFallback);
      } finally {
        button.disabled = false;
        button.textContent = '${html(t.hero.cta)} →';
      }
    });
    bulkButton.addEventListener('click', async () => {
      setError(bulkError, '');
      const domains = parseBulkDomains(bulkInput.value);
      if (!domains.length) {
        setError(bulkError, tools.bulkEmpty || 'Add domains first.');
        return;
      }
      bulkButton.disabled = true;
      bulkButton.textContent = (tools.bulkLoading || 'Comparing') + '...';
      bulkResults.replaceChildren(emptyNode((tools.bulkLoading || 'Comparing') + '...'));
      try {
        const filters = requestFilters();
        const response = await fetch('/api/traffic/bulk', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ targets: domains, country: filters.country, month: filters.month }),
        });
        const payload = await response.json();
        if (!response.ok || payload.code !== 0) {
          throw new Error(payload.message || state.errorFallback);
        }
        renderBulkRows(payload.data.results || []);
      } catch (error) {
        setError(bulkError, error instanceof Error ? error.message : state.errorFallback);
        bulkResults.replaceChildren(emptyNode(tools.bulkEmpty || 'No results yet.'));
      } finally {
        bulkButton.disabled = false;
        bulkButton.textContent = (tools.compareCta || 'Compare') + ' →';
      }
    });
    watchAdd.addEventListener('click', () => {
      setError(watchError, '');
      const domain = lastResult && (lastResult.rootDomain || lastResult.domain);
      if (!domain) {
        setError(watchError, tools.noResult || 'Analyze a domain first.');
        return;
      }
      const items = readWatchlist();
      if (!items.some((item) => item.domain === domain)) {
        items.unshift({ domain: domain, savedAt: new Date().toISOString() });
        writeWatchlist(items);
      }
      watchAdd.textContent = tools.saved || 'Saved';
      window.setTimeout(() => {
        watchAdd.textContent = tools.addWatch || 'Add current domain';
      }, 1200);
      renderWatchlist();
    });
    renderWatchlist();
    checkHealth();
  </script>
</body>
</html>`;
}

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

function normalizeDomain(input) {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('Domain is required.');

  let parsed;
  try {
    parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    throw new Error('Invalid domain or URL.');
  }

  let hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
  hostname = hostname.replace(/^www\./, '');

  if (!hostname || hostname === 'localhost') {
    throw new Error('Invalid public domain.');
  }
  if (hostname.includes('_') || !/^[a-z0-9.-]+$/.test(hostname)) {
    throw new Error('Invalid domain format.');
  }

  const parts = hostname.split('.').filter(Boolean);
  if (parts.length < 2) throw new Error('Domain must include a valid TLD.');

  const suffix2 = parts.slice(-2).join('.');
  if (MULTI_PART_TLDS.has(suffix2) && parts.length < 3) {
    throw new Error('Domain must include a second-level name.');
  }

  const rootDomain = MULTI_PART_TLDS.has(suffix2)
    ? parts.slice(-3).join('.')
    : suffix2;

  return { input: raw, hostname, rootDomain };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  if (!rows.length) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = (values[index] || '').trim();
    });
    return item;
  });
}

function parseNumber(value) {
  if (!value) return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCountry(country) {
  const value = String(country || '').trim();
  if (!value || value.toLowerCase() === 'global') return 'global';
  if (!/^[a-z]{2}$/i.test(value)) {
    throw new Error('Country must be a two-letter ISO code or global.');
  }
  return value.toUpperCase();
}

function normalizeMonth(month) {
  const value = String(month || '').trim();
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-01$/.test(value)) {
    throw new Error('Month must use YYYY-MM-01 format.');
  }
  return value;
}

function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for') ||
    'anonymous'
  ).split(',')[0].trim();
}

function enforceRateLimit(request) {
  const key = `${request.method}:${new URL(request.url).pathname}:${getClientIp(request)}`;
  const now = Date.now();
  const last = rateLimitStore.get(key);
  if (typeof last === 'number' && now - last < 1200) {
    const retryAfter = Math.max(1, Math.ceil((1200 - (now - last)) / 1000));
    return json(
      {
        code: -1,
        error: 'too_many_requests',
        message: `Please retry after ${retryAfter}s.`,
      },
      429
    );
  }
  rateLimitStore.set(key, now);
  return null;
}

async function enforceSemrushRateLimit(env) {
  const maxRps = Math.max(1, Number(env.SEMRUSH_MAX_RPS || 10));
  const minIntervalMs = Math.ceil(1000 / maxRps);
  const now = Date.now();
  const waitMs = Math.max(0, minIntervalMs - (now - semrushLastRequestAt));
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  semrushLastRequestAt = Date.now();
}

function cacheTtlMs(env) {
  const days = Math.min(
    Math.max(Number(env.SEMRUSH_CACHE_TTL_DAYS || DEFAULT_CACHE_TTL_DAYS), 1),
    DEFAULT_CACHE_TTL_DAYS
  );
  return days * 24 * 60 * 60 * 1000;
}

function mapSummaryRow(row, request, cachedUntil) {
  return {
    domain: row.target || request.target,
    country: row.country || request.country || 'global',
    month: row.display_date || request.displayDate || null,
    source: 'semrush',
    cachedUntil,
    metrics: {
      visits: parseNumber(row.visits),
      users: parseNumber(row.users),
      desktopVisits: parseNumber(row.desktop_visits),
      mobileVisits: parseNumber(row.mobile_visits),
      bounceRate: parseNumber(row.bounce_rate),
      pagesPerVisit: parseNumber(row.pages_per_visit),
      timeOnSite: parseNumber(row.time_on_site),
      accuracy: row.accuracy || null,
    },
    raw: row,
  };
}

async function getTrafficSummary(env, request) {
  const key = JSON.stringify({
    target: request.target,
    country: request.country,
    displayDate: request.displayDate || '',
    columns: DEFAULT_COLUMNS,
  });
  const cached = trafficCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, cached: true };
  }

  if (!env.SEMRUSH_API_KEY) {
    const error = new Error('SEMRUSH_API_KEY is not configured.');
    error.status = 500;
    error.code = 'missing_api_key';
    throw error;
  }

  const baseUrl = String(env.SEMRUSH_TRENDS_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = new URL(`${baseUrl}/summary`);
  url.searchParams.set('targets', request.target);
  url.searchParams.set('key', env.SEMRUSH_API_KEY);
  url.searchParams.set('export_columns', DEFAULT_COLUMNS.join(','));

  if (request.country && request.country !== 'global') {
    url.searchParams.set('country', request.country);
  }
  if (request.displayDate) {
    url.searchParams.set('display_date', request.displayDate);
  }

  await enforceSemrushRateLimit(env);

  const response = await fetch(url.toString(), {
    headers: { accept: 'text/csv,text/plain,*/*' },
  });
  const text = await response.text();

  if (!response.ok) {
    const error = new Error(text || `Semrush request failed with status ${response.status}.`);
    error.status = response.status;
    error.code = 'provider_error';
    throw error;
  }

  const row = parseCsv(text)[0];
  if (!row) {
    const error = new Error('No traffic data is available for this domain.');
    error.status = 404;
    error.code = 'no_data';
    throw error;
  }

  const expiresAt = Date.now() + cacheTtlMs(env);
  const result = mapSummaryRow(row, request, new Date(expiresAt).toISOString());
  trafficCache.set(key, { expiresAt, result });
  return { ...result, cached: false };
}

async function lookupDomain(env, input, country, displayDate) {
  const normalized = normalizeDomain(input || '');
  const result = await getTrafficSummary(env, {
    target: normalized.rootDomain,
    country,
    displayDate,
  });

  return {
    input: normalized.input,
    hostname: normalized.hostname,
    rootDomain: normalized.rootDomain,
    ...result,
  };
}

async function handleLookup(request, env) {
  if (request.method !== 'POST') {
    return json({ code: -1, error: 'method_not_allowed', message: 'Use POST.' }, 405);
  }

  const limited = enforceRateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const country = normalizeCountry(body.country);
    const displayDate = normalizeMonth(body.month);
    const result = await lookupDomain(env, body.target || '', country, displayDate);

    return json({
      code: 0,
      message: 'ok',
      data: result,
    });
  } catch (error) {
    return json(
      {
        code: -1,
        message: error instanceof Error ? error.message : 'Traffic lookup failed.',
        error: error.code || 'invalid_request',
      },
      error.status || 400
    );
  }
}

function normalizeBulkTargets(body) {
  const source = Array.isArray(body.targets) ? body.targets : String(body.targets || body.target || '').split(/[\n,;\s]+/);
  const targets = Array.from(new Set(source.map((item) => String(item || '').trim()).filter(Boolean)));
  if (!targets.length) {
    const error = new Error('At least one domain is required.');
    error.status = 400;
    error.code = 'empty_targets';
    throw error;
  }
  if (targets.length > MAX_BULK_DOMAINS) {
    const error = new Error(`Bulk compare supports up to ${MAX_BULK_DOMAINS} domains.`);
    error.status = 400;
    error.code = 'too_many_targets';
    throw error;
  }
  return targets;
}

async function handleBulkLookup(request, env) {
  if (request.method !== 'POST') {
    return json({ code: -1, error: 'method_not_allowed', message: 'Use POST.' }, 405);
  }

  const limited = enforceRateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const country = normalizeCountry(body.country);
    const displayDate = normalizeMonth(body.month);
    const targets = normalizeBulkTargets(body);
    const results = [];

    for (const target of targets) {
      try {
        const data = await lookupDomain(env, target, country, displayDate);
        results.push({
          ok: true,
          input: target,
          domain: data.rootDomain || data.domain,
          data,
        });
      } catch (error) {
        let normalized = null;
        try {
          normalized = normalizeDomain(target);
        } catch {
          normalized = null;
        }
        results.push({
          ok: false,
          input: target,
          domain: normalized ? normalized.rootDomain : target,
          error: error.code || 'lookup_failed',
          message: error instanceof Error ? error.message : 'Traffic lookup failed.',
        });
      }
    }

    return json({
      code: 0,
      message: 'ok',
      data: {
        country,
        month: displayDate || null,
        count: results.length,
        results,
      },
    });
  } catch (error) {
    return json(
      {
        code: -1,
        message: error instanceof Error ? error.message : 'Bulk lookup failed.',
        error: error.code || 'invalid_request',
      },
      error.status || 400
    );
  }
}

function handleHealth(env) {
  return json({
    ok: true,
    version: 'alpha',
    semrushConfigured: Boolean(env.SEMRUSH_API_KEY),
    cacheTtlDays: Math.min(
      Math.max(Number(env.SEMRUSH_CACHE_TTL_DAYS || DEFAULT_CACHE_TTL_DAYS), 1),
      DEFAULT_CACHE_TTL_DAYS
    ),
    maxBulkDomains: MAX_BULK_DOMAINS,
  });
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = normalizePath(url.pathname);

    if (pathname === '/api/traffic/lookup') {
      return handleLookup(request, env);
    }
    if (pathname === '/api/traffic/bulk') {
      return handleBulkLookup(request, env);
    }
    if (pathname === '/api/health') {
      return handleHealth(env);
    }
    if (pathname === '/robots.txt') {
      return new Response('User-agent: *\nAllow: /\n', {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
    if (pathname === '/favicon.ico' || pathname === '/favicon.svg') {
      return new Response(SITE_RISE_ICON_SVG, {
        headers: {
          'content-type': 'image/svg+xml; charset=utf-8',
          'cache-control': 'public, max-age=31536000, immutable',
        },
      });
    }

    if (pathname === '/') {
      const locale = normalizeLocale(pathname, request.headers.get('accept-language') || '');
      return Response.redirect(`${url.origin}/${locale}`, 302);
    }

    const parts = pathname.split('/').filter(Boolean);
    const locale = parts[0] === 'zh' || parts[0] === 'en' ? parts[0] : normalizeLocale(pathname);
    const slug = parts[0] === locale ? parts.slice(1).join('/') : parts.join('/');

    if (slug === '' || slug === 'pricing' || pathname === '/pricing') {
      return htmlResponse(pageHtml(locale, slug === 'pricing' || pathname === '/pricing' ? 'pricing' : 'home'));
    }

    return htmlResponse(pageHtml(locale), 404);
  },
};
