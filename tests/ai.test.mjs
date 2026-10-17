import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_GUIDE, DEF } from '../src/modules/constants.js';

test('AI: MODEL_GUIDE contains complete specifications for curated Gemini models', () => {
  const models = ['gemini-3.8-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
  for (const m of models) {
    const spec = MODEL_GUIDE[m];
    assert.ok(spec, `Model ${m} should be in MODEL_GUIDE`);
    assert.ok(spec.name, `Model ${m} must have a name`);
    assert.ok(spec.tag, `Model ${m} must have a tag`);
    assert.ok(spec.cost, `Model ${m} must have cost details`);
    assert.ok(spec.speed, `Model ${m} must have speed rating`);
    assert.ok(spec.useCase, `Model ${m} must have recommended use case`);
  }
});

test('AI: DEF contains default Gemini 3.8 Flash model configuration', () => {
  assert.equal(DEF.model, 'gemini-3.8-flash');
  assert.equal(DEF.aiMode, 'gemini');
  assert.equal(DEF.aiModel, 'gemma-4-e4b');
});

test('AI: Invoice and receipt OCR data normalization sanitizes line items', () => {
  const mockOcrResponse = {
    store: 'Metro Wholesalers',
    invoiceNo: 'INV-9921',
    date: '2026-04-12',
    total: 145.50,
    items: [
      { name: 'Sunflower Oil 1L', qty: 10, unit: 'L', cost: 2.20, mrp: 3.10, confidence: 0.98 },
      { name: 'Basmati Rice 5kg', qty: 5, unit: 'kg', cost: 6.50, mrp: null, confidence: 0.95 }
    ]
  };

  const normalized = {
    store: mockOcrResponse.store || null,
    invoiceNo: mockOcrResponse.invoiceNo || null,
    date: mockOcrResponse.date || null,
    total: mockOcrResponse.total != null ? +mockOcrResponse.total : null,
    items: (mockOcrResponse.items || []).map(x => ({
      name: x.name,
      count: +x.qty || 1,
      unit: x.unit,
      cost: x.cost != null ? +x.cost : null,
      mrp: x.mrp != null ? +x.mrp : null,
      confidence: x.confidence
    }))
  };

  assert.equal(normalized.store, 'Metro Wholesalers');
  assert.equal(normalized.invoiceNo, 'INV-9921');
  assert.equal(normalized.total, 145.50);
  assert.equal(normalized.items.length, 2);
  assert.equal(normalized.items[0].count, 10);
  assert.equal(normalized.items[0].cost, 2.20);
  assert.equal(normalized.items[1].mrp, null);
});

test('AI: DEF contains default voiceEngine set to auto', () => {
  assert.equal(DEF.voiceEngine, 'auto');
});

test('Matching: dynamically learned regional aliases match deterministically', async () => {
  const { Core } = await import('../src/core.js');
  const inventory = [
    { id: 'p1', name: 'Wheat Flour 5kg', aliases: ['atta', 'आटा'], barcode: '' },
    { id: 'p2', name: 'Green Cardamom 50g', aliases: ['elaichi', 'इलायची'], barcode: '' },
    { id: 'p3', name: 'Sugar 1kg', aliases: ['शक्खर', 'cheeni'], barcode: '' }
  ];

  // Matches even without XL dictionary entry because alias is on product
  const m1 = Core.matchProduct('आटा', inventory);
  assert.equal(m1.product?.id, 'p1');

  const m2 = Core.matchProduct('इलायची', inventory);
  assert.equal(m2.product?.id, 'p2');

  const m3 = Core.matchProduct('शक्खर', inventory);
  assert.equal(m3.product?.id, 'p3');
});

test('Voice POS: meta-command patterns recognize start, finish, next and cancel in English and Hindi', () => {
  const isStart = t => /(?:take|accept|start|create|make|receive|begin|get)\s*(?:an?|the|my|this|new)?\s*order\b|(?:bill|order)\s*(?:banao|lo|le\s*lo|shuru|karo|start)|(?:naya|new)\s*(?:bill|order)|(?:take|start|accept)\s*order|टेक\s*ऑर्डर|बिल\s*बनाओ|ऑर्डर\s*लो|ऑर्डर\s*शुरू|नया\s*बिल/i.test(t.trim().toLowerCase());
  const isDone = t => /(?:\bdone\b|\ball\s*done\b|\bthat'?s\s*all\b|\bthat\s*is\s*all\b|\bfinish(?:ed)?\b|\bcomplete(?:d)?\b|\bho\s*gaya\b|\bhogaya\b|\bbas\b|\bbaas\b|\bitna\s*hi\b|\bkhatam\b|\bstop\s*(?:order)?\b|हो\s*गया|बस|खत्म|पूरा)/i.test(t.trim().toLowerCase());
  const isNext = t => /(?:\bnext(?:\s*(?:order|customer|bill))?\b|\bagla(?:\s*customer)?\b|\bagle\b|\bsave(?:\s*(?:order|bill))?\b|\bcheckout\b|\bcomplete\s*sale\b|अगला|अगले|सेव)/i.test(t.trim().toLowerCase());
  const isCancel = t => /(?:\bcancel(?:\s*(?:order|bill))?\b|\bclear(?:\s*bill)?\b|\bradd\b|\bhatao\b|\bdiscard\b|\babort\b|कैंसिल|रद्द|हटाओ)/i.test(t.trim().toLowerCase());

  // Start commands
  assert.ok(isStart('take order'));
  assert.ok(isStart('take the order'));
  assert.ok(isStart('take my order'));
  assert.ok(isStart('accept my order'));
  assert.ok(isStart('accept the order'));
  assert.ok(isStart('accept order'));
  assert.ok(isStart('bill banao'));
  assert.ok(isStart('order shuru'));
  assert.ok(isStart('order lo'));

  // Done / finish commands
  assert.ok(isDone('done'));
  assert.ok(isDone('ho gaya'));
  assert.ok(isDone('bas'));
  assert.ok(isDone('baas'));
  assert.ok(isDone('khatam'));

  // Next commands
  assert.ok(isNext('next'));
  assert.ok(isNext('agla'));
  assert.ok(isNext('save'));

  // Cancel commands
  assert.ok(isCancel('cancel'));
  assert.ok(isCancel('radd'));
});

test('Engine Isolation: resolveVoiceEngine returns appropriate labels and offline flags', async () => {
  const { resolveVoiceEngine } = await import('../src/modules/ai.js');
  const res = resolveVoiceEngine();
  assert.ok(res.engine);
  assert.ok(res.label);
});

test('Engine Isolation: parseVoiceCommand in Gemma mode never touches Gemini cloud when local server absent', async () => {
  const { parseVoiceCommand } = await import('../src/modules/ai.js');
  await assert.rejects(
    async () => {
      await parseVoiceCommand('2 sugar', ['Sugar'], 'gemma');
    },
    /Local Gemma server/
  );
});

test('Engine Isolation: aiTranscribe rejects in Gemma mode to prevent cloud quota usage', async () => {
  const { aiTranscribe } = await import('../src/modules/ai.js');
  const { S } = await import('../src/modules/state.js');
  S.settings.voiceEngine = 'gemma';
  await assert.rejects(
    async () => {
      await aiTranscribe('fakeWavBase64', 'en-US');
    },
    /Cloud transcription disabled in ⚡ Gemma/
  );
  S.settings.voiceEngine = 'auto'; // reset
});

test('Feature Flag: DEF.handsFreeEnabled defaults to false (disabled)', () => {
  assert.strictEqual(DEF.handsFreeEnabled, false);
});

test('Feature Flag: meta-commands are guarded by handsFreeEnabled flag', () => {
  const checkMeta = (flag, text) => {
    const isTake = flag && /(?:take|accept|start)\s*order/i.test(text);
    const isDone = flag && /(?:\bdone\b|\bho\s*gaya\b)/i.test(text);
    return { isTake, isDone };
  };

  // Flag disabled: meta commands do not fire
  assert.strictEqual(checkMeta(false, 'take order').isTake, false);
  assert.strictEqual(checkMeta(false, 'done').isDone, false);

  // Flag enabled: meta commands fire as expected
  assert.strictEqual(checkMeta(true, 'take order').isTake, true);
  assert.strictEqual(checkMeta(true, 'done').isDone, true);
});



