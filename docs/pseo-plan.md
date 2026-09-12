# HoodScan：低资源 PSEO 评审与实施

## 结论

采用「限额快照发布 + PostgreSQL + 按需 ISR」，先做 300 个 token、500 个关联地址。
第一阶段无需 CDN 也能把这些页面的上游调用移出请求路径。Cloudflare 可以后加，但必须正确隔离 HTML / RSC，不能直接对整个 `/token/*` 做 Cache Everything。

本次代码已在 `codex/bounded-pseo-snapshots` 本地分支实施。未修改生产数据库、未推送远端、未部署网站、未配置 Cloudflare。

## 原方案需要纠正的地方

1. **大方向正确，实际调用不止 6 次。** token 主页面原本是动态页面，风险分析还会调用 RPC；全站 `TickerBar` 的 12 秒 RPC 数据缓存会影响路由再验证频率。现在风险分析和顶部 gas 数据都在定时任务中完成。
2. **`Suspense` 不等于静态外壳。** 当前项目没有启用相应的局部预渲染架构；在同一路由里使用 `headers()` 或动态数据不能靠套 `Suspense` 保证传统 ISR。此次统一返回快照，不根据 UA 区分内容。[Next.js ISR](https://nextjs.org/docs/app/guides/incremental-static-regeneration)
3. **Google 忽略 `changefreq` 和 `priority`。** `hourly` 不会让 Google 每小时抓一次；真正应修正的是可信的 `lastmod`、URL 质量、重复页面和实际响应成本。[Google sitemap 说明](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
4. **不是生成几千页就违规，也没有保证收录的页数阈值。** 风险在于以操纵排名为目的大规模生产低价值页面。只有余额或尘埃转账并不足以证明值得索引。[Google scaled content abuse](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content)
5. **Cloudflare 不默认缓存 HTML，也不能承诺 90% 命中。** Next 的 HTML 和 RSC 内容必须隔离，私有/错误响应不得强行缓存。[Cloudflare 默认行为](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)、[Next.js CDN 指南](https://nextjs.org/docs/app/guides/cdn-caching)
6. **GitHub Actions 托管计算免费有条件。** 公共仓库标准 runner 免费不代表数据库、流量、上游 API 和存储零成本，调度也不保证准点。[GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

## 已实现的行为

| 部分 | 行为 |
| --- | --- |
| `/token/[address]` | 只读成功快照；1 小时 ISR；数据摘要、canonical、更新时间、风险报告 |
| `/address/[address]` | 已发布地址读快照；只有达到内容门槛的页面可索引 |
| holders / transfers | 复用主快照，1 小时 ISR，暂时 noindex，避免薄内容扩张 |
| 未发布地址 | Node proxy 返回统一的 noindex 轻页面，给 Blockscout 实时入口；不进入 ISR |
| 未发布 token | Node proxy 返回 404，给对应 Blockscout 实时入口；不触发上游探测 |
| 无效地址 / 大小写 | 无效值直接 404；混合大小写地址 308 到小写 canonical |
| token OG 图片 | 读快照，去掉服务端远程 token 图标下载 |
| sitemap | 只列成功且 indexable 的 token/address；不再猜测哪些 token 有 pools；修正 DEX 重定向 URL |
| robots | 修正 sitemap 域名；允许访问快照页以读取 noindex；保留 block/tx 保护 |
| DB 故障 | 页面读取抛错，ISR 可保留上次内容；入口目录不可用时 503 + Retry-After，1 分钟重试退避 |
| 上游故障 | 严格获取模式抛错，单个快照失败不覆盖旧记录，任务报告失败 |

`proxy.ts` 替代已弃用的 `middleware.ts`，使用 Next.js 16 的 Node runtime。发布目录每个进程最多每分钟查询一次，并合并并发刷新；硬上限 10,000 个已发布 key。未知 URL 不制造 Next ISR 磁盘条目。对于已发布 key 的随机不存在子路径，仍应在边缘做普通请求限速。

`react.cache` 合并同一次渲染中 metadata 和正文的快照查询。冷渲染通常为一条页面快照查询加一条 network 查询；缓存命中时没有这两条查询。入口目录刷新独立于页面缓存，每个进程约每分钟最多一次。没有承诺所有请求严格只有一次 SQL。

## 后台预算和新鲜度

`npm run snapshot` / `.github/workflows/snapshot.yml` 每小时第 17 分钟运行：

- 候选 token 最多 300；持币人数 >= 10，且有流动性、交易量或验证信号，排除已知 scam。
- 每次最多刷新最久未更新的 20 个 token，保留 top 20 holders 和最近 20 transfers。
- 从成功 token 的 creator / holders 生成最多 500 个关联地址，每次最多刷新 40 个。
- 地址索引门槛：快照展示至少 5 条交易，且展示持仓包含合格 token。不推断实名，不自动冠以“官方”或“巨鲸”。
- 每个地址约 3 次上游请求；每个 token 3–4 次 Blockscout 请求，另有风险分析 RPC（当前最多 7 次）。单次上界约 341 次请求，包括 gas；串行实体处理、实体间暂停 500ms。
- 软运行预算 10 分钟；GitHub job 硬超时 12 分钟。单个实体正在执行时可能越过软预算；调度延迟或错误会拉长覆盖周期。
- 满额且成功时，token 全量约 15 小时，地址约 13 小时，再加按需 ISR 的约 1 小时窗口。**每小时任务不等于每个地址每小时更新。** ISR 在后续访问时刷新，不是后台定时推送。
- 所有快照显示采集时间，不能把这些数据宣传为实时价格或实时余额。现有 5 分钟市场数据任务保持原样。
- `content_updated_at` 只在 payload 或 indexable 变化时更新；检查时间单独存储。单条 upsert 原子更新。
- PostgreSQL advisory lock 和 workflow concurrency 防止快照任务重叠；非 indexable 且 30 天未更新的历史记录清理。

如果新鲜度比成本更重要，可将 token batch 从 20 提高到 50，或把市场字段从重快照中分离为独立的批量 DB 更新。先测量上游 429、任务时长和数据库压力，不先扩大全链同步。

## 上线顺序（必须先有数据再切页面）

1. 在现有 PostgreSQL 执行增量迁移，保留原有表：

   ```sh
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001-seo-snapshots.sql
   ```

2. 确认原来的 `npm run sync` 已成功写入真实 token 数据。运行 `npm run snapshot` 首次填充；新建表本身不会自动产生页面。现有 GitHub `DATABASE_URL` secret 需要能读原表、写新表。不要在网页请求时执行迁移。
3. 在数据库检查真实内容和覆盖量：

   ```sql
   SELECT kind, indexable, count(*), min(fetched_at), max(fetched_at)
   FROM seo_snapshots GROUP BY kind, indexable;
   SELECT address, payload->'token'->>'name', fetched_at
   FROM seo_snapshots WHERE kind='token' AND indexable LIMIT 10;
   ```

4. **部署门槛：** 必须已有真实可索引 token 快照；抽查 holders、交易、风险数据正确。有价值 token 未进入快照时会改为 404，未收录地址改为外部实时入口，这是明确的功能取舍。先把重要 token 的快照填好再发布。
5. 新构建容器，运行生产版本。Docker build 不需要 `DATABASE_URL`，运行时需要；proxy 和页面都必须能访问同一个数据库。Next cache 路径需要可写。使用单副本起步，多副本会各自刷新 ISR 和目录；共享缓存需要另行设计。
6. 让 hourly workflow 在默认分支生效，或先手动执行。仅在本地创建 workflow 不会启动远端调度。
7. 验证真实页面、robots、sitemap，再向 Search Console 提交 `/sitemap.xml`。
8. 若回滚：部署之前的应用版本即可；新表可保留，停用 snapshot workflow，无需删除现有数据。

## Cloudflare：第二阶段配置建议

当前未接入或修改 Cloudflare。建议先用 Next ISR 跑一周确认收益，再在实际站点账户中配置：

- 对已验证可缓存的公开 HTML GET/HEAD 设置短 TTL，例如 5–10 分钟；保留源站更严格的 `private` / `no-store`。
- RSC、Next Router prefetch / state headers、`_rsc` query、Server Actions、带 Authorization/Cookie 的请求先全部绕过共享 HTML 缓存。排除 OG 图片、API、Next 静态资源的通配混用；图片可单独配置。
- 不缓存入口的未发布提示、404、503，尤其不能把 no-store 覆盖成 Cache Everything。
- 测试正常浏览器首次访问、站内导航、预取、不同查询串和 Googlebot；确认 Content-Type、正文以及缓存 key 不混淆。
- 按日志实施限速，已验证搜索引擎流量单独处理。UA 自报不是身份认证，不将 Bot Fight Mode 当成通用 SEO 开关。

免费计划上规则字段、数量和安全功能的可用性需要在实际账户确认；不依赖未确认的功能。

## 验证与后续监控

本地执行：

```sh
npm ci
npm run test:seo
npx tsc --noEmit
npm run build
npm run test:seo:smoke
```

数据库测试用隔离的 PGlite PostgreSQL 引擎，覆盖重复迁移、lastmod、NUMERIC、地址校验、上游失败不伪装成成功。生产 smoke 使用显式 opt-in 的数据库 fixture，禁止任何上游 fetch，验证 ISR HIT 不查 DB、UA 内容一致、随机地址 no-store、大小写 canonical、noindex 和 sitemap 成员资格。测试需要本机端口 34817。

Smoke 会写入本地 `.next` 测试缓存；上线前重新构建，绝不能部署测试后的构建目录。测试文件不参与应用运行。

监控：小时快照任务成功率、最旧 fetched_at、上游调用/429 数、容器 CPU/RSS、PG 连接数与慢查询、ISR 磁盘体积、Googlebot 的真实回源次数和 Search Console 收录质量。拿到这些数据之后再扩大 token/address 上限。

不包含整站首页、排行榜、tx/block 实时功能的全面重写；这些原有页面仍可能调用上游。本次“零上游”范围是 token/address 快照详情及对应子页的服务端访问路径；浏览器主动加载 GeckoTerminal 图表不经过本站服务器。
