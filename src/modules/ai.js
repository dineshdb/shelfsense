// ShelfSense AI — Multimodal AI Client (Gemini & Local Gemma / Custom)
import { CAT } from './constants.js';
import { S, set, save } from './state.js';
import { toast } from './utils.js';

export const aiReady = () => (set().aiMode === 'custom' && set().aiBaseUrl) || !!set().apiKey;

export const aiLabel = () => set().aiMode === 'custom' && set().aiBaseUrl ? `Local ${set().aiModel}` : 'Gemini AI';

export const fetchT = (url, opts, ms = 60000) => {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(ms) })
    .catch(e => {
      throw new Error(
        e && (e.name === 'TimeoutError' || /timed?\s?out/i.test(e.message || ''))
          ? 'AI backend timed out — try again'
          : (e.message || String(e))
      );
    });
};

export async function aiCustom(parts, json = true) {
  const base = set().aiBaseUrl.replace(/\/+$/, '').replace(/\/v1\/?$/, '');
  const content = [];
  let text = '';
  for (const p of parts) {
    if (p && p.inline_data) {
      content.push({ type: 'image_url', image_url: { url: `data:${p.inline_data.mime_type};base64,${p.inline_data.data}` } });
    } else if (p && p.audio) {
      content.push({ type: 'input_audio', input_audio: { data: p.audio.data, format: 'wav' } });
    } else {
      text += (p && p.text || String(p ?? '')) + '\n';
    }
  }
  content.unshift({ type: 'text', text: text.trim() + (json ? '\nAnswer ONLY with JSON. No prose, no code fences.' : '') });

  const r = await fetchT(base + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: set().aiModel,
      temperature: json ? 0.2 : 0.5,
      messages: [{ role: 'user', content }]
    })
  });

  if (!r.ok) throw new Error('local AI HTTP ' + r.status + ': ' + (await r.text()).slice(0, 150));
  const d = await r.json();
  const m0 = (d.choices || [])[0]?.message || {};
  let t = (m0.content ?? '').trim();
  if (!t && m0.reasoning_content) {
    t = (m0.reasoning_content.match(/\{[\s\S]*\}/) || [''])[0].trim();
  }
  if (!t) throw new Error('local AI returned no content');
  return json ? JSON.parse(t.replace(/```json|```/g, '').trim()) : t;
}

export async function gemini(parts, json = true) {
  parts = parts.map(p => p && p.audio ? { inline_data: { mime_type: 'audio/wav', data: p.audio.data } } : p);
  if (set().aiMode === 'custom' && set().aiBaseUrl) return aiCustom(parts, json);
  if (!set().apiKey) throw new Error('No AI backend configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(set().model)}:generateContent?key=${encodeURIComponent(set().apiKey)}`;
  const r = await fetchT(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: json ? { responseMimeType: 'application/json', temperature: 0.2 } : { temperature: 0.5 }
    })
  });

  if (!r.ok) {
    let m = 'HTTP ' + r.status;
    try { m = (await r.json()).error.message; } catch (e) {}
    throw new Error('Gemini: ' + m);
  }

  const d = await r.json();
  const t = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  return json ? JSON.parse(t.replace(/```json|```/g, '').trim()) : t.trim();
}

export async function aiTranscribe(wavB64, lang) {
  const langName = (lang || '').startsWith('ne') ? 'Nepali' : (lang || '').startsWith('hi') ? 'Hindi' : (lang || '').startsWith('es') ? 'Spanish' : '';
  const prompt = `Transcribe this audio recording exactly as spoken, keeping the original language${langName ? ' — it is ' + langName : ''}. Output only the transcript text and nothing else.`;
  return (await gemini([{ text: prompt }, { audio: { data: wavB64 } }], false)).trim();
}

export async function geminiDetect(imgs) {
  const prompt = `You are the inventory vision system of a small grocery store. ${imgs.length > 1 ? `These ${imgs.length} images are frames from one video sweep of the same shelves; merge them and do NOT double-count items seen in several frames.` : 'Analyze the shelf image.'}
Identify every distinct retail product. Read brand and size from packaging when legible (e.g. "Coca-Cola 600ml"), else use a clear generic name ("Bananas", "White Sugar 1kg").
Return ONLY a JSON array, one object per distinct product: {"name": string, "category": one of ${JSON.stringify(Object.keys(CAT))}, "count": integer visible units (estimate kg for loose produce), "unit": "unit"|"kg"|"L"|"pack", "confidence": 0-1, "price_guess": typical local retail price number or null, "box_2d": [ymin,xmin,ymax,xmax] normalized 0-1000 around all units of that product in the FIRST image, or null}.`;

  const r = await gemini([{ text: prompt }, ...imgs.map(d => ({ inline_data: { mime_type: 'image/jpeg', data: d.split(',')[1] } }))]);
  return (Array.isArray(r) ? r : (r.products || r.items || [])).filter(x => x && x.name).map(x => ({
    name: x.name,
    category: x.category,
    count: Math.round(+x.count || 1),
    unit: x.unit,
    confidence: x.confidence,
    price: x.price_guess,
    box: x.box_2d || null
  }));
}

export async function receiptParse(imgs) {
  const prompt = `You are an expert OCR & invoice parsing system for a grocery store. ${imgs.length > 1 ? `These ${imgs.length} images are photos of ONE invoice or bill — merge them and do not double-count lines.` : 'Read this wholesale delivery bill, distributor invoice, or purchase slip.'}
It may be printed or handwritten, in English, Hindi/Hinglish, or Spanish.
Extract:
- store: supplier/wholesaler/distributor name if legible (e.g. "Metro Cash & Carry", "Patel Traders") or null
- invoiceNo: invoice/bill number if visible, or null
- date: date of invoice (YYYY-MM-DD or as written) or null
- total: grand total amount paid/due, or null
- items: array of product lines received:
  [{"name": short product name with brand & pack size (e.g. "Fortune Oil 1L", "White Sugar 1kg"),
    "qty": number,
    "unit": "unit"|"kg"|"g"|"L"|"ml"|"pack",
    "cost": number (purchase cost paid per unit),
    "mrp": number or null (printed MRP or retail sale price),
    "confidence": number 0-1}]
Skip tax summaries, signatures, and terms. Return ONLY JSON: {"store": string|null, "invoiceNo": string|null, "date": string|null, "total": number|null, "items": [...]}. If unreadable, return empty items array.`;

  const r = await gemini([{ text: prompt }, ...imgs.map(d => ({ inline_data: { mime_type: 'image/jpeg', data: d.split(',')[1] } }))]);
  return {
    store: r.store || null,
    invoiceNo: r.invoiceNo || null,
    date: r.date || null,
    total: r.total != null ? +r.total : null,
    items: (Array.isArray(r) ? r : (r.items || [])).filter(x => x && x.name).map(x => ({
      name: x.name,
      count: +x.qty || 1,
      unit: x.unit,
      cost: x.cost != null ? +x.cost : null,
      mrp: x.mrp != null ? +x.mrp : null,
      confidence: x.confidence
    }))
  };
}

export async function fetchActiveModels() {
  if (!set().apiKey) {
    toast('Enter your Gemini API key in Settings first', 'warn');
    return null;
  }
  toast('🔄 Querying Google API for active models…', 'ok', 2000);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(set().apiKey)}`;
    const r = await fetchT(url, { method: 'GET' }, 12000);
    if (!r.ok) {
      let m = 'HTTP ' + r.status;
      try { m = (await r.json()).error.message; } catch (e) {}
      throw new Error(m);
    }
    const d = await r.json();
    const list = (d.models || []).filter(x => (x.supportedGenerationMethods || []).includes('generateContent'));
    if (!list.length) throw new Error('No generateContent models found for this key');
    S.fetchedModels = list.map(x => ({
      id: x.name.replace(/^models\//, ''),
      name: x.displayName || x.name.replace(/^models\//, ''),
      description: x.description || ''
    }));
    save();
    toast(`✅ Discovered ${S.fetchedModels.length} active models for your key!`, 'ok', 3500);
    return S.fetchedModels;
  } catch (e) {
    toast('Model lookup failed: ' + e.message, 'err', 6000);
    return null;
  }
}
