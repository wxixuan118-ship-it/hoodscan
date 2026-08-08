import type { ContractInfo, ContractSourceInfo, IndexedToken, TokenHolder } from './blockscout';
import { callContract } from './robinhood-rpc';

export type RiskStatus = 'pass' | 'warn' | 'fail' | 'unknown';
export type RiskLevel = 'Low' | 'Medium' | 'High';

export type TokenRiskCheck = {
  key: string;
  label: string;
  status: RiskStatus;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  evidence: string;
};

export type TokenRiskReport = {
  level: RiskLevel;
  score: number;
  checks: TokenRiskCheck[];
  concentration: {
    top1: number;
    top5: number;
    top10: number;
  };
};

type AbiEntry = { type?: string; name?: string; stateMutability?: string; inputs?: unknown[] };

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const RENOUNCED_ADDRESS = '0x000000000000000000000000000000000000dead';
const FOUR_BYTES = /^0x[0-9a-fA-F]{8}$/;

const SELECTORS = {
  owner: '0x8da5cb5b',
  getOwner: '0x893d20e8',
  paused: '0x5c975abb',
  totalTax: '0x2d8a7f37',
  buyTax: '0x6d6b2e9a',
  sellTax: '0xe5b2c4a5',
  taxFee: '0x7a0ed627',
};

function getAbi(source: ContractSourceInfo | null): AbiEntry[] {
  const abi = source?.abi;
  if (Array.isArray(abi)) return abi.filter((item): item is AbiEntry => typeof item === 'object' && item !== null);
  if (typeof abi !== 'string') return [];
  try {
    const parsed = JSON.parse(abi) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is AbiEntry => typeof item === 'object' && item !== null) : [];
  } catch {
    return [];
  }
}

function sourceText(source: ContractSourceInfo | null): string {
  return `${source?.sourceCode || ''} ${JSON.stringify(source?.abi || '')}`.toLowerCase();
}

function hasFunction(abi: AbiEntry[], names: string[]) {
  const wanted = new Set(names.map(name => name.toLowerCase()));
  return abi.some(entry => entry.type === 'function' && entry.name && wanted.has(entry.name.toLowerCase()));
}

function hasWritableFunction(abi: AbiEntry[], names: string[]) {
  const wanted = new Set(names.map(name => name.toLowerCase()));
  return abi.some(entry => (
    entry.type === 'function' &&
    entry.name &&
    wanted.has(entry.name.toLowerCase()) &&
    entry.stateMutability !== 'view' &&
    entry.stateMutability !== 'pure'
  ));
}

function containsAny(text: string, words: string[]) {
  return words.some(word => text.includes(word.toLowerCase()));
}

function decodeAddress(result: string | null) {
  if (!result || result.length < 66) return null;
  return `0x${result.slice(-40)}`;
}

function decodeBool(result: string | null) {
  if (!result || result.length < 66) return null;
  return BigInt(result) !== BigInt(0);
}

function decodeUint(result: string | null) {
  if (!result || result.length < 66) return null;
  return BigInt(result);
}

function compactPercent(value: number) {
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

async function readOwner(address: string) {
  const owner = decodeAddress(await callContract(address, SELECTORS.owner));
  if (owner) return owner;
  return decodeAddress(await callContract(address, SELECTORS.getOwner));
}

async function readPaused(address: string) {
  return decodeBool(await callContract(address, SELECTORS.paused));
}

async function readTax(address: string) {
  const selectors = [SELECTORS.totalTax, SELECTORS.buyTax, SELECTORS.sellTax, SELECTORS.taxFee].filter(selector => FOUR_BYTES.test(selector));
  const values = await Promise.all(selectors.map(selector => callContract(address, selector).then(decodeUint)));
  return values.filter((value): value is bigint => value !== null);
}

export async function analyzeTokenRisk(args: {
  token: IndexedToken & { liquidity?: number | null };
  holders: TokenHolder[];
  contract: ContractInfo;
  source: ContractSourceInfo | null;
}): Promise<TokenRiskReport> {
  const { token, holders, contract, source } = args;
  const abi = getAbi(source);
  const text = sourceText(source);
  const top1 = holders[0]?.percentage || 0;
  const top5 = holders.slice(0, 5).reduce((sum, holder) => sum + holder.percentage, 0);
  const top10 = holders.slice(0, 10).reduce((sum, holder) => sum + holder.percentage, 0);
  const checks: TokenRiskCheck[] = [];

  checks.push({
    key: 'holder-concentration',
    label: '持仓集中度',
    status: top1 >= 50 || top5 >= 80 ? 'fail' : top1 >= 25 || top5 >= 60 ? 'warn' : 'pass',
    severity: top1 >= 50 || top5 >= 80 ? 'high' : top1 >= 25 || top5 >= 60 ? 'medium' : 'low',
    summary: `Top 1 ${compactPercent(top1)} · Top 5 ${compactPercent(top5)} · Top 10 ${compactPercent(top10)}`,
    evidence: holders.length ? '由 Blockscout holders 接口按总供应量计算。' : 'Blockscout 暂未返回 holder 列表。',
  });

  const owner = await readOwner(token.address);
  const privileged = hasWritableFunction(abi, [
    'transferOwnership', 'renounceOwnership', 'grantRole', 'revokeRole', 'setRoleAdmin',
    'setFee', 'setFees', 'setTax', 'setTaxes', 'setBlacklist', 'blacklist', 'pause', 'unpause',
  ]) || containsAny(text, ['onlyowner', 'accesscontrol', 'default_admin_role']);
  const ownerRenounced = owner ? [ZERO_ADDRESS, RENOUNCED_ADDRESS].includes(owner.toLowerCase()) : false;
  checks.push({
    key: 'admin-permissions',
    label: '权限控制',
    status: ownerRenounced ? 'pass' : privileged ? 'warn' : owner ? 'warn' : 'unknown',
    severity: ownerRenounced ? 'low' : privileged ? 'medium' : 'medium',
    summary: ownerRenounced ? 'Owner 已放弃' : owner ? `Owner ${owner.slice(0, 8)}...${owner.slice(-4)}` : privileged ? '发现权限函数，未读到 owner' : '未识别到权限状态',
    evidence: privileged ? 'ABI/源码中包含 owner/role/admin 可写函数。' : '通过 owner()/getOwner() 与 ABI/源码关键词检测。',
  });

  checks.push({
    key: 'proxy-contract',
    label: '代理合约',
    status: contract.proxyType || contract.implementations.length ? 'warn' : 'pass',
    severity: contract.proxyType || contract.implementations.length ? 'medium' : 'low',
    summary: contract.proxyType ? `${contract.proxyType} proxy` : contract.implementations.length ? `${contract.implementations.length} implementation(s)` : '未发现代理结构',
    evidence: '来自 Blockscout address.proxy_type 与 implementations 字段。',
  });

  const mintable = hasWritableFunction(abi, ['mint', 'ownerMint', 'adminMint', 'issue', 'createTokens']) || containsAny(text, ['function mint', '_mint(', 'minter_role']);
  const burnOnlyMint = mintable && containsAny(text, ['onlyminter', 'onlyowner', 'accesscontrol']);
  checks.push({
    key: 'mintability',
    label: '增发能力',
    status: mintable ? 'fail' : source?.sourceCode || abi.length ? 'pass' : 'unknown',
    severity: mintable ? 'high' : 'low',
    summary: mintable ? (burnOnlyMint ? '存在受权限控制的 mint 能力' : '发现 mint/issue 增发入口') : '未发现增发入口',
    evidence: source?.sourceCode || abi.length ? '通过 verified ABI/源码关键词检测。' : '合约未提供 verified ABI/源码，无法判断。',
  });

  const blacklistable = hasWritableFunction(abi, ['blacklist', 'setBlacklist', 'setBlacklisted', 'addBlacklist', 'removeBlacklist', 'excludeFromTransfer']) || containsAny(text, ['blacklist', 'isblacklisted', 'denylist', 'blocklist']);
  checks.push({
    key: 'blacklist',
    label: '黑名单',
    status: blacklistable ? 'fail' : source?.sourceCode || abi.length ? 'pass' : 'unknown',
    severity: blacklistable ? 'high' : 'low',
    summary: blacklistable ? '发现黑名单/限制转账能力' : '未发现黑名单入口',
    evidence: source?.sourceCode || abi.length ? '通过 ABI 函数名与源码关键词检测。' : '缺少 verified ABI/源码。',
  });

  const pauseFunction = hasFunction(abi, ['paused']) || containsAny(text, ['pausable', 'whennotpaused', 'paused()']);
  const pausedNow = pauseFunction ? await readPaused(token.address) : null;
  checks.push({
    key: 'pausable',
    label: '暂停开关',
    status: pausedNow === true ? 'fail' : pauseFunction ? 'warn' : source?.sourceCode || abi.length ? 'pass' : 'unknown',
    severity: pausedNow === true ? 'high' : pauseFunction ? 'medium' : 'low',
    summary: pausedNow === true ? '当前已暂停' : pauseFunction ? '存在暂停能力，当前未读到暂停状态' : '未发现暂停能力',
    evidence: pauseFunction ? '检测 paused()/Pausable/whenNotPaused，并尝试 eth_call paused().' : '通过 ABI/源码检测。',
  });

  const liquidity = token.liquidity ?? null;
  checks.push({
    key: 'liquidity',
    label: '流动性',
    status: liquidity === null ? 'unknown' : liquidity < 25_000 ? 'fail' : liquidity < 100_000 ? 'warn' : 'pass',
    severity: liquidity === null || liquidity >= 100_000 ? 'low' : liquidity < 25_000 ? 'high' : 'medium',
    summary: liquidity === null ? '未获取到 DEX 流动性' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(liquidity),
    evidence: '来自 GeckoTerminal pool reserve/liquidity 数据。',
  });

  const taxLike = hasWritableFunction(abi, ['setTax', 'setTaxes', 'setFees', 'setBuyTax', 'setSellTax', 'excludeFromFees', 'setTransferFee']) || containsAny(text, ['taxfee', 'buytax', 'selltax', 'transferfee', 'feedenominator', 'excludefromfee']);
  const taxValues = taxLike ? await readTax(token.address) : [];
  checks.push({
    key: 'trade-tax',
    label: '交易税',
    status: taxLike ? 'warn' : source?.sourceCode || abi.length ? 'pass' : 'unknown',
    severity: taxLike ? 'medium' : 'low',
    summary: taxValues.length ? `读到税/费数值：${taxValues.map(value => value.toString()).join(', ')}` : taxLike ? '发现税费相关函数或字段' : '未发现交易税逻辑',
    evidence: taxLike ? '通过 ABI/源码检测税费能力；未执行 DEX 买卖模拟。' : '通过 ABI/源码关键词检测。',
  });

  const score = checks.reduce((sum, check) => {
    if (check.status === 'fail') return sum + (check.severity === 'high' ? 25 : 16);
    if (check.status === 'warn') return sum + (check.severity === 'high' ? 18 : check.severity === 'medium' ? 12 : 6);
    if (check.status === 'unknown') return sum + 5;
    return sum;
  }, contract.isScam ? 35 : 0);
  const cappedScore = Math.min(score, 100);

  return {
    level: cappedScore >= 60 ? 'High' : cappedScore >= 25 ? 'Medium' : 'Low',
    score: cappedScore,
    checks,
    concentration: { top1, top5, top10 },
  };
}
