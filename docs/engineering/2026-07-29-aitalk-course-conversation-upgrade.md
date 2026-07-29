# AITalk 课程与对话体验升级验收记录

日期：2026-07-29  
状态：本地实现并独立验收；未提交、未推送、未部署

## 目标与边界

本次工作优化 AITalk 晚间课程体系与对话体验：

- 课程路径按学生当前 L1-L5 Level 展示，按 Unit 组织；
- 自由对话可从八个稳定话题中选择；
- Tutor 根据学生 Level 调整句长、提问、纠错和脚手架；
- 自由对话与复习模式不得写入课程完成、分数或进度；
- 页面同时适配手机与电脑屏幕。

未执行 Git 提交、远程推送、PR、部署、数据库迁移、线上配置修改或真实用户数据操作。`aitalk_ef` 中原有的未跟踪课程内容脚本、迁移和 seed 文件保持未改动。

## 源码基线与交接包

- Web 基线：`aitalk-web` `main`，commit `e2bf4372f94b62ab0761127a530029ad22f96636`
- Data/Edge 基线：`aitalk_ef` `main`，commit `44b82c50ed12bcd4291e029eef6ca854d61a1eec`；该仓库在开始前已领先远端 1 个提交
- Worker：`aitalk_cf/course-tutor-agent` 目录没有独立 Git 元数据
- 交接 ZIP：`aitalk-course-conversation-source.zip`
- ZIP 大小：29,388,989 bytes
- ZIP SHA-256：`8da34457edb09096e6d04a76ee78295c4b15b8d549f7294189c23cb76233d0b7`
- ZIP 条目数：916

打包时排除了 `.git`、`node_modules`、`.next`、构建产物、缓存、数据库/运行状态、浏览器状态和所有 `.env*`。上传副本中的三个公开 Supabase anon JWT 字面量也替换成了占位符，本地源码没有因此被修改。上传前和最终复核均未发现 API Key、Token、私钥或 JWT；文件名检查没有发现凭据文件。压缩包中的 `src/shared/lib/cookie.ts` 是 Cookie 工具源码，不是 Cookie 数据或浏览器状态。

## ChatGPT Pro 协作记录

- [课程数据与计划一致性](https://chatgpt.com/c/6a697966-103c-83ec-987d-d129dd72791f)
- [响应式 UI 与自由话题流程](https://chatgpt.com/c/6a6986eb-0c94-83ec-9b2a-68640404cf57)
- [Tutor Worker 分级策略与模式隔离](https://chatgpt.com/c/6a698758-4160-83ec-b1ec-f75c61525faa)

课程数据对话的第一版补丁为 5,138 bytes，SHA-256 `03a69f83a0819058f82b42d9cb6f3f8cdc5a415e83bb73d634da552789b73371`。它在隔离 worktree 中可以通过类型检查，但格式检查失败，且存在静默吞错、并发重复、空 fallback、多个 `in_progress`、计划返回陈旧、创建/更新不补齐计划、完成后跨 Level 等问题，因此被拒绝并要求修正。

第二版文本补丁为 9,267 bytes，SHA-256 `3d5a2bf5ff14e9222b4133fc8e937640ee769f3d347a96ea6a37582818f7fda8`。再次复核发现同 Segment 约束没有真正生效、并发插入仍可能重复、返回计划仍可能陈旧、Level 未夹紧到 L1-L5。最终实现吸收了有效设计，但由 Codex 重写并补充合同测试，没有直接接受该补丁。

UI 对话最初只交付五段不完整片段，缺少完整页面流程、状态边界与可应用补丁；要求其缩小范围并交付完整话题流程后，ChatGPT Pro 达到当日限额。Worker 对话报告了 9,877 bytes 的补丁（其报告 SHA-256 为 `c2dcdf17acc1b8f1309eaefbf0063ad70729ae8153f47e9e6dae83828bddac39`）和 78,796 bytes 的变更 ZIP（其报告 SHA-256 为 `d356d9445d438cf5fdb7b01efb9707af0d3106c12f29f2a5b375a05d18ed0ded`），但附件在限额触发后无法下载，因而这两个 Worker 哈希未能独立复算，相关交付没有被直接采用。

## 最终实现

### 课程计划

- 新增可测试的 L1-L5 Level 规范化与 `1000` 分段排序；
- 兼容数据库现有 `2101`、`5405` 一类排序号；
- 计划补齐使用幂等 upsert，不删除历史、不降级完成状态；
- 当前课程从学生当前 Level 的可见计划中选择；
- 后端推进与 UI “下一课”均限制在同一 Level Segment；
- 课程路径改为 Level → Unit → Lesson，并展示 Unit 进度、预计时长、当前/已完成/待学习状态。

### 自由对话

- 新增 Daily life、Travel、Food、Hobbies、Study、Work、Culture、Dreams & goals 八个话题；
- 新增桌面四列、手机单列的响应式话题选择页；
- 话题 key 使用本地白名单，标题和上下文去控制字符并限制长度；
- 保留原有数字型 Explore 话题链接兼容性；
- `topic_free` 不加载或变更学习计划，不传 `planId`，不调用完成动作；
- 明确区分 `guided`、`review`、`completed_lesson_free`、`topic_free` 四种模式。

### Tutor 策略与安全边界

- Web、Cloudflare Worker 和 Supabase Edge fallback 统一传递/识别 Level、模式与话题字段；
- L1-L5 分别采用不同的句长、问题复杂度、纠错强度和脚手架；
- Worker 的 `topic_free` 模式没有课程/进度工具；
- 非 `guided` 模式强制 `task_passed=false`、`should_complete_lesson=false`、`score=0`、`report_available=false`；
- 话题上下文被视为不可信数据，并进行长度和控制字符限制；
- 保留旧 `lesson_mode` 请求的兼容映射。

### 工程门禁

- 新增 ESLint 9 flat config，使仓库的 `pnpm lint` 可以真正启动；
- 新增 Web 课程计划/话题合同测试；
- 新增 Worker 分级/模式/输入边界测试。

## 独立验收结果

| 检查                                        | 结果                                                |
| ------------------------------------------- | --------------------------------------------------- |
| Web `pnpm exec tsc --noEmit`                | 通过                                                |
| Web `pnpm run test:aitalk`                  | 通过，9/9                                           |
| Web 变更文件 Prettier                       | 通过                                                |
| Web 新增核心、话题路由和课程 UI 目标 ESLint | 通过                                                |
| Web `pnpm run build:next`                   | 通过，包含 `/[locale]/app`、`/lessons`、`/practice` |
| Worker `npm run check`                      | 通过                                                |
| Worker `npm test`                           | 通过，4/4                                           |
| Supabase fallback `deno check`              | 通过                                                |
| Web 与 Edge `git diff --check`              | 通过                                                |
| 本地生产服务器 HTTP 冒烟                    | 未登录请求返回预期 307 到登录页                     |
| 视觉检查                                    | 1440×1000 与 375×812 均无横向溢出                   |
| 最终变更密钥扫描                            | 未发现凭据                                          |

视觉检查使用临时、无数据库写入的 mock 页面验证话题卡片与课程路径布局，检查完成后已删除该页面。它只证明响应式布局和视觉状态，不代表真实 Supabase 数据、真实 Tutor、麦克风、STT 或 TTS 的生产验证。

全仓 `pnpm lint` 运行完成但未通过：共 694 项（456 errors、238 warnings），主要是模板、脚本和历史源码中的 `no-explicit-any`、React 19 hooks/purity 规则和已有图片警告。本次新增的计划/话题核心、话题路由、选择器和课程路径目标集合通过 ESLint；没有为了本功能批量改写 456 个无关错误。

## 尚未验证的风险

- 没有 AITalk 产品账号会话，因此未用真实用户课程数据走完登录后的完整 E2E；
- 未调用真实 Tutor 模型、STT、TTS 或麦克风权限，不能声称语音和模型生产链路已验证；
- 没有连接真实 Supabase 做并发写入或 RLS 集成测试；幂等与模式隔离由源码审查和纯合同测试覆盖；
- Worker 与 Supabase fallback 都未部署，线上仍不会获得这些改动；
- 全仓 lint 存量债务仍需独立治理。

## 当前代码状态

所有实现仅存在于本地工作区。没有创建 Git commit，没有推送远端，没有创建 PR，没有部署，没有执行数据库迁移，也没有操作真实用户数据。
