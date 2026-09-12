// Run after npm run build. Tests the production Next server against isolated PostgreSQL fixtures.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const log = join(mkdtempSync(join(tmpdir(), 'hoodscan-seo-')), 'queries.jsonl');
const server = spawn(process.execPath, ['--require', resolve('tests/seo-fixture.cjs'), '.next/standalone/server.js'], {
  env: {...process.env, HOODSCAN_SEO_FIXTURES:'1', HOODSCAN_QUERY_LOG:log, DATABASE_URL:'postgres://fixture-only', NODE_ENV:'production', HOSTNAME:'127.0.0.1', PORT:'34817'}, stdio:['ignore','pipe','pipe'],
});
let output='';
server.stdout.on('data', x => output+=x); server.stderr.on('data', x => output+=x);
const base='http://127.0.0.1:34817';
const address='0x'+'a'.repeat(40), wallet='0x'+'b'.repeat(40);
const events=()=>readFileSync(log,'utf8').trim().split('\n').map(x=>JSON.parse(x));
try {
  let ready=false;
  for(let i=0;i<100;i++) {
    try { if((await fetch(base+'/robots.txt')).ok) {ready=true;break;} } catch {}
    await new Promise(r=>setTimeout(r,200));
  }
  assert.ok(ready, output);
  const first=await fetch(base+'/token/'+address);
  assert.equal(first.status,200,output);
  const html=await first.text();
  assert.ok(html.includes('Data snapshot:'));
  assert.ok(!html.includes('Fixture </script> Token'));
  const reads=events().length;
  const second=await fetch(base+'/token/'+address);
  await second.text();
  assert.equal(second.headers.get('x-nextjs-cache'),'HIT');
  assert.equal(events().length,reads,'cache hit should not query PostgreSQL');
  const bot=await fetch(base+'/token/'+address,{headers:{'User-Agent':'Googlebot'}});
  assert.equal(bot.status,200);
  assert.equal(await bot.text(),html,'bot and person must receive the same cached HTML');
  const unknown=await fetch(base+'/address/0x'+'c'.repeat(40));
  assert.equal(unknown.status,200);
  assert.match(unknown.headers.get('cache-control'),/no-store/);
  assert.match(unknown.headers.get('x-robots-tag'),/noindex/);
  const unknownToken=await fetch(base+'/token/0x'+'d'.repeat(40));
  assert.equal(unknownToken.status,404);
  assert.match(unknownToken.headers.get('cache-control'),/no-store/);
  const invalid=await fetch(base+'/address/nope'); assert.equal(invalid.status,404);
  const upper=await fetch(base+'/token/'+address.toUpperCase().replace('0X','0x'),{redirect:'manual'});
  assert.equal(upper.status,308); assert.ok(upper.headers.get('location').endsWith(address));
  const walletPage=await fetch(base+'/address/'+wallet);assert.equal(walletPage.status,200);
  assert.match(await walletPage.text(),/name="robots" content="noindex, follow"/);
  for (const sub of ['holders','transfers']) {
    const response=await fetch(`${base}/token/${address}/${sub}`);assert.equal(response.status,200);
    assert.match(await response.text(),/noindex, follow/);
  }
  const sitemap=await (await fetch(base+'/sitemap.xml')).text();
  assert.ok(sitemap.includes('/token/'+address));assert.ok(!sitemap.includes('/address/'+wallet));
  assert.equal(events().filter(e=>e.unexpectedFetch).length,0,'snapshot request path must not call any upstream');
  console.log('PASS: production ISR HIT, zero DB reads on HIT, zero upstream calls, bot parity, bounded misses, canonical redirect, noindex, sitemap membership.');
} catch(error) { console.error(output); throw error; }
finally {server.kill('SIGTERM');}
