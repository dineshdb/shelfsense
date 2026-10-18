// ShelfSense AI — Settings View
import { MODEL_GUIDE } from '../modules/constants.js';
import { esc } from '../modules/utils.js';
import { set } from '../modules/state.js';
import { aiReady, aiLabel } from '../modules/ai.js';
import { MOBILE_LOCAL_MODELS, engineState } from '../modules/webllm.js';

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

  const localModelKey = s.localAiModel || 'gemma3-1b-it-q4f16_1-MLC';
  const localModelInfo = MOBILE_LOCAL_MODELS[localModelKey] || MOBILE_LOCAL_MODELS['gemma3-1b-it-q4f16_1-MLC'];

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
    <label class="lb">Backend</label><select class="f" data-set="aiMode">${[['gemini', 'Google Gemini API (cloud, API key)'], ['custom', 'Local Google Gemma Server (Ollama / llama-server with Gemma)']].map(([v, l]) => `<option value="${v}" ${v === s.aiMode ? 'selected' : ''}>${l}</option>`).join('')}</select>
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
      <label class="lb">External Google Gemma Server URL (Optional)</label>${inp('aiBaseUrl', 'text', 'placeholder="http://localhost:8080"')}
      <div class="g2"><div><label class="lb">Google Gemma model</label>${inp('aiModel')}</div><div></div></div>
      <div class="muted small mt">For running a Google Gemma server on PC/LAN (e.g. <code>ollama run gemma2</code> or <code>llama-server -hf google/gemma-4-e4a</code>). If using in-browser mobile AI below, you do not need this!</div>
    </div>
    <button class="btn sec w mt" data-a="test">🔌 Test AI connection</button>`)}
  ${sec(3, '📱', 't-ok', 'On-Device Google Gemma AI (Zero-Install · $0)', `
    ${tg('localAiEnabled', '📱 Run Google Gemma Directly on Device (WebGPU)', 'Zero install! Downloads Google Gemma weights into phone browser storage once, then runs 100% offline with zero cloud cost.')}
    <div style="margin-top:10px">
      <label class="lb">Select Mobile Model</label>
      <select class="f" data-set="localAiModel" id="localAiModelSelect">
        ${Object.values(MOBILE_LOCAL_MODELS).map(m => `
          <option value="${m.id}" ${m.id === localModelKey ? 'selected' : ''}>
            ${m.name} (${m.size})
          </option>
        `).join('')}
      </select>
    </div>
    <div style="margin-top:8px;padding:10px 12px;border-radius:var(--radius);background:var(--secondary);border:1px solid var(--border)">
      <div class="flex between" style="align-items:center">
        <b style="font-size:13px;color:var(--primary)">${esc(localModelInfo.name)}</b>
        <span class="badge ${localModelInfo.badgeCls || 'b-ok'}" style="font-size:10.5px">${esc(localModelInfo.badge)}</span>
      </div>
      <div class="muted small" style="margin-top:4px">📦 <b>Download size:</b> ${esc(localModelInfo.size)} · 🧠 <b>VRAM/RAM:</b> ${esc(localModelInfo.vram)}</div>
      <div class="muted small" style="margin-top:3px">💡 ${esc(localModelInfo.desc)}</div>
    </div>
    <div class="mt" style="padding-top:4px">
      ${engineState.status === 'downloading' ? `
        <div id="localAiProgressContainer" style="margin-top:4px">
          <div class="muted small" style="margin-bottom:6px">
            📥 <b>Downloading & Initializing:</b> <span id="localAiProgressText">${esc(engineState.text)} (${engineState.progress}%)</span>
          </div>
          <div class="countdown-bar">
            <div class="countdown-fill" id="localAiProgressFill" style="width:${engineState.progress}%;transition:width 0.25s cubic-bezier(0.4, 0, 0.2, 1)"></div>
          </div>
        </div>
      ` : engineState.status === 'ready' ? `
        <div class="badge b-ok small" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:var(--radius);flex-wrap:wrap;gap:8px">
          <span>🟢 <b>Model Active in RAM:</b> Ready for offline billing</span>
          <button class="btn sm ghost" data-a="unloadLocalAi" style="font-size:11px;padding:3px 8px" title="Free up phone memory">⏹️ Sleep / Free RAM</button>
        </div>
      ` : engineState.status === 'unloaded' ? `
        <div class="badge b-new small" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:var(--radius);flex-wrap:wrap;gap:8px">
          <span>💤 <b>Model Sleeping:</b> Phone RAM is 100% free</span>
          <button class="btn sm pri" data-a="startLocalAi" style="font-size:11px;padding:3px 8px">⚡ Wake / Start</button>
        </div>
      ` : `
        <div class="g2 mt">
          <button class="btn ${s.localAiEnabled ? 'pri' : 'sec'}" data-a="startLocalAi">⚡ Start / Download Model</button>
          <button class="btn ghost danger" data-a="deleteLocalAiCache" title="Free up phone storage">🗑️ Clear Cache</button>
        </div>
      `}
    </div>
    <div class="muted small mt" style="font-size:11.5px">📶 <b>Mobile Tip:</b> Models download once into browser storage and never consume cellular data again. Recommended to download over Wi-Fi. Tap "Sleep / Free RAM" anytime to release phone memory.</div>
  `)}
  ${sec(4, '🎙️', 't-info', 'Voice & Audio POS', `
    <label class="lb">Voice Engine Strategy</label>
    <select class="f" data-set="voiceEngine">
      <option value="auto" ${(s.voiceEngine || 'auto') === 'auto' ? 'selected' : ''}>🔄 Smart Auto (Local Gemma with Cloud Fallback)</option>
      <option value="gemma" ${s.voiceEngine === 'gemma' ? 'selected' : ''}>⚡ Local Gemma ($0 Cost · 100% Offline Ready)</option>
      <option value="gemini" ${s.voiceEngine === 'gemini' ? 'selected' : ''}>☁️ Google Gemini Cloud (Multilingual Pro)</option>
    </select>
    <div class="muted small mt" style="margin-bottom:10px">💡 <b>Zero Cost Strategy:</b> Local Gemma processes cashier voice billing locally on your device with $0 token cost and keeps working during network outages.</div>
    ${tg('handsFreeEnabled', '🎙️ Hands-Free "Take Order" Mode (Beta)', 'Enable continuous listening with "Take order", "Done", and 3-second auto-save countdown.')}
    ${tg('autoApply', 'Auto-record', 'Save immediately when every product is recognized')}${tg('speak', 'Spoken confirmation', 'Reads back the sale and low-stock warnings')}
    <div class="mt" style="border-top:1px solid var(--line);padding-top:10px">
      <label class="lb">Max Multi-Photo Scan Limit</label>${inp('maxScanImages', 'number', 'min="1" max="10"')}
      <div class="muted small mt">Number of photos allowed per inventory shelf sweep or wholesale delivery bill (default: 5).</div>
    </div>`)}
  ${sec(5, '📊', 't-warn', 'Reorder rules', `
    <div class="g3"><div><label class="lb">Lead days</label>${inp('leadDays', 'number', 'min="0"')}</div><div><label class="lb">Cover days</label>${inp('coverDays', 'number', 'min="1"')}</div><div><label class="lb">Safety days</label>${inp('safetyDays', 'number', 'min="0"')}</div></div>
    <label class="lb">Sales history window (days)</label>${inp('windowDays', 'number', 'min="7"')}
    <div class="muted small mt">Reorder point = avg daily sales × (lead + safety). Order = avg daily × (lead + cover + safety) − stock.</div>`)}
  ${sec(6, '🎨', 't-slow', 'Appearance', `
    <div class="flex between"><span class="muted small">Follows your choice; Auto tracks the system.</span>
      <div class="chips" role="group" aria-label="Theme">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => {
        let cur = 'auto';
        try { cur = localStorage.getItem("shelfsense:theme") || 'auto'; } catch {}
        return `<button class="chip ${cur === v ? 'on' : ''}" data-a="theme" data-v="${v}">${l}</button>`;
      }).join('')}</div></div>`)}
  ${sec(7, '💾', 't-slow', 'Data', `<div class="g2">
    <button class="btn sec" data-a="demo">✨ Load demo</button><button class="btn sec" data-a="export">⬇️ Export</button>
    <button class="btn sec" data-a="pick" data-v="importIn">⬆️ Import</button><button class="btn danger" data-a="reset">🗑️ Reset all</button></div>`)}
  <div class="muted small" style="text-align:center;padding:4px 0 16px">ShelfSense AI · Smart Retail Assistant</div></div>`;
}

