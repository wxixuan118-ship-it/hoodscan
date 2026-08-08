# HoodScan 实施计划

> 基于战略分析文档，按五阶段拆解为具体任务、工作量和验收标准。
> 优先原则：用户任务优先于数据库浏览；SEO 价值优先于功能完整度。

---

## 阶段一：导航 + 搜索 + Token 详情模板
**目标**：把"数据表集合"变成"任务驱动入口"
**预估工期**：3–4 周
**影响**：直接改善所有现有用户体验，同时铺设 SEO 基础

### 任务清单

#### 1.1 全局导航重构
| 任务 | 详情 | 工作量 |
|------|------|--------|
| 一级菜单重组 | Explore / Tokens / Analytics / Resources 四组；移除 Wallet 一级入口 | 1 天 |
| Explore 下拉 | Blocks · Transactions · Contracts · Verified Contracts | 0.5 天 |
| Tokens 下拉 | All Tokens · Token Transfers · Trending · New Tokens | 0.5 天 |
| Analytics 下拉 | Network Overview · Gas Tracker · Top Accounts · DEX Activity | 0.5 天 |
| Resources 下拉 | About · Add Network · Bridge Guide · Developer Resources | 0.5 天 |
| 状态胶囊 | 右上角显示 "Robinhood Mainnet · Live"，Tooltip 展示 Chain ID 4663 | 0.5 天 |
| Connect Wallet 按钮 | 右上角主操作入口 | 1 天 |

**验收**：点击每个菜单项都能落地到对应页面；移动端折叠菜单正常；搜索框在移动端固定显示。

#### 1.2 搜索框能力升级
| 任务 | 详情 | 工作量 |
|------|------|--------|
| 自动类型识别 | `0x` + 42 位 → 地址；`0x` + 66 位 → 交易；纯数字 → 区块；其他 → Token 搜索 | 1 天 |
| 下拉分类结果 | 不等待完整输入即展示分类候选，标注 Wallet / Contract / Token Contract | 2 天 |
| 最近搜索 | 本地存储最近 5 条，打开搜索框时展示 | 0.5 天 |
| Token 搜索防假币 | 结果同时显示名称、Symbol、合约地址片段和风险状态 | 1 天 |
| ENS / 标签支持 | 后期扩展预留接口，本阶段设计好数据结构 | 0.5 天 |

**验收**：输入任意有效哈希/地址/区块号，1 秒内出结果；Token 搜索能区分同名代币。

#### 1.3 Token 详情页模板（`/token/{contract}`）
这是 P0 SEO 核心页面。

| 区块 | 内容 | 数据源 |
|------|------|--------|
| Header | Logo · 名称 · Symbol · 合约地址（可复制）· 链接：官网/社媒 | CoinGecko + 项目方 |
| 价格区 | 当前价格 · 24h 涨跌 · 24h 成交量 · 市值 · FDV · 流通量/总量 | GeckoTerminal |
| 图表 | OHLCV 蜡烛图，默认 1D，支持 1H/4H/1W | GeckoTerminal |
| 流动性 | 各 DEX 池子列表（池名、流动性、成交量、价格）→ 链接到 `/token/{contract}/pools` | GeckoTerminal |
| 风险信号 | 可升级代理 · 铸币权限 · 所有权放弃 · 持仓集中度 · 流动性锁定 | 合约 ABI + holders |
| 合约信息 | 验证状态 · 精度 · 创建时间 · 创建者地址 | Blockscout |
| 持币者 | Top 10 + 总数，链接到 `/token/{contract}/holders` | Blockscout |
| 最新转账 | 最近 10 条，链接到 `/token/{contract}/transfers` | Blockscout |
| 结构化数据 | `schema.org/FinancialProduct` + `BreadcrumbList` | SSR 输出 |
| Meta | `<title>{Name} ({SYMBOL}) on Robinhood Chain` · OG 图 | SSR 输出 |

**验收**：Google 抓取工具可见所有核心数据；页面首屏无 "Loading…" 字样；LCP < 2.5s。

#### 1.4 Tokens 列表页瘦身
| 任务 | 详情 | 工作量 |
|------|------|--------|
| 默认列简化 | 仅保留：Token · Price/24h · 24h Volume · Liquidity · Holders · Verified | 0.5 天 |
| 列配置器 | 用户可勾选显示更多字段（市值、精度、供应量等） | 1 天 |
| Verified 拆分 | 明确区分 Contract Verified / Token Identified / Risk Checked 三种状态 | 1 天 |
| 收录门槛标注 | 表格底部注明：已识别 + 有流动性 + 有近期交易才进入默认视图 | 0.5 天 |

---

## 阶段二：Token 子页面 + 排行榜
**目标**：形成 Token 生态的内部链接网络，承接长尾搜索
**预估工期**：3 周
**前置条件**：Token 详情页模板完成

### 任务清单

#### 2.1 Token 子页面
| 页面 | URL | 核心内容 | 数据源 |
|------|-----|----------|--------|
| Holders | `/token/{contract}/holders` | 持币者排行榜、集中度图、Top 10/50 占比 | Blockscout |
| Transfers | `/token/{contract}/transfers` | 最新转账列表，可筛选时间/金额/地址 | Blockscout |
| Pools | `/token/{contract}/pools` | 各 DEX 池子，价格/流动性/成交量/交易数 | GeckoTerminal |

每个子页面需要：
- 面包屑：首页 → Tokens → {Token Name} → {子页面}
- `<link rel="canonical">` 指向自身
- 分页 > 第 3 页使用 `noindex, follow`

#### 2.2 排行榜页面
| 页面 | URL | 排序依据 | 刷新频率 |
|------|-----|----------|----------|
| Trending | `/tokens/trending` | GeckoTerminal trending score | 每 5 分钟 |
| New Tokens | `/tokens/new` | 合约创建时间 + GeckoTerminal 新池 | 每 10 分钟 |
| Top Gainers | `/tokens/top-gainers` | 24h 价格涨幅 | 每 5 分钟 |
| Most Traded | `/tokens/most-traded` | 24h 成交量/交易数 | 每 5 分钟 |
| Most Held | `/tokens/most-held` | Holder 数量 | 每小时 |
| High Liquidity | `/tokens/high-liquidity` | 总流动性 | 每 15 分钟 |

每个页面需要：
- SSR 输出前 50 条数据的完整内容
- 50 条以上的分页用 `noindex, follow`
- 页面描述中明确时间范围（"过去 24 小时"）
- JSON-LD: `ItemList`

#### 2.3 DEX 页面
| 任务 | URL | 内容 |
|------|-----|------|
| DEX 总览 | `/dex` | 各 DEX 流动性、成交量、池数、交易数排名 |
| DEX 详情 | `/dex/{dex-name}` | 该 DEX 所有池子，Top 池子，统计数据 |

数据源：GeckoTerminal pools by DEX，按 Robinhood Chain 网络筛选。

---

## 阶段三：地址 + 交易详情质量增强
**目标**：让地址页和交易页从"哈希查询"升级为有价值的 SEO 页面
**预估工期**：3–4 周
**注意**：不是所有地址都应被索引

### 收录策略（进入 sitemap 的门槛）

**地址页** 至少满足其中一项：
- ETH 余额 > 0.01
- 持有已识别 Token
- 有标签（合约名、项目名）
- 交易数 > 20

**交易页**：仅收录已成功、涉及 Token 转移或合约调用的交易；纯 ETH 转账不主动收录但保留访问。

**区块页**：仅收录每 100 个高度的"里程碑"区块，或交易数 > 50 的区块。

### 任务清单

#### 3.1 地址详情页（`/address/{address}`）
| 区块 | 内容 |
|------|------|
| Header | 标签（如已知：Exchange / DEX / Project）· 余额 · ETH 价值 |
| Token 持仓 | 已识别 Token 持仓列表 + 总估值 |
| 交易历史 | 分页，支持筛选（普通/内部/Token 转账） |
| 合约信息 | 若为合约：验证状态、ABI、创建者、创建块 |
| 风险提示 | 若地址在已知黑名单/诈骗数据库中 |

#### 3.2 交易详情页（`/tx/{hash}`）
| 区块 | 内容 |
|------|------|
| 状态 | Success / Failed + 错误原因（Revert message） |
| 基础信息 | 时间 · 区块 · 确认数 · Nonce |
| Gas | Gas Price · Gas Used · Gas Limit · 交易费 |
| 地址 | From · To（合约调用方法名） |
| Token 转移 | 涉及的 ERC-20/ERC-721 转移列表 |
| 内部交易 | 合约间调用树 |
| 原始数据 | Input Data 解码（如合约已验证） |

#### 3.3 标签系统
| 任务 | 内容 |
|------|------|
| 已知地址库 | 整合 Robinhood 官方地址、主流 DEX 合约、桥合约、稳定币发行方 |
| 社区提交入口 | 允许用户提交地址标签，人工审核后上线 |
| 标签显示 | 在搜索结果、交易 From/To、地址 Header 中统一显示 |

---

## 阶段四：网络统计 + Gas Tracker
**目标**：承接"Robinhood Chain 网络状态"类搜索
**预估工期**：2–3 周
**前置条件**：自建数据聚合层基本就绪

### 任务清单

#### 4.1 Gas Tracker（`/gas-tracker`）
| 任务 | 内容 |
|------|------|
| 实时 Gas | 低/标准/快速 Gas Price（Gwei）+ 预估时间 |
| 历史图表 | 24h/7d/30d Gas Price 趋势 |
| Gas 换算器 | 输入 Gas Limit，自动计算 ETH 和美元费用 |
| SSR | 页面加载时即显示最近一次有效 Gas 读数 |

数据源：RPC `eth_gasPrice` + `eth_feeHistory`；每 15 秒刷新。

#### 4.2 网络统计页（`/stats`）
| 指标 | 图表类型 | 时间粒度 |
|------|----------|----------|
| 每日交易数 | 折线 | 日 |
| 每日活跃地址 | 折线 | 日 |
| 平均 Gas | 折线 | 日/小时 |
| 新合约数 | 柱状 | 日 |
| Token 转账量 | 折线 | 日 |
| TPS（实时） | 仪表盘 | 实时 |

URL 模板：`/stats/daily-transactions/{date}` · `/stats/active-addresses/{date}`（可被搜索引擎收录的静态快照）

#### 4.3 Top Accounts（`/accounts`）
按余额排序的地址排行榜；显示标签；链接到地址详情页。

---

## 阶段五：RWA / Stock Token Registry（差异化壁垒）
**目标**：建立 HoodScan 区别于通用浏览器的核心竞争力
**预估工期**：4–6 周（含人工审核流程建立）
**前置条件**：Token 详情页完成；团队有能力维护资产 registry

### 任务清单

#### 5.1 建立资产 Registry
| 字段 | 说明 |
|------|------|
| 资产类型 | Stock / ETF / Stablecoin / RWA Other |
| 标的资产 | 如 AAPL、SPY、USD |
| 链上合约地址 | 经人工核实的官方地址 |
| 发行方 | 机构名称和官网 |
| 司法辖区 | 资产受何处监管 |
| 官方披露链接 | 文件/招募说明书链接 |
| 审核状态 | Pending / Verified / Rejected |

**严格要求**：不可自动推断，每条记录必须人工审核；防止仿冒资产混入。

#### 5.2 Stock Tokens 页面（`/stock-tokens`）
| 区块 | 内容 |
|------|------|
| 总览 | 已上链资产数、总市值、24h 成交量 |
| 分类筛选 | Stocks · ETFs · Stablecoins · Other RWA |
| 资产列表 | 名称/标的 · 发行方 · 价格 · 持币者 · 合约 |
| 免责声明 | 明确说明 HoodScan 是独立数据平台，非 Robinhood 官方产品 |

#### 5.3 Stock Token 详情页（`/stock-token/{symbol}`）
在 Token 详情页模板基础上增加：
- 标的资产信息（股票代码、交易所、标准股价）
- 链上价格与场外价格对比
- 发行方信息和官方文件链接
- Registry 来源标注

#### 5.4 RWA 分类页（`/rwa`、`/rwa/{category}`）
| URL | 内容 |
|-----|------|
| `/rwa` | RWA 总市值、资产数、24h 成交量、持有人数 |
| `/rwa/stocks` | 股票型 Token |
| `/rwa/etfs` | ETF 型 Token |
| `/rwa/stablecoins` | 稳定币（按发行方和抵押类型区分） |

---

## 数据层建设（贯穿所有阶段）

### 建议架构

```
RPC / Blockscout API / GeckoTerminal API
              ↓
        定时抓取 Ingestion（每 5-60 分钟）
              ↓
   Postgres / ClickHouse 标准化数据层
   Token · Address · Pool · Block · DailyStats
              ↓
    内部 API → 页面 SSR/ISR → Sitemap 生成
```

### 关键决策

| 决策点 | 建议 |
|--------|------|
| Blockscout API 迁移 | 尽早封装 adapter，隔离页面逻辑与 API 版本 |
| GeckoTerminal 接入 | 使用 `/networks/robinhood/pools` 端点，按 volume 排序即可获得趋势 |
| 聚合层刷新 | Token 价格 5 分钟；排行榜 5-15 分钟；日统计每日 0 点 |
| 页面缓存 | Token 详情 ISR 1 分钟；排行榜 ISR 5 分钟；地址页 ISR 30 秒 |
| Sitemap | 分 Token / Address / Tx / Block 四个子 sitemap，总条目 < 50,000 |

---

## SEO 红线（整个项目期间持续遵守）

1. **核心数据必须 SSR 输出**——不允许 "Loading…" 出现在 Google 抓取结果中
2. **深分页统一 `noindex, follow`**——列表第 3 页及以后
3. **低质量页面不进 sitemap**——地址、Token 收录门槛见阶段三
4. **自动摘要必须引用真实数据**——不写"这是一个 ERC-20 Token"，要写"持币者 1,234 个，24h 成交量 $23,000"
5. **品牌关系声明**——页脚和 Token/RWA 页面持续显示"HoodScan 是独立数据平台，与 Robinhood 无官方关联"

---

## 优先级速查

| 阶段 | 关键交付 | 预计完成 | 解锁价值 |
|------|----------|----------|----------|
| **1** | 导航重构 · 搜索升级 · Token 详情页 | 3–4 周 | 现有用户留存 + Token 搜索流量 |
| **2** | Token 子页面 · Trending/New/Gainers · DEX | +3 周 | 长尾搜索 + 内链网络 |
| **3** | 地址/交易详情 + 标签系统 + 收录门槛 | +3–4 周 | 用户任务完成率 + 索引质量 |
| **4** | Gas Tracker · 网络统计 · Top Accounts | +2–3 周 | 非品牌搜索 · 每日回访 |
| **5** | RWA Registry · Stock Token 页面 | +4–6 周 | 竞争壁垒 · 独特流量 |

> 如果只能选一个突破口：**Token 详情页模板**（阶段一 1.3）——它同时影响 SEO、用户体验和内部链接密度，是整个内容体系的根节点。
