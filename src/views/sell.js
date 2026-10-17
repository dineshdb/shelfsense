// ShelfSense AI — Voice POS & Checkout View
import { UNITS, ICONS } from '../modules/constants.js';
import { esc, money, fq, emoji } from '../modules/utils.js';
import { set, prod } from '../modules/state.js';
import { aiReady } from '../modules/ai.js';
import { vKhata } from './khata.js';
import { Core } from '../core.js';

export function vSell(S, U) {
  const v = U.voice;
  const ready = aiReady();
  const cur = set().currency;
  const hasSpeechRec = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  if (v.view === 'khata') return vKhata(S, U);

  const topProducts = S.products.slice(0, 8);
  let o = `<div class="sellgrid">
    <div class="chips" style="grid-column:1/-1;margin:0 0 -4px">
      <button class="chip on" data-a="sellView" data-v="bill">🎙️ Voice & Quick POS</button>
      <button class="chip" data-a="sellView" data-v="khata">📖 Khata Ledger (${Object.keys(S.khata || {}).length})</button>
    </div>
    <div class="card"><div class="ch"><h2><span class="ico t-info">🎙️</span>Voice sales</h2><span class="sub">${esc(set().lang)}${hasSpeechRec ? ' · Fast Web Speech' : ''}${v.recording ? ' · recording' : ''}</span></div><div class="voice">
    <button class="micbtn ${v.recording ? 'on' : ''}" data-a="listen" ${ready ? '' : 'disabled'} aria-label="${v.recording ? 'Stop recording' : 'Start recording'}">${v.recording ? ICONS.stop : ICONS.mic}</button>
    <div class="wave ${v.recording ? 'on' : ''}">${'<i></i>'.repeat(13)}</div>
    <div class="trans ${v.transcript ? '' : 'ph2'}" id="trans">${v.transcript ? '“' + esc(v.transcript) + '”' : v.recording ? 'Recording… tap again to send' : v.busy ? 'Transcribing…' : 'Tap the mic, speak, tap again — English, हिन्दी, नेपाली, Español'}</div>
    ${v.busy ? '<div class="muted"><div class="spin dk" style="width:22px;height:22px;border-width:3px"></div>Understanding…</div>' : ''}</div>
    <div class="inrow mt"><input class="f" id="typed" placeholder="…or type: sold 2 milk to Ramesh on credit" ${ready ? '' : 'disabled'}><button class="btn pri" data-a="typed" ${ready ? '' : 'disabled'}>Add</button></div>
    ${ready ? '' : `<div class="muted small mt">Voice and typed commands are parsed by the AI backend — configure Gemini or your local server in Settings.</div>`}
    ${topProducts.length ? `
      <div style="border-top:1px solid var(--line);margin-top:14px;padding-top:10px">
        <div class="flex between" style="align-items:center;margin-bottom:6px"><span class="muted small" style="font-weight:600">⚡ Fast tap checkout</span><span class="muted small">Tap to add</span></div>
        <div class="chips" style="margin:0;flex-wrap:wrap;gap:6px">
          ${topProducts.map(p => `<button class="chip" data-a="quickSaleTap" data-v="${p.id}" style="font-size:12px;padding:6px 10px">${emoji(p)} ${esc(p.name)} (${money(p.price, cur)})</button>`).join('')}
        </div>
      </div>` : ''}
    </div>`;

  if (v.bill.length) {
    const inc = v.bill.filter(b => b.include);
    const total = inc.reduce((sum, b) => {
      if (b.intent !== 'sale') return sum;
      const pr = prod(b.productId);
      if (!pr) return sum;
      const q = +Core.convertQty(+b.qty, b.unit || null, pr.unit).toFixed(3);
      return sum + q * pr.price;
    }, 0);

    o += `<div class="card"><div class="ch"><h2><span class="ico t-ind">🧾</span>Current bill</h2><button class="btn sm ghost" data-a="billClear">Clear</button></div>
    <div class="list">${v.bill.map((b, i) => {
      const pr = prod(b.productId);
      const lp = pr && b.intent === 'sale' ? money(+(+Core.convertQty(+b.qty, b.unit || null, pr.unit).toFixed(3) * pr.price).toFixed(2), cur) : pr ? '+stock' : '—';
      return `<div class="billline ${b.include ? '' : 'off'} ${b.productId ? '' : 'miss'}">
      <input type="checkbox" ${b.include ? 'checked' : ''} data-bi="${i}" data-bk="include" aria-label="Include this line">
      <div class="bmid">
        <select class="f" data-bi="${i}" data-bk="productId"><option value="">❓ “${esc(b.query)}” — choose</option>${S.products.map(x => `<option value="${x.id}" ${x.id === b.productId ? 'selected' : ''}>${esc(x.name)} (${fq(x.stock, x.unit)})</option>`).join('')}</select>
        ${b.productId ? '' : '<div class="misswarn">⚠️ Not in inventory — pick a product or it won’t be recorded</div>'}
        <div class="brow"><select class="f" data-bi="${i}" data-bk="intent"><option value="sale" ${b.intent === 'sale' ? 'selected' : ''}>Sold</option><option value="restock" ${b.intent === 'restock' ? 'selected' : ''}>Received</option></select>
          <input class="f" type="number" min="0" step="any" value="${b.qty}" data-bi="${i}" data-bk="qty" aria-label="Quantity">
          <select class="f" data-bi="${i}" data-bk="unit"><option value="">—</option>${UNITS.concat('dozen').map(u => `<option ${u === b.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      </div>
      <div class="rt"><b>${lp}</b><button class="btn sm ghost" data-a="billRemove" data-v="${b.id}" aria-label="Remove line">✕</button></div>
    </div>`;
    }).join('')}</div>
    <div class="total"><span>Bill total</span><b>${money(total, cur)}</b></div>
    <div style="border-top:1px solid var(--line);margin-top:12px;padding-top:10px">
      <div class="g2">
        <div><label class="lb" style="font-size:11px">Customer / Tab</label><input class="f" id="billCustomer" placeholder="Customer name (optional)" value="${esc(v.customer || '')}"></div>
        <div><label class="lb" style="font-size:11px">Payment Mode</label>
          <div class="chips" style="margin:0"><button class="chip ${v.paymentMode === 'cash' ? 'on' : ''}" data-a="payMode" data-v="cash">💵 Cash</button><button class="chip ${v.paymentMode === 'khata' ? 'on' : ''}" data-a="payMode" data-v="khata">📖 Khata (Credit)</button></div>
        </div>
      </div>
    </div>
    <div class="g2 mt"><button class="btn pri" data-a="billApply">${v.paymentMode === 'khata' ? '📖 Record to Khata' : '✔ Complete sale'}</button>
    <button class="btn sec" data-a="billPrint">🖨️ Print bill</button></div></div>`;
  } else {
    o += `<div class="card"><div class="ch"><h2><span class="ico t-ind">🧾</span>Current bill</h2></div>
    <div class="empty"><span class="e">🧾</span>Speak, type or tap a product — every item lands here as a line you confirm before it touches stock.</div>
    <div class="muted small mt">Try “Ramesh ko 2 kg aloo udhaar do”, “2 milk and 1 bread sold”, or “5 kg chamal bikri bhayo”.</div></div>`;
  }
  o += '</div>';
  return o;
}
