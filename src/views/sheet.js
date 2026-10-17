// ShelfSense AI — Product Edit & Stock Adjustment Sheet Modal
import { CAT, UNITS } from '../modules/constants.js';
import { esc, fq, ago } from '../modules/utils.js';

export function vSheet(S, U) {
  const e = U.edit;
  if (!e) return '';
  const hist = e.id ? S.moves.filter(m => m.productId === e.id).sort((a, b) => b.ts - a.ts).slice(0, 8) : [];

  return `<div class="sheetbg" data-a="closeSheet"><div class="sheet" data-stop><div class="grab"></div><h3>${e.id ? 'Edit product' : 'New product'}</h3>
    <label class="lb">Name</label><input class="f" id="e_name" value="${esc(e.name)}">
    <div class="g2"><div><label class="lb">Barcode / SKU</label><input class="f" id="e_barcode" value="${esc(e.barcode || '')}" placeholder="e.g. 5449000000996"></div>
    <div><label class="lb">Voice aliases</label><input class="f" id="e_alias" value="${esc((e.aliases || []).join(', '))}" placeholder="coke, soda, refresco"></div></div>
    <div class="g2"><div><label class="lb">Category</label><select class="f" id="e_cat">${Object.keys(CAT).map(c => `<option ${c === e.category ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div><label class="lb">Unit</label><select class="f" id="e_unit">${UNITS.map(u => `<option ${u === e.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    <div><label class="lb">In stock</label><input class="f" id="e_stock" type="number" step="any" value="${e.stock}"></div>
    <div><label class="lb">Min stock</label><input class="f" id="e_min" type="number" step="any" value="${e.minStock ?? ''}" placeholder="auto (AI)"></div>
    <div><label class="lb">Sell price</label><input class="f" id="e_price" type="number" step="0.01" value="${e.price}"></div>
    <div><label class="lb">Cost price</label><input class="f" id="e_cost" type="number" step="0.01" value="${e.cost}"></div></div>
    <div class="g2 mt2"><button class="btn pri" data-a="saveP">Save</button>${e.id ? '<button class="btn danger" data-a="delP">Delete</button>' : '<button class="btn ghost" data-a="closeSheet">Cancel</button>'}</div>
    ${e.id ? `<div class="h3">⚖️ Adjust stock</div>
    <div class="rowf"><select class="f" id="a_mode"><option value="set">Set count</option><option value="add">Add</option><option value="remove">Remove</option></select>
    <input class="f" id="a_qty" type="number" step="any" min="0" placeholder="Qty"></div>
    <input class="f mt" id="a_note" placeholder="Note — delivery, spoilage, shelf count…">
    <button class="btn sec w mt2" data-a="adjustStock">Apply adjustment</button>
    <div class="muted small mt">Set = physical shelf count. The change is logged with your note.</div>
    <div class="h3">🕑 Recent activity</div>
    ${hist.length ? `<div class="list">${hist.map(m => `<div class="it"><div class="em">${m.type === 'sale' ? '💵' : m.type === 'restock' ? '📦' : '🧮'}</div>
      <div class="mid"><div class="tt">${(m.delta ?? (m.type === 'sale' ? -m.qty : m.qty)) >= 0 ? '+' : '−'}${fq(Math.abs(m.delta ?? m.qty), e.unit)} ${m.type === 'sale' ? 'sold' : m.type === 'restock' ? 'received' : 'adjusted'}</div>
      <div class="ss">${ago(m.ts)} · ${esc(m.source || 'manual')}${m.text ? ' · ' + esc(m.text) : ''}</div></div></div>`).join('')}</div>`
      : '<div class="muted small">No movements recorded yet.</div>'}` : ''}</div></div>`;
}
