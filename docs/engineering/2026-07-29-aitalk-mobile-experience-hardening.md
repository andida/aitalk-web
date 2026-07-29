# AITalk 移动端对话体验加固记录

日期：2026-07-29  
状态：本地修改已完成并验收；未提交、未推送、未部署

## 背景与基线

本轮是在课程体系、自由话题和 Dashboard 用户卡已经进入仓库之后，对手机端真实使用体验进行加固。开始修改时：

- 仓库：`aitalk-web`
- 分支：`main`
- 基线 commit：`c2f979b`
- Git 状态：干净，`main...origin/main`

原始源码交接包、密钥扫描和 ChatGPT Pro 协作记录见
[`2026-07-29-aitalk-course-conversation-upgrade.md`](./2026-07-29-aitalk-course-conversation-upgrade.md)。
该交接包基于更早的 Web commit `e2bf4372f94b62ab0761127a530029ad22f96636`，
大小 29,388,989 bytes，SHA-256
`8da34457edb09096e6d04a76ee78295c4b15b8d549f7294189c23cb76233d0b7`。

相关 ChatGPT Pro 对话：

- [课程数据与计划一致性](https://chatgpt.com/c/6a697966-103c-83ec-987d-d129dd72791f)
- [响应式 UI 与自由话题流程](https://chatgpt.com/c/6a6986eb-0c94-83ec-9b2a-68640404cf57)
- [Tutor Worker 分级策略与模式隔离](https://chatgpt.com/c/6a698758-4160-83ec-b1ec-f75c61525faa)

## 本轮实现

### 练习对话

- 新消息、导师启动状态、等待状态和错误状态出现时自动保持最新消息可见；
- 监听 `visualViewport` 变化，手机软键盘打开或收起时重新保持对话末尾可见；
- 使用 `ResizeObserver` 实时测量底部输入器高度，动态设置页面底部留白；
- 语音输入和文字输入切换后，最后一条消息不会被固定输入器覆盖；
- Tutor 请求失败后提供原位 `Try again`，复用同一份 transcript，不重复插入学生消息；
- 自动开场失败也可重试；
- 已收到导师回复但课程进度保存失败时，不会重发导师请求或制造重复回复；
- 麦克风/STT/TTS 错误提供 `Use text` 和 `Dismiss` 降级路径；
- 对话区增加 `role="log"`、`aria-live="polite"`；
- 图标型录音、发送和输入模式按钮补充可访问名称；
- 消息播放按钮和错误操作达到至少 44px 触控高度。

### 手机导航与登录

- Dashboard 底部导航加入 `safe-area-inset-bottom`；
- 主内容底部留白同步计算安全区，避免最后一段内容被导航遮挡；
- 桌面和手机主导航增加 `aria-label` 与 `aria-current="page"`；
- 登录密码显隐按钮从 36px 扩大到 44px。

### 空状态

- Tutor 空状态不再暴露数据库表名；
- Speaking prompts 为空时展示学生可理解的说明和 `Start free practice` 降级入口。

## 独立验收

| 检查                     | 结果                                 |
| ------------------------ | ------------------------------------ |
| `pnpm exec tsc --noEmit` | 通过                                 |
| `pnpm test:aitalk`       | 通过，11/11                          |
| 4 个改动文件 Prettier    | 通过                                 |
| 4 个改动文件 ESLint      | 0 error；6 个既有 warning            |
| `git diff --check`       | 通过                                 |
| `npm run build`          | 通过，OpenNext Cloudflare build 完成 |
| 手机视觉检查             | 375×812 通过，无横向溢出             |
| 桌面视觉检查             | 1440×900 通过，无横向溢出            |
| 浏览器控制台             | 0 error                              |

375×812 的实测数据：

- 语音输入器高 106px，页面动态底部留白 130px；
- 文字输入器高 184px，页面动态底部留白 208px；
- 底部导航高 73px，每个入口最小触控高度 56px；
- `documentElement.scrollWidth === window.innerWidth === 375`；
- 当前导航项能读到 `aria-current="page"`。

1440×900 下：

- 主内容从 288px 侧边栏之后开始；
- 手机固定输入器不渲染为可见元素；
- 侧边栏、用户卡、对话和桌面输入器均正常显示；
- 页面无横向溢出。

视觉验收使用临时 mock 路由，不读取或写入真实用户数据；检查完成后该路由已删除。

完整 `pnpm lint` 也已执行，但仓库基线仍有 692 项（455 errors、237 warnings），
主要位于模板脚本、支付、管理后台和通用组件。本轮没有扩大范围批量改写这些历史问题。
OpenNext 打包阶段打印了可恢复的依赖复制日志和一个既有重复 `case` warning，
最终命令退出码为 0，并输出 `OpenNext build complete`。

## 尚未验证

- 没有在真实 iPhone/Android 硬件上验证 Safari/Chrome 软键盘、刘海安全区和手势条；
- 没有使用 AITalk 产品账号完成真实登录、课程数据和会话恢复 E2E；
- 没有请求真实麦克风权限，也没有调用真实 Tutor、STT 或 TTS 生产链路；
- 失败重试逻辑已通过源码审查、类型检查和生产构建，但当前专项测试没有组件级网络故障注入；
- 全仓 ESLint 存量债务仍是独立风险。

## 权限与代码状态

本轮只修改本地源码并运行只读/本地测试。没有执行 Git commit、push、PR、部署、
数据库迁移、线上配置修改、生产功能启用或真实用户数据操作。
