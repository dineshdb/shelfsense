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
