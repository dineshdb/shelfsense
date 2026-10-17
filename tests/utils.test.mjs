import test from 'node:test';
import assert from 'node:assert/strict';
import { esc, uid, money, fq, daysTxt, ago, emoji, color } from '../src/modules/utils.js';

test('esc: HTML characters are escaped safely', () => {
  assert.equal(esc('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.equal(esc("John's Store & Sons"), 'John&#39;s Store &amp; Sons');
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});

test('uid: generates distinct non-empty identifier strings', () => {
  const id1 = uid();
  const id2 = uid();
  assert.equal(typeof id1, 'string');
  assert.ok(id1.length >= 8);
  assert.notEqual(id1, id2);
});

test('money: formats numeric amounts with 2 decimal places and currency symbol', () => {
  assert.equal(money(12.5), '$12.50');
  assert.equal(money(0), '$0.00');
  assert.equal(money(1000, '₹'), '₹1,000.00');
  assert.equal(money('invalid', '€'), '€0.00');
});

test('fq: formats quantities with proper decimal places and units', () => {
  assert.equal(fq(5, 'unit'), '5');
  assert.equal(fq(2.545, 'kg'), '2.55 kg');
  assert.equal(fq(1.5, 'L'), '1.5 L');
  assert.equal(fq(3, 'pack'), '3 pack');
  assert.equal(fq(Infinity, 'kg'), '–');
});

test('daysTxt: formats days remaining clearly for grocery owners', () => {
  assert.equal(daysTxt(Infinity), 'no recent sales');
  assert.equal(daysTxt(0.4), '< 1 day left');
  assert.equal(daysTxt(3.2), '~3 days left');
  assert.equal(daysTxt(7), '~7 days left');
});

test('ago: formats relative time elapsed', () => {
  const now = 1700000000000;
  assert.equal(ago(now - 30 * 1000, now), 'just now');
  assert.equal(ago(now - 15 * 60 * 1000, now), '15 min ago');
  assert.equal(ago(now - 4 * 3600 * 1000, now), '4 h ago');
  assert.equal(ago(now - 2 * 86400 * 1000, now), '2 d ago');
});

test('emoji: matches names to relevant icons and falls back to category', () => {
  assert.equal(emoji({ name: 'Fresh Milk 1L', category: 'Dairy' }), '🥛');
  assert.equal(emoji({ name: 'Azucar Blanca', category: 'Pantry' }), '🍬');
  assert.equal(emoji({ name: 'Coca Cola 600ml', category: 'Beverages' }), '🥤');
  assert.equal(emoji({ name: 'Mystery Item', category: 'Produce' }), '🥬');
  assert.equal(emoji({ name: 'Unknown Item', category: 'Other' }), '📦');
});

test('color: maps inventory status to correct design system variables', () => {
  assert.equal(color('ok'), 'var(--ok)');
  assert.equal(color('low'), 'var(--warn)');
  assert.equal(color('out'), 'var(--bad)');
  assert.equal(color('slow'), 'var(--chart-4)');
});
