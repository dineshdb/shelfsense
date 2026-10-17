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

  const handsFreeOn = !!set().handsFreeEnabled;

  if (v.view === 'khata') return vKhata(S, U);

  const topProducts = S.products.slice(0, 8);
  const currentEngine = set().voiceEngine || 'auto';
  let o = `<div class="sellgrid">
    <div class="chips" style="grid-column:1/-1;margin:0 0 -4px">
      <button class="chip on" data-a="sellView" data-v="bill">🎙️ Voice & Quick POS</button>
      <button class="chip" data-a="sellView" data-v="khata">📖 Khata Ledger (${Object.keys(S.khata || {}).length})</button>
    </div>
    <div class="card"><div class="ch"><h2><span class="ico t-info">🎙️</span>Voice sales</h2>
      <div class="chips" style="margin:0;gap:4px">
        <button class="chip ${currentEngine === 'gemma' ? 'on' : ''}" data-a="voiceEngineToggle" data-v="gemma" title="100% Free · Runs locally on device">⚡ Gemma ($0)</button>
        <button class="chip ${currentEngine === 'gemini' ? 'on' : ''}" data-a="voiceEngineToggle" data-v="gemini" title="Cloud Multilingual Pro">☁️ Gemini</button>
        <button class="chip ${currentEngine === 'auto' ? 'on' : ''}" data-a="voiceEngineToggle" data-v="auto" title="Auto: Local Gemma with Cloud Fallback">🔄 Auto</button>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:-4px 0 10px;flex-wrap:wrap;gap:6px">
      <div class="chips" style="margin:0;gap:4px">
        <button class="chip ${set().lang === 'en-US' ? 'on' : ''}" data-a="setLang" data-v="en-US" title="English (US)">🇺🇸 EN</button>
        <button class="chip ${set().lang === 'en-IN' ? 'on' : ''}" data-a="setLang" data-v="en-IN" title="Indian English / Hinglish">🇮🇳 Hinglish</button>
        <button class="chip ${set().lang === 'hi-IN' ? 'on' : ''}" data-a="setLang" data-v="hi-IN" title="हिन्दी (Hindi)">🇮🇳 हिन्दी</button>
        <button class="chip ${set().lang === 'ne-NP' ? 'on' : ''}" data-a="setLang" data-v="ne-NP" title="नेपाली (Nepali)">🇳🇵 नेपाली</button>
        <button class="chip ${set().lang === 'es-ES' ? 'on' : ''}" data-a="setLang" data-v="es-ES" title="Español">🇪🇸 ES</button>
      </div>
      <span class="badge ${currentEngine === 'gemma' ? 'b-ok' : currentEngine === 'gemini' ? 'b-info' : 'b-new'}" style="font-size:10px">
        ${currentEngine === 'gemma' ? '⚡ 100% Free · Offline POS' : currentEngine === 'gemini' ? '☁️ Cloud Gemini Pro' : '🔄 Auto Fallback'}
      </span>
    </div>
    <div class="voice">
    <button class="micbtn ${v.recording ? 'on' : ''}" data-a="listen" ${ready || hasSpeechRec ? '' : 'disabled'} aria-label="${v.recording ? 'Stop recording' : 'Start recording'}">${v.recording ? ICONS.stop : ICONS.mic}</button>
    <div class="wave ${v.recording ? 'on' : ''}">${'<i></i>'.repeat(13)}</div>
    <div class="trans ${v.transcript ? '' : 'ph2'}" id="trans">${v.transcript ? '“' + esc(v.transcript) + '”' : v.handsFree ? '🎙️ Listening hands-free… speak items freely' : v.recording ? 'Recording… speak item or tap to stop' : v.busy ? 'Understanding…' : (handsFreeOn ? 'Tap the mic or Start "Take Order" — English, हिन्दी, नेपाली, Español' : 'Tap the mic or type to sell — English, हिन्दी, नेपाली, Español')}</div>
    ${v.busy ? '<div class="muted"><div class="spin dk" style="width:22px;height:22px;border-width:3px"></div>Understanding…</div>' : ''}</div>
    ${handsFreeOn ? `
    <button class="btn ${v.handsFree ? 'danger' : 'pri'} w mt" data-a="toggleTakeOrder" style="display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px">
      ${v.handsFree ? '⏹️ Stop "Take Order" Mode' : '🎙️ Start "Take Order" Hands-Free (Beta)'}
    </button>` : ''}
    <div class="inrow mt"><input class="f" id="typed" placeholder="…or type: sold 2 milk to Ramesh on credit"><button class="btn pri" data-a="typed">Add</button></div>
    ${v.statusMsg ? `<div class="badge b-ok mt small" style="display:flex;align-items:center;gap:6px;padding:7px 11px;font-size:12px;margin-top:10px;border-radius:var(--radius)"><span>${esc(v.statusMsg)}</span></div>` : ''}
    ${handsFreeOn ? `
    <div class="muted small" style="margin-top:10px;font-size:11.5px;display:flex;align-items:center;gap:5px;flex-wrap:wrap">
      <span>🗣️ <b>Voice flow:</b> Say <i>"Take order"</i> to start · <i>"Done / Ho gaya"</i> to finish · <i>"Next / Agla"</i> to save · <i>"Cancel"</i></span>
    </div>` : `
    <div class="muted small" style="margin-top:10px;font-size:11.5px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
      <span>🗣️ Tap mic to speak or type commands above.</span>
      <button class="btn ghost sm" data-a="tab" data-v="settings" style="font-size:11px;padding:2px 8px">🧪 Hands-Free POS (Beta)</button>
    </div>`}
    <div class="muted small mt">⚡ <b>Instant Voice POS:</b> Works offline with built-in smart parser, or connect Gemini/Local Gemma in Settings for advanced multilingual understanding.</div>
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
