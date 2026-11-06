import vm from 'node:vm';

export function clientLab(html) {
  const stats = { tones: 0, speech: 0 }, elements = new Map(), requests = [];
  let events = [];
  const element = () => ({ textContent: '', innerHTML: '', disabled: false,
    classList: { values: new Set(['hidden']), add(v) { this.values.add(v); }, remove(v) { this.values.delete(v); },
      contains(v) { return this.values.has(v); }, toggle(v, on) { on ??= !this.values.has(v); on ? this.values.add(v) : this.values.delete(v); } },
    setAttribute() {}, addEventListener() {}, scrollIntoView() {} });
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  const storage = new Map([['notificationHubSession', 'isolated-session']]);
  class AudioContext {
    state = 'running'; currentTime = 0; destination = {};
    resume() { return Promise.resolve(); }
    createOscillator() { return { frequency: {}, connect() { return { connect() {} }; }, start() { stats.tones++; }, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
  }
  const sandbox = { URLSearchParams, Date, Intl, AbortController, TextDecoder, Set, Map, console,
    location: { hostname: 'localhost', search: '' }, AudioContext,
    document: { getElementById: get, addEventListener() {}, createElement: element },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    speechSynthesis: { cancel() {}, resume() {}, speak() { stats.speech++; } }, SpeechSynthesisUtterance: class {},
    fetch: async (url, options) => { requests.push({ url, method: options?.method || 'GET' }); return { ok: true, json: async () => ({ events }) }; },
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
  const kickoff = 'if (confirmationToken) loadConfirmation(); else loadHistory().then(connectRealtime);';
  if (!script?.includes(kickoff)) throw new Error('unexpected-client-entry');
  vm.runInContext(script.replace(kickoff, ''), context);
  return { stats, requests,
    async refresh(rows, { initial = false, poll = true } = {}) {
      events = rows;
      if (!initial) vm.runInContext('knownEventIds ??= new Set()', context);
      await vm.runInContext(`loadHistory(false, ${poll})`, context);
    },
    card(event) { sandbox.fixture = event; return vm.runInContext('eventCard(fixture)', context); },
    eval(code) { return vm.runInContext(code, context); },
    overlayVisible() { return !get('callOverlay').classList.contains('hidden'); },
  };
}
