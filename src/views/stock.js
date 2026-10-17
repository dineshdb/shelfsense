// ShelfSense AI — Stock & Inventory View
import { ICONS } from '../modules/constants.js';
import { esc, money, fq, daysTxt, ago, emoji, color } from '../modules/utils.js';
import { set, prod } from '../modules/state.js';
import { Core } from '../core.js';

export function stockList(S, U) {
  const cur = set().currency;
  const q = Core.strip(U.inv.q);
  const rows = Core.analyze(S.products, S.moves, set()).rows.filter(r => {
    if (U.inv.cat === 'Low' && !(r.status === 'low' || r.status === 'out')) return false;
    if (!['All', 'Low'].includes(U.inv.cat) && (r.p.category || 'Other') !== U.inv.cat) return false;
    return !q || Core.strip(r.p.name + ' ' + (r.p.aliases || []).join(' ')).includes(q);
  }).sort((a, b) => {
    if (U.inv.sort === 'low') {
      const w = { out: 0, low: 1, slow: 2, ok: 3 };
      return (w[a.status] - w[b.status]) || (a.daysLeft - b.daysLeft) || a.p.name.localeCompare(b.p.name);
    }
    if (U.inv.sort === 'value') {
      return (b.p.stock * (b.p.cost || b.p.price * 0.75 || 0)) - (a.p.stock * (a.p.cost || a.p.price * 0.75 || 0));
    }
    if (U.inv.sort === 'sold') {
      return (b.lastSale || 0) - (a.lastSale || 0) || a.p.name.localeCompare(b.p.name);
    }
    return a.p.name.localeCompare(b.p.name);
  });

  const lead = +set().leadDays + +set().coverDays + +set().safetyDays;
  return rows.length ? rows.map(r => `<div class="it"><div class="em" data-a="edit" data-v="${r.id}">${emoji(r.p)}</div>
    <div class="mid" data-a="edit" data-v="${r.id}" style="cursor:pointer"><div class="tt">${esc(r.p.name)}</div><div class="ss">${money(r.p.price, cur)}/${r.p.unit} · ${daysTxt(r.daysLeft)}</div>
    <div class="bar"><i style="width:${Math.min(100, Math.max(3, r.p.stock / Math.max(r.rop * 3, r.avgDaily * lead, 1) * 100))}%;background:${color(r.status)}"></i></div></div>
    <div class="rt flex" style="gap:6px"><button class="qb" data-a="qm" data-v="${r.id}" data-t="sale">−</button>
    <div style="min-width:56px;text-align:center"><b>${fq(r.p.stock, r.p.unit)}</b><br><span class="badge b-${r.status}">${r.status}</span></div>
    <button class="qb" data-a="qm" data-v="${r.id}" data-t="restock">+</button></div></div>`).join('')
    : `<div class="empty"><span class="e">📦</span>No products${U.inv.q ? ' match your search' : ' yet — scan your shelves or tap +'}.</div>`;
}

export function vStock(S, U) {
  const cur = set().currency;
  const cats = [...new Set(S.products.map(p => p.category || 'Other'))].sort();
  const val = S.products.reduce((s, p) => s + Math.max(0, p.stock) * (p.cost || p.price * 0.75 || 0), 0);
  const rows = Core.analyze(S.products, S.moves, set()).rows;
  const nOut = rows.filter(r => r.status === 'out').length;
  const nLow = rows.filter(r => r.status === 'low').length;
  const health = rows.length ? Math.round(rows.filter(r => r.status === 'ok' || r.status === 'slow').length / rows.length * 100) : 100;

  return `<div class="stockgrid">
  <div class="hero" style="grid-column:1/-1"><div class="row"><div><div class="g">Stock · ${rows.length} products tracked</div><div class="big">${money(val, cur)}</div>
    <div class="sm">stock value at cost · <span style="color:${nLow ? 'var(--warn)' : 'inherit'}">${nLow} low</span>${nOut ? ` · <span style="color:var(--bad)">${nOut} out</span>` : ''}</div></div>
    <div class="ring" style="--p:${health}"><div><b>${health}%</b><small>Healthy</small></div></div></div></div>
  <div class="card"><div class="ch"><h2><span class="ico t-ind">📦</span>Inventory</h2><button class="btn sm sec" data-a="invCsv">⬇️ CSV</button></div>
    <div class="search">${ICONS.search}<input class="f" id="q" placeholder="Search products…" value="${esc(U.inv.q)}"></div>
    <div class="chips">${[['name', 'A–Z'], ['low', '⚠️ Need first'], ['value', '💰 Value'], ['sold', '🕑 Recently sold']].map(([v, l]) => `<button class="chip ${U.inv.sort === v ? 'on' : ''}" data-a="sort" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="chips">${['All', 'Low'].concat(cats).map(c => `<button class="chip ${U.inv.cat === c ? 'on' : ''}" data-a="cat" data-v="${esc(c)}">${c === 'Low' ? '⚠️ Low stock' : esc(c)}</button>`).join('')}</div>
    <div class="list mt" id="stocklist">${stockList(S, U)}</div></div>
  ${S.moves.length ? `<div class="card"><div class="ch"><h2><span class="ico t-ok">🕑</span>Activity</h2><span class="sub">${S.moves.length} records</span></div>
    <div class="list">${[...S.moves].sort((a, b) => b.ts - a.ts).slice(0, 30).map(m => {
      const p = prod(m.productId);
      return `<div class="it"><div class="em">${m.type === 'sale' ? '💵' : m.type === 'restock' ? '📦' : '🧮'}</div>
      <div class="mid"><div class="tt">${m.type === 'sale' ? 'Sold' : m.type === 'restock' ? 'Received' : 'Adjusted'} ${fq(Math.abs(m.qty), p?.unit)} · ${esc(p?.name || '(deleted)')}</div>
      <div class="ss">${ago(m.ts)} · ${esc(m.source || 'manual')}${m.text ? ' · “' + esc(m.text) + '”' : ''}</div></div></div>`;
    }).join('')}</div>
    ${S.moves.length > 30 ? `<div class="muted small mt">showing the latest 30 of ${S.moves.length}</div>` : ''}</div>` : ''}
  </div>
  <div class="fab"><button class="btn pri" data-a="edit" data-v="">＋</button></div>`;
}
