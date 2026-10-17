// ShelfSense AI — Settings View
import { MODEL_GUIDE } from '../modules/constants.js';
import { esc } from '../modules/utils.js';
import { set } from '../modules/state.js';
import { aiReady, aiLabel } from '../modules/ai.js';

export function vSettings(S, U) {
  const s = set();
  const inp = (k, type = 'text', extra = '') => `<input class="f" type="${type}" data-set="${k}" value="${esc(s[k])}" ${extra}>`;
  const tg = (k, t, d) => `<div class="sw"><div><b>${t}</b><div class="muted small">${d}</div></div><button class="tg ${s[k] ? 'on' : ''}" data-a="toggle" data-v="${k}"></button></div>`;
  const sec = (n, ico, cls, title, body) => `<div class="card"><div class="ch"><h2><span class="stp">${n}</span><span class="ico ${cls}">${ico}</span>${title}</h2></div>${body}</div>`;

  const curModel = s.model || 'gemini-3.8-flash';
  const info = MODEL_GUIDE[curModel] || {
    name: curModel,
    tag: 'Active / Detected Model',
    cost: 'Standard Gemini API pricing',
    speed: 'Variable',
    useCase: 'Active model connected via Google Generative Language API.'
  };

  const fetched = S.fetchedModels || [];
  let modelOpts = '';
  if (fetched.length) {
    modelOpts += `<optgroup label="✅ Verified Active on Your Key">${fetched.map(m => {
      const g = MODEL_GUIDE[m.id];
      const label = g ? `${m.id} (${g.tag})` : (m.name !== m.id ? `${m.id} — ${m.name}` : m.id);
      return `<option value="${esc(m.id)}" ${m.id === curModel ? 'selected' : ''}>${esc(label)}</option>`;
    }).join('')}</optgroup>`;
    modelOpts += `<optgroup label="⚡ Preset Curated Models">${Object.entries(MODEL_GUIDE).filter(([id]) => !fetched.some(f => f.id === id)).map(([id, g]) => `<option value="${id}" ${id === curModel ? 'selected' : ''}>${id} (${g.tag})</option>`).join('')}</optgroup>`;
  } else {
    modelOpts = Object.entries(MODEL_GUIDE).map(([id, g]) => `<option value="${id}" ${id === curModel ? 'selected' : ''}>${id} (${g.tag})</option>`).join('');
    if (!MODEL_GUIDE[curModel]) modelOpts += `<option value="${esc(curModel)}" selected>Custom: ${esc(curModel)}</option>`;
  }

  return `<div class="settingsgrid">
  ${sec(1, '🏪', 't-ok', 'Store', `
    <label class="lb">Shop name</label>${inp('storeName')}
    <div class="g2"><div><label class="lb">Currency</label>${inp('currency')}</div><div><label class="lb">Voice language</label><select class="f" data-set="lang">${[['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['es-ES', 'Español (ES)'], ['es-MX', 'Español (MX)'], ['es-CR', 'Español (CR)'], ['hi-IN', 'हिन्दी Hindi'], ['ne-NP', 'नेपाली Nepali'], ['fr-FR', 'Français'], ['pt-BR', 'Português']].map(([v, l]) => `<option value="${v}" ${v === s.lang ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>`)}
  ${sec(2, '🤖', 't-ind', 'AI backend', `
    <div class="ch" style="border:0;padding:0 0 2px"><span class="pill ${aiReady() ? '' : 'off'}"><i></i>${aiReady() ? aiLabel() : 'AI off'}</span></div>
    <label class="lb">Backend</label><select class="f" data-set="aiMode">${[['gemini', 'Google Gemini API (cloud, API key)'], ['custom', 'Custom / local server (OpenAI-compatible — Gemma, llama.cpp, ollama…)']].map(([v, l]) => `<option value="${v}" ${v === s.aiMode ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <label class="lb">Google Gemini API key</label><div class="inrow">${inp('apiKey', 'password', 'id="key" placeholder="AIza…" autocomplete="off"')}<button class="btn sm ghost" data-a="showkey">Show</button></div>
    <div class="flex between mt" style="align-items:center;margin-bottom:4px">
      <label class="lb" style="margin:0">Gemini model</label>
      <button class="btn sm sec" data-a="fetchModels" style="font-size:11.5px;padding:3px 9px" ${s.apiKey ? '' : 'disabled'}>🔄 Auto-detect models</button>
    </div>
    <select class="f" data-set="model" id="modelSelect">
      ${modelOpts}
    </select>
    <div style="margin-top:8px;padding:10px 12px;border-radius:var(--radius);background:var(--secondary);border:1px solid var(--border)">
      <div class="flex between" style="align-items:center">
        <b style="font-size:13px;color:var(--primary)">${esc(info.name || curModel)}</b>
        <span class="badge ${info.badgeClass || 'b-ok'}" style="font-size:10.5px">${esc(info.tag || 'Active')}</span>
      </div>
      <div class="muted small" style="margin-top:4px">💰 <b>Cost:</b> ${esc(info.cost)}</div>
      <div class="muted small">⚡ <b>Speed:</b> ${esc(info.speed)}</div>
      <div class="muted small" style="margin-top:3px">💡 <b>Best for:</b> ${esc(info.useCase)}</div>
    </div>
    <div class="mt" style="border-top:1px solid var(--line);padding-top:12px">
      <label class="lb">Local server base URL</label>${inp('aiBaseUrl', 'text', 'placeholder="http://localhost:8080"')}
      <div class="g2"><div><label class="lb">Local model</label>${inp('aiModel')}</div><div></div></div>
      <div class="muted small mt">For all AI features on YOUR machine: your merve gateway (<code>http://localhost:8283/v1</code>, model <code>gemma-4-e4b</code>) or any OpenAI-compatible server. Tip: open <code>http://localhost:8283</code> itself — it serves this app next to the AI, same origin, so no browser permission is needed (llama.cpp + CORS shim does the rest; ollama needs OLLAMA_ORIGINS=*).</div>
    </div>
    <button class="btn sec w mt" data-a="test">🔌 Test AI connection</button>`)}
  ${sec(3, '🎙️', 't-info', 'Voice', `${tg('autoApply', 'Auto-record', 'Save immediately when every product is recognized')}${tg('speak', 'Spoken confirmation', 'Reads back the sale and low-stock warnings')}`)}
  ${sec(4, '📊', 't-warn', 'Reorder rules', `
    <div class="g3"><div><label class="lb">Lead days</label>${inp('leadDays', 'number', 'min="0"')}</div><div><label class="lb">Cover days</label>${inp('coverDays', 'number', 'min="1"')}</div><div><label class="lb">Safety days</label>${inp('safetyDays', 'number', 'min="0"')}</div></div>
    <label class="lb">Sales history window (days)</label>${inp('windowDays', 'number', 'min="7"')}
    <div class="muted small mt">Reorder point = avg daily sales × (lead + safety). Order = avg daily × (lead + cover + safety) − stock.</div>`)}
  ${sec(5, '🎨', 't-slow', 'Appearance', `
    <div class="flex between"><span class="muted small">Follows your choice; Auto tracks the system.</span>
      <div class="chips" role="group" aria-label="Theme">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => {
        let cur = 'auto';
        try { cur = localStorage.getItem("shelfsense:theme") || 'auto'; } catch {}
        return `<button class="chip ${cur === v ? 'on' : ''}" data-a="theme" data-v="${v}">${l}</button>`;
      }).join('')}</div></div>`)}
  ${sec(6, '💾', 't-slow', 'Data', `<div class="g2">
    <button class="btn sec" data-a="demo">✨ Load demo</button><button class="btn sec" data-a="export">⬇️ Export</button>
    <button class="btn sec" data-a="pick" data-v="importIn">⬆️ Import</button><button class="btn danger" data-a="reset">🗑️ Reset all</button></div>`)}
  <div class="muted small" style="text-align:center;padding:4px 0 16px">ShelfSense AI · Smart Retail Assistant</div></div>`;
}
