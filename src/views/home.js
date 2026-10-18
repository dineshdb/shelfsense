// ShelfSense AI — Home / Dashboard View
import { DAY } from "../modules/constants.js";
import { esc, money, fq, daysTxt, ago, emoji, color } from "../modules/utils.js";
import { set } from "../modules/state.js";
import { Core } from "../core.js";

export function chart(s, currency = "$") {
  const W = 340,
    H = 150,
    pad = 18,
    max = Math.max(1, ...s.map((x) => x.value)),
    bw = (W - pad) / s.length;
  let g = `<svg viewBox="0 0 ${W} ${H + 18}">`;
  [0, 0.5, 1].forEach((f) => {
    const y = 6 + (H - 6) * (1 - f);
    g += `<line x1="${pad}" x2="${W}" y1="${y}" y2="${y}" stroke="var(--border)"/><text x="0" y="${y + 3}">${Math.round(max * f)}</text>`;
  });
  s.forEach((x, i) => {
    const bh = Math.max(2, ((H - 6) * x.value) / max),
      X = pad + i * bw + bw * 0.18,
      last = i === s.length - 1;
    g += `<rect x="${X}" y="${H - bh}" width="${bw * 0.64}" height="${bh}" rx="4" fill="${last ? "var(--primary)" : "var(--muted)"}"><title>${x.label}: ${money(x.value, currency)}</title></rect>`;
    if (i % 2 === (s.length - 1) % 2)
      g += `<text x="${X + bw * 0.32}" y="${H + 14}" text-anchor="middle">${x.label.split(" ").reverse().join(" ")}</text>`;
  });
  return g + "</svg>";
}

export function vHome(S, U) {
  const cur = set().currency;
  const a = Core.analyze(S.products, S.moves, set());
  const rows = a.rows;
  const now = Date.now();
  const d0 = new Date();
  d0.setHours(0, 0, 0, 0);

  const sales = S.moves.filter((m) => m.type === "sale");
  const today = sales.filter((m) => m.ts >= d0.getTime());
  const s7 = sales.filter((m) => m.ts >= now - 7 * DAY);
  const low = rows
    .filter((r) => r.status === "low" || r.status === "out")
    .sort((x, y) => x.daysLeft - y.daysLeft);
  const reorder = rows
    .filter((r) => r.reorderQty > 0 && r.status !== "slow")
    .sort((x, y) => x.daysLeft - y.daysLeft);
  const best = rows
    .filter((r) => r.rev7 > 0)
    .sort((x, y) => y.rev7 - x.rev7)
    .slice(0, 5);
  const slow = rows
    .filter((r) => r.status === "slow")
    .sort((x, y) => y.p.stock * (y.p.cost || y.p.price) - x.p.stock * (x.p.cost || x.p.price))
    .slice(0, 5);
  const health = rows.length
    ? Math.round(
        (rows.filter((r) => r.status === "ok" || r.status === "slow").length / rows.length) * 100,
      )
    : 100;
  const stockVal = S.products.reduce(
    (s, p) => s + Math.max(0, p.stock) * (p.cost || p.price * 0.75 || 0),
    0,
  );
  const total = reorder.reduce((s, r) => s + r.reorderCost, 0);
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

  let o = "";
  let g = "";
  if (!S.products.length) {
    o += `<div class="card"><div class="ch"><h2><span class="ico t-info">👋</span>Set up your store in 3 steps</h2></div>
    <div class="onb"><div><span>1</span>Scan your shelves — AI builds the inventory</div><div><span>2</span>Say "One kilogram of sugar sold"</div><div><span>3</span>Get alerts and what to reorder</div></div>
    <div class="g2"><button class="btn pri" data-a="tab" data-v="scan">📸 Scan shelves</button><button class="btn sec" data-a="demo">✨ Try demo store</button></div></div>`;
  }

  o += `<div class="hero"><div class="row"><div><div class="g">${greet} · Today's sales</div><div class="big">${money(
    today.reduce((s, m) => s + m.total, 0),
    cur,
  )}</div>
    <div class="sm">${today.length} sales recorded today</div></div>
    <div class="ring" style="--p:${health}"><div><b>${health}%</b><small>Stock health</small></div></div></div>
    <div class="hstats"><div><b>${money(
      s7.reduce((s, m) => s + m.total, 0),
      cur,
    )}</b><span>Revenue · 7d</span></div><div><b style="color:${low.length ? "var(--bad)" : "var(--ok)"}">${low.length}</b><span>Need reorder</span></div><div><b>${money(stockVal, cur)}</b><span>Stock value</span></div></div></div>`;

  if (low.length) {
    g += `<div class="card"><div class="ch"><h2><span class="ico t-bad">🚨</span>Low-stock alerts</h2><span class="sub">${low.length} item${low.length > 1 ? "s" : ""}</span></div><div class="list">${low
      .map(
        (r) => `
    <div class="it"><div class="em">${emoji(r.p)}</div><div class="mid"><div class="tt">${esc(r.p.name)}</div><div class="ss">${fq(r.p.stock, r.p.unit)} left · ${daysTxt(r.daysLeft)}</div>
    <div class="bar"><i style="width:${Math.max(4, Math.min(100, (r.p.stock / Math.max(r.rop, 0.01)) * 50))}%;background:${color(r.status)}"></i></div></div>
    <div class="rt"><span class="badge b-${r.status}">${r.status === "out" ? "Out" : "Low"}</span></div></div>`,
      )
      .join("")}</div></div>`;
  }

  g += `<div class="card"><div class="ch"><h2><span class="ico t-ind">🤖</span>What to buy next</h2><button class="btn sm sec" data-a="share" ${reorder.length ? "" : "disabled"}>Share</button></div>
    <div class="muted small" style="margin:-4px 0 6px">AI forecast · covers ${set().coverDays} days + ${set().safetyDays} safety days · lead time ${set().leadDays}d · based on ${a.windowDays} days of sales</div>
    ${
      reorder.length
        ? reorder
            .map(
              (
                r,
              ) => `<div class="order"><div class="em" style="width:38px;height:38px;flex-basis:38px;font-size:19px">${emoji(r.p)}</div>
      <div class="mid"><div class="tt">${esc(r.p.name)}</div><div class="ss">Stock ${fq(r.p.stock, r.p.unit)} · sells ${fq(r.avgDaily, r.p.unit, 1)}/day · ${daysTxt(r.daysLeft)}</div></div>
      <div class="rt"><div class="q">+${fq(r.reorderQty, r.p.unit)}</div><div class="ss">${money(r.reorderCost, cur)}</div></div></div>`,
            )
            .join("") +
          `<div class="total"><span>Estimated purchase</span><b>${money(total, cur)}</b></div>`
        : `<div class="empty"><span class="e">✅</span>Stock levels are healthy — nothing to reorder.</div>`
    }</div>`;

  if (sales.length) {
    g += `<div class="card span2"><div class="ch"><h2><span class="ico t-info">📈</span>Daily revenue</h2><span class="sub">last 14 days</span></div><div class="chart">${chart(Core.dailySeries(S.moves, 14), cur)}</div></div>`;
  }

  if (best.length) {
    g += `<div class="card"><div class="ch"><h2><span class="ico t-ok">🏆</span>Best sellers</h2><span class="sub">revenue · 7 days</span></div><div class="list">${best
      .map(
        (r, i) => `
    <div class="it"><div class="em">${["🥇", "🥈", "🥉", "4", "5"][i]}</div><div class="mid"><div class="tt">${esc(r.p.name)}</div>
    <div class="ss">${fq(r.qty7, r.p.unit)} sold · <b style="color:${r.trend >= 0 ? "var(--ok)" : "var(--bad)"}">${r.trend >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(r.trend * 100))}%</b> vs avg</div>
    <div class="bar"><i style="width:${(r.rev7 / best[0].rev7) * 100}%;background:var(--primary)"></i></div></div><div class="rt"><b>${money(r.rev7, cur)}</b></div></div>`,
      )
      .join("")}</div></div>`;
  }

  if (slow.length) {
    g += `<div class="card"><div class="ch"><h2><span class="ico t-slow">🐢</span>Slow movers</h2><span class="sub">cash tied up</span></div><div class="list">${slow
      .map(
        (r) => `
    <div class="it"><div class="em">${emoji(r.p)}</div><div class="mid"><div class="tt">${esc(r.p.name)}</div><div class="ss">${fq(r.p.stock, r.p.unit)} in stock · ${r.lastSale ? "last sold " + ago(r.lastSale) : "never sold"}</div></div>
    <div class="rt"><b>${money(r.p.stock * (r.p.cost || r.p.price * 0.75), cur)}</b><div class="ss">${daysTxt(r.daysLeft)}</div></div></div>`,
      )
      .join("")}</div>
    <div class="muted small mt">💡 Don't reorder these yet — try a bundle or small discount.</div></div>`;
  }

  if (S.products.length) {
    g += `<div class="card"><div class="ch"><h2><span class="ico t-ind">✨</span>AI business advisor</h2><button class="btn sm ${U.ai.text ? "sec" : "pri"}" data-a="advisor" ${U.ai.busy ? "disabled" : ""}>${U.ai.busy ? "Thinking…" : U.ai.text ? "Refresh" : "Analyze"}</button></div>
    ${U.ai.busy ? `<div class="empty"><div class="spin dk"></div>Reviewing sales, stock and trends…</div>` : U.ai.text ? `<div class="ai">${esc(U.ai.text)}</div>` : `<div class="muted">What's selling, what's running out, what to buy next.</div>`}</div>`;
  }

  o += `<div class="homegrid">${g}</div>`;
  return o;
}
