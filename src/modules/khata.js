// ShelfSense AI — Khata Customer Ledger Domain Logic
import { uid, money } from './utils.js';

/**
 * Records a credit/debit transaction on a customer's Khata tab.
 */
export function recordKhataDebit(khata, customerName, total, itemDescriptions = []) {
  if (!customerName || !total || total <= 0) return null;
  const name = customerName.trim();
  if (!khata[name]) {
    khata[name] = { name, balance: 0, phone: '', txs: [] };
  }
  const cust = khata[name];
  cust.balance = +(cust.balance + total).toFixed(2);
  const tx = {
    id: uid(),
    type: 'debit',
    amount: total,
    ts: Date.now(),
    items: itemDescriptions
  };
  cust.txs = cust.txs || [];
  cust.txs.push(tx);
  return { customer: cust, tx };
}

/**
 * Records a payment against a customer's balance.
 */
export function recordKhataPayment(khata, customerName, amount, note = 'Payment received') {
  if (!customerName || !amount || amount <= 0) return null;
  const name = customerName.trim();
  const cust = khata[name];
  if (!cust) return null;

  cust.balance = Math.max(0, +(cust.balance - amount).toFixed(2));
  const tx = {
    id: uid(),
    type: 'credit',
    amount: +amount,
    ts: Date.now(),
    items: [note]
  };
  cust.txs = cust.txs || [];
  cust.txs.push(tx);
  return { customer: cust, tx };
}

/**
 * Calculates aggregate summary metrics for the Khata ledger.
 */
export function getKhataSummary(khata = {}) {
  const list = Object.values(khata).filter(c => c && c.name);
  const totalDue = list.reduce((s, c) => s + (c.balance || 0), 0);
  const unpaidCount = list.filter(c => (c.balance || 0) > 0).length;
  const clearedCount = list.filter(c => (c.balance || 0) <= 0).length;

  return {
    accounts: list,
    totalDue: +totalDue.toFixed(2),
    unpaidCount,
    clearedCount
  };
}

/**
 * Formats a WhatsApp friendly reminder message string.
 */
export function formatKhataReminder(customerName, balance, storeName = 'My Grocery Store', currency = '$') {
  const balStr = money(balance, currency);
  return `Namaste ${customerName} ji! Friendly update from ${storeName}: your current store tab / Khata balance is ${balStr}. You can clear via UPI or cash whenever convenient. Thank you!`;
}

/**
 * Formats a WhatsApp bill receipt for Khata sales.
 */
export function formatKhataReceipt(customerName, items = [], total = 0, outstandingBalance = 0, storeName = 'My Grocery Store', currency = '$') {
  const dateStr = new Date().toLocaleDateString();
  const lines = items.map(m => `• ${m.name || m.query}: ${money(m.line || m.price, currency)}`).join('\n');
  return `🧾 *Bill Receipt — ${storeName}*\nCustomer: ${customerName}\nDate: ${dateStr}\n\n${lines}\n\n*Total:* ${money(total, currency)}\n*Payment:* 📖 Khata (Store Credit)\n*Outstanding Balance:* ${money(outstandingBalance, currency)}\n\nThank you!`;
}
