import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { SNAPSHOT_UPSERT } from '../lib/snapshot-store';
import { isAddress, pricedToken } from '../lib/seo-types';
import type { DbToken } from '../lib/db-client';

const address = `0x${'a'.repeat(40)}`;
test('migration is repeatable; unchanged payload keeps lastmod; changed content advances it', async () => {
  const db = new PGlite();
  try {
    const migration = readFileSync('db/migrations/001-seo-snapshots.sql', 'utf8');
    await db.exec(migration); await db.exec(migration);
    await db.query(SNAPSHOT_UPSERT, ['token', address, JSON.stringify({ holders: 10 }), true]);
    await db.exec("UPDATE seo_snapshots SET content_updated_at='2020-01-01T00:00:00Z', fetched_at='2020-01-01T00:00:00Z'");
    await db.query(SNAPSHOT_UPSERT, ['token', address, JSON.stringify({ holders: 10 }), true]);
    let result = await db.query<{content_updated_at: Date; fetched_at: Date}>('SELECT * FROM seo_snapshots');
    assert.equal(result.rows[0].content_updated_at.getUTCFullYear(), 2020);
    assert.ok(result.rows[0].fetched_at.getUTCFullYear() > 2020);
    await db.query(SNAPSHOT_UPSERT, ['token', address, JSON.stringify({ holders: 11 }), true]);
    result = await db.query('SELECT * FROM seo_snapshots');
    assert.ok(result.rows[0].content_updated_at.getUTCFullYear() > 2020);
    await db.query(SNAPSHOT_UPSERT, ['address', address, '{}', false]);
    const sitemap = await db.query('SELECT address FROM seo_snapshots WHERE kind=$1 AND indexable', ['address']);
    assert.equal(sitemap.rows.length, 0);
    await assert.rejects(db.query(SNAPSHOT_UPSERT, ['token', address.toUpperCase(), '{}', true]));
  } finally { await db.close(); }
});

test('display conversion handles PostgreSQL NUMERIC strings and preserves raw supply', () => {
  const token = pricedToken({ address, price_usd: '0.0123', liquidity: '123456.78', price_change_24h: '-2.1', total_supply: '999999999999999999999999999999', price_source: 'GeckoTerminal' } as unknown as DbToken);
  assert.equal(token.price, 0.0123); assert.equal(token.liquidity, 123456.78);
  assert.equal(token.change24h, -2.1); assert.equal(token.totalSupply, '999999999999999999999999999999');
  assert.equal(token.marketCap, null);
  assert.ok(isAddress(address)); assert.ok(!isAddress('../tokens')); assert.ok(!isAddress('0x123'));
});

test('snapshot mode propagates upstream errors instead of publishing empty records', async () => {
  const { getTokenHolders, getContractInfo } = await import('../lib/blockscout');
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('unavailable', { status: 503 });
  try {
    await assert.rejects(getTokenHolders(address, { totalSupply: '100' } as never, true));
    await assert.rejects(getContractInfo(address, true));
    assert.deepEqual(await getTokenHolders(address, { totalSupply: '100' } as never), []);
  } finally { globalThis.fetch = original; }
});
