// ShelfSense AI — Setup View
import { esc } from "../modules/utils.js";
import { set } from "../modules/state.js";

export function vSetup(U, S) {
  const st = U.setup;
  const s = set();
  return `<div style="min-height:calc(100vh - 90px);display:grid;place-items:center;padding:18px">
    <div class="card" style="max-width:440px;width:100%;margin:0">
      <div class="ch"><h2><span class="ico t-ind">🛒</span>Welcome to ShelfSense AI</h2></div>
      <div class="muted" style="margin:-6px 0 14px">Step 1 — your AI backend: powers shelf scanning, voice parsing and the advisor. Change anytime in Settings.</div>
      <div class="chips">${[
        ["gemini", "☁️ Google Gemini API"],
        ["custom", "🖥️ Local Google Gemma Server"],
      ]
        .map(
          ([v, l]) =>
            `<button class="chip ${st.mode === v ? "on" : ""}" data-a="setupMode" data-v="${v}">${l}</button>`,
        )
        .join("")}</div>
      ${
        st.mode === "gemini"
          ? `
        <label class="lb">Gemini API key — free at aistudio.google.com</label>
        <input class="f" id="su_key" type="password" placeholder="AIza…" autocomplete="off" value="${esc(s.apiKey)}">
        <div class="muted small mt">Cloud — works from any device. Key stays on your device.</div>`
          : `
        <label class="lb">Google Gemma Server URL (OpenAI-compatible)</label>
        <input class="f" id="su_url" placeholder="http://localhost:8080" value="${esc(s.aiBaseUrl)}">
        <label class="lb" style="margin-top:10px">Google Gemma Model Name</label>
        <input class="f" id="su_model" value="${esc(s.aiModel)}">
        <div class="muted small mt">Local Gemma server: <code>http://localhost:8080</code> with <code>gemma-4-e4b</code>, or Ollama with <code>gemma2</code>. 100% offline.</div>`
      }
      <div class="g2 mt" style="border-top:1px solid var(--line);padding-top:12px">
        <div><label class="lb">Shop name</label><input class="f" id="su_name" value="${esc(s.storeName)}" placeholder="My Grocery Store"></div>
        <div><label class="lb">Currency</label><input class="f" id="su_cur" value="${esc(s.currency)}" placeholder="$"></div>
      </div>
      <div class="g2 mt2"><button class="btn pri" data-a="setupTest" ${st.busy ? "disabled" : ""}>${st.busy ? "Testing…" : "Test & continue"}</button>
        <button class="btn ghost" data-a="setupSkip">Skip for now</button></div>
      ${st.msg ? `<div class="muted small mt" style="color:var(--bad)">${esc(st.msg)}</div>` : ""}
    </div></div>`;
}
