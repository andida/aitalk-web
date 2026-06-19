# SiteRise Discovery Automation

SiteRise 的新站发现现在可以通过 GitHub Actions 每天自动运行。该任务只负责后台数据采集、过滤、写入数据库和重建 `New Websites` 榜单，不会改动前台页面文案。

## Schedule

- 定时任务：每天北京时间 02:15 运行一次。
- 对应 cron：`15 18 * * *` UTC。
- 手动任务：GitHub Actions 页面选择 `SiteRise Discovery`，点击 `Run workflow`。
- 手动任务默认 `dry_run=true`，只输出候选、过滤原因和预计调用量，不写入数据库。

## Required GitHub Secrets

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 添加：

```text
DATABASE_URL
QUERY_DOMAINS_API_KEY
```

可选：

```text
PRODUCT_HUNT_API_TOKEN
PRODUCTHUNT_CLIENT_ID
PRODUCTHUNT_CLIENT_SECRET
```

`PRODUCT_HUNT_API_TOKEN` 和 `PRODUCTHUNT_CLIENT_ID` / `PRODUCTHUNT_CLIENT_SECRET` 二选一即可。优先使用 `PRODUCT_HUNT_API_TOKEN`；没有 token 时，脚本会用 client credentials 自动换取只读 access token。两者都没有时，脚本会继续使用补充候选来源，但高质量新产品网站覆盖会少一些。

## Daily Flow

1. 拉取候选域名。
2. 归一化 root domain，并跳过重复域名和 blocked 域名。
3. 检查 DNS、HTTPS、首页质量。
4. 查询并缓存注册时间。
5. 查询后台质量分，只用于过滤和排序，不在前台展示。
6. 查询最近流量，低于阈值的域名不进入榜单。
7. 写入 `siterise_domain`、`siterise_traffic_snapshot`、WHOIS 缓存表。
8. 重新生成 `New Websites` 榜单。

## Defaults

```text
days=90
candidate_limit=500
traffic_limit=100
min_visits=1
min_dr=0
country=global
build_leaderboard=true
```

定时任务会真实写库。手动任务默认 dry-run，确认输出正常后可以把 `dry_run` 改成 `false` 再运行。

## Operational Notes

- WHOIS 缓存 TTL 在自动任务里设置为 30 天。新站发现阶段只需要判断注册时间，30 天缓存能减少重复请求，同时仍能覆盖月度更新。
- 流量数据缓存 TTL 保持 30 天，符合按月更新的产品节奏。
- 如果数据库表结构已经由 Supabase SQL Editor 手动创建，不需要在该 workflow 里跑 migration。
- 如果 GitHub Actions 报缺少 secret，不要把密钥写进仓库，直接在 GitHub Secrets 中补齐。
