import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { clientLab } from './client-lab.mjs';

const html = fs.readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const fixture = (id, extra = {}) => ({ id, source: 'synthetic', device: 'bailange', eventKey: id,
  level: 2, title: 'synthetic', body: 'synthetic', status: 'open', createdAt: '2026-11-06T03:00:00Z',
  deliveries: [], bugFix: null, dailyOnly: false, ...extra });

test('client daily-only matrix: both severity levels and every device stay in list without sounds or overlays', async () => {
  const client = clientLab(html);
  for (const device of ['mac-m5','main-pc','bailange']) for (const level of [1,2]) {
    const event = fixture(device+level, { device, level, dailyOnly: true });
    await client.refresh([event]);
    assert.match(client.card(event), /日报项/);
  }
  assert.equal(client.stats.tones, 0); assert.equal(client.stats.speech, 0); assert.equal(client.overlayVisible(), false);
});

test('client immediate exceptions and independent business still alert once; initial/history refresh does not replay', async () => {
  for (const source of ['repair-rules','repair-security','independent-business']) {
    const client = clientLab(html), e = fixture(source, { source });
    await client.refresh([e]); assert.equal(client.stats.tones,2);
    await client.refresh([e]); assert.equal(client.stats.tones,2);
    assert.doesNotMatch(client.card(e),/日报项/);
  }
  const initial = clientLab(html); await initial.refresh([fixture('initial')], { initial: true });
  await initial.refresh([fixture('manual')], { poll:false }); assert.equal(initial.stats.tones,0);
  const urgent = clientLab(html); await urgent.refresh([fixture('urgent', { level:1 })]);
  assert.equal(urgent.stats.tones,3); assert.equal(urgent.stats.speech,1); assert.equal(urgent.overlayVisible(),true);
});

test('client unknown policy, alert-off, confirmed and trash views cannot create sounds', async () => {
  const client = clientLab(html);
  for (const dailyOnly of [undefined,null,'false',0]) await client.refresh([fixture(String(dailyOnly),{dailyOnly})]);
  await client.refresh([fixture('confirmed',{status:'confirmed'})]);
  client.eval('alertEnabled=false'); await client.refresh([fixture('off')]);
  client.eval('alertEnabled=true;viewingTrash=true'); await client.refresh([fixture('trash')]);
  assert.equal(client.stats.tones,0); assert.equal(client.overlayVisible(),false);
});

