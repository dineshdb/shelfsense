// ShelfSense AI — Settings View
import { MODEL_GUIDE } from "../modules/constants.js";
import { esc, ago } from "../modules/utils.js";
import { set } from "../modules/state.js";
import { aiReady, aiLabel, OPENROUTER_MODELS, OPENROUTER_MODEL } from "../modules/ai.js";
import { MOBILE_LOCAL_MODELS, engineState } from "../modules/webllm.js";
import { cloudState } from "../modules/cloud.js";

export function vSettings(S, U) {
  const s = set();
  const inp = (k, type = "text", extra = "") =>
    `<input class="f" type="${type}" data-set="${k}" value="${esc(s[k])}" ${extra}>`;
  const tg = (k, t, d) =>
    `<div class="sw"><div><b>${t}</b><div class="muted small">${d}</div></div><button class="tg ${s[k] ? "on" : ""}" data-a="toggle" data-v="${k}"></button></div>`;
  const sec = (n, ico, cls, title, body) =>
    `<div class="card"><div class="ch"><h2><span class="stp">${n}</span><span class="ico ${cls}">${ico}</span>${title}</h2></div>${body}</div>`;

  const curModel = s.model || "gemini-3.8-flash";
  const info = MODEL_GUIDE[curModel] || {
    name: curModel,
    tag: "Active / Detected Model",
    cost: "Standard Gemini API pricing",
    speed: "Variable",
    useCase: "Active model connected via Google Generative Language API.",
  };

  const localModelKey = s.localAiModel || "gemma3-1b-it-q4f16_1-MLC";
  const localModelInfo =
    MOBILE_LOCAL_MODELS[localModelKey] || MOBILE_LOCAL_MODELS["gemma3-1b-it-q4f16_1-MLC"];

  const fetched = S.fetchedModels || [];
  let modelOpts = "";
  if (fetched.length) {
    modelOpts += `<optgroup label="✅ Verified Active on Your Key">${fetched
      .map((m) => {
        const g = MODEL_GUIDE[m.id];
        const label = g ? `${m.id} (${g.tag})` : m.name !== m.id ? `${m.id} — ${m.name}` : m.id;
        return `<option value="${esc(m.id)}" ${m.id === curModel ? "selected" : ""}>${esc(label)}</option>`;
      })
      .join("")}</optgroup>`;
    modelOpts += `<optgroup label="⚡ Preset Curated Models">${Object.entries(MODEL_GUIDE)
      .filter(([id]) => !fetched.some((f) => f.id === id))
      .map(
        ([id, g]) =>
          `<option value="${id}" ${id === curModel ? "selected" : ""}>${id} (${g.tag})</option>`,
      )
      .join("")}</optgroup>`;
  } else {
    modelOpts = Object.entries(MODEL_GUIDE)
      .map(
        ([id, g]) =>
          `<option value="${id}" ${id === curModel ? "selected" : ""}>${id} (${g.tag})</option>`,
      )
      .join("");
    if (!MODEL_GUIDE[curModel])
      modelOpts += `<option value="${esc(curModel)}" selected>Custom: ${esc(curModel)}</option>`;
  }

  // Two-way AI source (appearance-chip style): Remote covers every cloud /
  // server provider, On-Device is the WebGPU engine. The choice is explicit —
  // a selected remote backend is used as-is, never swapped for the on-device
  // model; the on-device model is used only when the user picks On-Device.
  const aiSrc = s.localAiEnabled ? "device" : "remote";
  const aiChipRow = `<div class="flex between"><span class="muted small">Where the AI runs.</span>
      <div class="chips" role="group" aria-label="AI backend">${[
        ["remote", "☁️ Remote"],
        ["device", "📱 On-Device"],
      ]
        .map(
          ([v, l]) =>
            `<button class="chip ${aiSrc === v ? "on" : ""}" data-a="aiMode" data-v="${v}">${l}</button>`,
        )
        .join("")}</div></div>`;
  const aiProvider = s.aiProvider || (s.aiMode === "custom" ? "custom" : "gemini");
  const remoteBody = `
    <label class="lb">Provider</label><select class="f" data-set="aiProvider">
      ${[
        ["gemini", "Google Gemini"],
        ["openrouter", "OpenRouter"],
        ["vertex", "Google Vertex (Express key)"],
        ["custom", "Custom endpoint (OpenAI-compatible)"],
      ]
        .map(([v, l]) => `<option value="${v}" ${v === aiProvider ? "selected" : ""}>${l}</option>`)
        .join("")}
    </select>
    ${
      aiProvider === "gemini" || aiProvider === "vertex"
        ? `
      <label class="lb">Google AI key</label><div class="inrow">${inp("apiKey", "password", 'id="key" placeholder="AIza…" autocomplete="off"')}<button class="btn sm ghost" data-a="showkey">Show</button></div>
      ${aiProvider === "vertex" ? '<div class="muted small mt">Vertex express mode — same models, API-key auth, billed via Vertex.</div>' : ""}
      <div class="flex between mt" style="align-items:center;margin-bottom:4px">
        <label class="lb" style="margin:0">Model</label>
        <button class="btn sm sec" data-a="fetchModels" style="font-size:11.5px;padding:3px 9px" ${s.apiKey ? "" : "disabled"}>🔄 Auto-detect</button>
      </div>
      <select class="f" data-set="model" id="modelSelect">${modelOpts}</select>
      <div class="muted small mt">💰 ${esc(info.cost)}</div>
      <button class="btn sec w mt" data-a="test">🔌 Test connection</button>
    `
        : aiProvider === "openrouter"
          ? `
      <label class="lb">OpenRouter API key</label><div class="inrow">${inp("aiApiKey", "password", 'id="aiKey" placeholder="sk-or-…" autocomplete="off"')}<button class="btn sm ghost" data-a="showAiKey">Show</button></div>
      <label class="lb mt">Model</label><select class="f" data-set="aiModel">${OPENROUTER_MODELS.map((m) => `<option value="${m}" ${m === (s.aiModel || OPENROUTER_MODEL) ? "selected" : ""}>${m.replace(/^google\//, "")}</option>`).join("")}</select>
      <div class="muted small mt">Routed through the ShelfSense proxy — the server stores nothing; the key is sent per request. Flash models take photos; Gemma is text-only ($0).</div>
      <button class="btn sec w mt" data-a="test">🔌 Test connection</button>
    `
          : `
      <label class="lb">Server URL (OpenAI-compatible)</label>${inp("aiBaseUrl", "text", 'placeholder="http://localhost:8080"')}
      <label class="lb mt">API key — optional, for hosted endpoints (OpenAI, vLLM…)</label><div class="inrow">${inp("aiApiKey", "password", 'id="aiKey" placeholder="sk-…" autocomplete="off"')}<button class="btn sm ghost" data-a="showAiKey">Show</button></div>
      <label class="lb mt">Model</label>${inp("aiModel")}
      <div class="muted small mt">Any <code>/v1/chat/completions</code> server works — Ollama, llama-server, vLLM, OpenAI.</div>
      <button class="btn sec w mt" data-a="test">🔌 Test connection</button>
    `
    }`;
  const deviceBody = `
    ${tg("localAiEnabled", "Run Gemma on this device (WebGPU)", "Downloads weights once, then 100% offline at $0.")}
    <label class="lb mt">Model</label>
    <select class="f" data-set="localAiModel" id="localAiModelSelect">
      ${Object.values(MOBILE_LOCAL_MODELS)
        .map(
          (m) =>
            `<option value="${m.id}" ${m.id === localModelKey ? "selected" : ""}>${m.name} (${m.size})</option>`,
        )
        .join("")}
    </select>
    <div class="muted small mt">📦 ${esc(localModelInfo.size)} · 🧠 ${esc(localModelInfo.vram)}</div>
    ${
      engineState.status === "downloading"
        ? `
      <div class="muted small mt" style="margin-bottom:6px">📥 <span id="localAiProgressText">${esc(engineState.text)} (${engineState.progress}%)</span></div>
      <div class="countdown-bar"><div class="countdown-fill" id="localAiProgressFill" style="width:${engineState.progress}%;transition:width 0.25s cubic-bezier(0.4, 0, 0.2, 1)"></div></div>
    `
        : engineState.status === "ready"
          ? `
      <div class="badge b-ok small mt" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:var(--radius);gap:8px">
        <span>🟢 Active in RAM</span>
        <button class="btn sm ghost" data-a="unloadLocalAi" style="font-size:11px;padding:3px 8px">⏹️ Sleep</button>
      </div>
    `
          : engineState.status === "unloaded"
            ? `
      <div class="badge b-new small mt" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:var(--radius);gap:8px">
        <span>💤 Sleeping — RAM free</span>
        <button class="btn sm pri" data-a="startLocalAi" style="font-size:11px;padding:3px 8px">⚡ Wake</button>
      </div>
    `
            : `
      <div class="g2 mt">
        <button class="btn ${s.localAiEnabled ? "pri" : "sec"}" data-a="startLocalAi">⚡ Start / Download</button>
        <button class="btn ghost danger" data-a="deleteLocalAiCache">🗑️ Clear cache</button>
      </div>
    `
    }`;

  return `<div class="settingsgrid">
  ${sec(
    1,
    "☁️",
    "t-ind",
    "Cloud Sync & Google Account",
    `
    <div class="flex between" style="align-items:center;margin-bottom:8px">
      <span class="badge ${cloudState.loggedIn ? "b-ok" : "b-info"}" style="font-size:11px;font-weight:700">
        ${cloudState.loggedIn ? "🟢 Cloud Sync active" : "⚪ Local-only"}
      </span>
      ${cloudState.lastSyncedAt ? `<span class="muted small">Last synced: ${ago(cloudState.lastSyncedAt)}</span>` : ""}
    </div>
    ${
      cloudState.loggedIn
        ? `
      <div style="background:var(--secondary);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;margin-bottom:10px">
        <div class="flex between" style="align-items:center">
          <div>
            <b>${esc(cloudState.user?.displayName || "Store Owner")}</b>
            <div class="muted small">${esc(cloudState.user?.email || "")}</div>
          </div>
          <button class="btn sm ghost danger" data-a="cloudLogout" style="font-size:11px;padding:3px 8px">🚪 Sign Out</button>
        </div>
        <div class="muted small mt" style="font-size:11px;display:flex;align-items:center;gap:4px">
          <span>🔐</span> Gemini key & settings backed up encrypted (AES-GCM).
        </div>
      </div>
      <div class="g2">
        <button class="btn pri" data-a="cloudSyncNow" ${cloudState.isSyncing ? "disabled" : ""}>${cloudState.isSyncing ? "🔄 Syncing…" : "⚡ Sync Now"}</button>
        <button class="btn sec" data-a="save">💾 Save Local</button>
      </div>
    `
        : `
      <div class="muted small" style="margin-bottom:10px;line-height:1.4">
        Saved locally on this device. Sign in with Google for multi-device sync and encrypted backup.
      </div>
      <div class="g2">
        <button class="btn pri" data-a="cloudLogin">🔑 Sign in with Google</button>
        <button class="btn sec" data-a="cloudSyncNow">💾 Sync Local</button>
      </div>
    `
    }
  `,
  )}
  ${sec(
    2,
    "🏪",
    "t-ok",
    "Store",
    `
    <label class="lb">Shop name</label>${inp("storeName")}
    <div class="g2"><div><label class="lb">Currency</label>${inp("currency")}</div><div><label class="lb">Voice language</label><select class="f" data-set="lang">${[
      ["en-US", "English (US)"],
      ["en-GB", "English (UK)"],
      ["es-ES", "Español (ES)"],
      ["es-MX", "Español (MX)"],
      ["es-CR", "Español (CR)"],
      ["hi-IN", "हिन्दी Hindi"],
      ["ne-NP", "नेपाली Nepali"],
      ["fr-FR", "Français"],
      ["pt-BR", "Português"],
    ]
      .map(([v, l]) => `<option value="${v}" ${v === s.lang ? "selected" : ""}>${l}</option>`)
      .join("")}</select></div></div>`,
  )}
  ${sec(
    3,
    "🤖",
    "t-ind",
    "AI backend",
    `
    <div class="ch" style="border:0;padding:0 0 2px"><span class="pill ${aiReady() ? "" : "off"}"><i></i>${aiReady() ? aiLabel() : "AI off"}</span></div>
    ${aiChipRow}
    ${aiSrc === "remote" ? remoteBody : deviceBody}`,
  )}
  ${sec(
    4,
    "🎙️",
    "t-info",
    "Voice & Audio POS",
    `
    <label class="lb">Voice Engine Strategy</label>
    <select class="f" data-set="voiceEngine">
      <option value="auto" ${(s.voiceEngine || "auto") === "auto" ? "selected" : ""}>🔄 Smart Auto (local first, cloud fallback)</option>
      <option value="gemma" ${s.voiceEngine === "gemma" ? "selected" : ""}>⚡ Local Gemma ($0 · offline)</option>
      <option value="gemini" ${s.voiceEngine === "gemini" ? "selected" : ""}>☁️ Google Gemini Cloud</option>
    </select>
    <div class="muted small mt" style="margin-bottom:10px">💡 Local Gemma: $0, on-device, keeps working during outages.</div>
    ${tg("handsFreeEnabled", '🎙️ Hands-Free "Take Order" Mode (Beta)', 'Continuous listening with "Take order", "Done", and 3-second auto-save.')}
    ${tg("autoApply", "Auto-record", "Save immediately when every product is recognized")}${tg("speak", "Spoken confirmation", "Reads back the sale and low-stock warnings")}
    <div class="mt" style="border-top:1px solid var(--line);padding-top:10px">
      <label class="lb">Max Multi-Photo Scan Limit</label>${inp("maxScanImages", "number", 'min="1" max="10"')}
      <div class="muted small mt">Photos per shelf sweep or bill scan (default 5).</div>
    </div>`,
  )}
  ${sec(
    5,
    "📊",
    "t-warn",
    "Reorder rules",
    `
    <div class="g3"><div><label class="lb">Lead days</label>${inp("leadDays", "number", 'min="0"')}</div><div><label class="lb">Cover days</label>${inp("coverDays", "number", 'min="1"')}</div><div><label class="lb">Safety days</label>${inp("safetyDays", "number", 'min="0"')}</div></div>
    <label class="lb">Sales history window (days)</label>${inp("windowDays", "number", 'min="7"')}
    <div class="muted small mt">Reorder point = avg daily sales × (lead + safety). Order = avg daily × (lead + cover + safety) − stock.</div>`,
  )}
  ${sec(
    6,
    "🎨",
    "t-slow",
    "Appearance",
    `
    <div class="flex between"><span class="muted small">Follows your choice; Auto tracks the system.</span>
      <div class="chips" role="group" aria-label="Theme">${[
        ["auto", "Auto"],
        ["light", "Light"],
        ["dark", "Dark"],
      ]
        .map(([v, l]) => {
          let cur = "auto";
          try {
            cur = localStorage.getItem("shelfsense:theme") || "auto";
          } catch {}
          return `<button class="chip ${cur === v ? "on" : ""}" data-a="theme" data-v="${v}">${l}</button>`;
        })
        .join("")}</div></div>`,
  )}
  ${sec(
    7,
    "💾",
    "t-slow",
    "Data",
    `<div class="g2">
    <button class="btn sec" data-a="demo">✨ Load demo</button><button class="btn sec" data-a="export">⬇️ Export</button>
    <button class="btn sec" data-a="pick" data-v="importIn">⬆️ Import</button><button class="btn danger" data-a="reset">🗑️ Reset all</button></div>`,
  )}
  <div class="muted small" style="text-align:center;padding:4px 0 16px">ShelfSense AI · Smart Retail Assistant</div></div>`;
}
