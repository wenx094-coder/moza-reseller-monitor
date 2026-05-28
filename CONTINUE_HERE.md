# MOZA Reseller Monitor — 会话恢复点

## 已完成
- ✅ 16 个 Instagram 经销商 handles 已核实（`simu.fy` 修正等）
- ✅ 仪表盘亮色主题 + 大洲分组 + 品牌选择器 + 品牌标签
- ✅ 多品牌检测（MOZA, Fanatec, Logitech G, Simucube, Thrustmaster, Simagic, Turtle Beach, PXN）
- ✅ Apify proxy 已启用（绕过 Instagram 屏蔽）
- ✅ 默认品牌过滤器设为 `all`（所有大洲可见）
- ✅ 每周品牌曝光报告脚本 (`scripts/weekly-report.js`) — 支持钉钉加签发送
- ✅ 两个 GitHub Actions workflows 已就绪：
  - `refresh-data.yml` — 24h cron + 手动触发抓取帖子
  - `weekly-report.yml` — 每周一 1:00 UTC 生成报告发送钉钉
- ✅ 钉钉 Webhook 已测试通过（`errcode: 0`）
- ✅ GitHub Secrets 已添加（`DINGTALK_WEBHOOK_URL` + `DINGTALK_WEBHOOK_SECRET`）

## 待办
- ❌ **推送本地 commit 到 GitHub**（网络不通 `github.com:443`）
  - 本地有 2 个 commit 待推送：
    - `e7c2e70` — fix: correct Simufy handle
    - `aa907fd` — feat: add weekly DingTalk brand report with signing
  - 在能连 GitHub 的网络下运行：`cd C:\Users\wenx0\moza-monitor && git push origin master`

## 后续可选
- 添加 YouTube 频道监控
- 扩展品牌检测覆盖更多竞品
- 增加更多经销商

## 项目路径
`C:\Users\wenx0\moza-monitor\`
