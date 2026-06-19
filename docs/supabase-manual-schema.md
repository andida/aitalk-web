# Supabase 手动建表说明

适用场景：你要在 Supabase SQL Editor 里手动执行建表，而不是先跑 `pnpm db:migrate`。

## 执行文件

复制并执行：

```text
docs/supabase-manual-schema.sql.txt
```

这份 SQL 基于 `src/config/db/schema.postgres.ts` 生成，包含：

- Better Auth 表：`user`、`session`、`account`、`verification`
- 模板业务表：`config`、`post`、`taxonomy`、`order`、`subscription`、`credit`、`apikey`
- RBAC 表：`role`、`permission`、`role_permission`、`user_role`
- AI/chat 表：`ai_task`、`chat`、`chat_message`
- SiteRise 表：`siterise_domain`、`siterise_traffic_snapshot`、`siterise_leaderboard_run`、`siterise_leaderboard_entry`、`siterise_watchlist`、`siterise_traffic_query_log`

## 执行前提

- 建议在新的 Supabase 项目或空的 `public` schema 执行。
- 不要同时启用 Supabase Auth 作为网站登录系统。当前项目登录使用 Better Auth。
- 如果数据库里已经存在同名表，SQL 会失败。需要先确认是否要保留旧数据。

## 执行后

在 Cloudflare Workers 配置 secrets：

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put AUTH_SECRET
npx wrangler secret put SEMRUSH_API_KEY
```

然后初始化后台 RBAC：

```bash
pnpm rbac:init
pnpm rbac:assign -- --email=你的管理员邮箱 --role=super_admin
```

如果后续改 schema，建议改回标准流程：

```bash
pnpm db:generate
pnpm db:migrate
```
