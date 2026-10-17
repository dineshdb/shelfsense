// ShelfSense AI — Khata Customer Ledger View
import { esc, money, ago } from '../modules/utils.js';
import { set } from '../modules/state.js';
import { getKhataSummary, formatKhataReminder } from '../modules/khata.js';

export function vKhata(S, U) {
  const khata = S.khata || {};
  const { accounts, totalDue, unpaidCount, clearedCount } = getKhataSummary(khata);
  const cur = set().currency;

  return `<div class="khatagrid">
    <div class="card">
      <div class="ch"><h2><span class="ico t-warn">📖</span>Customer Khata Ledger</h2><span class="sub">${accounts.length} accounts</span></div>
      <div class="hstats" style="margin-top:0">
        <div><b style="color:${totalDue > 0 ? 'var(--bad)' : 'var(--ok)'}">${money(totalDue, cur)}</b><span>Total credit out</span></div>
        <div><b>${unpaidCount}</b><span>Unpaid tabs</span></div>
        <div><b>${clearedCount}</b><span>Cleared</span></div>
      </div>
      <div class="g2 mt"><button class="btn pri" data-a="newKhataCustomer">➕ New customer tab</button>
      <button class="btn sec" data-a="sellView" data-v="bill">🎙️ Back to checkout</button></div>
    </div>
    ${accounts.length ? `<div class="card"><div class="ch"><h2><span class="ico t-ind">👥</span>Customer tabs</h2></div>
      <div class="list">${accounts.sort((a, b) => (b.balance || 0) - (a.balance || 0)).map(c => {
        const bal = c.balance || 0;
        const balText = money(bal, cur);
        const lastTx = (c.txs && c.txs.length) ? c.txs[c.txs.length - 1] : null;
        const reminderMsg = formatKhataReminder(c.name, bal, set().storeName, cur);
        const waReminder = encodeURIComponent(reminderMsg);
        return `<div class="it" style="border:1px solid var(--line);border-radius:var(--radius);padding:10px;margin-bottom:8px">
          <div class="em" style="font-size:24px">👤</div>
          <div class="mid">
            <div class="tt" style="font-size:15px;font-weight:700">${esc(c.name)}</div>
            <div class="ss" style="margin-top:2px">${lastTx ? 'Last activity ' + ago(lastTx.ts) : 'New account'} · ${c.txs ? c.txs.length : 0} transaction${(c.txs?.length || 0) > 1 ? 's' : ''}</div>
            <div class="muted small" style="margin-top:2px">Status: <span class="badge ${bal > 0 ? 'b-bad' : 'b-ok'}">${bal > 0 ? 'Balance ' + balText : 'All cleared'}</span></div>
          </div>
          <div class="rt" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <b style="font-size:16px;color:${bal > 0 ? 'var(--bad)' : 'var(--ok)'}">${balText}</b>
            <div class="flex" style="gap:4px">
              ${bal > 0 ? `<button class="btn sm pri" data-a="khataPay" data-v="${esc(c.name)}" style="font-size:11px;padding:3px 8px">💵 Pay</button>` : ''}
              ${bal > 0 ? `<a class="btn sm sec" href="https://wa.me/?text=${waReminder}" target="_blank" style="font-size:11px;padding:3px 8px;text-decoration:none">📲 Remind</a>` : ''}
              <button class="btn sm ghost" data-a="khataHistory" data-v="${esc(c.name)}" style="font-size:11px;padding:3px 8px">📜</button>
            </div>
          </div>
        </div>`;
      }).join('')}</div>`
    : `<div class="card"><div class="empty"><span class="e">📖</span>No customer credit accounts yet. Say "Ramesh ko 2 kg aloo udhaar do" or tap ➕ New customer tab.</div></div>`}
  </div>`;
}
