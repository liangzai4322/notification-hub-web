const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function dashboard() {
  const elements = new Map();
  const values = new Map();
  const requests = [];
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      innerHTML: '', textContent: '', handlers: {},
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      setAttribute() {}, addEventListener(name, handler) { this.handlers[name] = handler; },
      scrollIntoView() { this.scrolled = true; },
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    location: { hostname: 'localhost', search: '' }, URLSearchParams, Intl, Date,
    setInterval() {}, clearInterval() {}, setTimeout() {}, clearTimeout() {}, AbortController,
    document: { getElementById: element, addEventListener() {}, createElement() {
      return { textContent: '', get innerHTML() { return String(this.textContent ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); } };
    } },
    localStorage: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ events: [] }) };
    },
  });
  const html = fs.readFileSync(path.join(__dirname, '../docs/index.html'), 'utf8');
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('if (confirmationToken) loadConfirmation(); else loadHistory().then(connectRealtime);', ''), context);
  return { run: (code) => vm.runInContext(code, context), element, requests, values };
}

const fixture = `[
  {id:'info',source:'project',eventKey:'info',title:'info',body:'',level:3,status:'informational',createdAt:new Date().toISOString()},
  {id:'approved',source:'project',eventKey:'approved',title:'approved',body:'',level:2,status:'confirmed',createdAt:new Date(Date.now()-1000).toISOString(),bugFix:{status:'approved',impactFiles:[]}},
  {id:'pending',source:'project',eventKey:'pending',title:'pending',body:'',level:3,status:'informational',createdAt:new Date(Date.now()-86400000).toISOString(),bugFix:{status:'pending_approval',impactFiles:[]}},
  {id:'open',source:'project',eventKey:'open',title:'open',body:'',level:2,status:'open',createdAt:new Date(Date.now()-4000).toISOString()}
]`;

test('refresh places newer pending work first and approved items below it', () => {
  const page = dashboard();
  page.run(`allEvents=${fixture}; renderHistory()`);
  const ids = [...page.element('historyList').innerHTML.matchAll(/data-event-id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, ['open', 'pending', 'info', 'approved']);
  page.run(`allEvents.find(event=>event.id==='open').status='confirmed'; renderHistory()`);
  assert.match(page.element('historyList').innerHTML, /^<article[^>]+data-event-id="pending"/);
  page.run(`allEvents.find(event=>event.id==='pending').bugFix.status='approved'; renderHistory()`);
  assert.match(page.element('historyList').innerHTML, /^<article[^>]+data-event-id="info"/);
});

test('source and time filters retain pending-first order while history groups stay collapsible', () => {
  const page = dashboard();
  page.run(`allEvents=${fixture}; activeFilter={type:'source',value:'project'}; renderHistory()`);
  const html = page.element('historyList').innerHTML;
  assert.ok(html.indexOf('data-event-id="pending"') < html.indexOf('<details'));
  assert.match(html, /<details class="time-group"/);
  assert.doesNotMatch(html, /data-action="restore"/);
  page.run(`activeFilter={type:'time',value:'今天'}; renderHistory()`);
  assert.match(page.element('historyList').innerHTML, /^<article[^>]+data-event-id="open"/);
  page.run(`viewingTrash=true; activeFilter=null; renderHistory()`);
  assert.match(page.element('historyList').innerHTML, /^<article[^>]+data-event-id="info"/);
});

test('list request retains eight-row page and explicitly requests attention ordering', async () => {
  const page = dashboard();
  page.values.set('notificationHubSession', 'local-test-session');
  await page.run('loadHistory()');
  assert.match(page.requests[0].url, /\/v1\/events\?limit=8&order=attention$/);
  await page.run('historyExpanded=true; loadHistory()');
  assert.match(page.requests[1].url, /limit=500&order=attention$/);
  await page.run('viewingTrash=true; loadHistory()');
  assert.match(page.requests[2].url, /\/v1\/trash\?limit=500$/);
});

test('successful approval refreshes and brings the next item into view', async () => {
  const page = dashboard();
  page.values.set('notificationHubSession', 'local-test-session');
  const item = { dataset: { eventId: 'local-test-event' } };
  const button = { dataset: { action: 'bug-approve' }, closest: () => item };
  await page.element('historyList').handlers.click({ target: { closest: (selector) => selector === '[data-action]' ? button : null } });
  assert.match(page.requests[0].url, /\/local-test-event\/bug-fix\/approve$/);
  assert.equal(page.requests[0].options.method, 'POST');
  assert.match(page.requests[1].url, /limit=8&order=attention$/);
  assert.equal(page.element('historyList').scrolled, true);
});
