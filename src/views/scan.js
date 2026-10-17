// ShelfSense AI — Scan View (Shelf Vision, Wholesale Bill OCR, Barcode)
import { UNITS, ICONS, MAX_SCAN_IMAGES } from '../modules/constants.js';
import { esc, money, fq, emoji } from '../modules/utils.js';
import { set, prod, findByBarcode } from '../modules/state.js';
import { aiReady, aiLabel } from '../modules/ai.js';

export function vScan(S, U) {
  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
  const sc = U.scan;
  const rcpt = sc.mode === 'rcpt';
  const barcode = sc.mode === 'barcode';
  const ready = barcode ? true : aiReady();
  const gate = barcode ? false : !ready;
  const cur = set().currency;
  const maxImages = set().maxScanImages || MAX_SCAN_IMAGES || 5;
  const staged = sc.images || [];
  const imgCount = staged.length;

  let o = `<div class="scangrid"><div class="card"><div class="ch"><h2><span class="ico t-ok">${barcode ? '🏷️' : rcpt ? '📄' : '📸'}</span>${barcode ? 'Scan a barcode' : rcpt ? 'Inward delivery bill' : 'Scan the store'}</h2><span class="sub">${barcode ? (hasBarcodeDetector ? 'Native Scanner' : 'Barcode') : ready ? aiLabel() : 'Needs AI'}</span></div>
  <div class="chips" style="margin-top:0">${[['shelf', '🧺 Shelf'], ['rcpt', '📄 Inward Bill'], ['barcode', '🏷️ Barcode']].map(([v, l]) => `<button class="chip ${sc.mode === v ? 'on' : ''}" data-a="scanmode" data-v="${v}">${l}</button>`).join('')}</div>
  <div class="viewer">
    ${sc.camOn && !sc.image ? `<video id="video" playsinline muted autoplay></video><span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span><div class="laser"></div>` : ''}
    ${sc.image ? `<img id="shot" src="${sc.image}"><canvas id="shotCv"></canvas>` : ''}
    ${!sc.camOn && !sc.image ? `<div class="ph"><div class="scanico">${barcode ? '🏷️' : rcpt ? '📄' : ICONS.scan}</div><b style="font-size:14.5px">${barcode ? 'Point camera at any barcode or QR code' : rcpt ? 'Point at supplier invoice or delivery slip' : 'Point at a shelf'}</b><br>${barcode ? 'Instant deterministic product lookup, sales checkout and restock.' : rcpt ? `Photograph up to ${maxImages} invoice pages — AI merges lines, costs and margins.` : `Take up to ${maxImages} shelf photos for complete aisle inventory.`}</div>` : ''}
    ${sc.busy ? `<div class="busy"><div><div class="spin"></div>${esc(sc.status || 'Analyzing photos…')}</div></div>` : ''}
  </div>`;

  // Processing Screen with Live Counters
  if (sc.busy) {
    const totalUnits = sc.dets.reduce((s, d) => s + (+d.count || 0), 0);
    o += `<div class="card mt" style="background:var(--secondary);border:1px solid var(--border);padding:14px;border-radius:var(--radius)">
      <div class="flex between" style="align-items:center;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="spin" style="width:18px;height:18px;border-width:2.5px"></div>
          <b style="font-size:13px">${esc(sc.status || 'Scanning each photo with ' + aiLabel() + '…')}</b>
        </div>
        <span class="badge b-info">${imgCount || 1} photo${imgCount > 1 ? 's' : ''} queued</span>
      </div>
      <div class="countdown-bar" style="height:6px;margin:8px 0 12px;background:var(--line);border-radius:3px;overflow:hidden">
        <div style="height:100%;background:linear-gradient(90deg,var(--primary),var(--ok));width:100%;animation:pulse 1.4s infinite"></div>
      </div>
      <div class="g2" style="gap:8px">
        <div style="background:var(--card);padding:8px 10px;border-radius:var(--radius);border:1px solid var(--line);text-align:center">
          <div class="muted small" style="font-size:11px">📦 Product Types</div>
          <b style="font-size:16px;color:var(--primary)">${sc.dets.length || '…'}</b>
        </div>
        <div style="background:var(--card);padding:8px 10px;border-radius:var(--radius);border:1px solid var(--line);text-align:center">
          <div class="muted small" style="font-size:11px">🔢 Total Units Counted</div>
          <b style="font-size:16px;color:var(--ok)">${totalUnits || '…'}</b>
        </div>
      </div>
    </div>`;
  }

  // Staged Photos Tray (Multi-Image)
  if (!barcode && staged.length > 0 && !sc.busy) {
    o += `<div style="margin-top:12px;padding:10px 12px;background:var(--secondary);border-radius:var(--radius);border:1px solid var(--border)">
      <div class="flex between" style="align-items:center;margin-bottom:6px">
        <span class="muted small" style="font-weight:600;font-size:12px">📸 Staged Photos (${staged.length}/${maxImages})</span>
        <button class="btn sm ghost danger" data-a="clearScanImgs" style="font-size:11px;padding:2px 8px">🗑️ Clear all</button>
      </div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scroll-behavior:smooth">
        ${staged.map((img, idx) => `
          <div style="position:relative;flex-shrink:0;width:66px;height:66px;border-radius:var(--radius);overflow:hidden;border:2px solid ${idx === (sc.activeIdx || 0) ? 'var(--primary)' : 'var(--line)'};cursor:pointer" data-a="selectScanImg" data-idx="${idx}">
            <img src="${img}" style="width:100%;height:100%;object-fit:cover" alt="Photo ${idx + 1}">
            <span style="position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,0.65);color:#fff;font-size:9.5px;padding:1px 4px;border-radius:3px;font-weight:700">#${idx + 1}</span>
            <button data-a="removeScanImg" data-idx="${idx}" style="position:absolute;top:2px;right:2px;background:rgba(239,68,68,0.88);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1" title="Remove photo">✕</button>
          </div>
        `).join('')}
        ${staged.length < maxImages ? `
          <button class="btn ghost" data-a="pick" data-v="photoIn" style="flex-shrink:0;width:66px;height:66px;border-radius:var(--radius);border:2px dashed var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;gap:2px;font-size:10.5px" title="Add another photo">
            <span style="font-size:16px">➕</span>
            <span>Add</span>
          </button>
        ` : ''}
      </div>
    </div>`;
  }

  // Camera and Action Buttons
  if (sc.camOn) {
    o += `<div class="g2 mt">
      <button class="btn pri" data-a="capture" ${staged.length >= maxImages ? 'disabled' : ''}>
        ◉ Snap ${staged.length > 0 ? `(${staged.length + 1}/${maxImages})` : ''}
      </button>
      ${staged.length > 0 ? `
        <button class="btn ok" data-a="startScanAll">🚀 Scan ${staged.length} Photo${staged.length > 1 ? 's' : ''}</button>
      ` : `
        <button class="btn ghost" data-a="camoff">✕ Close</button>
      `}
    </div>
    ${staged.length > 0 ? `<button class="btn ghost w mt" data-a="camoff" style="font-size:11px">✕ Stop Camera</button>` : ''}`;
  } else if (staged.length > 0 && !sc.busy) {
    o += `<div class="g2 mt">
      <button class="btn pri" data-a="startScanAll" ${sc.busy ? 'disabled' : ''}>
        🚀 Scan All (${staged.length} Photo${staged.length > 1 ? 's' : ''})
      </button>
      <button class="btn sec" data-a="cam" ${staged.length >= maxImages ? 'disabled' : ''}>
        🎥 + Snap more
      </button>
    </div>`;
  } else if (!sc.busy) {
    o += `<div class="g2 mt">
      <button class="btn pri" data-a="cam" ${gate ? 'disabled' : ''}>🎥 Live camera</button>
      <button class="btn sec" data-a="pick" data-v="photoIn" ${gate ? 'disabled' : ''}>🖼️ ${barcode ? 'Barcode photo' : rcpt ? `Invoice photos (1–${maxImages})` : `Photos (1–${maxImages})`}</button>
    </div>`;
  }

  if (barcode) {
    o += `<div class="inrow mt"><input class="f" id="manualBarcode" placeholder="Or enter barcode / SKU…"><button class="btn pri" data-a="manualBarcode">Find</button></div>`;
  }
  if (gate) o += `<div class="muted small mt">Scanning needs an AI backend — configure Gemini or your local server in Settings.</div>`;
  if (sc.image && !sc.busy && !staged.length) o += `<button class="btn ghost w mt" data-a="rescan">↺ ${barcode ? 'Scan another barcode' : rcpt ? 'Read another invoice' : 'Scan again'}</button>`;
  o += `</div>`;

  if (barcode) {
    if (sc.barcode) {
      const bp = findByBarcode(sc.barcode.code);
      if (bp) {
        o += `<div class="card"><div class="ch"><h2><span class="ico t-ok">🏷️</span>Barcode matched</h2><span class="badge b-ok">In inventory</span></div>
        <div class="muted small" style="margin:-4px 0 10px">Barcode: <code>${esc(sc.barcode.code)}</code></div>
        <div class="it" style="border:1px solid var(--line);border-radius:var(--radius);padding:12px;margin-bottom:14px">
          <div class="em" style="font-size:28px">${emoji(bp)}</div>
          <div class="mid">
            <div class="tt" style="font-size:16px;font-weight:700">${esc(bp.name)}</div>
            <div class="ss">${money(bp.price, cur)} / ${bp.unit} · Stock: <b>${fq(bp.stock, bp.unit)}</b></div>
            <div class="muted small" style="margin-top:2px">${esc(bp.category || 'Other')}${bp.barcode ? ' · SKU ' + esc(bp.barcode) : ''}</div>
          </div>
        </div>
        <div class="g2"><button class="btn pri" data-a="barcodeAction" data-t="sale" data-v="${bp.id}">⚡ Quick Sale (1 ${bp.unit})</button>
        <button class="btn sec" data-a="barcodeAction" data-t="restock" data-v="${bp.id}">📦 +1 Restock</button></div>
        <div class="g2 mt"><button class="btn ghost" data-a="edit" data-v="${bp.id}">✏️ Edit product</button>
        <button class="btn ghost" data-a="barcodeRescan">↺ Scan another</button></div></div>`;
      } else {
        o += `<div class="card"><div class="ch"><h2><span class="ico t-warn">🏷️</span>Unmatched Barcode</h2><span class="badge b-new">New</span></div>
        <div class="muted" style="margin:-4px 0 14px">Barcode <b style="color:var(--primary);font-family:monospace;font-size:15px">${esc(sc.barcode.code)}</b> is not linked to any product yet.</div>
        <div class="g2"><button class="btn pri" data-a="barcodeNew" data-v="${esc(sc.barcode.code)}">➕ Create new product</button>
        <button class="btn ghost" data-a="barcodeRescan">↺ Scan another</button></div></div>`;
      }
    } else {
      o += `<div class="card"><div class="ch"><h2><span class="ico t-info">🏷️</span>Barcode checkout & intake</h2></div>
      <div class="empty"><span class="e">🏷️</span>Point camera at any UPC, EAN, or QR barcode to instantly look up stock, ring up a sale, or log incoming goods.</div>
      <div class="muted small mt">Supports EAN-13, UPC-A, Code 128, QR codes, and more using your browser's native hardware scanner.</div></div>`;
    }
  } else if (!sc.dets.length && !sc.busy) {
    o += `<div class="card"><div class="ch"><h2><span class="ico t-info">${rcpt ? '📄' : '🔎'}</span>${rcpt ? 'Inward delivery lines' : 'Found products'}</h2></div>
    ${rcpt ? `<div class="empty"><span class="e">📄</span>Photograph up to ${maxImages} printed or handwritten supplier bill pages — AI merges items, quantities, costs and margins for 1-tap stock inwarding.</div>
    <div class="muted small mt">Wholesale unit costs update inventory cost price; margins are calculated automatically and stock is logged to the ledger.</div>`
    : `<div class="empty"><span class="e">🔍</span>Capture up to ${maxImages} shelf photos and everything the AI recognizes lands here — check names, quantities and prices, then save to inventory.</div>
    <div class="muted small mt">Use <b>Live camera</b> to multi-snap shelf tiers, or <b>Photos</b> to upload shots. Detection runs with ${aiLabel()}.</div>`}</div>`;
  }

  if (sc.dets.length) {
    const sum = sc.dets.filter(d => d.include).reduce((s, d) => s + (+d.count || 0) * (+d.cost || 0), 0);
    const totUnits = sc.dets.filter(d => d.include).reduce((s, d) => s + (+d.count || 0), 0);
    const totOk = sc.rcpt && sc.rcpt.total != null && Math.abs(sum - sc.rcpt.total) <= Math.max(1, sc.rcpt.total * 0.02);
    o += `<div class="card"><div class="ch"><h2><span class="ico t-info">${rcpt ? '📄' : '🔎'}</span>${sc.dets.length} ${rcpt ? 'inward line' + (sc.dets.length > 1 ? 's' : '') : 'products found'}</h2>
      <span class="badge b-ok" style="font-size:11px">🔢 ${totUnits} total units · ${imgCount || 1} photo${imgCount > 1 ? 's' : ''}</span>
    </div>
    ${rcpt && sc.rcpt && (sc.rcpt.store || sc.rcpt.invoiceNo || sc.rcpt.total != null) ? `<div class="muted small" style="margin:-4px 0 10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${sc.rcpt.store ? `<span class="badge b-ok" style="font-weight:600">🏢 ${esc(sc.rcpt.store)}</span>` : ''}
      ${sc.rcpt.invoiceNo ? `<span class="badge b-info">#️⃣ Inv: ${esc(sc.rcpt.invoiceNo)}</span>` : ''}
      ${sc.rcpt.date ? `<span>📅 ${esc(sc.rcpt.date)}</span>` : ''}
      ${sc.rcpt.total != null ? `<span>Invoice total ${money(sc.rcpt.total, cur)} · lines sum: <b style="color:${totOk ? 'var(--ok)' : 'var(--warn)'}">${money(sum, cur)}</b></span>` : ''}
    </div>` : ''}
    ${rcpt ? `<div class="flex between mt small" style="align-items:center;background:var(--secondary);padding:6px 10px;border-radius:var(--radius);margin-bottom:10px">
      <span class="muted">Check unit costs & sell prices</span>
      <button class="btn sm ghost" data-a="autoMarginAll" style="font-size:11px;padding:3px 8px">⚡ Auto 30% margin</button>
    </div>` : ''}
    <div class="muted small" style="margin:-4px 0 10px">${rcpt ? 'Check products, inward quantities, costs and selling prices, then confirm inward stock.' : 'Check names, quantities and prices, then save to inventory.'}</div>
    <div class="list">${sc.dets.map((d, i) => {
      const margin = (d.price && d.cost) ? Math.round(((d.price - d.cost) / d.price) * 100) : null;
      return `<div class="det"><input type="checkbox" data-det="${i}" data-k="include" ${d.include ? 'checked' : ''}><div>
      <input class="f" style="font-weight:700" value="${esc(d.name)}" data-det="${i}" data-k="name">
      <div class="flex mt small" style="flex-wrap:wrap;gap:6px;align-items:center">
        <span class="badge ${d.matchId ? 'b-ok' : 'b-new'}">${d.matchId ? 'Updates ' + esc(prod(d.matchId)?.name || '') : 'New product'}</span>
        ${d.photosCount && d.photosCount > 1 ? `<span class="badge b-info" style="font-size:10px">📸 In ${d.photosCount} photos</span>` : ''}
        ${d.costDiff ? `<span class="badge ${d.costDiff > 0 ? 'b-warn' : 'b-ok'}">${d.costDiff > 0 ? '▲ Cost +' + money(d.costDiff, cur) : '▼ Cost ' + money(d.costDiff, cur)}</span>` : ''}
        ${margin !== null ? `<span class="badge ${margin >= 20 ? 'b-ok' : margin > 0 ? 'b-warn' : 'b-bad'}">${margin}% margin</span>` : ''}
        ${d.confidence ? `<span class="muted small">${Math.round(d.confidence * 100)}% conf</span>` : ''}
        ${rcpt ? '' : `<span class="muted small">${esc(d.category)}</span>`}
      </div>
      <div class="rowf" style="grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-top:6px">
        <div><label class="lb" style="font-size:10px">Inward Qty</label><input class="f" type="number" min="0" step="any" value="${d.count}" data-det="${i}" data-k="count" placeholder="Qty"></div>
        <div><label class="lb" style="font-size:10px">Unit</label><select class="f" data-det="${i}" data-k="unit">${UNITS.map(u => `<option ${u === d.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
        <div><label class="lb" style="font-size:10px">${rcpt ? 'Unit Cost' : 'Cost'}</label><input class="f" type="number" min="0" step="0.01" value="${esc(d.cost ?? '')}" data-det="${i}" data-k="cost" placeholder="Cost"></div>
        <div><label class="lb" style="font-size:10px">Sell Price</label><input class="f" type="number" min="0" step="0.01" value="${esc(d.price ?? '')}" data-det="${i}" data-k="price" placeholder="Price"></div>
      </div></div></div>`;
    }).join('')}</div>
    <div class="g2 mt2"><button class="btn pri" data-a="commit" data-v="add">${rcpt ? '📦 Confirm inward stock' : '➕ Add to stock'}</button>${rcpt ? '' : '<button class="btn sec" data-a="commit" data-v="set">🧮 Set as count</button>'}</div>
    <div class="muted small mt">${rcpt ? 'Stock rises by incoming quantities, cost prices update, and purchase history is logged.' : '<b>Add</b> = a new delivery on top of current stock. <b>Set</b> = a full shelf count.'}</div></div>`;
  }
  o += '</div>';
  return o;
}
