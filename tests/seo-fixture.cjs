/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS preload for `node --require`; never used by the application or deployment. */
if (process.env.HOODSCAN_SEO_FIXTURES !== '1') throw new Error('Test fixture preload requires explicit opt-in');
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const Module = require('node:module');
const originalLoad = Module._load;
const db = new PGlite();
const tokenAddress = '0x' + 'a'.repeat(40);
const walletAddress = '0x' + 'b'.repeat(40);
const ready = (async () => {
  await db.exec(fs.readFileSync('db/migrations/001-seo-snapshots.sql', 'utf8'));
  const token = { address: tokenAddress, name: 'Fixture </script> Token', symbol: 'TEST', decimals: 18, totalSupply: '1000000000000000000000', holders: 12, price: 0.123, marketCap: 123, volume24h: 200, liquidity: 1000, change24h: 1, iconUrl: null, type: 'ERC-20', reputation: 'unknown', poolAddress: null, dex: null, sparkline: [], priceSource: 'Blockscout' };
  for (const [kind,address,payload,indexable] of [
    ['token',tokenAddress,{ token, holders: [{address:walletAddress,name:null,balance:'100',percentage:10}],transfers:[],contract:{verified:false,creator:walletAddress,creationTx:null,proxyType:null,implementations:[],isScam:false,reputation:'unknown'},risk:null },true],
    ['address',walletAddress,{ethBalance:'1.23',displayTxs:[],tokenBalances:[]},false],
    ['network','chain',{gasPrice:'0.001'},false],
  ]) await db.query('INSERT INTO seo_snapshots(kind,address,payload,indexable) VALUES ($1,$2,$3::jsonb,$4)',[kind,address,JSON.stringify(payload),indexable]);
})();
class Pool {
  async query(sql, params) {
    await ready;
    fs.appendFileSync(process.env.HOODSCAN_QUERY_LOG, `${JSON.stringify({sql,params})}\n`);
    return db.query(sql, params);
  }
  async end() {}
}
globalThis.__hoodscanPool = new Pool();
Module._load = function(id, ...args) {
  if (id === 'pg') return { Pool };
  return originalLoad.call(this, id, ...args);
};
const originalFetch = globalThis.fetch;
globalThis.fetch = (url,...args) => {
  const value = String(url?.url ?? url);
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(value)) {
    fs.appendFileSync(process.env.HOODSCAN_QUERY_LOG, JSON.stringify({unexpectedFetch:value})+'\n');
    throw new Error('Upstream access forbidden in snapshot smoke test');
  }
  return originalFetch(url,...args);
};
