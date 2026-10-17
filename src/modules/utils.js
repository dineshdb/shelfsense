// ShelfSense AI — Utilities & Formatting Helpers
import { CAT, NAME_EMOJI } from './constants.js';
import { Core } from '../core.js';

export const $ = s => document.querySelector(s);

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const money = (n, currency = '$') => esc(currency) + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fq = (q, unit, dec) => {
  if (!isFinite(q)) return '–';
  const d = dec !== undefined ? dec : (unit === 'kg' || unit === 'L' ? 2 : 1);
  return (Math.round(q * 10 ** d) / 10 ** d).toLocaleString(undefined, { maximumFractionDigits: d }) + (unit && unit !== 'unit' ? ' ' + unit : '');
};

export const daysTxt = d => !isFinite(d) ? 'no recent sales' : d < 1 ? '< 1 day left' : '~' + Math.round(d) + ' days left';

export const ago = (ts, now = Date.now()) => {
  const s = (now - ts) / 1000;
  return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago';
};

export const emoji = p => {
  if (!p) return '📦';
  const n = Core.strip(p.name || '');
  for (const [re, e] of NAME_EMOJI) {
    if (re.test(n)) return e;
  }
  return CAT[p.category] || '📦';
};

export const color = s => ({ ok: 'var(--ok)', low: 'var(--warn)', out: 'var(--bad)', slow: 'var(--chart-4)' }[s]);

export function beep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ac = new AudioCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ac.currentTime);
    g.gain.setValueAtTime(0.18, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.12);
  } catch (e) {}
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([60]);
  } catch (e) {}
}

export function toast(msg, type = '', ms = 3200) {
  if (typeof document === 'undefined') return;
  const container = document.querySelector('#toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

export function speak(msg, settings = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  if (settings.speak === false) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = settings.lang || 'en-US';
    u.rate = 1.05;
    speechSynthesis.speak(u);
  } catch (e) {}
}

export const fileToURL = f => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(f);
});

export const resize = (src, max = 1280) => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => {
    const k = Math.min(1, max / Math.max(im.width, im.height));
    const c = document.createElement('canvas');
    c.width = Math.round(im.width * k);
    c.height = Math.round(im.height * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    res(c.toDataURL('image/jpeg', 0.85));
  };
  im.onerror = () => rej(new Error('Could not read image'));
  im.src = src;
});

export function drawBoxes(cv, w, h, dets) {
  if (!cv) return;
  cv.width = w;
  cv.height = h;
  const x = cv.getContext('2d');
  x.clearRect(0, 0, w, h);
  const lw = Math.max(2, w / 260);
  const fs = Math.max(14, w / 42);
  x.font = `600 ${fs}px Inter,system-ui,sans-serif`;

  const PAL = [
    ['oklch(0.596 0.145 163.225)', 'oklch(0.596 0.145 163.225 / 0.14)'],
    ['oklch(0.52 0.105 223.128)', 'oklch(0.52 0.105 223.128 / 0.14)'],
    ['oklch(0.508 0.118 165.612)', 'oklch(0.508 0.118 165.612 / 0.14)'],
    ['oklch(0.72 0.14 75)', 'oklch(0.72 0.14 75 / 0.16)'],
    ['oklch(0.432 0.095 166.913)', 'oklch(0.432 0.095 166.913 / 0.14)'],
    ['oklch(0.577 0.245 27.325)', 'oklch(0.577 0.245 27.325 / 0.12)'],
    ['oklch(0.56 0.021 213.5)', 'oklch(0.56 0.021 213.5 / 0.16)'],
  ];

  dets.forEach((d, i) => {
    if (!d.box || d.box.length !== 4 || d.include === false) return;
    const [y0, x0, y1, x1] = d.box.map(Number);
    const X = x0 / 1000 * w;
    const Y = y0 / 1000 * h;
    const W = (x1 - x0) / 1000 * w;
    const H = (y1 - y0) / 1000 * h;
    const col = PAL[i % PAL.length];
    x.strokeStyle = col[0];
    x.lineWidth = lw;
    x.beginPath();
    x.roundRect ? x.roundRect(X, Y, W, H, lw * 3) : x.rect(X, Y, W, H);
    x.stroke();
    x.fillStyle = col[1];
    x.fill();
    const label = d.name + (d.count > 1 ? ' ×' + d.count : '');
    const tw = x.measureText(label).width + 14;
    const ty = Math.max(0, Y - fs - 10);
    x.fillStyle = col[0];
    x.fillRect(X, ty, tw, fs + 10);
    x.fillStyle = '#fff';
    x.fillText(label, X + 7, ty + fs + 2);
  });
}
