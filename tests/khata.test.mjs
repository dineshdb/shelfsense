import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recordKhataDebit,
  recordKhataPayment,
  getKhataSummary,
  formatKhataReminder,
  formatKhataReceipt
} from '../src/modules/khata.js';

test('Khata: records debit to new and existing customer accounts', () => {
  const khata = {};
  const res1 = recordKhataDebit(khata, 'Ramesh Sharma', 15.50, ['1kg Sugar', '2L Milk']);
  assert.ok(res1);
  assert.equal(khata['Ramesh Sharma'].balance, 15.50);
  assert.equal(khata['Ramesh Sharma'].txs.length, 1);
  assert.equal(khata['Ramesh Sharma'].txs[0].type, 'debit');
  assert.equal(khata['Ramesh Sharma'].txs[0].amount, 15.50);

  // Second debit on same customer
  recordKhataDebit(khata, 'Ramesh Sharma', 4.50, ['1 Bread']);
  assert.equal(khata['Ramesh Sharma'].balance, 20.00);
  assert.equal(khata['Ramesh Sharma'].txs.length, 2);
});

test('Khata: records payment and clamps balance at 0', () => {
  const khata = {
    'Priya Patel': { name: 'Priya Patel', balance: 50.00, txs: [] }
  };

  const res1 = recordKhataPayment(khata, 'Priya Patel', 20.00, 'UPI payment');
  assert.ok(res1);
  assert.equal(khata['Priya Patel'].balance, 30.00);
  assert.equal(khata['Priya Patel'].txs.length, 1);
  assert.equal(khata['Priya Patel'].txs[0].type, 'credit');
  assert.equal(khata['Priya Patel'].txs[0].amount, 20.00);

  // Overpayment clamps to 0
  recordKhataPayment(khata, 'Priya Patel', 40.00, 'Cash excess');
  assert.equal(khata['Priya Patel'].balance, 0.00);
});

test('Khata: getKhataSummary aggregates balances and status counts correctly', () => {
  const khata = {
    'Customer A': { name: 'Customer A', balance: 25.50, txs: [] },
    'Customer B': { name: 'Customer B', balance: 0.00, txs: [] },
    'Customer C': { name: 'Customer C', balance: 14.50, txs: [] }
  };

  const summary = getKhataSummary(khata);
  assert.equal(summary.accounts.length, 3);
  assert.equal(summary.totalDue, 40.00);
  assert.equal(summary.unpaidCount, 2);
  assert.equal(summary.clearedCount, 1);
});

test('Khata: formatKhataReminder produces valid message text', () => {
  const msg = formatKhataReminder('Amit', 35.00, 'Super Bazaar', '₹');
  assert.ok(msg.includes('Amit'));
  assert.ok(msg.includes('Super Bazaar'));
  assert.ok(msg.includes('₹35.00'));
});

test('Khata: formatKhataReceipt itemizes purchases and shows outstanding balance', () => {
  const items = [
    { name: '1kg Basmati Rice', line: 12.00 },
    { name: '2L Mustard Oil', line: 8.50 }
  ];
  const receipt = formatKhataReceipt('Sunita', items, 20.50, 45.00, 'Corner Store', '$');
  assert.ok(receipt.includes('Sunita'));
  assert.ok(receipt.includes('Basmati Rice: $12.00'));
  assert.ok(receipt.includes('Total:* $20.50'));
  assert.ok(receipt.includes('Outstanding Balance:* $45.00'));
});
