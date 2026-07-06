/* ============================================================
   CaseCompass — UI helpers: rendering, modals, toasts, charts,
   diff blocks, export utilities.
   ============================================================ */
'use strict';

(function () {
  const CC = window.CC;
  const UI = CC.ui = {};

  /* ---------------- primitives ---------------- */
  UI.esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  UI.icon = (name, cls) => `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  UI.fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  UI.fmtDateTime = (ts) => new Date(ts).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  UI.today = () => new Date().toISOString().slice(0, 10);
  UI.md = (s) => {
    // minimal markdown: **bold**, bullet lines, paragraphs
    const esc = UI.esc(s);
    return esc.split(/\n{2,}/).map(block => {
      const lines = block.split('\n');
      if (lines.every(l => /^\s*[•\-*]\s+/.test(l) || !l.trim())) {
        return '<ul>' + lines.filter(l => l.trim()).map(l => '<li>' + l.replace(/^\s*[•\-*]\s+/, '') + '</li>').join('') + '</ul>';
      }
      return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
    }).join('').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  };

  UI.riskChip = (level) => {
    const r = CC.RISK_LEVELS.find(x => x.key === level) || CC.RISK_LEVELS[0];
    return `<span class="chip ${r.chip}" title="${UI.esc(r.desc)}">${UI.icon('flag')}${r.label} risk</span>`;
  };

  UI.avatar = (client, cls) => `<span class="avatar ${cls || ''}" aria-hidden="true">${UI.esc((client.initials || '?').slice(0, 3))}</span>`;

  /* ---------------- toast ---------------- */
  UI.toast = (msg, isErr) => {
    const root = document.getElementById('toastRoot');
    const el = document.createElement('div');
    el.className = 'toast' + (isErr ? ' err' : '');
    el.innerHTML = UI.icon(isErr ? 'alert' : 'check') + UI.esc(msg);
    root.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 350); }, 3200);
  };

  /* ---------------- modal ---------------- */
  UI.modal = ({ title, body, footer, wide, onOpen }) => {
    const root = document.getElementById('modalRoot');
    const scrim = document.createElement('div');
    scrim.className = 'modal-scrim';
    scrim.innerHTML = `
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${UI.esc(title)}">
        <div class="modal-head"><h2>${UI.esc(title)}</h2>
          <button class="btn btn-icon" data-close aria-label="Close">${UI.icon('x')}</button></div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>`;
    root.appendChild(scrim);
    const close = () => { scrim.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) close(); });
    scrim.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    const first = scrim.querySelector('input, select, textarea, button:not([data-close])');
    if (first) first.focus();
    if (onOpen) onOpen(scrim, close);
    return { el: scrim, close };
  };

  UI.confirm = (title, message, confirmLabel, danger) => new Promise(resolve => {
    const m = UI.modal({
      title,
      body: `<p>${message}</p>`,
      footer: `<button class="btn" data-close>Cancel</button>
               <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${UI.esc(confirmLabel || 'Confirm')}</button>`,
      onOpen(scrim, close) {
        scrim.querySelector('[data-yes]').addEventListener('click', () => { close(); resolve(true); });
        scrim.querySelector('[data-close]').addEventListener('click', () => resolve(false));
      },
    });
    m.el.addEventListener('mousedown', (e) => { if (e.target === m.el) resolve(false); });
  });

  /* ---------------- diff block (old red → new green) ---------------- */
  UI.diffBlock = (oldText, newText, why, oldWhen, newWhen) => `
    <div class="diff-pair">
      <div class="diff-old"><span class="diff-tag">${UI.icon('history')}Old ${oldWhen ? '· ' + UI.esc(oldWhen) : ''}</span><div>${UI.esc(oldText)}</div></div>
      <div class="diff-arrow" aria-label="changed to">${UI.icon('arrow-right')}</div>
      <div class="diff-new"><span class="diff-tag">${UI.icon('check')}Updated ${newWhen ? '· ' + UI.esc(newWhen) : ''}</span><div>${UI.esc(newText)}</div></div>
    </div>
    ${why ? `<div class="diff-why"><strong>Why it changed:</strong> ${UI.esc(why)}</div>` : ''}`;

  /* ---------------- export helpers ---------------- */
  UI.download = (name, text, type) => {
    const blob = new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  UI.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); UI.toast('Copied to clipboard'); }
    catch { UI.toast('Copy failed — select and copy manually', true); }
  };

  UI.printDocument = (title, bodyHtml) => {
    const w = window.open('', '_blank');
    const clinician = CC.store.db?.settings?.clinicianName || '';
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${UI.esc(title)}</title>
      <style>
        body{font:14px/1.6 "Noto Sans",system-ui,sans-serif;color:#111;max-width:52rem;margin:2rem auto;padding:0 1.5rem}
        h1{font-size:1.35rem;border-bottom:2px solid #333;padding-bottom:.4rem} h2{font-size:1.05rem;margin-top:1.4rem} h3{font-size:.95rem}
        .meta{color:#555;font-size:.85rem;margin-bottom:1.4rem}
        .draft{border:1.5px solid #b45309;color:#b45309;display:inline-block;padding:.15rem .6rem;border-radius:999px;font-weight:700;font-size:.75rem;letter-spacing:.05em}
        @media print{.noprint{display:none}}
      </style></head><body>
      <p class="noprint" style="text-align:right"><button onclick="print()">Print / Save as PDF</button></p>
      <h1>${UI.esc(title)}</h1>
      <p class="meta">${clinician ? 'Clinician: ' + UI.esc(clinician) + ' · ' : ''}Generated ${new Date().toLocaleString()} · <span class="draft">DRAFT — for clinician review</span></p>
      ${bodyHtml}
      </body></html>`);
    w.document.close();
  };

  /* ============================================================
     Line chart (assessment trends) — per dataviz method:
     one hue per series (fixed slot order), 2px lines, ≥8px markers
     with 2px surface ring, recessive hairline grid, direct labels,
     legend for ≥2 series, hover tooltip, table alternative rendered
     by the caller.
     ============================================================ */
  const SERIES_VARS = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5'];

  UI.lineChart = (series, opts = {}) => {
    // series: [{name, points: [{x: 'YYYY-MM-DD', y}], max}]
    const W = opts.width || 640, H = opts.height || 220;
    const padL = 34, padR = 90, padT = 14, padB = 26;
    const all = series.flatMap(s => s.points);
    if (!all.length) return '<p class="muted small">No data yet.</p>';
    const xs = [...new Set(all.map(p => p.x))].sort();
    const yMax = opts.yMax || Math.max(10, ...all.map(p => p.y));
    const x = (v) => xs.length === 1 ? (padL + (W - padL - padR) / 2) : padL + (W - padL - padR) * (xs.indexOf(v) / (xs.length - 1));
    const y = (v) => padT + (H - padT - padB) * (1 - v / yMax);
    const gridVals = [0, Math.round(yMax / 2), yMax];
    let svg = `<div class="chart-wrap viz-root"><svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${UI.esc(opts.label || 'Score trend chart')}" style="min-width:420px">`;
    gridVals.forEach(v => {
      svg += `<line class="grid-l" x1="${padL}" y1="${y(v)}" x2="${W - padR}" y2="${y(v)}"/>`;
      svg += `<text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    });
    svg += `<line class="axis-l" x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}"/>`;
    const step = Math.max(1, Math.ceil(xs.length / 6));
    xs.forEach((d, i) => {
      if (i % step === 0 || i === xs.length - 1) {
        svg += `<text x="${x(d)}" y="${H - padB + 16}" text-anchor="middle">${UI.esc(d.slice(5))}</text>`;
      }
    });
    series.forEach((s, si) => {
      const color = `var(${SERIES_VARS[si % SERIES_VARS.length]})`;
      const pts = [...s.points].sort((a, b) => a.x < b.x ? -1 : 1);
      const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
      if (pts.length > 1) svg += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
      pts.forEach(p => {
        svg += `<circle cx="${x(p.x).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="4.5" fill="${color}" stroke="var(--surface)" stroke-width="2" data-tip="${UI.esc(s.name)} · ${UI.esc(p.x)}: ${p.y}"/>`;
      });
      const last = pts[pts.length - 1];
      svg += `<text class="series-lbl" x="${(W - padR + 8)}" y="${(y(last.y) + 4 + si * 2).toFixed(1)}" fill="${color}">${UI.esc(s.name)} ${last.y}</text>`;
    });
    svg += '</svg></div>';
    if (series.length > 1) {
      svg += '<div class="chart-legend">' + series.map((s, si) =>
        `<span class="lg-item"><span class="lg-swatch" style="background:var(${SERIES_VARS[si % SERIES_VARS.length]})"></span>${UI.esc(s.name)}</span>`).join('') + '</div>';
    }
    return svg;
  };

  /* chart tooltips (event delegation) */
  let tipEl = null;
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest?.('[data-tip]');
    if (!t) { if (tipEl) { tipEl.remove(); tipEl = null; } return; }
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'chart-tip'; document.body.appendChild(tipEl); }
    tipEl.textContent = t.getAttribute('data-tip');
    const r = t.getBoundingClientRect();
    tipEl.style.left = Math.min(window.innerWidth - 160, r.left + r.width / 2) + 'px';
    tipEl.style.top = (r.top - 34) + 'px';
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest?.('[data-tip]') && tipEl) { tipEl.remove(); tipEl = null; }
  });
})();
