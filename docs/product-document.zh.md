# 网站流量机会情报产品文档

最后更新：2026-06-10  
文档状态：立项版 PRD  
数据源假设：以 Semrush Trends API 为主要网站流量数据源，补充 SERP、域名、技术栈和人工分类数据。

## 1. 一句话定义

做一个面向独立开发者、SEO 团队、增长团队和代理商的“网站机会情报”产品，帮助用户发现增长最快的网站、监控竞品流量变化、分析关键词 SERP 里的真实竞争强度，并把这些信号转化为可执行的建站、内容、获客、投放、合作和收购机会。

不要把产品定位成“又一个网站流量查询器”。免费流量查询只是获客入口，真正付费价值应该是：

- 发现哪些网站正在快速增长。
- 判断某个细分市场是否值得进入。
- 监控竞品是否突然起量或掉量。
- 从关键词 SERP 中找出内容和产品机会。
- 把网站流量、增长、变现信号和技术信号组合成机会评分。

建议定位语：

> 发现正在增长的网站、竞品变化和可复制的流量机会。

英文备选：

> Discover fast-growing websites, competitor movements, and traffic opportunities before everyone else.

## 2. 背景与机会

网站流量数据本身不是稀缺品，Semrush、Similarweb、Ahrefs、Ubersuggest 都提供不同形态的流量估算、关键词、竞品和市场分析。机会在于这些工具通常偏“专业分析软件”，对轻量用户、独立开发者和内容创业者来说有三个问题：

- 太重：用户需要自己知道该查什么、如何筛选、如何解释数据。
- 太贵：完整竞品情报产品常面向企业或专业 SEO 团队。
- 太分散：流量、关键词、技术栈、变现方式、域名年龄、榜单发现和监控提醒分散在多个工具里。

Traffic.cv 证明了一个可行的产品形态：用免费 Traffic Checker 做 SEO 和低门槛入口，用排行榜和 Watchlist 做付费转化。它的卖点不是单次查询，而是“New / Trending / Top 网站榜单”和“Revenue 榜单”带来的发现价值。

本产品应在此基础上做差异化：更垂直、更可解释、更面向机会判断，而不是只展示表格。

## 3. 竞品调研

### 3.1 Traffic.cv

观察日期：2026-06-10  
官网：https://traffic.cv/  
价格页：https://traffic.cv/pricing

Traffic.cv 的免费首页主张是“Free Website Traffic Checker”，承诺可查看任意网站的流量规模、来源、趋势、关键词和域名信息。它的工具入口包括：

- Website Traffic Checker
- TLD Traffic Checker
- Bulk Traffic Checker
- Keyword Traffic Checker

Traffic.cv 的付费页面核心卖点是“解锁 Leaderboard”。免费计划包含流量查询、TLD 查询、批量查询、关键词分析和 10 个 Watchlist 域名；付费计划主要增加：

- Website Watchlist 从 10 个域名提升到 100 个域名。
- New Websites by Traffic Leaderboard。
- Trending Websites by Traffic Leaderboard。
- Top Websites by Traffic Leaderboard。
- New Websites by Revenue Leaderboard。
- Trending Websites by Revenue Leaderboard。
- Top Websites by Revenue Leaderboard。

截至 2026-06-10，价格页展示：

- Free：0 美元。
- Leaderboard Monthly：原价 199 美元/月，早鸟码后 119.4 美元/月。
- Leaderboard Yearly：894 美元/年，折算 74.5 美元/月。

Traffic.cv 的产品卖点拆解：

- 获客入口：免费流量查询工具，SEO 关键词覆盖面大。
- 转化钩子：免费工具可查单点数据，但真正有价值的“发现列表”需要付费。
- 付费理由：用户为“省时间发现机会”付费，而不是为某一次查询付费。
- 产品结构：工具页负责捕获需求，榜单页负责制造稀缺，Watchlist 负责留存。

Traffic.cv 的可攻击点：

- 榜单分类偏泛，垂直行业深度不足。
- 机会解释不足，用户还要自己判断“为什么值得关注”。
- Revenue 估算方法不透明，容易造成信任问题。
- 如果不提供导出、提醒、标签和团队流程，对代理商和专业用户的长期价值有限。
- 数据来源、准确度和缓存合规需要明确说明，否则商业化有风险。

### 3.2 Semrush Traffic Analytics

官网：https://www.semrush.com/features/traffic-analytics/  
开发者文档：https://developer.semrush.com/api/trends/api-reference/

Semrush Traffic Analytics 的价值主张是分析任意公司网站表现、竞品、潜在合作伙伴和市场趋势。它覆盖流量规模、桌面/移动、互动指标、Top Pages、Traffic Journey、Geo Distribution、Subdomains 和 Bulk Traffic Analysis。

对本产品的意义：

- 可以作为底层数据提供商。
- 适合做单域名查询、批量查询、竞品对比、国家维度和设备维度分析。
- 通过 Trends API 可以自动化接入，但必须尊重 API 限制、缓存限制和再分发限制。

本产品不应该正面复制 Semrush 的“全功能营销套件”，而应该在它之上做更窄的人群和工作流：

- 面向“发现机会”而不是“完整营销分析”。
- 面向垂直榜单和轻量监控，而不是企业级 Traffic Analytics 控制台。
- 把复杂指标转化为机会、风险、建议和可保存的候选列表。

### 3.3 Similarweb

Similarweb 是成熟的数字市场情报产品，强项是网站排名、行业洞察、市场份额、流量来源、受众和企业级研究。

对本产品的启发：

- 市场情报类产品的高价值来自横向对比和行业上下文，不是孤立域名指标。
- “Top sites by country/category”这类榜单天然适合 SEO 获客和重复访问。
- 企业级产品通常价格和复杂度较高，给轻量化垂直产品留下空间。

### 3.4 Ahrefs

官网：https://ahrefs.com/free-seo-tools

Ahrefs 的免费工具矩阵包括 Website Traffic Checker、SERP Checker、Keyword Generator、Backlink Checker、Website Authority Checker 等。它的优势在 SEO 数据、关键词、外链和内容研究。

对本产品的启发：

- 免费工具矩阵可以成为长期 SEO 获客资产。
- 关键词 SERP 分析是非常明确的入口：用户输入关键词，产品输出 Top 10 竞品域名的流量和竞争强度。
- Ahrefs 更偏 SEO 专业工具，本产品可以偏“网站机会发现 + 榜单 + 监控”。

### 3.5 Ubersuggest

官网：https://neilpatel.com/ubersuggest/

Ubersuggest 更偏轻量 SEO、关键词建议、竞品分析和内容建议，面向中小网站和营销人员。

对本产品的启发：

- 用户需要的是“我下一步该做什么”，不是更多原始指标。
- 免费入口、低价订阅和易懂建议适合中小客户转化。

### 3.6 竞品结论

可以做，但不要做通用 SEO 套件。更好的切入是：

- 用 Traffic.cv 的免费工具和榜单模型获客。
- 用 Semrush 的 Traffic Analytics 数据保证基础可信度。
- 用垂直榜单、机会评分、监控提醒和变现信号形成差异化。
- 用更低门槛的定价吸引独立开发者、内容站、代理商和增长团队。

## 4. 目标用户

### 4.1 独立开发者和 Micro-SaaS 创业者

需求：

- 找产品方向。
- 观察哪些工具站、AI 应用、Chrome 插件、SaaS 网站在增长。
- 判断某个细分需求是否已经有流量。

核心问题：

- 这个网站为什么增长？
- 这个市场是不是还有机会？
- 我能不能做一个更垂直、更轻、更便宜的替代品？

### 4.2 SEO 和内容站运营者

需求：

- 输入关键词，分析 SERP Top 10 域名的流量实力。
- 发现低竞争但有流量的关键词和网站。
- 批量比较竞品站点。

核心问题：

- 这个关键词 SERP 是不是被大站垄断？
- 哪些小站靠这个主题拿到了流量？
- 我应该做什么内容集群？

### 4.3 增长团队和创始人

需求：

- 监控竞品流量变化。
- 观察渠道结构变化。
- 发现新兴竞品、合作对象、媒体投放对象。

核心问题：

- 竞品最近是否起量？
- 流量来自搜索、社交、推荐还是付费？
- 是否有新的增长渠道值得跟进？

### 4.4 代理商和顾问

需求：

- 批量查询客户和竞品。
- 导出报告。
- 建立 Watchlist。
- 为客户提供市场监控和机会清单。

核心问题：

- 怎么快速生成客户可读的竞品报告？
- 怎么持续监控一组市场玩家？
- 怎么把数据变成续费价值？

### 4.5 投资、收购和合作拓展用户

需求：

- 筛选增长快的网站。
- 判断流量和变现潜力。
- 建立潜在收购、合作、投放和外链对象清单。

核心问题：

- 哪些网站还小但增长快？
- 哪些网站有商业化迹象？
- 哪些网站值得联系？

## 5. 用户任务

核心 Jobs To Be Done：

- 当我想找新项目方向时，我希望看到近期增长最快的网站，以便发现新需求。
- 当我评估一个细分市场时，我希望看到该市场 Top 网站和 Trending 网站，以便判断是否值得进入。
- 当我做关键词研究时，我希望输入一个关键词后看到 SERP Top 10 域名的流量、增长和权重，以便判断竞争难度。
- 当我监控竞品时，我希望收到月度流量变化提醒，以便及时响应市场变化。
- 当我做外联、合作或收购时，我希望批量导出符合条件的网站，以便建立候选清单。

## 6. 产品原则

- 机会优先：先告诉用户“哪些值得看”，再展示完整指标。
- 可解释：所有评分、收入估算、增长判断都必须展示计算依据。
- 数据透明：明确标注流量为第三方估算数据，来源为 Semrush 或其他提供商。
- 合规优先：缓存、导出、付费榜单、历史数据保留必须遵守 Semrush 条款。
- 先窄后宽：MVP 先做少量垂直场景，避免一开始做成大型 SEO 套件。
- 可运营：榜单、分类、标签、种子域名池要允许人工干预。

## 7. 产品范围

### 7.1 MVP 范围

MVP 必须包含：

- 单域名流量查询。
- 批量域名流量查询。
- 关键词 SERP Top 10 流量分析。
- 域名详情页。
- Traffic Leaderboard：
  - Top Websites。
  - Trending Websites。
  - New Websites。
- Watchlist：
  - 保存域名。
  - 查看月度变化。
  - 设置基础提醒。
- 免费和付费计划限制。
- 管理后台：
  - Semrush API 调用量。
  - 费用估算。
  - 错误率。
  - 缓存命中率。

MVP 数据源：

- Semrush Trends API：网站流量、设备、国家、来源、互动指标。
- SERP Provider：DataForSEO 或 SerpApi，用于关键词 Top 10 结果。
- RDAP/WHOIS：域名年龄和注册信息。
- 页面抓取：title、description、favicon、canonical URL。
- 人工分类：AI Tools、SaaS、Developer Tools、Ecommerce、Content Sites 等。

### 7.2 非 MVP 范围

MVP 不做：

- 完整 Similarweb 替代品。
- 完整 Ahrefs / Semrush SEO 套件。
- 面向第三方开放的流量数据 API。
- 未经授权的长期历史流量库。
- 未经授权的 Semrush 数据 CSV 批量转售。
- 声称“真实收入”的 Revenue 估算。
- 爬取 Traffic.cv 或竞品私有数据。

### 7.3 Post-MVP 范围

第二阶段可做：

- 垂直榜单：
  - AI Tools。
  - SaaS。
  - Shopify Stores。
  - Chrome Extensions。
  - Newsletters。
  - Developer Tools。
  - Content Sites。
- Opportunity Score。
- Revenue Estimate Range。
- 高级 Watchlist Alerts。
- Saved Reports。
- CSV / Google Sheets Export。
- 团队席位。
- 客户报告模板。
- API，仅在数据授权确认后开放。

## 8. 核心功能需求

### 8.1 单域名流量查询

页面建议：

- `/traffic/[domain]`
- 或 SEO 更强的 `/website-traffic/[domain]`

输入：

- 域名或 URL。
- 国家，默认 Global。
- 月份，默认 Semrush 可用的最近完整月份。

输出：

- Estimated Monthly Visits。
- Unique Visitors。
- Desktop Visits。
- Mobile Visits。
- Bounce Rate。
- Pages per Visit。
- Time on Site。
- Traffic Sources，如果 Semrush plan 支持。
- Country Split，如果调用 Geo Distribution。
- Accuracy / Confidence，如果返回。
- 域名年龄。
- 网站标题、描述、favicon。
- 最近一次更新时间。

核心 CTA：

- Add to Watchlist。
- Compare Competitors。
- View Similar Opportunities。
- Unlock Full Report。

错误状态：

- 域名无效。
- 无 Semrush 数据。
- Semrush 限流。
- Semrush 额度不足。
- 数据暂不可用。

验收标准：

- 用户输入 `example.com` 或 `https://example.com/path` 都能规范化为根域名。
- 查询成功后展示核心指标和数据来源说明。
- 免费用户达到配额后出现升级提示。
- 所有 Semrush 原始数据缓存不超过配置的合规期限。

### 8.2 批量域名查询

页面建议：`/bulk`

输入：

- 文本框，一行一个域名。
- 国家。
- 月份。

计划限制建议：

- Anonymous：最多 3 个域名。
- Free：最多 10 个域名。
- Pro：最多 100 个域名。
- Growth：最多 200 个域名。

输出表格：

- Domain。
- Visits。
- Users。
- Desktop / Mobile Split。
- Bounce Rate。
- Pages per Visit。
- Time on Site。
- Month-over-month Change。
- Accuracy。
- Country。

操作：

- Sort。
- Filter。
- Add Selected to Watchlist。
- Compare Selected。
- Export CSV，仅付费且授权确认后开放。

验收标准：

- 自动去重和域名规范化。
- 部分失败不影响其他域名展示。
- 明确展示失败原因，但不泄露 provider key 或内部错误。
- Provider 调用量按 target count 记录。

### 8.3 关键词流量分析

页面建议：`/keyword`

输入：

- Keyword。
- Country。
- Search locale。

流程：

1. 调用 SERP provider 获取自然搜索 Top 10。
2. 抽取 URL 的 root domain。
3. 去重域名。
4. 调用 Semrush Traffic Summary 查询这些域名。
5. 合并 SERP 位置、标题、URL、域名流量和互动指标。
6. 输出机会判断。

输出：

- SERP Position。
- Ranking URL。
- Domain。
- Estimated Visits。
- Traffic Trend。
- Domain Age。
- SERP Competition Level。
- Opportunity Notes。

机会判断示例：

- Top 10 中出现多个小站：可能有进入机会。
- Top 10 都是高权重大站：竞争强。
- 论坛、Reddit、Quora 多：说明需求强但内容供给可能不足。
- 工具站多：可考虑做工具型落地页。
- 流量高但页面体验弱：可考虑做更好的替代内容或产品。

付费点：

- 保存关键词报告。
- 跟踪关键词 SERP 变化。
- 导出 Top 100 关键词机会。
- 查看历史报告。

### 8.4 Traffic Leaderboard

页面建议：

- `/leaderboards/traffic/top`
- `/leaderboards/traffic/trending`
- `/leaderboards/traffic/new`
- `/leaderboards/[category]/traffic/top`
- `/leaderboards/[category]/traffic/trending`

榜单类型：

- Top Websites：按当前月 visits 排序。
- Trending Websites：按增长分数排序。
- New Websites：按 first seen 时间和当前 visits 排序。

筛选：

- Category。
- Country。
- Traffic Range。
- Growth Range。
- Domain Age。
- TLD。
- Monetization Signal。
- Technology Signal。

行字段：

- Rank。
- Favicon。
- Domain。
- One-line description。
- Visits。
- Growth Abs。
- Growth %。
- Category。
- Country。
- Domain Age。
- Opportunity Score。
- Save。

榜单增长公式建议：

```text
growth_abs = visits_current - visits_previous
growth_pct = growth_abs / max(visits_previous, 1)
trending_score =
  normalized(log(visits_current)) * 0.35 +
  normalized(growth_abs) * 0.35 +
  normalized(growth_pct) * 0.20 +
  accuracy_score * 0.10
```

噪音过滤：

- 排除 previous_visits 过低的网站，例如低于 10,000。
- 排除 parked domain。
- 排除 adult、spam、malware。
- 排除 accuracy 过低的数据。
- 对异常增长做 winsorize，避免极端值刷榜。

Semrush 能否直接给“每月增长最快的网站”：

- 不建议理解为“Semrush 直接给一个 fastest-growing endpoint”。
- Semrush Trends API 有 Traffic Rank 和 Traffic Summary 等接口，可提供流量榜单和指定域名的月度指标。
- 产品需要自己建立候选域名池，拉取当前月和上月数据，再计算增长。
- 如果使用 Traffic Rank 做种子，只能覆盖 Semrush rank 返回范围和你的调用范围；若要做垂直榜单，需要自建或购买垂直种子源。

### 8.5 Revenue Leaderboard

Revenue Leaderboard 放在 Post-MVP，原因是收入估算比流量估算更容易引发信任和合规风险。

可采用“收入区间”而非单点收入：

- Content Site：

```text
estimated_revenue = visits * pages_per_visit * rpm / 1000
```

- SaaS / Tool：

```text
estimated_revenue = visits * visitor_to_signup_rate * signup_to_paid_rate * arpu
```

- Ecommerce：

```text
estimated_revenue = visits * conversion_rate * average_order_value
```

- Affiliate：

```text
estimated_revenue = visits * clickout_rate * conversion_rate * commission
```

必须展示：

- Low / Base / High 区间。
- 假设参数。
- 模型类型。
- 置信度。
- “估算，不代表真实收入”的声明。

### 8.6 Watchlist

页面建议：

- `/dashboard/watchlists`
- `/dashboard/watchlists/[id]`

功能：

- 添加域名。
- 删除域名。
- 分组。
- 标签。
- 备注。
- 设置国家和设备。
- 手动刷新。
- 月度自动刷新。
- 阈值提醒。

提醒规则：

- Visits 上升超过 X%。
- Visits 下降超过 X%。
- 进入 Trending 榜单。
- 流量来源结构发生明显变化。
- 新检测到 monetization signal。

计划限制建议：

- Free：5 个域名。
- Pro：100 个域名。
- Growth：500 个域名。
- Agency：自定义。

合规注意：

- Watchlist 的成员关系、备注和标签可以长期保存。
- Semrush 派生流量数据能否长期保留，需要获得书面许可；默认按 30 天缓存窗口处理。

### 8.7 Domain Enrichment

域名增强数据不完全依赖 Semrush，可作为差异化资产。

字段：

- Title。
- Meta description。
- Favicon。
- Canonical domain。
- Domain age。
- Registrar。
- Nameservers。
- Technologies。
- Monetization signals。
- Social links。
- Pricing page URL。
- Contact page URL。

Monetization signals 示例：

- Stripe。
- Paddle。
- Lemon Squeezy。
- Shopify。
- WooCommerce。
- Gumroad。
- Google Ads。
- Affiliate links。
- Pricing page。
- Checkout page。

### 8.8 Opportunity Score

MVP 可以先隐藏在 feature flag 后，等数据稳定后再开放。

建议公式：

```text
opportunity_score =
  traffic_growth_score * 0.30 +
  traffic_quality_score * 0.15 +
  niche_relevance_score * 0.15 +
  monetization_signal_score * 0.15 +
  competition_gap_score * 0.15 +
  domain_freshness_score * 0.10
```

评分解释：

- traffic_growth_score：月环比增长、绝对增长。
- traffic_quality_score：bounce rate、pages per visit、time on site。
- niche_relevance_score：是否属于用户选择的行业。
- monetization_signal_score：是否有支付、定价、广告、联盟等迹象。
- competition_gap_score：是否由小站或弱品牌获得流量。
- domain_freshness_score：新站快速增长给更高分。

输出：

- 0-100 分。
- High / Medium / Low confidence。
- “为什么得这个分”的明细。
- 可操作建议。

## 9. 数据源与合规设计

### 9.1 Semrush Trends API 能力

重点接口：

- Traffic Summary：`GET https://api.semrush.com/analytics/ta/api/v3/summary`
- Traffic Rank：`GET https://api.semrush.com/analytics/ta/api/v3/rank`
- Daily Traffic：`/summary_by_day`
- Weekly Traffic：`/summary_by_week`
- Traffic Sources：`/sources`
- Geo Distribution：`/geo`
- Top Pages：`/top_pages`
- Subdomains / Subfolders
- Audience Insights
- Data Accuracy

Traffic Summary 关键信息：

- 可按 domains / subdomains / subfolders 查询。
- `targets` 最大 200 个。
- `display_date` 使用 `YYYY-MM-01`。
- 不传 `display_date` 时默认返回上一个完整月份。
- `country` 使用 ISO 3166-1 alpha-2 国家码；不传则为 global。
- `device_type` 可选 desktop / mobile；不传则为 all devices。
- 响应格式为 CSV。
- 可通过 `export_columns` 指定字段。
- 常用字段包括 target、rank、visits、users、desktop_visits、mobile_visits、direct、referral、search、paid、search_organic、search_paid、social_organic、social_paid、time_on_site、pages_per_visit、bounce_rate、accuracy、display_date、country、device_type。

Traffic Rank 关键信息：

- 返回按流量降序排列的域名列表。
- 默认每次返回 200 条，最大 200 条。
- 可通过 `display_offset` 翻页。
- 适合构建 Top Websites 和候选种子池。
- 不等于直接提供“增长最快网站”；增长榜仍需自己计算。

### 9.2 Semrush 限制

根据 Semrush API 使用限制：

- 最高 10 requests per second。
- 同账号最高 10 simultaneous requests。
- 未经 Semrush 明确书面同意，不得缓存 API 返回信息超过一个月。
- Trends API 的月度请求上限取决于订阅计划。

产品默认合规策略：

- `SEMRUSH_CACHE_TTL_DAYS` 默认不超过 30。
- 所有 Semrush 派生数据都带 `provider_cached_until`。
- 过期数据不展示、刷新或清理。
- CSV 导出、付费榜单、长期历史趋势、公共 SEO 页面展示 Semrush 派生数据，必须在上线前确认授权。
- 不提供公开 API 返回 Semrush 派生数据，除非授权明确允许。

### 9.3 合规灰区

上线前必须确认：

- 是否可以在公开页面展示 Semrush 派生流量数据。
- 是否可以把 Semrush 派生数据作为付费 Leaderboard 展示。
- 是否允许用户导出 CSV。
- 增长率、机会分这类派生指标能否长期保留。
- Watchlist 的历史快照能否长期保存。
- Revenue Estimate 如果使用 Semrush visits 参与计算，能否保留计算结果。

保守上线方案：

- 免费工具实时查，缓存 30 天内。
- 公共榜单只展示 teaser：域名、排名区间、增长标签，不展示完整数值。
- 付费榜单先 feature flag 关闭，授权确认后开启。
- 历史趋势只展示授权允许范围内的数据。

## 10. 信息架构

主导航：

- Traffic Checker
- Bulk Checker
- Keyword Analyzer
- Leaderboards
- Watchlist
- Pricing

登录后导航：

- Watchlist
- Reports
- Exports
- Usage
- Billing
- Settings

管理后台：

- Provider Usage
- API Errors
- Cache
- Leaderboard Jobs
- Users
- Subscriptions
- Feature Flags

页面层级：

```text
/
/traffic/[domain]
/bulk
/keyword
/leaderboards
/leaderboards/traffic/top
/leaderboards/traffic/trending
/leaderboards/traffic/new
/leaderboards/[category]/traffic/top
/leaderboards/[category]/traffic/trending
/dashboard/watchlists
/dashboard/watchlists/[id]
/dashboard/reports
/dashboard/usage
/pricing
```

## 11. 页面体验要求

### 11.1 首页

首屏不做纯营销页，直接提供可用查询框。

首屏元素：

- 大搜索框：输入域名或 URL。
- 国家选择。
- 查询按钮。
- 简短价值主张。
- Trending 网站预览。

首页结构：

- Domain Search。
- Trending Websites Preview。
- Keyword Opportunity Workflow。
- Watchlist Monitoring。
- Pricing CTA。
- FAQ。

文案建议：

- H1：Find fast-growing websites before they become obvious.
- 副标题：Analyze traffic, discover trending domains, and monitor competitors with Semrush-powered website intelligence.

中文版本：

- H1：发现正在增长的网站。
- 副标题：查询任意网站流量，发现增长榜单，监控竞品变化，把流量数据转化为机会清单。

### 11.2 域名详情页

布局：

- Header：favicon、domain、title、category、confidence。
- Summary metrics：visits、users、growth、desktop/mobile、bounce、pages/session。
- Traffic source breakdown。
- Geo distribution。
- Domain metadata。
- Similar domains。
- Opportunity notes。
- CTA：Add to Watchlist、Compare、Unlock full report。

必须展示：

- 数据来源。
- 更新时间。
- 估算声明。
- 置信度或 accuracy。

### 11.3 Leaderboard 页面

布局：

- 顶部 tab：Top / Trending / New。
- 左侧或顶部 filter。
- 密集表格。
- 行内保存按钮。
- 付费遮罩或 teaser 行。

免费用户：

- 可看前 10 条部分字段。
- 隐藏完整流量、增长率、导出和高级筛选。

付费用户：

- 可看完整榜单。
- 可筛选。
- 可保存到 Watchlist。
- 可导出，前提是授权允许。

### 11.4 Keyword Analyzer 页面

布局：

- 输入区。
- SERP competition summary。
- Top 10 table。
- Opportunity notes。
- Save report CTA。

### 11.5 Watchlist 页面

布局：

- Watchlist selector。
- 添加域名输入框。
- 表格：
  - Domain。
  - Visits。
  - Change。
  - Last refreshed。
  - Alert status。
  - Tags。
  - Notes。
- 右侧详情抽屉：
  - 指标变化。
  - 最近提醒。
  - 域名信息。

## 12. 定价与包装

### 12.1 推荐上线定价

Free：

- 5 次单域名查询/天。
- 1 次批量查询/天，最多 10 个域名。
- 3 个关键词报告/月。
- 5 个 Watchlist 域名。
- Leaderboard teaser。
- 无导出。

Pro：建议 29-49 美元/月

- 200 次查询/月。
- 批量最多 100 个域名。
- 50 个关键词报告/月。
- 100 个 Watchlist 域名。
- 完整 Traffic Leaderboards。
- 基础导出，授权确认后开放。

Growth：建议 99-149 美元/月

- 1,000 次查询/月。
- 批量最多 200 个域名。
- 300 个关键词报告/月。
- 500 个 Watchlist 域名。
- 垂直榜单。
- Alerts。
- Saved Reports。
- 高级导出，授权确认后开放。

Agency：建议 299 美元/月起

- 团队席位。
- 更高配额。
- 客户报告。
- 自定义分类。
- 优先支持。

### 12.2 包装原则

- 免费层要足够有用，承担 SEO 和口碑获客。
- Pro 解锁重复工作流：Watchlist、完整榜单、批量分析。
- Growth 解锁运营型能力：垂直榜单、提醒、报告、导出。
- Agency 卖团队协作、客户报告和高配额。

### 12.3 付费转化点

自然转化场景：

- 用户查看 Trending 榜单第 10 条之后。
- 用户想看完整增长率。
- 用户想导出批量结果。
- 用户 Watchlist 超过免费限制。
- 用户想保存关键词报告。
- 用户想查看垂直榜单。

## 13. 数据模型概念

核心实体：

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
- social_visits
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

`provider_usage_logs`

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

## 14. API 合同概念

### 14.1 单域名查询

`POST /api/traffic/lookup`

请求：

```json
{
  "target": "example.com",
  "country": "US",
  "month": "2026-05-01"
}
```

响应：

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

### 14.2 批量查询

`POST /api/traffic/bulk`

请求：

```json
{
  "targets": ["example.com", "competitor.com"],
  "country": "US",
  "month": "2026-05-01"
}
```

行为：

- 规范化域名。
- 去重。
- 检查配额。
- 查缓存。
- 对未命中的域名调用 Semrush。
- 返回成功行和失败行。

### 14.3 关键词分析

`POST /api/keyword/analyze`

请求：

```json
{
  "keyword": "ai resume builder",
  "country": "US"
}
```

行为：

- 检查配额。
- 调 SERP provider。
- 提取 Top 10 root domains。
- 调 Semrush。
- 保存 report。
- 返回 SERP + traffic 合并结果。

### 14.4 Watchlist

接口：

- `GET /api/watchlists`
- `POST /api/watchlists`
- `POST /api/watchlists/:id/items`
- `DELETE /api/watchlists/:id/items/:itemId`
- `POST /api/watchlists/:id/refresh`

## 15. 后台和运营能力

管理后台必须能看到：

- Semrush requests today / month。
- Semrush target count today / month。
- 估算 API units。
- 错误率。
- 慢请求。
- Cache hit rate。
- Top cost users。
- Watchlist refresh job 状态。
- Leaderboard rebuild job 状态。

运营后台需要：

- 管理分类。
- 管理种子域名池。
- 屏蔽 spam / adult / parked domain。
- 手动重建榜单。
- 调整榜单权重。
- 设置 feature flags。

## 16. 产品路线图

### Phase 0：验证和合规准备，2-3 天

目标：

- 明确 Semrush plan、可用字段、API 额度和授权边界。
- 选择 SERP provider。
- 确认 MVP 分类。
- 确定产品名称和路由。

交付：

- Semrush API spike。
- 数据字段清单。
- 合规问题清单。
- MVP 信息架构。

### Phase 1：基础查询能力，1-2 周

目标：

- 让用户能完成单域名和批量查询。

功能：

- Domain normalization。
- Semrush provider wrapper。
- CSV parser。
- Cache。
- Provider usage logs。
- 单域名结果页。
- 批量查询页。
- 免费配额。

验收：

- 用户能查到域名流量。
- 缓存命中不重复消耗 provider。
- 错误状态完整。
- 后台能看到调用量。

### Phase 2：关键词分析和 Watchlist，1-2 周

目标：

- 形成重复使用场景。

功能：

- SERP Top 10。
- Keyword traffic report。
- Watchlist add/remove。
- 手动刷新。
- Watchlist 配额。

验收：

- 用户可输入关键词并得到 Top 10 域名流量。
- 用户可保存域名并查看变化。
- 免费和付费限制生效。

### Phase 3：Leaderboard MVP，1-2 周

目标：

- 形成核心付费价值。

功能：

- 种子域名池。
- Top / Trending / New 榜单。
- 榜单筛选。
- Teaser / paid access。
- 榜单重建 job。

验收：

- 榜单可按月生成。
- 免费用户看到 teaser。
- 付费用户看到完整数据。
- 管理员可以重建和屏蔽异常域名。

### Phase 4：商业化和增长，1 周

目标：

- 上线可付费版本。

功能：

- Pricing page。
- Stripe checkout。
- Plan entitlements。
- Upgrade prompts。
- Usage page。
- SEO landing pages。
- 数据来源声明和免责声明。

验收：

- 免费到付费流程完整。
- 付费权益正确解锁。
- Provider 成本可控。

### Phase 5：差异化能力，持续迭代

方向：

- Vertical leaderboards。
- Opportunity Score。
- Revenue estimate。
- Email alerts。
- Saved reports。
- Team seats。
- Agency report。
- Google Sheets export。

## 17. 增长策略

### 17.1 SEO 获客

免费工具页：

- Website Traffic Checker。
- Bulk Website Traffic Checker。
- Keyword Traffic Checker。
- TLD Traffic Checker。
- AI Tools Traffic Leaderboard。
- SaaS Traffic Leaderboard。
- Top Websites by Traffic in [Country]。
- Fastest Growing Websites in [Category]。

内容页：

- “How much traffic does [domain] get?”
- “Top [category] websites by traffic”
- “Fastest growing AI tools this month”
- “Best [keyword] SERP competitors”

### 17.2 社区传播

适合发布渠道：

- Product Hunt。
- Indie Hackers。
- Reddit SEO / SaaS / Entrepreneur。
- Hacker News，偏数据故事。
- X / LinkedIn 数据榜单图。

适合传播内容：

- 每月增长最快 AI 工具 Top 20。
- 新兴 SaaS 网站榜。
- 小站超过大站的 SERP 案例。
- 本月增长最快 Shopify 店铺。

### 17.3 销售转化

代理商和顾问：

- 提供可下载报告模板。
- 提供客户 Watchlist。
- 提供白标或轻量品牌化报告，后置阶段再做。

创始人和增长团队：

- 提供竞品监控。
- 提供每月邮件摘要。
- 提供行业榜单订阅。

## 18. 成功指标

获客：

- Organic clicks。
- Domain lookup conversion rate。
- Keyword analyzer usage。
- Leaderboard page impressions。

激活：

- 首次成功查询。
- 添加第一个 Watchlist domain。
- 查看第一个完整榜单。
- 保存第一个 keyword report。

留存：

- Weekly active users。
- Watchlist return rate。
- Alert email open rate。
- Monthly report views。

收入：

- Free-to-paid conversion。
- MRR。
- ARPA。
- Churn。
- Expansion revenue。

成本：

- Semrush cost per active user。
- Semrush cost per paid user。
- Cache hit rate。
- Gross margin after data provider cost。

## 19. 风险与缓解

### 19.1 Semrush 数据授权风险

风险：付费榜单、导出和历史数据可能触及再分发或缓存限制。  
缓解：

- 上线前获得书面确认。
- Feature flag 控制榜单、导出和历史图。
- 默认 30 天缓存。
- 公共页只展示 teaser。

### 19.2 Provider 成本失控

风险：免费用户批量查询导致 API 成本过高。  
缓解：

- 严格配额。
- IP 和用户限流。
- 缓存优先。
- 批量任务排队。
- 成本后台。

### 19.3 小网站数据覆盖不足

风险：很多长尾网站无数据或 accuracy 低。  
缓解：

- 明确 no-data 状态。
- 用域名、技术栈、页面信息补充价值。
- 榜单设置最低流量阈值。

### 19.4 Trending 榜单噪音

风险：低基数网站容易因为百分比增长刷榜。  
缓解：

- 同时使用绝对增长和百分比增长。
- 设置 previous_visits 最低值。
- 增加 accuracy 权重。
- 人工屏蔽异常域名。

### 19.5 收入估算信任风险

风险：Revenue 估算不透明会降低信任。  
缓解：

- 只给区间。
- 展示假设。
- 标记置信度。
- Post-MVP 再上线。

## 20. MVP 验收标准

MVP 可上线标准：

- 用户可以输入域名并看到标准化流量指标。
- 用户可以批量查询域名，且计划限制生效。
- 用户可以输入关键词并看到 SERP Top 10 域名流量。
- 登录用户可以添加和删除 Watchlist 域名。
- 系统记录 Semrush API 调用和成本估算。
- 缓存过期逻辑符合 Semrush 限制。
- 关键页面都有数据来源和估算声明。
- Provider 错误不会泄露内部实现。
- 管理员能查看 API 使用量、错误率和缓存状态。
- Pricing 页面能清楚表达免费和付费差异。

## 21. 待决策问题

必须尽快决定：

- 产品名称。
- 首批垂直分类。
- Semrush 订阅计划。
- SERP provider。
- 是否获得 Semrush 付费榜单展示授权。
- 是否获得 CSV 导出授权。
- 是否允许长期保存派生增长指标。
- MVP 定价。
- 首发市场是英文还是中文。

建议默认答案：

- 首发英文市场，因为搜索需求和竞品模式更成熟。
- 首批分类选 AI Tools、SaaS、Developer Tools、Content Sites。
- Revenue Leaderboard 不进 MVP。
- CSV Export 默认关闭，授权确认后开放。
- Opportunity Score 先内部计算，等质量稳定后对外展示。

## 22. 参考资料

- Traffic.cv 首页：https://traffic.cv/
- Traffic.cv Pricing：https://traffic.cv/pricing
- Semrush Traffic Analytics：https://www.semrush.com/features/traffic-analytics/
- Semrush Trends API Reference：https://developer.semrush.com/api/trends/api-reference/
- Semrush API Usage Restrictions：https://developer.semrush.com/api/introduction/api-usage-restrictions/
- Ahrefs Free SEO Tools：https://ahrefs.com/free-seo-tools
- Ubersuggest：https://neilpatel.com/ubersuggest/

