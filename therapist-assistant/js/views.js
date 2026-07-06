/* ============================================================
   CaseCompass — views (all routes render into #view)
   ============================================================ */
'use strict';

(function () {
  const CC = window.CC;
  const UI = CC.ui, S = () => CC.store, E = CC.engine;
  const V = CC.views = {};
  const esc = UI.esc, icon = UI.icon;
  const view = () => document.getElementById('view');

  const mount = (html) => { view().innerHTML = html; view().focus({ preventScroll: true }); window.scrollTo(0, 0); };
  const on = (sel, ev, fn) => view().querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));
  const val = (id) => (view().querySelector('#' + id)?.value || '').trim();

  const pageHead = (title, lead, actions) => `
    <div class="page-head">
      <div><h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div>
      ${actions ? `<div class="page-head-actions">${actions}</div>` : ''}
    </div>`;

  const clientSelect = (id, selected) => {
    const opts = S().clients().map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.initials)}${c.name ? ' — ' + esc(c.name) : ''}</option>`).join('');
    return `<select id="${id}"><option value="">Select a client…</option>${opts}</select>`;
  };

  /* ============================================================
     DASHBOARD
     ============================================================ */
  V.dashboard = () => {
    const clients = S().clients();
    const week = Date.now() - 7 * 86400000;
    const notesWeek = clients.reduce((n, c) => n + c.dapNotes.filter(x => x.ts > week).length, 0);
    const hi = clients.filter(c => c.riskLevel === 'high' || c.riskLevel === 'acute');
    const recent = clients.flatMap(c => c.timeline.slice(-3).map(t => ({ c, t }))).sort((a, b) => b.t.ts - a.t.ts).slice(0, 8);
    const staleRisk = clients.filter(c => (c.riskLevel === 'high' || c.riskLevel === 'acute') && !E.latestScore(c, 'C-SSRS'));

    mount(`
      ${pageHead('Practice Overview', 'Your whole caseload at a glance. Day-to-day work happens inside each client’s workspace.',
        `<a class="btn btn-primary" href="#/clients">${icon('users')}Choose client</a>
         <a class="btn" href="#/clients?new=1">${icon('plus')}New client</a>`)}
      <div class="grid grid-4">
        <div class="stat-tile"><div class="stat-label">Active clients</div><div class="stat-value">${clients.length}</div><div class="stat-sub">of ${CC.MAX_CLIENTS} capacity</div></div>
        <div class="stat-tile"><div class="stat-label">Elevated risk</div><div class="stat-value">${hi.length}</div><div class="stat-sub">high or acute</div></div>
        <div class="stat-tile"><div class="stat-label">DAP notes · 7 days</div><div class="stat-value">${notesWeek}</div><div class="stat-sub">across caseload</div></div>
        <div class="stat-tile"><div class="stat-label">Active treatment plans</div><div class="stat-value">${clients.filter(c => c.treatmentPlans.length).length}</div><div class="stat-sub">clients with a current plan</div></div>
      </div>

      ${hi.length ? `<div class="card" style="margin-top:1rem"><div class="card-title">${icon('alert')}<h2>Risk watchlist</h2><span class="spacer"></span><a class="btn btn-sm" href="#/risk">Risk tracking</a></div>
        <div class="chip-row">${hi.map(c => `<a class="chip ${c.riskLevel === 'acute' ? 'chip-critical' : 'chip-serious'}" href="#/client/${c.id}/risk" style="text-decoration:none">${esc(c.initials)} — ${c.riskLevel}</a>`).join('')}</div>
        ${staleRisk.length ? `<div class="reminder-callout" style="margin-bottom:0">${icon('info')}<span>Reminder: ${staleRisk.map(c => esc(c.initials)).join(', ')} ${staleRisk.length > 1 ? 'are' : 'is'} flagged high/acute without a recorded structured risk assessment (e.g., C-SSRS). Consider completing and documenting one.</span></div>` : ''}
      </div>` : ''}

      <div class="grid grid-2" style="margin-top:1rem">
        <div class="card"><div class="card-title">${icon('clock')}<h2>Recent activity</h2></div>
          ${recent.length ? `<ul class="timeline">${recent.map(({ c, t }) => `<li data-kind="${t.type === 'risk' ? 'risk' : t.type === 'note' ? 'note' : ''}"><div class="tl-when">${UI.fmtDateTime(t.ts)} · <a href="#/client/${c.id}">${esc(c.initials)}</a></div><div class="tl-what">${esc(t.summary)}</div></li>`).join('')}</ul>`
            : `<div class="empty">${icon('users')}<p>No activity yet. Add your first client to begin.</p><a class="btn btn-primary" href="#/clients?new=1">${icon('plus')}Add client</a></div>`}
        </div>
        <div class="card"><div class="card-title">${icon('shield')}<h2>Clinical guardrails</h2></div>
          <p class="small muted">CaseCompass drafts, organizes, and remembers — you diagnose, decide, and document. Standing reminders:</p>
          <ul class="small" style="padding-left:1.2rem;color:var(--muted)">
            <li>Risk assessment is never automated — flags here prompt <em>your</em> assessment.</li>
            <li>Mandated reporting duties and timelines are jurisdiction-specific.</li>
            <li>All generated text is a draft/hypothesis until you review, edit, and adopt it.</li>
            <li>Informed consent should cover your documentation tools, including this one.</li>
            <li>Data stays encrypted on this device; exports are your responsibility to protect.</li>
          </ul>
          <a class="btn btn-sm" href="#/knowledge">${icon('book')}Open knowledge base</a>
        </div>
      </div>`);
  };

  /* ============================================================
     CHOOSE CLIENT (home screen)
     ============================================================ */
  const timeAgo = (ts) => {
    const d = Date.now() - ts;
    const days = Math.floor(d / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return days + 'd ago';
    return UI.fmtDate(ts);
  };
  const lastSessionOf = (c) => {
    const n = c.dapNotes[c.dapNotes.length - 1];
    if (!n) return null;
    return n.sessionDate || UI.fmtDate(n.ts);
  };
  const cFilter = { q: '', risk: 'all', plan: 'all', sort: 'updated' };

  V.clients = (params) => {
    const all = S().clients();
    const full = all.length >= CC.MAX_CLIENTS;
    const hour = new Date().getHours();
    const salut = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const name = S().db.settings.clinicianName;

    const q = cFilter.q.toLowerCase();
    let list = all.filter(c => {
      if (cFilter.risk !== 'all' && c.riskLevel !== cFilter.risk) return false;
      if (cFilter.plan === 'has' && !c.treatmentPlans.length) return false;
      if (cFilter.plan === 'none' && c.treatmentPlans.length) return false;
      if (!q) return true;
      const dx = (c.diagnoses || []).map(d => d.label).join(' ');
      return (c.initials + ' ' + (c.name || '') + ' ' + dx + ' ' + (c.presentingProblem || '') + ' ' + c.riskLevel).toLowerCase().includes(q);
    });
    const riskOrder = { acute: 0, high: 1, moderate: 2, low: 3 };
    const lastTs = (c) => c.dapNotes.length ? c.dapNotes[c.dapNotes.length - 1].ts : 0;
    list.sort({
      updated: (a, b) => b.updatedAt - a.updatedAt,
      name: (a, b) => (a.initials + a.name).localeCompare(b.initials + b.name),
      risk: (a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel] || b.updatedAt - a.updatedAt,
      session: (a, b) => lastTs(b) - lastTs(a),
    }[cFilter.sort]);

    const card = (c) => {
      const dx = E.activeDx(c);
      const fresh = Date.now() - c.updatedAt < 3 * 86400000;
      const plan = c.treatmentPlans.length;
      const ls = lastSessionOf(c);
      return `
      <button class="client-card" data-id="${c.id}" aria-label="Open ${esc(c.initials)}">
        <div class="cc-top">${UI.avatar(c, 'sm')}
          <div class="cc-name"><strong>${esc(c.initials)}</strong><span>${esc(c.name || (c.age ? 'Age ' + c.age : '')) || '&nbsp;'}</span></div>
          <span class="cc-open">${icon('arrow-right')}</span>
        </div>
        <div class="chip-row">${UI.riskChip(c.riskLevel)}${plan ? `<span class="chip chip-ok">${icon('map')}Plan v${plan}</span>` : `<span class="chip">${icon('map')}No plan yet</span>`}</div>
        <div class="cc-rows">
          <div>${icon('file')}<span class="val">${dx.length ? esc(dx[0]) : 'No diagnosis recorded'}</span></div>
          <div>${icon('clock')}<span class="val">${ls ? 'Last session ' + esc(ls) : 'No sessions documented'}</span></div>
        </div>
        <div class="cc-foot">${fresh ? '<span class="fresh-dot" title="Updated in the last 3 days"></span>' : ''}<span class="tiny faint">Updated ${timeAgo(c.updatedAt)}</span></div>
      </button>`;
    };

    mount(`
      <div class="greeting">
        <h1>${salut}${name ? ', ' + esc(name.split(',')[0]) : ''}</h1>
        <p>Choose a client to open their workspace — everything you create lives inside their record. ${all.length} of ${CC.MAX_CLIENTS} caseload slots in use.</p>
      </div>
      <div class="client-toolbar">
        <div class="ct-search">${icon('search')}<input id="cq" type="search" placeholder="Search initials, name, diagnosis, presenting problem…" value="${esc(cFilter.q)}" aria-label="Search clients"></div>
        <select id="csort" aria-label="Sort clients">
          <option value="updated" ${cFilter.sort === 'updated' ? 'selected' : ''}>Recently updated</option>
          <option value="session" ${cFilter.sort === 'session' ? 'selected' : ''}>Recent session</option>
          <option value="risk" ${cFilter.sort === 'risk' ? 'selected' : ''}>Risk (highest first)</option>
          <option value="name" ${cFilter.sort === 'name' ? 'selected' : ''}>Name A–Z</option>
        </select>
        <button class="btn btn-cta" id="btnNewClient" ${full ? 'disabled title="Caseload is at the 50-client capacity"' : ''}>${icon('plus')}New client</button>
      </div>
      <div class="filter-chips" role="group" aria-label="Filter clients">
        <button data-frisk="all" aria-pressed="${cFilter.risk === 'all'}">All</button>
        ${CC.RISK_LEVELS.map(r => `<button data-frisk="${r.key}" aria-pressed="${cFilter.risk === r.key}"><span class="risk-dot" style="background:var(--${r.key === 'low' ? 'ok' : r.key === 'moderate' ? 'warn' : r.key === 'high' ? 'serious' : 'critical'})"></span>${r.label}</button>`).join('')}
        <button data-fplan="has" aria-pressed="${cFilter.plan === 'has'}">Has plan</button>
        <button data-fplan="none" aria-pressed="${cFilter.plan === 'none'}">Needs plan</button>
      </div>
      ${all.length === 0
        ? `<div class="empty">${icon('users')}<p>Welcome. Add your first client — initials are enough to start, and the record deepens with every note, score, and formulation you add.</p><button class="btn btn-primary" id="btnNewClientEmpty">${icon('plus')}Add first client</button></div>`
        : list.length === 0
          ? `<div class="empty">${icon('search')}<p>No clients match this search or filter.</p><button class="btn" id="btnClearFilter">Clear filters</button></div>`
          : `<div class="client-grid">${list.map(card).join('')}
              ${!full ? `<button class="client-card new-card" id="btnNewClientCard">${icon('plus')}New client</button>` : ''}
            </div>`}
    `);

    const open = () => V.clientForm();
    on('#btnNewClient', 'click', open); on('#btnNewClientEmpty', 'click', open); on('#btnNewClientCard', 'click', open);
    on('.client-card[data-id]', 'click', (e) => { location.hash = '#/client/' + e.currentTarget.dataset.id; });
    const cq = view().querySelector('#cq');
    if (cq) cq.addEventListener('input', () => { cFilter.q = cq.value; const pos = cq.selectionStart; V.clients(); const cq2 = view().querySelector('#cq'); cq2.focus(); cq2.setSelectionRange(pos, pos); });
    on('#csort', 'change', (e) => { cFilter.sort = e.target.value; V.clients(); });
    on('[data-frisk]', 'click', (e) => { cFilter.risk = e.currentTarget.dataset.frisk; V.clients(); });
    on('[data-fplan]', 'click', (e) => { cFilter.plan = cFilter.plan === e.currentTarget.dataset.fplan ? 'all' : e.currentTarget.dataset.fplan; V.clients(); });
    on('#btnClearFilter', 'click', () => { Object.assign(cFilter, { q: '', risk: 'all', plan: 'all' }); V.clients(); });
    if (params?.get('new') === '1' && !full) setTimeout(open, 50);
  };

  V.clientForm = (client) => {
    const c = client || {};
    UI.modal({
      title: client ? 'Edit client' : 'New client', wide: true,
      body: `
        <p class="small muted">Use initials or a code rather than a full name where possible — smallest identifying dataset that still serves care.</p>
        <div class="field-row">
          <div><label>Initials / code *</label><input id="cf-initials" value="${esc(c.initials || '')}" maxlength="8" required></div>
          <div><label>Name (optional)</label><input id="cf-name" value="${esc(c.name || '')}"></div>
          <div><label>Age</label><input id="cf-age" value="${esc(c.age || '')}" maxlength="6"></div>
          <div><label>Gender / pronouns</label><input id="cf-pronouns" value="${esc(c.pronouns || '')}" placeholder="e.g., she/her"></div>
        </div>
        <div class="field-row">
          <div><label>Level of care</label><select id="cf-loc">${['', ...CC.LEVELS_OF_CARE].map(l => `<option ${l === c.levelOfCare ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div><label>Risk level</label><select id="cf-risk">${CC.RISK_LEVELS.map(r => `<option value="${r.key}" ${r.key === (c.riskLevel || 'low') ? 'selected' : ''}>${r.label}</option>`).join('')}</select></div>
        </div>
        <div class="field-row">
          <div><label>Attachment style (working hypothesis)</label><select id="cf-attach">${CC.ATTACHMENT_STYLES.map(a => `<option ${a === (c.attachmentStyle || CC.ATTACHMENT_STYLES[0]) ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
          <div><label>Motivation / stage of change</label><select id="cf-stage">${['', ...CC.MOTIVATION_STAGES].map(m => `<option ${m === c.motivationStage ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        </div>
        <label>Presenting problem</label><textarea id="cf-presenting" rows="3">${esc(c.presentingProblem || '')}</textarea>
        <label>Substance-use summary (if any)</label><input id="cf-sud" value="${esc(c.substanceUse || '')}" placeholder="e.g., alcohol, daily → regulates anxiety; 30 days sober">`,
      footer: `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="cf-save">${icon('check')}${client ? 'Save changes' : 'Create client'}</button>`,
      onOpen(scrim, close) {
        scrim.querySelector('#cf-save').addEventListener('click', () => {
          const g = (id) => scrim.querySelector('#' + id).value.trim();
          if (!g('cf-initials')) { scrim.querySelector('#cf-initials').focus(); return; }
          const fields = { initials: g('cf-initials'), name: g('cf-name'), age: g('cf-age'), pronouns: g('cf-pronouns'), levelOfCare: g('cf-loc'), riskLevel: g('cf-risk'), attachmentStyle: g('cf-attach'), motivationStage: g('cf-stage'), presentingProblem: g('cf-presenting'), substanceUse: g('cf-sud') };
          if (client) {
            if (fields.riskLevel !== client.riskLevel) S().logChange(client, 'riskLevel', 'Risk level', client.riskLevel, fields.riskLevel, 'Edited from client form');
            if (fields.attachmentStyle !== client.attachmentStyle) S().logChange(client, 'attachmentStyle', 'Attachment hypothesis', client.attachmentStyle, fields.attachmentStyle, 'Edited from client form');
            if (fields.presentingProblem !== client.presentingProblem) S().logChange(client, 'presentingProblem', 'Presenting problem', client.presentingProblem, fields.presentingProblem, '');
            Object.assign(client, fields); S().touch(client);
            close(); V.route(); UI.toast('Client updated');
          } else {
            try { const nc = S().addClient(fields); close(); location.hash = '#/client/' + nc.id; UI.toast('Client created'); }
            catch { UI.toast('Caseload is at the 50-client capacity', true); }
          }
        });
      },
    });
  };

  /* ============================================================
     CLIENT WORKSPACE (tabs)
     ============================================================ */
  const TABS = [
    ['overview', 'Overview', 'home'], ['notes', 'DAP Notes', 'note'], ['plan', 'Treatment Plan', 'map'], ['profile', 'Full Profile', 'id'],
    ['formulation', 'Formulation', 'lightbulb'], ['interventions', 'Interventions', 'tools'], ['safety', 'Safety & Trust', 'heart'],
    ['assessments', 'Assessments', 'gauge'], ['risk', 'Risk', 'alert'], ['timeline', 'Timeline', 'clock'],
    ['documents', 'Documents', 'file'], ['history', 'Change History', 'history'], ['settings', 'Client Settings', 'gear'],
  ];

  /* ---- context-aware navigation (sidebar on desktop, bottom bar on mobile) ---- */
  V.renderNav = (client, active) => {
    const nav = document.getElementById('mainNav');
    const bottom = document.getElementById('bottomNav');
    if (!nav || !bottom) return;
    if (!client) {
      const top = [
        ['clients', 'Clients', 'users'], ['practice', 'Practice Overview', 'home'],
        ['knowledge', 'Knowledge Base', 'book'], ['settings', 'Settings', 'gear'],
      ];
      nav.innerHTML = `<div class="nav-label">Workspace</div>` + top.map(([r, l, i]) =>
        `<a href="#/${r}" ${active === r ? 'aria-current="page"' : ''}>${icon(i)}${l}</a>`).join('');
      bottom.innerHTML = `<div class="bn-items">` + top.map(([r, l, i]) =>
        `<a href="#/${r}" ${active === r ? 'aria-current="page"' : ''}>${icon(i)}${l.split(' ')[0]}</a>`).join('') + `</div>`;
    } else {
      nav.innerHTML = `
        <a class="nav-back" href="#/clients">${icon('back')}All clients</a>
        <div class="sidebar-client">${UI.avatar(client, 'sm')}<div class="sc-meta"><strong>${esc(client.initials)}</strong><span>${esc(CC.RISK_LEVELS.find(r => r.key === client.riskLevel)?.label || '')} risk</span></div></div>
        <div class="nav-label">Client sections</div>` +
        TABS.map(([k, l, i]) => `<a href="#/client/${client.id}/${k}" ${active === k ? 'aria-current="page"' : ''}>${icon(i)}${l}</a>`).join('');
      bottom.innerHTML = `<div class="bn-items">
        <a href="#/clients">${icon('back')}Clients</a>
        <a href="#/client/${client.id}/overview" ${active === 'overview' ? 'aria-current="page"' : ''}>${icon('home')}Overview</a>
        <a href="#/client/${client.id}/notes" ${active === 'notes' ? 'aria-current="page"' : ''}>${icon('note')}Notes</a>
        <a href="#/client/${client.id}/plan" ${active === 'plan' ? 'aria-current="page"' : ''}>${icon('map')}Plan</a>
        <button type="button" id="bnMore" ${!['overview', 'notes', 'plan'].includes(active) ? 'style="color:var(--primary-ink)"' : ''}>${icon('more')}More</button>
      </div>`;
      bottom.querySelector('#bnMore').addEventListener('click', () => {
        UI.modal({
          title: esc(client.initials) + ' — sections',
          body: `<div class="sheet-links">${TABS.map(([k, l, i]) => `<a href="#/client/${client.id}/${k}">${icon(i)}${l}</a>`).join('')}</div>`,
          onOpen(scrim, close) { scrim.querySelectorAll('.sheet-links a').forEach(a => a.addEventListener('click', close)); },
        });
      });
    }
  };

  V.client = (id, tab) => {
    const c = S().client(id);
    if (!c) { mount('<div class="empty"><p>Client not found.</p><a class="btn" href="#/clients">Back to clients</a></div>'); return; }
    tab = TABS.some(t => t[0] === tab) ? tab : 'overview';
    const dx = E.activeDx(c);
    mount(`
      <div class="breadcrumb"><a href="#/clients">Clients</a> / ${esc(c.initials)}</div>
      <div class="client-hero">
        ${UI.avatar(c)}
        <div class="client-hero-meta">
          <h1>${esc(c.initials)}${c.name ? ` <span class="muted" style="font-weight:400;font-size:1rem">(${esc(c.name)})</span>` : ''}</h1>
          <div class="client-hero-sub">
            ${c.age ? `<span>Age ${esc(c.age)}</span>` : ''} ${c.pronouns ? `<span>${esc(c.pronouns)}</span>` : ''}
            ${c.levelOfCare ? `<span>${esc(c.levelOfCare)}</span>` : ''} ${UI.riskChip(c.riskLevel)}
            ${dx.length ? `<span>${esc(dx[0])}${dx.length > 1 ? ' +' + (dx.length - 1) : ''}</span>` : ''}
          </div>
        </div>
        <div class="page-head-actions">
          <button class="btn btn-sm" id="btnEditClient">${icon('edit')}Edit</button>
        </div>
      </div>
      <nav class="tabs" aria-label="Client sections">
        ${TABS.map(([k, l]) => `<a href="#/client/${c.id}/${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}
      </nav>
      <div id="tabBody"></div>`);
    on('#btnEditClient', 'click', () => V.clientForm(c));
    V['tab_' + tab](c, document.getElementById('tabBody'));
  };

  /* ---- chip-list editor helper (themes, risk factors, etc.) ---- */
  const chipEditor = (c, key, label, hint) => {
    const items = c[key] || [];
    return `<div class="card"><div class="card-title"><h3>${label}</h3><span class="spacer"></span><button class="btn btn-sm" data-chipadd="${key}">${icon('plus')}Add</button></div>
      ${items.length ? `<div class="chip-row">${items.map((t, i) => `<span class="chip">${esc(t)}<button class="btn btn-icon" style="min-width:22px;min-height:22px;padding:0" data-chipdel="${key}" data-i="${i}" aria-label="Remove ${esc(t)}">${icon('x')}</button></span>`).join('')}</div>` : `<p class="small muted" style="margin:0">${hint || 'None recorded yet.'}</p>`}
    </div>`;
  };
  const bindChipEditors = (c, rerender) => {
    on('[data-chipadd]', 'click', (e) => {
      const key = e.currentTarget.dataset.chipadd;
      UI.modal({
        title: 'Add item', body: `<label>New entry</label><input id="chip-new" placeholder="Type and save">`,
        footer: `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="chip-save">Add</button>`,
        onOpen(scrim, close) {
          const doSave = () => {
            const v = scrim.querySelector('#chip-new').value.trim();
            if (!v) return;
            c[key] = c[key] || []; c[key].push(v);
            S().logChange(c, key, key.replace(/([A-Z])/g, ' $1'), '', v, 'Added');
            close(); rerender();
          };
          scrim.querySelector('#chip-save').addEventListener('click', doSave);
          scrim.querySelector('#chip-new').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') doSave(); });
        },
      });
    });
    on('[data-chipdel]', 'click', (e) => {
      const key = e.currentTarget.dataset.chipdel, i = +e.currentTarget.dataset.i;
      const old = c[key][i];
      c[key].splice(i, 1);
      S().logChange(c, key, key.replace(/([A-Z])/g, ' $1'), old, '', 'Removed');
      rerender();
    });
  };

  /* ---- TAB: overview (the client dashboard) ---- */
  V.tab_overview = (c, root) => {
    const dx = c.diagnoses || [];
    const meds = (c.medications || []).filter(m => m.active !== false);
    const goals = (c.goals || []).filter(g => g.status !== 'discontinued');
    const f = c.formulations[c.formulations.length - 1];
    const fPrev = c.formulations[c.formulations.length - 2];
    const lastNote = c.dapNotes[c.dapNotes.length - 1];
    const scores = ['PHQ-9', 'GAD-7', 'PCL-5', 'AUDIT', 'C-SSRS'].map(t => ({ t, s: E.latestScore(c, t) })).filter(x => x.s);
    const recs = E.recommendInterventions(c).slice(0, 3);
    const changes = E.changesSinceLastSession(c);
    const focus = E.nextSessionFocus(c);
    const riskDef = CC.RISK_LEVELS.find(r => r.key === c.riskLevel);

    root.innerHTML = `
      <div class="grid grid-2">
        <div class="card"><div class="card-title">${icon('id')}<h3>Current clinical snapshot</h3></div>
          <dl class="kv">
            <dt>Age / pronouns</dt><dd>${esc([c.age, c.pronouns].filter(Boolean).join(' · ') || '—')}</dd>
            <dt>Level of care</dt><dd>${esc(c.levelOfCare || '—')}</dd>
            <dt>Attachment</dt><dd>${esc(c.attachmentStyle || '—')}</dd>
            <dt>Stage of change</dt><dd>${esc(c.motivationStage || '—')}</dd>
            <dt>Substance use</dt><dd>${esc(c.substanceUse || '—')}</dd>
            <dt>Latest measures</dt><dd>${scores.length ? scores.map(({ t, s }) => `${t} ${s.score}`).join(' · ') : '—'}</dd>
          </dl>
        </div>
        <div class="card" style="border-left:4px solid var(--${c.riskLevel === 'low' ? 'ok' : c.riskLevel === 'moderate' ? 'warn' : c.riskLevel === 'high' ? 'serious' : 'critical'})">
          <div class="card-title">${icon('alert')}<h3>Risk level &amp; safety notes</h3><span class="spacer"></span><a class="btn btn-sm" href="#/client/${c.id}/risk">Open risk</a></div>
          <div class="chip-row" style="margin-bottom:.5rem">${UI.riskChip(c.riskLevel)}</div>
          <p class="small muted" style="margin-bottom:.5rem">${esc(riskDef?.desc || '')}</p>
          <p class="small" style="margin:0"><strong>Safety notes:</strong> ${esc(c.safetyConcerns || 'None documented.')}</p>
          ${(c.riskFactors || []).length ? `<p class="tiny muted" style="margin:.4rem 0 0">Risk factors: ${esc(c.riskFactors.join(', '))}</p>` : ''}
        </div>
      </div>

      <div class="focus-card" style="margin-top:1rem">
        <div class="card-title">${icon('sparkle')}<h3>What to focus on next session</h3><span class="draft-tag">suggested</span></div>
        <ol>${focus.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      </div>

      <div class="grid grid-2" style="margin-top:1rem">
        <div class="card"><div class="card-title">${icon('flag')}<h3>Main presenting problem</h3></div>
          <p class="small" style="margin:0">${esc(c.presentingProblem || 'Not recorded yet — edit the client or fill the profile’s presenting-problem section.')}</p>
        </div>
        <div class="card"><div class="card-title">${icon('file')}<h3>Key diagnoses &amp; medications</h3><span class="spacer"></span>
            <button class="btn btn-sm" id="btnAddDx">${icon('plus')}Dx</button><button class="btn btn-sm" id="btnAddMed">${icon('plus')}Med</button></div>
          ${dx.length ? `<div class="chip-row" style="margin-bottom:.6rem">${dx.map((d, i) => `<span class="chip ${d.status === 'confirmed' ? 'chip-primary' : d.status === 'ruled-out' ? '' : 'chip-warn'}" title="${d.status}">${esc(d.label)} <button class="btn btn-icon" style="min-width:22px;min-height:22px;padding:0" data-dxdel="${i}" aria-label="Remove">${icon('x')}</button></span>`).join('')}</div>` : '<p class="small muted">No diagnoses / impressions recorded.</p>'}
          ${meds.length ? `<dl class="kv">${meds.map(m => `<dt>${esc(m.name)}</dt><dd>${esc(m.dose || '')} ${m.prescriber ? '· ' + esc(m.prescriber) : ''}</dd>`).join('')}</dl>` : '<p class="small muted" style="margin:0">No active medications recorded.</p>'}
        </div>
      </div>

      <div class="card" style="margin-top:1rem"><div class="card-title">${icon('lightbulb')}<h3>Updated case formulation</h3><span class="spacer"></span><a class="btn btn-sm" href="#/client/${c.id}/formulation">Open</a></div>
        ${f ? `<p class="small">${esc(f.text)}</p><p class="tiny muted">v${c.formulations.length} · ${UI.fmtDateTime(f.ts)} · ${f.author === 'clinician' ? 'clinician-authored' : 'assistant draft, clinician-reviewed'}</p>` : `<p class="small muted">No formulation yet. Generate a draft from the record on the Formulation tab.</p>`}
        ${f && fPrev ? `<details class="acc"><summary>${icon('history')}What changed from the previous formulation</summary><div class="acc-body">${UI.diffBlock(fPrev.text, f.text, f.rationale, UI.fmtDate(fPrev.ts), UI.fmtDate(f.ts))}</div></details>` : ''}
      </div>

      <div class="grid grid-2" style="margin-top:1rem">
        <div class="card"><div class="card-title">${icon('map')}<h3>Current treatment plan goals</h3><span class="spacer"></span>
            <button class="btn btn-sm" id="btnAddGoal">${icon('plus')}Goal</button><a class="btn btn-sm" href="#/client/${c.id}/plan">Plan</a></div>
          ${goals.length ? goals.slice(0, 6).map((g) => { const i = c.goals.indexOf(g); return `
            <div style="display:flex;gap:.6rem;align-items:center;margin-bottom:.55rem">
              <span class="chip ${g.status === 'met' ? 'chip-ok' : g.term === 'short' ? 'chip-primary' : ''}">${g.term === 'short' ? 'ST' : 'LT'}</span>
              <div style="flex:1;min-width:0"><div class="small">${esc(g.text)}</div>
                <div style="height:6px;border-radius:3px;background:var(--bg-soft);margin-top:3px"><div style="height:100%;width:${g.progress || 0}%;background:var(--cta);border-radius:3px"></div></div></div>
              <button class="btn btn-icon" data-goaledit="${i}" aria-label="Edit goal">${icon('edit')}</button>
            </div>`; }).join('') : `<p class="small muted" style="margin:0">No goals yet — <a href="#/client/${c.id}/plan">generate a master treatment plan</a> to propose measurable objectives.</p>`}
        </div>
        <div class="card"><div class="card-title">${icon('tools')}<h3>Recommended next interventions</h3><span class="spacer"></span><a class="btn btn-sm" href="#/client/${c.id}/interventions">All</a></div>
          ${recs.length ? recs.map(r => `<p class="small" style="margin-bottom:.5rem"><strong>${esc(r.iv.name)}</strong><br><span class="muted">${esc(r.why.slice(0, 2).join('; ') || r.iv.fits.slice(0, 90))}</span></p>`).join('') : '<p class="small muted" style="margin:0">Add diagnoses, risk data, and profile sections to unlock matched suggestions.</p>'}
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:1rem">
        <div class="card"><div class="card-title">${icon('note')}<h3>Most recent DAP note</h3><span class="spacer"></span><a class="btn btn-sm" href="#/client/${c.id}/notes">All notes</a></div>
          ${lastNote ? `
            <p class="small" style="margin-bottom:.35rem"><strong>${esc(lastNote.sessionDate || UI.fmtDate(lastNote.ts))}</strong> · ${esc(CC.DAP_STYLES.find(s => s.key === lastNote.style)?.label || lastNote.style)} ${lastNote.riskFlags?.length ? '<span class="chip chip-critical">risk flagged</span>' : ''}</p>
            <p class="small muted" style="margin:0">${esc(lastNote.data.slice(0, 220))}…</p>`
          : `<p class="small muted" style="margin:0">No sessions documented yet — <a href="#/client/${c.id}/notes">write the first DAP note</a>.</p>`}
        </div>
        <div class="card"><div class="card-title">${icon('history')}<h3>Recent changes since last session</h3><span class="spacer"></span><a class="btn btn-sm" href="#/client/${c.id}/history">History</a></div>
          ${changes.length ? `<ul class="timeline">${changes.slice(0, 5).map(ch => `<li><div class="tl-when">${UI.fmtDateTime(ch.ts)}</div><div class="tl-what">${esc(ch.label)}${ch.reason ? ` — <span class="muted">${esc(ch.reason)}</span>` : ''}</div></li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">Nothing has changed since the last documented session.</p>'}
        </div>
      </div>

      <div class="grid grid-3" style="margin-top:1rem">
        ${chipEditor(c, 'themes', 'Core clinical themes')}
        ${chipEditor(c, 'coreIssues', 'Core issues')}
        ${chipEditor(c, 'traumaThemes', 'Trauma themes')}
      </div>`;

    const rerender = () => V.client(c.id, 'overview');
    bindChipEditors(c, rerender);
    on('#btnAddDx', 'click', () => {
      UI.modal({
        title: 'Add diagnosis / impression',
        body: `<label>Diagnosis or diagnostic impression</label><input id="dx-label" placeholder="e.g., PTSD (provisional); MDD, recurrent, moderate">
               <label>Status</label><select id="dx-status"><option value="impression">Diagnostic impression (provisional)</option><option value="confirmed">Established diagnosis</option><option value="ruled-out">Ruled out</option></select>`,
        footer: `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="dx-save">Add</button>`,
        onOpen(scrim, close) {
          scrim.querySelector('#dx-save').addEventListener('click', () => {
            const label = scrim.querySelector('#dx-label').value.trim(); if (!label) return;
            c.diagnoses.push({ id: S().id(), label, status: scrim.querySelector('#dx-status').value, date: UI.today() });
            S().logChange(c, 'diagnoses', 'Diagnoses', '', label, 'Added'); close(); rerender();
          });
        },
      });
    });
    on('[data-dxdel]', 'click', (e) => {
      const i = +e.currentTarget.dataset.dxdel; const old = c.diagnoses[i].label;
      c.diagnoses.splice(i, 1); S().logChange(c, 'diagnoses', 'Diagnoses', old, '', 'Removed'); rerender();
    });
    on('#btnAddMed', 'click', () => {
      UI.modal({
        title: 'Add medication',
        body: `<div class="field-row"><div><label>Medication</label><input id="med-name"></div><div><label>Dose</label><input id="med-dose"></div></div>
               <label>Prescriber</label><input id="med-rx"><label>Note</label><input id="med-note" placeholder="e.g., started 3/2026; monitor sedation">`,
        footer: `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="med-save">Add</button>`,
        onOpen(scrim, close) {
          scrim.querySelector('#med-save').addEventListener('click', () => {
            const name = scrim.querySelector('#med-name').value.trim(); if (!name) return;
            c.medications.push({ id: S().id(), name, dose: scrim.querySelector('#med-dose').value.trim(), prescriber: scrim.querySelector('#med-rx').value.trim(), note: scrim.querySelector('#med-note').value.trim(), active: true, startDate: UI.today() });
            S().logChange(c, 'medications', 'Medications', '', name, 'Added'); close(); rerender();
          });
        },
      });
    });
    const goalModal = (g, i) => UI.modal({
      title: g ? 'Edit goal' : 'Add goal',
      body: `<label>Goal</label><textarea id="goal-text" rows="2">${esc(g?.text || '')}</textarea>
             <div class="field-row"><div><label>Term</label><select id="goal-term"><option value="short" ${g?.term === 'short' ? 'selected' : ''}>Short-term</option><option value="long" ${g?.term === 'long' ? 'selected' : ''}>Long-term</option></select></div>
             <div><label>Status</label><select id="goal-status">${['active', 'met', 'revised', 'discontinued'].map(s => `<option ${g?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
             <div><label>Progress %</label><input id="goal-prog" type="number" min="0" max="100" value="${g?.progress || 0}"></div></div>`,
      footer: `<button class="btn" data-close>Cancel</button>${g ? '<button class="btn btn-danger" id="goal-del">Delete</button>' : ''}<button class="btn btn-primary" id="goal-save">Save</button>`,
      onOpen(scrim, close) {
        scrim.querySelector('#goal-save').addEventListener('click', () => {
          const text = scrim.querySelector('#goal-text').value.trim(); if (!text) return;
          const nv = { text, term: scrim.querySelector('#goal-term').value, status: scrim.querySelector('#goal-status').value, progress: +scrim.querySelector('#goal-prog').value || 0 };
          if (g) { S().logChange(c, 'goals', 'Treatment goal', g.text + ' (' + (g.progress || 0) + '%)', nv.text + ' (' + nv.progress + '%)', ''); Object.assign(g, nv); }
          else { c.goals.push({ id: S().id(), createdAt: Date.now(), ...nv }); S().logChange(c, 'goals', 'Treatment goal', '', text, 'Added'); }
          close(); rerender();
        });
        scrim.querySelector('#goal-del')?.addEventListener('click', () => {
          c.goals.splice(i, 1); S().logChange(c, 'goals', 'Treatment goal', g.text, '', 'Removed'); close(); rerender();
        });
      },
    });
    on('#btnAddGoal', 'click', () => goalModal());
    on('[data-goaledit]', 'click', (e) => { const i = +e.currentTarget.dataset.goaledit; goalModal(c.goals[i], i); });
  };

  /* ---- TAB: DAP notes ---- */
  V.tab_notes = (c, root) => {
    const notes = [...c.dapNotes].reverse();
    root.innerHTML = `
      <div class="btn-row" style="margin-bottom:1rem"><button class="btn btn-cta" id="btnNewNote">${icon('plus')}New DAP note</button></div>
      <div id="dapComposer"></div>
      ${notes.length ? notes.map(n => `
        <details class="acc"><summary>${icon('note')} ${esc(n.sessionDate || UI.fmtDate(n.ts))} · ${esc(CC.DAP_STYLES.find(s => s.key === n.style)?.label || n.style)} ${n.riskFlags?.length ? `<span class="chip chip-critical">risk flagged</span>` : ''}</summary>
          <div class="acc-body">
            <h4>Data</h4><p class="small">${esc(n.data)}</p>
            <h4>Assessment</h4><p class="small">${esc(n.assessment)}</p>
            <h4>Plan</h4><p class="small">${esc(n.plan)}</p>
            <div class="btn-row">
              <button class="btn btn-sm" data-copy="${n.id}">${icon('copy')}Copy</button>
              <button class="btn btn-sm" data-print="${n.id}">${icon('print')}Print / PDF</button>
              <button class="btn btn-sm btn-danger" data-del="${n.id}">${icon('trash')}Delete</button>
            </div>
          </div>
        </details>`).join('') : `<div class="empty">${icon('note')}<p>No DAP notes yet. Paste rough notes, bullets, or a transcript and generate a polished draft to edit.</p></div>`}
    `;
    on('#btnNewNote', 'click', () => V.dapComposer(c, document.getElementById('dapComposer'), () => V.client(c.id, 'notes')));
    const noteText = (n) => `DAP NOTE — ${c.initials} — ${n.sessionDate || UI.fmtDate(n.ts)}\n\nDATA:\n${n.data}\n\nASSESSMENT:\n${n.assessment}\n\nPLAN:\n${n.plan}\n\n[Drafted with clinician-directed assistant; reviewed and approved by clinician.]`;
    on('[data-copy]', 'click', (e) => { const n = c.dapNotes.find(x => x.id === e.currentTarget.dataset.copy); UI.copy(noteText(n)); });
    on('[data-print]', 'click', (e) => {
      const n = c.dapNotes.find(x => x.id === e.currentTarget.dataset.print);
      UI.printDocument(`DAP Note — ${c.initials} — ${n.sessionDate || UI.fmtDate(n.ts)}`,
        `<h2>Data</h2><p>${esc(n.data)}</p><h2>Assessment</h2><p>${esc(n.assessment)}</p><h2>Plan</h2><p>${esc(n.plan)}</p>`);
    });
    on('[data-del]', 'click', async (e) => {
      const id = e.currentTarget.dataset.del;
      if (await UI.confirm('Delete note', 'Delete this DAP note? This cannot be undone.', 'Delete', true)) {
        c.dapNotes = c.dapNotes.filter(x => x.id !== id); S().touch(c); V.client(c.id, 'notes');
      }
    });
  };

  /* DAP composer (used in client tab and global page) */
  V.dapComposer = (c, root, done) => {
    root.innerHTML = `
      <div class="card" style="margin-bottom:1rem">
        <div class="card-title">${icon('sparkle')}<h3>New DAP note — ${esc(c.initials)}</h3><span class="draft-tag">drafts for your review</span></div>
        <div class="field-row">
          <div><label>Session date</label><input type="date" id="dap-date" value="${UI.today()}"></div>
          <div><label>Style</label><select id="dap-style">${CC.DAP_STYLES.map(s => `<option value="${s.key}" title="${esc(s.hint)}">${s.label}</option>`).join('')}</select></div>
        </div>
        <label>Session material — transcript, rough notes, bullets, or dictated text</label>
        <textarea id="dap-raw" rows="6" placeholder="Paste anything: full transcript, shorthand, voice-to-text output…"></textarea>
        <div class="field-row">
          <div><label>Client-described mood</label><input id="dap-mood" placeholder='e.g., "exhausted but hopeful"'></div>
          <div><label>Observed affect</label><input id="dap-affect" list="affects" placeholder="e.g., constricted"><datalist id="affects">${CC.PHRASES.affectObserved.map(a => `<option>${a}</option>`).join('')}</datalist></div>
          <div><label>Engagement</label><input id="dap-engage" list="engages" placeholder="e.g., engaged and cooperative"><datalist id="engages">${CC.PHRASES.engagement.map(a => `<option>${a}</option>`).join('')}</datalist></div>
        </div>
        <label>Client quotes (one per line)</label><textarea id="dap-quotes" rows="2" placeholder="Key statements, verbatim — especially risk-relevant ones"></textarea>
        <div class="field-row">
          <div><label>Interventions used</label><input id="dap-interv" placeholder="e.g., MI, grounding, thought record review"></div>
          <div><label>Progress toward goals</label><input id="dap-progress" placeholder="e.g., completed 2 of 3 scheduled activities"></div>
        </div>
        <div class="field-row">
          <div><label>Risk / safety content</label><input id="dap-risk" placeholder="e.g., denied SI/HI; passive SI on Tuesday, no plan"></div>
          <div><label>Homework assigned</label><input id="dap-homework" placeholder="e.g., trigger log through Friday"></div>
        </div>
        <div class="field-row">
          <div><label>Your impressions</label><input id="dap-impress" placeholder="Clinical impressions to weave into Assessment"></div>
          <div><label>Next session focus</label><input id="dap-next" placeholder="e.g., review trigger log; begin hierarchy"></div>
        </div>
        <div class="btn-row" style="margin-top:1rem">
          <button class="btn btn-primary" id="dap-generate">${icon('sparkle')}Generate draft</button>
          <button class="btn btn-ghost" id="dap-cancel">Cancel</button>
        </div>
        <div id="dap-result"></div>
      </div>`;
    root.querySelector('#dap-cancel').addEventListener('click', () => { root.innerHTML = ''; });
    root.querySelector('#dap-generate').addEventListener('click', () => {
      const g = (id) => root.querySelector('#' + id).value.trim();
      const inputs = { sessionDate: g('dap-date'), raw: g('dap-raw'), mood: g('dap-mood'), affect: g('dap-affect'), engagement: g('dap-engage'), quotes: g('dap-quotes'), interventions: g('dap-interv'), progress: g('dap-progress'), risk: g('dap-risk'), homework: g('dap-homework'), impressions: g('dap-impress'), nextFocus: g('dap-next') };
      if (!inputs.raw && !inputs.impressions && !inputs.quotes) { UI.toast('Add at least some session material first', true); return; }
      const out = E.generateDAP(c, inputs, g('dap-style') || 'standard');
      const res = root.querySelector('#dap-result');
      res.innerHTML = `
        <div class="gen-output" style="margin-top:1rem">
          <div class="card-title"><span class="draft-tag">draft — edit before saving</span></div>
          ${out.riskFlags.map(f => `<div class="risk-callout">${icon('alert')}<span><strong>${esc(f.flag)}.</strong> ${esc(f.reminder)}</span></div>`).join('')}
          <h3>Data</h3><textarea id="out-d" rows="5">${esc(out.data)}</textarea>
          <h3>Assessment</h3><textarea id="out-a" rows="6">${esc(out.assessment)}</textarea>
          <h3>Plan</h3><textarea id="out-p" rows="4">${esc(out.plan)}</textarea>
          <div class="btn-row" style="margin-top:.8rem">
            <button class="btn btn-cta" id="dap-save">${icon('check')}Save note</button>
            ${E.aiAvailable() ? `<button class="btn" id="dap-ai">${icon('sparkle')}Polish with Claude (online)</button>` : ''}
            <span class="tiny muted">Saving records the note to ${esc(c.initials)}'s chart and timeline.</span>
          </div>
        </div>`;
      res.querySelector('#dap-save').addEventListener('click', () => {
        const note = { id: S().id(), ts: Date.now(), sessionDate: inputs.sessionDate, style: out.style, data: res.querySelector('#out-d').value, assessment: res.querySelector('#out-a').value, plan: res.querySelector('#out-p').value, riskFlags: out.riskFlags, inputs };
        c.dapNotes.push(note);
        S().logEvent(c, 'note', 'DAP note saved (' + (CC.DAP_STYLES.find(s => s.key === out.style)?.label || out.style) + ')');
        if (out.riskFlags.length) S().logEvent(c, 'risk', 'Risk content flagged in session note: ' + out.riskFlags.map(f => f.kind).join(', '));
        S().touch(c);
        UI.toast('DAP note saved'); done && done(note);
      });
      res.querySelector('#dap-ai')?.addEventListener('click', async (e) => {
        if (!await V.confirmAiSend()) return;
        const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Polishing…';
        try {
          const combined = `DATA:\n${res.querySelector('#out-d').value}\n\nASSESSMENT:\n${res.querySelector('#out-a').value}\n\nPLAN:\n${res.querySelector('#out-p').value}`;
          const polished = await E.aiPolish('Polish this DAP progress note. Keep the DATA/ASSESSMENT/PLAN section headers.', combined, inputs.raw);
          const m = polished.match(/DATA:?\s*([\s\S]*?)\n+ASSESSMENT:?\s*([\s\S]*?)\n+PLAN:?\s*([\s\S]*)/i);
          if (m) { res.querySelector('#out-d').value = m[1].trim(); res.querySelector('#out-a').value = m[2].trim(); res.querySelector('#out-p').value = m[3].trim(); }
          else res.querySelector('#out-a').value = polished;
          UI.toast('Draft polished — review before saving');
        } catch (err) { UI.toast(err.message, true); }
        btn.disabled = false; btn.innerHTML = icon('sparkle') + 'Polish with Claude (online)';
      });
      res.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  V.confirmAiSend = () => UI.confirm(
    'Send to online AI service?',
    'This will transmit the draft (which may contain protected health information) to the Anthropic API over an encrypted connection using your API key.<br><br><strong>Before using online AI with PHI</strong>, confirm your compliance posture: appropriate agreements (e.g., a BAA where required), your informed-consent language, and your organization’s policies. De-identify content where possible.',
    'I understand — send');

  /* ---- TAB: treatment plan ---- */
  V.tab_plan = (c, root) => {
    const plans = [...c.treatmentPlans].reverse();
    root.innerHTML = `
      <div class="btn-row" style="margin-bottom:1rem">
        <button class="btn btn-cta" id="btnGenPlan">${icon('sparkle')}Generate master treatment plan draft</button>
        <span class="tiny muted">Uses everything on file: profile, diagnoses, scores, risk, goals. Prior versions are preserved.</span>
      </div>
      <div id="planResult"></div>
      ${plans.length ? plans.map((p, idx) => `
        <details class="acc" ${idx === 0 ? 'open' : ''}><summary>${icon('map')} Plan v${plans.length - idx} · ${UI.fmtDateTime(p.ts)}</summary>
          <div class="acc-body">
            <h4>A. Holistic clinical identity formulation</h4><p class="small">${esc(p.sections.identity)}</p>
            <h4>B. Hierarchy of needs</h4><ol class="small">${p.sections.hierarchy.map(h => `<li><strong>${esc(h.label)}</strong> — <span class="muted">${esc(h.why)}</span></li>`).join('')}</ol>
            <h4>C. Evidenced by</h4><p class="small">${esc(p.sections.evidence)}</p>
            <h4>D. Goal plan</h4><p class="small">${esc(p.sections.goalPlan)}</p>
            <h4>E. Objectives &amp; plans</h4>
            ${p.sections.objectives.map((o, i) => `<div class="obj-card"><h4>Objective ${i + 1}</h4><p class="small">${esc(o.objective)}</p><h4>Plan ${i + 1}</h4><p class="small" style="margin:0">${esc(o.plan)}</p></div>`).join('')}
            <div class="btn-row">
              <button class="btn btn-sm" data-copyplan="${p.id}">${icon('copy')}Copy</button>
              <button class="btn btn-sm" data-printplan="${p.id}">${icon('print')}Print / PDF</button>
            </div>
          </div>
        </details>`).join('') : `<div class="empty">${icon('map')}<p>No treatment plan yet. The generator drafts a full master plan — identity formulation, need hierarchy, evidence, goals, and 4–5 measurable objective/plan pairs — from this client's record.</p></div>`}
    `;
    on('#btnGenPlan', 'click', () => {
      const sec = E.generateTreatmentPlan(c);
      const res = document.getElementById('planResult');
      res.innerHTML = `
        <div class="gen-output" style="margin-bottom:1rem">
          <div class="card-title"><span class="draft-tag">draft — edit before saving</span></div>
          <h3>A. Holistic clinical identity formulation</h3><textarea id="pl-a" rows="7">${esc(sec.identity)}</textarea>
          <h3>B. Hierarchy of needs and core clinical issues</h3>
          <ol class="small">${sec.hierarchy.map(h => `<li><strong>${esc(h.label)}</strong> — <span class="muted">${esc(h.why)}</span></li>`).join('')}</ol>
          <h3>C. Evidenced by</h3><textarea id="pl-c" rows="5">${esc(sec.evidence)}</textarea>
          <h3>D. Goal plan</h3><textarea id="pl-d" rows="4">${esc(sec.goalPlan)}</textarea>
          <h3>E. Objectives and plans</h3>
          ${sec.objectives.map((o, i) => `
            <div class="obj-card"><h4>Objective ${i + 1}</h4><textarea data-obj="${i}" rows="2">${esc(o.objective)}</textarea>
            <h4>Plan ${i + 1}</h4><textarea data-plan="${i}" rows="2">${esc(o.plan)}</textarea></div>`).join('')}
          <div class="btn-row" style="margin-top:.8rem">
            <button class="btn btn-cta" id="pl-save">${icon('check')}Save plan version</button>
            <span class="tiny muted">Also imports objectives as trackable goals.</span>
          </div>
        </div>`;
      res.querySelector('#pl-save').addEventListener('click', () => {
        const objectives = sec.objectives.map((o, i) => ({ objective: res.querySelector(`[data-obj="${i}"]`).value, plan: res.querySelector(`[data-plan="${i}"]`).value }));
        const plan = { id: S().id(), ts: Date.now(), sections: { identity: res.querySelector('#pl-a').value, hierarchy: sec.hierarchy, evidence: res.querySelector('#pl-c').value, goalPlan: res.querySelector('#pl-d').value, objectives } };
        c.treatmentPlans.push(plan);
        objectives.forEach(o => { if (!c.goals.some(g => g.text === o.objective)) c.goals.push({ id: S().id(), text: o.objective, term: 'short', status: 'active', progress: 0, createdAt: Date.now() }); });
        S().logEvent(c, 'plan', 'Master treatment plan v' + c.treatmentPlans.length + ' saved');
        S().touch(c); UI.toast('Treatment plan saved'); V.client(c.id, 'plan');
      });
      res.scrollIntoView({ behavior: 'smooth' });
    });
    const planText = (p) => {
      return `MASTER TREATMENT PLAN — ${c.initials} — ${UI.fmtDate(p.ts)}\n\nA. HOLISTIC CLINICAL IDENTITY FORMULATION\n${p.sections.identity}\n\nB. HIERARCHY OF NEEDS\n${p.sections.hierarchy.map((h, i) => `${i + 1}. ${h.label} — ${h.why}`).join('\n')}\n\nC. EVIDENCED BY\n${p.sections.evidence}\n\nD. GOAL PLAN\n${p.sections.goalPlan}\n\nE. OBJECTIVES AND PLANS\n${p.sections.objectives.map((o, i) => `Objective ${i + 1}: ${o.objective}\nPlan ${i + 1}: ${o.plan}`).join('\n\n')}\n\n[Draft generated with clinician-directed assistant; reviewed and approved by clinician.]`;
    };
    on('[data-copyplan]', 'click', (e) => { const p = c.treatmentPlans.find(x => x.id === e.currentTarget.dataset.copyplan); UI.copy(planText(p)); });
    on('[data-printplan]', 'click', (e) => {
      const p = c.treatmentPlans.find(x => x.id === e.currentTarget.dataset.printplan);
      UI.printDocument(`Master Treatment Plan — ${c.initials}`, `
        <h2>A. Holistic clinical identity formulation</h2><p>${esc(p.sections.identity)}</p>
        <h2>B. Hierarchy of needs</h2><ol>${p.sections.hierarchy.map(h => `<li><strong>${esc(h.label)}</strong> — ${esc(h.why)}</li>`).join('')}</ol>
        <h2>C. Evidenced by</h2><p>${esc(p.sections.evidence)}</p>
        <h2>D. Goal plan</h2><p>${esc(p.sections.goalPlan)}</p>
        <h2>E. Objectives and plans</h2>${p.sections.objectives.map((o, i) => `<h3>Objective ${i + 1}</h3><p>${esc(o.objective)}</p><h3>Plan ${i + 1}</h3><p>${esc(o.plan)}</p>`).join('')}`);
    });
  };

  /* ---- TAB: full profile ---- */
  V.tab_profile = (c, root) => {
    const nci = S().db.settings.nci;
    root.innerHTML = `
      <p class="small muted" style="max-width:70ch">A living psychological “resume” of the whole person. Each section is versioned — earlier text is preserved in change history whenever you update it.</p>
      ${CC.PROFILE_SCHEMA.map(f => {
        const cur = c.profile[f.key];
        return `<details class="acc" ${cur?.text ? '' : ''}>
          <summary>${esc(f.label)} ${cur?.text ? `<span class="chip chip-ok" style="margin-left:.4rem">on file</span>` : `<span class="chip" style="margin-left:.4rem">empty</span>`}</summary>
          <div class="acc-body">
            <p class="tiny muted" style="margin-bottom:.4rem">${esc(f.prompt)}</p>
            <textarea data-pf="${f.key}" rows="3" placeholder="Clinical notes for this domain…">${esc(cur?.text || '')}</textarea>
            <div class="btn-row" style="margin-top:.5rem">
              <button class="btn btn-sm btn-primary" data-pfsave="${f.key}">${icon('check')}Save</button>
              ${cur?.history?.length ? `<button class="btn btn-sm" data-pfhist="${f.key}">${icon('history')}History (${cur.history.length})</button>` : ''}
              ${cur?.updatedAt ? `<span class="tiny muted">Updated ${UI.fmtDate(cur.updatedAt)}</span>` : ''}
            </div>
          </div></details>`;
      }).join('')}

      <div class="card" style="margin-top:1rem">
        <div class="card-title">${icon('key')}<h3>Clinician-provided profiling framework (NCI / Behavior Ops style)</h3></div>
        ${nci.enabled && nci.levels.some(l => l.definition) ? `
          <p class="small muted">Scored against <em>your</em> rubric from Settings — this app does not supply proprietary definitions.</p>
          <div class="field-row">
            ${nci.levels.map(l => `<div><label>${esc(l.key)}${l.definition ? ` <span class="muted">(${esc(l.definition.slice(0, 40))}${l.definition.length > 40 ? '…' : ''})</span>` : ''}</label>
              <input data-nci="${esc(l.key)}" value="${esc(c.nci.scores[l.key] || '')}" placeholder="${l.scoring ? esc(l.scoring.slice(0, 50)) : 'Score / rating per your rubric'}"></div>`).join('')}
          </div>
          <label>Behavioral observations (clinical, ethical, non-manipulative language)</label>
          <textarea id="nci-notes" rows="3" placeholder="Observable behavior → hypothesis → treatment relevance">${esc(c.nci.notes || '')}</textarea>
          <div class="btn-row" style="margin-top:.5rem"><button class="btn btn-sm btn-primary" id="nci-save">${icon('check')}Save profiling data</button></div>`
        : `<p class="small muted" style="margin:0">Off. If you use a licensed behavioral-profiling framework (e.g., Chase Hughes' NCI levels), define your own rubric in <a href="#/settings">Settings → Profiling framework</a>. The app will then add structured scoring fields here — it never invents proprietary definitions, and generated language stays clinical and ethical.</p>`}
      </div>`;
    on('[data-pfsave]', 'click', (e) => {
      const key = e.currentTarget.dataset.pfsave;
      const ta = root.querySelector(`[data-pf="${key}"]`);
      const old = E.profileText(c, key);
      if (ta.value.trim() === old) { UI.toast('No changes to save'); return; }
      if (old) {
        UI.modal({
          title: 'Why did this change?',
          body: `<p class="small muted">A one-line rationale keeps the longitudinal record meaningful (shown in change history).</p><label>Reason (optional)</label><input id="pf-reason" placeholder="e.g., new disclosure in session 2026-07-03">`,
          footer: `<button class="btn" data-close>Skip</button><button class="btn btn-primary" id="pf-ok">Save</button>`,
          onOpen(scrim, close) {
            const save = () => { S().setProfileField(c, key, ta.value.trim(), scrim.querySelector('#pf-reason').value.trim()); close(); UI.toast('Saved'); V.client(c.id, 'profile'); };
            scrim.querySelector('#pf-ok').addEventListener('click', save);
            scrim.querySelector('[data-close]').addEventListener('click', () => { S().setProfileField(c, key, ta.value.trim(), ''); UI.toast('Saved'); V.client(c.id, 'profile'); });
          },
        });
      } else {
        S().setProfileField(c, key, ta.value.trim(), 'Initial entry'); UI.toast('Saved'); V.client(c.id, 'profile');
      }
    });
    on('[data-pfhist]', 'click', (e) => {
      const key = e.currentTarget.dataset.pfhist;
      const f = CC.PROFILE_SCHEMA.find(x => x.key === key);
      const cur = c.profile[key];
      const rows = [...(cur.history || [])].reverse();
      UI.modal({
        title: `History — ${f.label}`, wide: true,
        body: rows.map((h, i) => {
          const newer = i === 0 ? { text: cur.text, ts: cur.updatedAt } : { text: rows[i - 1].text, ts: rows[i - 1].ts };
          return UI.diffBlock(h.text, newer.text, '', UI.fmtDate(h.ts), UI.fmtDate(newer.ts));
        }).join('<hr style="border:none;border-top:1px solid var(--border);margin:1rem 0">') || '<p class="muted">No history.</p>',
        footer: `<button class="btn" data-close>Close</button>`,
      });
    });
    on('#nci-save', 'click', () => {
      nci.levels.forEach(l => { const inp = root.querySelector(`[data-nci="${CSS.escape(l.key)}"]`); if (inp) c.nci.scores[l.key] = inp.value.trim(); });
      c.nci.notes = root.querySelector('#nci-notes').value.trim();
      S().logEvent(c, 'change', 'Profiling framework data updated'); S().touch(c); UI.toast('Profiling data saved');
    });
  };

  /* ---- TAB: formulation ---- */
  V.tab_formulation = (c, root) => {
    const versions = [...c.formulations].reverse();
    root.innerHTML = `
      <div class="btn-row" style="margin-bottom:1rem">
        <button class="btn btn-cta" id="btnDraftForm">${icon('sparkle')}Draft from record</button>
        <button class="btn" id="btnManualForm">${icon('edit')}Write manually</button>
        <span class="tiny muted">Old versions are never overwritten — the evolution is the clinical story.</span>
      </div>
      <div id="formEditor"></div>
      ${versions.length ? versions.map((f, idx) => {
        const prev = c.formulations[c.formulations.length - idx - 2];
        return `<div class="card" style="margin-bottom:1rem">
          <div class="card-title"><h3>v${c.formulations.length - idx}</h3><span class="chip ${idx === 0 ? 'chip-ok' : ''}">${idx === 0 ? 'current' : 'superseded'}</span><span class="spacer"></span><span class="tiny muted">${UI.fmtDateTime(f.ts)}</span></div>
          <p class="small">${esc(f.text)}</p>
          ${prev ? `<details class="acc"><summary>${icon('history')}Changed from v${c.formulations.length - idx - 1}</summary><div class="acc-body">${UI.diffBlock(prev.text, f.text, f.rationale, UI.fmtDate(prev.ts), UI.fmtDate(f.ts))}</div></details>` : (f.rationale ? `<p class="tiny muted">${esc(f.rationale)}</p>` : '')}
        </div>`;
      }).join('') : `<div class="empty">${icon('lightbulb')}<p>No formulation yet. Draft one from the record — the engine assembles a 5-P style hypothesis from the profile, diagnoses, and history — then edit it into your own clinical voice.</p></div>`}
    `;
    const editor = (text, isDraft) => {
      const ed = document.getElementById('formEditor');
      ed.innerHTML = `
        <div class="gen-output" style="margin-bottom:1rem">
          <div class="card-title"><span class="draft-tag">${isDraft ? 'assistant draft — edit before saving' : 'new version'}</span></div>
          <textarea id="form-text" rows="8">${esc(text)}</textarea>
          <label>Why is the formulation changing? (recorded with the version)</label>
          <input id="form-why" placeholder="e.g., new trauma disclosure reframes the avoidance as protective">
          <div class="btn-row" style="margin-top:.8rem">
            <button class="btn btn-cta" id="form-save">${icon('check')}Save as new version</button>
            ${E.aiAvailable() ? `<button class="btn" id="form-ai">${icon('sparkle')}Polish with Claude (online)</button>` : ''}
            <button class="btn btn-ghost" id="form-cancel">Cancel</button>
          </div>
        </div>`;
      ed.querySelector('#form-cancel').addEventListener('click', () => ed.innerHTML = '');
      ed.querySelector('#form-save').addEventListener('click', () => {
        const t = ed.querySelector('#form-text').value.trim(); if (!t) return;
        const why = ed.querySelector('#form-why').value.trim();
        S().addFormulation(c, t, why || (c.formulations.length ? E.updateRationale(c, '') : 'Initial formulation'), isDraft ? 'assistant-draft' : 'clinician');
        UI.toast('Formulation version saved'); V.client(c.id, 'formulation');
      });
      ed.querySelector('#form-ai')?.addEventListener('click', async (e) => {
        if (!await V.confirmAiSend()) return;
        const btn = e.currentTarget; btn.disabled = true;
        try { ed.querySelector('#form-text').value = await E.aiPolish('Polish this case formulation. Keep it one cohesive clinical paragraph set, hypothesis-framed.', ed.querySelector('#form-text').value, ''); UI.toast('Polished — review before saving'); }
        catch (err) { UI.toast(err.message, true); }
        btn.disabled = false;
      });
      ed.scrollIntoView({ behavior: 'smooth' });
    };
    on('#btnDraftForm', 'click', () => editor(E.generateFormulation(c), true));
    on('#btnManualForm', 'click', () => editor(c.formulations[c.formulations.length - 1]?.text || '', false));
  };

  /* ---- TAB: interventions ---- */
  V.tab_interventions = (c, root) => {
    const recs = E.recommendInterventions(c);
    const activeKeys = new Set(c.interventions.filter(i => i.status === 'active').map(i => i.key));
    root.innerHTML = `
      <p class="small muted" style="max-width:70ch">Matched to this client's diagnoses, attachment presentation, stage of change, risk level, and profile. Rationale shown per recommendation — these are suggestions to weigh, not orders.</p>
      ${recs.length ? recs.map(r => `
        <details class="acc">
          <summary>${icon('tools')} ${esc(r.iv.name)} ${activeKeys.has(r.iv.key) ? '<span class="chip chip-ok">in use</span>' : ''}<span class="spacer"></span></summary>
          <div class="acc-body">
            <p class="small"><strong>Why it fits ${esc(c.initials)}:</strong> ${esc(r.why.join('; ') || 'General fit')}. ${esc(r.iv.fits)}</p>
            <p class="small"><strong>How to use it:</strong> ${esc(r.iv.how)}</p>
            <p class="small"><strong>What to avoid:</strong> ${esc(r.iv.avoid)}</p>
            <p class="small"><strong>Signs it's working:</strong> ${esc(r.iv.working)}</p>
            <p class="small"><strong>Signs the client isn't ready:</strong> ${esc(r.iv.notReady)}</p>
            <div class="btn-row">
              ${activeKeys.has(r.iv.key)
                ? `<button class="btn btn-sm" data-ivoff="${r.iv.key}">${icon('x')}Mark inactive</button>`
                : `<button class="btn btn-sm btn-primary" data-ivon="${r.iv.key}">${icon('check')}Adopt for this client</button>`}
            </div>
          </div>
        </details>`).join('') : `<div class="empty">${icon('tools')}<p>Add diagnoses, risk data, and profile sections to unlock matched intervention recommendations.</p></div>`}
      <p class="small" style="margin-top:1rem"><a href="#/interventions">Browse the full intervention library →</a></p>`;
    on('[data-ivon]', 'click', (e) => {
      const key = e.currentTarget.dataset.ivon;
      c.interventions.push({ id: S().id(), key, ts: Date.now(), status: 'active' });
      S().logEvent(c, 'change', 'Intervention adopted: ' + (CC.INTERVENTIONS.find(i => i.key === key)?.name || key));
      S().touch(c); V.client(c.id, 'interventions');
    });
    on('[data-ivoff]', 'click', (e) => {
      const key = e.currentTarget.dataset.ivoff;
      c.interventions.forEach(i => { if (i.key === key) i.status = 'inactive'; });
      S().touch(c); V.client(c.id, 'interventions');
    });
  };

  /* ---- TAB: safety/trust ---- */
  V.tab_safety = (c, root) => {
    const sections = E.generateSafetyStrategy(c);
    const saved = [...c.safetyStrategies].reverse();
    root.innerHTML = `
      <p class="small muted" style="max-width:70ch">How to create safety and earn trust with <strong>${esc(c.initials)}</strong>, generated from the attachment hypothesis (${esc(c.attachmentStyle)}), trauma and shame data, regulation style, and cultural context on file. Regenerates live as the record evolves.</p>
      <div class="card">
        ${sections.map(s => `<h3 style="margin-top:1rem;color:var(--primary-ink)">${esc(s.h)}</h3><p class="small">${esc(s.t)}</p>`).join('')}
        <div class="btn-row" style="margin-top:1rem">
          <button class="btn btn-primary" id="saveStrategy">${icon('check')}Snapshot this strategy</button>
          <button class="btn" id="printStrategy">${icon('print')}Print / PDF</button>
          <span class="tiny muted">Snapshots preserve today's strategy for comparison as the formulation evolves.</span>
        </div>
      </div>
      ${saved.length ? `<h2 style="margin-top:1.4rem">Snapshots</h2>` + saved.map((s, i) => `
        <details class="acc"><summary>${icon('history')} ${UI.fmtDateTime(s.ts)}</summary><div class="acc-body"><p class="small" style="white-space:pre-wrap">${esc(s.text)}</p></div></details>`).join('') : ''}
    `;
    const asText = () => sections.map(s => s.h.toUpperCase() + '\n' + s.t).join('\n\n');
    on('#saveStrategy', 'click', () => {
      c.safetyStrategies.push({ id: S().id(), ts: Date.now(), text: asText() });
      S().logEvent(c, 'change', 'Safety & rapport strategy snapshot saved'); S().touch(c);
      UI.toast('Strategy snapshot saved'); V.client(c.id, 'safety');
    });
    on('#printStrategy', 'click', () => UI.printDocument(`Safety, Trust & Rapport Strategy — ${c.initials}`, sections.map(s => `<h2>${esc(s.h)}</h2><p>${esc(s.t)}</p>`).join('')));
  };

  /* ---- TAB: assessments ---- */
  V.tab_assessments = (c, root) => {
    const rows = [...(c.assessments || [])].sort((a, b) => a.date < b.date ? 1 : -1);
    const tools = [...new Set(rows.map(r => r.tool))];
    const series = tools.filter(t => t !== 'C-SSRS').slice(0, 5).map(t => ({
      name: t, points: rows.filter(r => r.tool === t).map(r => ({ x: r.date, y: r.score })),
    })).filter(s => s.points.length);
    root.innerHTML = `
      <div class="card"><div class="card-title">${icon('plus')}<h3>Record a score</h3></div>
        <div class="field-row">
          <div><label>Instrument</label><select id="as-tool">${CC.ASSESSMENTS.map(t => `<option value="${t.key}">${t.name}</option>`).join('')}</select></div>
          <div><label>Score</label><input id="as-score" type="number" min="0"></div>
          <div><label>Date</label><input id="as-date" type="date" value="${UI.today()}"></div>
        </div>
        <label>Note</label><input id="as-note" placeholder="Context, subscales, administration notes">
        <div class="btn-row" style="margin-top:.7rem"><button class="btn btn-primary" id="as-add">${icon('check')}Save score</button>
        <span class="tiny muted" id="as-hint"></span></div>
      </div>
      ${series.length ? `<div class="card" style="margin-top:1rem"><div class="card-title">${icon('gauge')}<h3>Score trends</h3></div>${UI.lineChart(series, { label: 'Assessment score trends over time for ' + c.initials })}</div>` : ''}
      ${rows.length ? `<div class="table-wrap" style="margin-top:1rem"><table>
        <thead><tr><th>Date</th><th>Instrument</th><th class="num">Score</th><th>Interpretation</th><th>Note</th><th></th></tr></thead>
        <tbody>${rows.map(r => {
          const it = E.interpretScore(r.tool, r.score);
          const chip = it ? ['chip-ok', 'chip', 'chip-warn', 'chip-serious', 'chip-critical'][it.band.sev] : 'chip';
          return `<tr><td>${esc(r.date)}</td><td>${esc(r.tool)}</td><td class="num"><strong>${r.score}</strong></td>
            <td><span class="chip ${chip}">${it ? esc(it.band.label) : '—'}</span></td><td class="small muted">${esc(r.note || '')}</td>
            <td><button class="btn btn-icon" data-asdel="${r.id}" aria-label="Delete score">${icon('trash')}</button></td></tr>`;
        }).join('')}</tbody></table></div>` : `<div class="empty" style="margin-top:1rem">${icon('gauge')}<p>No scores yet. Trends unlock once two or more administrations of an instrument are recorded.</p></div>`}
      <div class="card" style="margin-top:1rem"><div class="card-title">${icon('info')}<h3>Instrument guidance</h3></div>
        ${CC.ASSESSMENTS.map(t => `<details class="acc"><summary>${esc(t.name)} <span class="tiny muted" style="margin-left:.4rem">${esc(t.cadence)}</span></summary><div class="acc-body"><p class="small">${esc(t.note)}</p><p class="tiny muted">Bands: ${t.bands.map(b => `${b.min}–${b.max} ${b.label}`).join(' · ')}</p></div></details>`).join('')}
      </div>`;
    const hint = root.querySelector('#as-hint');
    const updateHint = () => {
      const t = root.querySelector('#as-tool').value, sc = +root.querySelector('#as-score').value;
      if (!isNaN(sc) && root.querySelector('#as-score').value !== '') {
        const it = E.interpretScore(t, sc);
        hint.textContent = it ? `→ ${it.band.label}` : '';
      } else hint.textContent = '';
    };
    root.querySelector('#as-score').addEventListener('input', updateHint);
    root.querySelector('#as-tool').addEventListener('change', updateHint);
    on('#as-add', 'click', () => {
      const tool = val('as-tool'), score = +val('as-score'), date = val('as-date');
      if (val('as-score') === '' || isNaN(score) || !date) { UI.toast('Score and date are required', true); return; }
      c.assessments.push({ id: S().id(), tool, score, date, note: val('as-note') });
      const it = E.interpretScore(tool, score);
      S().logEvent(c, 'change', `${tool} recorded: ${score}${it ? ' (' + it.band.label + ')' : ''}`);
      if (tool === 'PHQ-9' && score >= 20) S().logEvent(c, 'risk', 'PHQ-9 in severe range — review item 9 / assess risk');
      if (tool === 'C-SSRS' && score >= 4) S().logEvent(c, 'risk', 'C-SSRS indicates ideation with intent/plan — acute risk protocol');
      S().touch(c); UI.toast('Score saved'); V.client(c.id, 'assessments');
    });
    on('[data-asdel]', 'click', async (e) => {
      const delId = e.currentTarget.dataset.asdel;
      if (await UI.confirm('Delete score', 'Remove this assessment entry?', 'Delete', true)) {
        c.assessments = c.assessments.filter(x => x.id !== delId);
        S().touch(c); V.client(c.id, 'assessments');
      }
    });
  };

  /* ---- TAB: risk ---- */
  V.tab_risk = (c, root) => {
    const riskChanges = c.changeLog.filter(ch => ch.field === 'riskLevel').reverse();
    root.innerHTML = `
      <div class="grid grid-2">
        <div class="card"><div class="card-title">${icon('alert')}<h3>Current risk level</h3></div>
          <div class="chip-row" style="margin-bottom:.8rem">${CC.RISK_LEVELS.map(r => `
            <button class="btn btn-sm ${c.riskLevel === r.key ? 'btn-primary' : ''}" data-risk="${r.key}" title="${esc(r.desc)}">${r.label}</button>`).join('')}</div>
          <p class="small muted">${esc(CC.RISK_LEVELS.find(r => r.key === c.riskLevel)?.desc || '')}</p>
          <label>Safety concerns (free text)</label>
          <textarea id="risk-concerns" rows="3">${esc(c.safetyConcerns || '')}</textarea>
          <div class="btn-row" style="margin-top:.5rem"><button class="btn btn-sm btn-primary" id="risk-save">${icon('check')}Save concerns</button></div>
        </div>
        <div class="card"><div class="card-title">${icon('shield')}<h3>Risk protocol reminders</h3></div>
          <ul class="small" style="padding-left:1.2rem;color:var(--muted)">
            <li>Ask directly; structure it (ideation → method → plan → intent → means → history).</li>
            <li>Means restriction is the intervention with the best evidence — have the conversation.</li>
            <li>Document: level, rationale, protective factors, actions, disposition.</li>
            <li>Reassess at transitions: discharge, post-hospitalization, relapse, anniversaries.</li>
            <li>US crisis resources: 988 (call/text) · Crisis Text Line: HOME to 741741 · 911.</li>
          </ul>
          <a class="btn btn-sm" href="#/knowledge?q=risk">${icon('book')}Full risk guidance</a>
        </div>
      </div>
      <div class="grid grid-2" style="margin-top:1rem">
        ${chipEditor(c, 'riskFactors', 'Risk factors', 'e.g., prior attempt, access to means, isolation, recent loss')}
        ${chipEditor(c, 'protectiveFactors', 'Protective factors', 'e.g., children, treatment engagement, faith, future plans')}
      </div>
      <div class="card" style="margin-top:1rem"><div class="card-title">${icon('history')}<h3>Risk level history</h3></div>
        ${riskChanges.length ? riskChanges.map(ch => UI.diffBlock(ch.oldValue, ch.newValue, ch.reason, '', UI.fmtDateTime(ch.ts))).join('<br>') : '<p class="small muted" style="margin:0">No recorded risk-level changes.</p>'}
      </div>`;
    const rerender = () => V.client(c.id, 'risk');
    bindChipEditors(c, rerender);
    on('[data-risk]', 'click', (e) => {
      const nv = e.currentTarget.dataset.risk;
      if (nv === c.riskLevel) return;
      UI.modal({
        title: 'Change risk level',
        body: `<p class="small">Changing <strong>${esc(c.initials)}</strong> from <strong>${c.riskLevel}</strong> to <strong>${nv}</strong>. A rationale is required — this is the audit trail.</p><label>Clinical rationale *</label><input id="risk-why" placeholder="e.g., denied SI x3 weeks, engaged with safety plan">`,
        footer: `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="risk-ok">Change level</button>`,
        onOpen(scrim, close) {
          scrim.querySelector('#risk-ok').addEventListener('click', () => {
            const why = scrim.querySelector('#risk-why').value.trim();
            if (!why) { scrim.querySelector('#risk-why').focus(); return; }
            S().logChange(c, 'riskLevel', 'Risk level', c.riskLevel, nv, why);
            S().logEvent(c, 'risk', `Risk level changed to ${nv}: ${why}`);
            c.riskLevel = nv; S().touch(c); close(); rerender();
          });
        },
      });
    });
    on('#risk-save', 'click', () => {
      const nv = val('risk-concerns');
      S().logChange(c, 'safetyConcerns', 'Safety concerns', c.safetyConcerns, nv, '');
      c.safetyConcerns = nv; S().touch(c); UI.toast('Saved');
    });
  };

  /* ---- TAB: timeline ---- */
  V.tab_timeline = (c, root) => {
    const items = [...c.timeline].reverse();
    root.innerHTML = items.length
      ? `<ul class="timeline">${items.map(t => `<li data-kind="${t.type === 'risk' ? 'risk' : t.type === 'note' ? 'note' : t.type === 'plan' ? 'plan' : ''}">
          <div class="tl-when">${UI.fmtDateTime(t.ts)} · <span class="chip">${esc(t.type)}</span></div>
          <div class="tl-what">${esc(t.summary)}</div></li>`).join('')}</ul>`
      : `<div class="empty">${icon('clock')}<p>The timeline builds itself as you add notes, scores, plans, and changes.</p></div>`;
  };

  /* ---- TAB: documents ---- */
  V.tab_documents = (c, root) => {
    const docs = [...c.documents].reverse();
    root.innerHTML = `
      <div class="card"><div class="card-title">${icon('upload')}<h3>Import material</h3></div>
        <p class="small muted">Paste or import typed notes, session transcripts, BPS assessments, prior treatment plans, or medication lists. Text files import directly; for PDFs, copy the text out and paste it here (kept local either way).</p>
        <div class="field-row">
          <div><label>Title</label><input id="doc-title" placeholder="e.g., Intake BPS 2026-06-12"></div>
          <div><label>Kind</label><select id="doc-kind">${['Session transcript', 'Typed notes', 'BPS / intake', 'Prior treatment plan', 'Assessment report', 'Medication list', 'Collateral', 'Other'].map(k => `<option>${k}</option>`).join('')}</select></div>
        </div>
        <label>Content</label><textarea id="doc-text" rows="6" placeholder="Paste document text…"></textarea>
        <div class="btn-row" style="margin-top:.6rem">
          <button class="btn btn-primary" id="doc-add">${icon('check')}Save to record</button>
          <label class="btn" style="margin:0">${icon('upload')}Import .txt/.md file<input type="file" id="doc-file" accept=".txt,.md,.text,.csv" hidden></label>
        </div>
      </div>
      ${docs.length ? docs.map(d => `
        <details class="acc"><summary>${icon('file')} ${esc(d.name)} <span class="chip" style="margin-left:.4rem">${esc(d.kind)}</span><span class="tiny muted" style="margin-left:.5rem">${UI.fmtDate(d.ts)}</span></summary>
          <div class="acc-body"><p class="small" style="white-space:pre-wrap;max-height:320px;overflow:auto">${esc(d.text)}</p>
          <div class="btn-row"><button class="btn btn-sm btn-danger" data-docdel="${d.id}">${icon('trash')}Delete</button></div></div>
        </details>`).join('') : ''}
    `;
    on('#doc-add', 'click', () => {
      const t = val('doc-text'); if (!t) { UI.toast('Nothing to save', true); return; }
      c.documents.push({ id: S().id(), name: val('doc-title') || 'Untitled document', kind: val('doc-kind'), text: t, ts: Date.now() });
      S().logEvent(c, 'change', 'Document imported: ' + (val('doc-title') || 'Untitled'));
      const flags = E.scanRisk(t);
      if (flags.length) S().logEvent(c, 'risk', 'Imported document contains flagged content: ' + flags.map(f => f.kind).join(', '));
      S().touch(c); UI.toast('Document saved' + (flags.length ? ' — risk content flagged' : '')); V.client(c.id, 'documents');
    });
    root.querySelector('#doc-file').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const text = await file.text();
      root.querySelector('#doc-text').value = text;
      root.querySelector('#doc-title').value ||= file.name;
      UI.toast('File loaded — review and save');
    });
    on('[data-docdel]', 'click', async (e) => {
      if (await UI.confirm('Delete document', 'Remove this document from the record?', 'Delete', true)) {
        c.documents = c.documents.filter(x => x.id !== e.target.closest('[data-docdel]').dataset.docdel);
        S().touch(c); V.client(c.id, 'documents');
      }
    });
  };

  /* ---- TAB: change history ---- */
  V.tab_history = (c, root) => {
    const rows = [...c.changeLog].reverse();
    root.innerHTML = rows.length ? rows.map(ch => `
      <div class="card" style="margin-bottom:.9rem">
        <div class="card-title"><h4 style="margin:0">${esc(ch.label)}</h4><span class="spacer"></span><span class="tiny muted">${UI.fmtDateTime(ch.ts)}</span></div>
        ${(ch.oldValue || ch.newValue) ? UI.diffBlock(ch.oldValue || '(empty)', ch.newValue || '(removed)', ch.reason, '', '') : ''}
      </div>`).join('')
      : `<div class="empty">${icon('history')}<p>Every change to formulations, risk levels, profile sections, and clinical data is versioned here — old in red, new in green, with the why.</p></div>`;
  };

  /* ---- TAB: client settings ---- */
  V.tab_settings = (c, root) => {
    root.innerHTML = `
      <div class="grid grid-2">
        <div class="card"><div class="card-title">${icon('id')}<h3>Client details</h3></div>
          <p class="small muted">Initials, demographics, level of care, presenting problem, attachment hypothesis, and stage of change.</p>
          <button class="btn" id="cs-edit">${icon('edit')}Edit client details</button>
        </div>
        <div class="card"><div class="card-title">${icon('download')}<h3>Export this client</h3></div>
          <p class="small muted">Everything on file — notes, plans, profile, formulations, history — as a portable record.</p>
          <div class="btn-row">
            <button class="btn" id="cs-json">${icon('download')}JSON record</button>
            <button class="btn" id="cs-print">${icon('print')}Print / PDF summary</button>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:1rem"><div class="card-title">${icon('alert')}<h3>Danger zone</h3></div>
        <p class="small muted">Deleting removes ${esc(c.initials)} and every associated note, plan, and history entry from this device. Export first if you may need the record.</p>
        <button class="btn btn-danger" id="cs-delete">${icon('trash')}Delete client permanently</button>
      </div>
      <p class="tiny muted" style="margin-top:1rem">Workspace-wide settings (security, AI mode, profiling rubric, backups) live in <a href="#/settings">Settings</a>.</p>`;
    on('#cs-edit', 'click', () => V.clientForm(c));
    on('#cs-json', 'click', async () => {
      if (await UI.confirm('Export client record', 'The file will contain <strong>readable clinical data</strong> for this client. Store it only on an encrypted volume and delete after use.', 'Export')) {
        UI.download(`client-${c.initials.replace(/\W+/g, '')}-${UI.today()}.json`, JSON.stringify(c, null, 2), 'application/json');
      }
    });
    on('#cs-print', 'click', () => {
      const f = c.formulations[c.formulations.length - 1];
      const plan = c.treatmentPlans[c.treatmentPlans.length - 1];
      UI.printDocument(`Clinical Summary — ${c.initials}`, `
        <h2>Snapshot</h2><p>${esc([c.age && 'Age ' + c.age, c.pronouns, c.levelOfCare, 'Risk: ' + c.riskLevel].filter(Boolean).join(' · '))}</p>
        <h2>Presenting problem</h2><p>${esc(c.presentingProblem || '—')}</p>
        <h2>Diagnoses / impressions</h2><p>${esc(E.activeDx(c).join('; ') || '—')}</p>
        <h2>Current formulation</h2><p>${esc(f?.text || '—')}</p>
        <h2>Active goals</h2><ul>${(c.goals || []).filter(g => g.status === 'active').map(g => `<li>${esc(g.text)} (${g.progress || 0}%)</li>`).join('') || '<li>—</li>'}</ul>
        ${plan ? `<h2>Treatment plan (latest)</h2><p>${esc(plan.sections.goalPlan)}</p>` : ''}`);
    });
    on('#cs-delete', 'click', async () => {
      if (await UI.confirm('Delete client record', `Permanently delete <strong>${esc(c.initials)}</strong> and every note, plan, and history entry? This cannot be undone.`, 'Delete permanently', true)) {
        S().deleteClient(c.id); location.hash = '#/clients'; UI.toast('Client deleted');
      }
    });
  };

  V.interventionsLibrary = () => {
    mount(`
      ${pageHead('Intervention Library', 'The full library the matcher draws from. For per-client fit and rationale, open a client’s Interventions tab.')}
      ${CC.INTERVENTIONS.map(iv => `
        <details class="acc"><summary>${icon('tools')} ${esc(iv.name)}</summary>
          <div class="acc-body">
            <p class="small"><strong>Fits:</strong> ${esc(iv.fits)}</p>
            <p class="small"><strong>How to use it:</strong> ${esc(iv.how)}</p>
            <p class="small"><strong>What to avoid:</strong> ${esc(iv.avoid)}</p>
            <p class="small"><strong>Signs it's working:</strong> ${esc(iv.working)}</p>
            <p class="small"><strong>Signs of not-ready:</strong> ${esc(iv.notReady)}</p>
          </div>
        </details>`).join('')}`);
  };

  V.riskTracking = () => {
    const clients = S().clients();
    const order = { acute: 0, high: 1, moderate: 2, low: 3 };
    const sorted = [...clients].sort((a, b) => order[a.riskLevel] - order[b.riskLevel]);
    mount(`
      ${pageHead('Risk Tracking', 'Caseload-wide risk posture. Levels change only with a documented rationale — the audit trail lives on each client’s Risk tab.')}
      <div class="grid grid-4">${CC.RISK_LEVELS.map(r => `
        <div class="stat-tile"><div class="stat-label">${r.label}</div><div class="stat-value">${clients.filter(c => c.riskLevel === r.key).length}</div><div class="stat-sub">${esc(r.desc.split('—')[0])}</div></div>`).join('')}
      </div>
      ${sorted.length ? `<div class="table-wrap" style="margin-top:1rem"><table>
        <thead><tr><th>Client</th><th>Risk</th><th>Risk factors</th><th>Protective factors</th><th>Latest C-SSRS</th><th>Safety concerns</th></tr></thead>
        <tbody>${sorted.map(c => {
          const cs = E.latestScore(c, 'C-SSRS');
          return `<tr class="rowlink" data-id="${c.id}" tabindex="0">
            <td><strong>${esc(c.initials)}</strong></td><td>${UI.riskChip(c.riskLevel)}</td>
            <td class="small">${esc((c.riskFactors || []).join(', ') || '—')}</td>
            <td class="small">${esc((c.protectiveFactors || []).join(', ') || '—')}</td>
            <td class="small">${cs ? `${cs.score} (${esc(cs.date)})` : '<span class="muted">none</span>'}</td>
            <td class="small" style="max-width:24ch">${esc(c.safetyConcerns || '—')}</td></tr>`;
        }).join('')}</tbody></table></div>` : `<div class="empty">${icon('alert')}<p>No clients yet.</p></div>`}`);
    on('tr.rowlink', 'click', (e) => location.hash = '#/client/' + e.currentTarget.dataset.id + '/risk');
    on('tr.rowlink', 'keydown', (e) => { if (e.key === 'Enter') location.hash = '#/client/' + e.currentTarget.dataset.id + '/risk'; });
  };

  V.knowledge = (params) => {
    const q = params?.get('q') || '';
    mount(`
      ${pageHead('Clinical Knowledge Base', 'Ask working questions — score meanings, next-session focus, documentation phrasing, formulation blind spots, model selection. Answers are reasoning aids, and hypotheses are labeled as such.')}
      <div class="card">
        <label for="kb-q">Your question</label>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <input id="kb-q" style="flex:1;min-width:220px" placeholder='e.g., "what does a PCL-5 of 44 mean" or "how do I write resistant clinically"' value="${esc(q)}">
          ${clientSelect('kb-client')}
          <button class="btn btn-primary" id="kb-go">${icon('search')}Ask</button>
        </div>
        <div class="chip-row" style="margin-top:.7rem">
          ${['What intervention should I use for this client?', 'What should I focus on next session?', 'What does this assessment score mean?', 'What are possible blind spots in my formulation?', 'What should I assess next?', 'How do I write this clinically?'].map(s => `<button class="chip" data-suggest="${esc(s)}" style="cursor:pointer">${esc(s)}</button>`).join('')}
        </div>
      </div>
      <div id="kb-out" style="margin-top:1rem"></div>
      <h2 style="margin-top:1.6rem">Browse all topics</h2>
      ${CC.KNOWLEDGE.map(k => `<details class="acc"><summary>${icon('book')} ${esc(k.title)}</summary><div class="acc-body kb-answer">${UI.md(k.body)}</div></details>`).join('')}
    `);
    const run = () => {
      const query = val('kb-q'); if (!query) return;
      const client = S().client(val('kb-client'));
      const { matches, clientNote } = E.answerKnowledge(query, client);
      const out = document.getElementById('kb-out');
      out.innerHTML = `
        <div class="card">
          <div class="card-title">${icon('lightbulb')}<h3>Working answer</h3><span class="kb-hypothesis">reasoning aid — hypotheses, not conclusions</span></div>
          ${clientNote ? `<div class="reminder-callout">${icon('info')}<span>${esc(clientNote)}</span></div>` : ''}
          ${matches.length ? matches.map(k => `<div class="kb-answer" style="margin-bottom:1rem"><h3>${esc(k.title)}</h3>${UI.md(k.body)}</div>`).join('') : '<p class="muted">No direct match in the knowledge base. Try different terms — or browse the topics below; the library covers assessment interpretation, documentation phrasing, risk protocol, models, and formulation method.</p>'}
        </div>`;
      out.scrollIntoView({ behavior: 'smooth' });
    };
    on('#kb-go', 'click', run);
    view().querySelector('#kb-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    on('[data-suggest]', 'click', (e) => { view().querySelector('#kb-q').value = e.currentTarget.dataset.suggest; run(); });
    if (q) run();
  };

  /* ============================================================
     SETTINGS
     ============================================================ */
  V.settings = () => {
    const st = S().db.settings;
    mount(`
      ${pageHead('Settings', 'Security, data control, AI processing mode, and your profiling framework.')}
      <div class="grid grid-2">
        <div class="card"><div class="card-title">${icon('id')}<h3>Clinician</h3></div>
          <label>Name (appears on printed documents)</label><input id="set-name" value="${esc(st.clinicianName)}">
          <div class="btn-row" style="margin-top:.6rem"><button class="btn btn-sm btn-primary" id="set-name-save">Save</button></div>
        </div>
        <div class="card"><div class="card-title">${icon('lock')}<h3>Security</h3></div>
          <label>Auto-lock after inactivity</label>
          <select id="set-autolock">${[[1, '1 minute'], [5, '5 minutes'], [15, '15 minutes'], [30, '30 minutes'], [0, 'Never (not recommended)']].map(([v, l]) => `<option value="${v}" ${st.autoLockMin === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <div class="checkbox-row"><input type="checkbox" id="set-lockhide" ${st.lockOnHide ? 'checked' : ''}><label for="set-lockhide">Lock immediately when the tab/window is hidden</label></div>
          <div class="btn-row" style="margin-top:.6rem">
            <button class="btn btn-sm btn-primary" id="set-sec-save">Save</button>
            <button class="btn btn-sm" id="set-pass">${icon('key')}Change passphrase</button>
          </div>
          <p class="tiny muted" style="margin-top:.7rem">Data is encrypted at rest (AES-256-GCM, PBKDF2 310k). Also enable OS-level full-disk encryption and a device screen lock — this app protects its own data, not your device.</p>
        </div>
      </div>

      <div class="card" style="margin-top:1rem"><div class="card-title">${icon('sparkle')}<h3>AI processing</h3></div>
        <div class="checkbox-row"><input type="radio" name="aimode" id="ai-local" value="local" ${st.ai.mode !== 'api' ? 'checked' : ''}>
          <label for="ai-local"><strong>Local-only (default).</strong> All drafting runs on-device from your structured inputs and the built-in clinical libraries. Nothing ever leaves this device.</label></div>
        <div class="checkbox-row"><input type="radio" name="aimode" id="ai-api" value="api" ${st.ai.mode === 'api' ? 'checked' : ''}>
          <label for="ai-api"><strong>Online polish (optional).</strong> Adds “Polish with Claude” buttons that send the current draft to the Anthropic API with your key — with a warning shown before every send.</label></div>
        <div id="ai-fields" ${st.ai.mode === 'api' ? '' : 'hidden'}>
          <label>Anthropic API key</label><input id="ai-key" type="password" value="${esc(st.ai.apiKey)}" placeholder="sk-ant-…" autocomplete="off">
          <label>Model</label><select id="ai-model">${['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'].map(m => `<option ${st.ai.model === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
          <div class="reminder-callout">${icon('info')}<span><strong>PHI leaves the device in this mode.</strong> Using any cloud AI service with protected health information generally requires appropriate safeguards — encrypted transmission (used here), vendor agreements such as a BAA where legally required, informed consent, and your organization’s approval. This app supports careful use; it cannot make a workflow HIPAA-compliant by itself. De-identify drafts where possible.</span></div>
        </div>
        <div class="btn-row"><button class="btn btn-sm btn-primary" id="ai-save">Save AI settings</button></div>
      </div>

      <div class="card" style="margin-top:1rem"><div class="card-title">${icon('key')}<h3>Profiling framework (clinician-provided)</h3></div>
        <p class="small muted">For NCI / Behavior-Ops-style profiling: enter <em>your</em> licensed definitions, scoring anchors, and behavioral markers. The app never invents proprietary content; it structures observations against your rubric in clinical, ethical, non-manipulative language.</p>
        <div class="checkbox-row"><input type="checkbox" id="nci-on" ${st.nci.enabled ? 'checked' : ''}><label for="nci-on">Enable profiling fields on client profiles</label></div>
        <label>Framework name / source</label><input id="nci-name" value="${esc(st.nci.framework)}" placeholder="e.g., NCI levels per my Behavior Ops training">
        ${st.nci.levels.map((l, i) => `
          <fieldset><legend>${esc(l.key)}</legend>
            <label>Definition (yours)</label><input data-ncidef="${i}" value="${esc(l.definition)}">
            <label>Behavioral markers</label><input data-ncimark="${i}" value="${esc(l.markers)}">
            <label>Scoring anchors</label><input data-nciscore="${i}" value="${esc(l.scoring)}">
          </fieldset>`).join('')}
        <div class="btn-row"><button class="btn btn-sm btn-primary" id="nci-save">Save framework</button></div>
      </div>

      <div class="card" style="margin-top:1rem"><div class="card-title">${icon('download')}<h3>Your data</h3></div>
        <div class="btn-row">
          <button class="btn" id="exp-enc">${icon('download')}Encrypted backup</button>
          <button class="btn" id="exp-json">${icon('download')}Unencrypted JSON export</button>
          <label class="btn" style="margin:0">${icon('upload')}Restore backup<input type="file" id="imp-file" accept=".json,.ccbackup" hidden></label>
          <button class="btn btn-danger" id="erase-all">${icon('trash')}Erase all data</button>
        </div>
        <p class="tiny muted" style="margin-top:.7rem">Encrypted backups restore with the same passphrase. Unencrypted exports contain readable clinical data — store them only on encrypted volumes and delete after use. Erasing is immediate and unrecoverable.</p>
      </div>

      <div class="card" style="margin-top:1rem"><div class="card-title">${icon('info')}<h3>About &amp; scope</h3></div>
        <p class="small muted">CaseCompass assists a licensed clinician with documentation, organization, and clinical reasoning. It does not make diagnoses, does not replace clinical judgment or supervision, and is not a medical device or an emergency tool. All generated content is a draft or hypothesis until reviewed, edited, and adopted by the clinician. Works fully offline; installable as an app on desktop and mobile (iOS/Android via “Add to Home Screen”, macOS/Windows via the browser’s Install option).</p>
      </div>`);

    on('#set-name-save', 'click', () => { st.clinicianName = val('set-name'); S().save(); UI.toast('Saved'); });
    on('#set-sec-save', 'click', () => {
      st.autoLockMin = +val('set-autolock'); st.lockOnHide = view().querySelector('#set-lockhide').checked;
      S().save(); S().armAutoLock(); UI.toast('Security settings saved');
    });
    on('#set-pass', 'click', () => {
      UI.modal({
        title: 'Change passphrase',
        body: `<label>New passphrase (12+ characters recommended)</label><input id="np1" type="password" autocomplete="new-password"><label>Confirm</label><input id="np2" type="password" autocomplete="new-password">`,
        footer: `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="np-ok">Change</button>`,
        onOpen(scrim, close) {
          scrim.querySelector('#np-ok').addEventListener('click', async () => {
            const a = scrim.querySelector('#np1').value, b = scrim.querySelector('#np2').value;
            if (a.length < 8) { UI.toast('Use at least 8 characters', true); return; }
            if (a !== b) { UI.toast('Passphrases do not match', true); return; }
            await S().changePassphrase(a); close(); UI.toast('Passphrase changed');
          });
        },
      });
    });
    view().querySelectorAll('[name="aimode"]').forEach(r => r.addEventListener('change', () => {
      document.getElementById('ai-fields').hidden = !view().querySelector('#ai-api').checked;
    }));
    on('#ai-save', 'click', () => {
      st.ai.mode = view().querySelector('#ai-api').checked ? 'api' : 'local';
      st.ai.apiKey = val('ai-key'); st.ai.model = val('ai-model') || 'claude-opus-4-8';
      S().save(); UI.toast('AI settings saved');
      document.getElementById('aiModePill').textContent = st.ai.mode === 'api' ? 'Online polish enabled' : 'Local-only mode';
    });
    on('#nci-save', 'click', () => {
      st.nci.enabled = view().querySelector('#nci-on').checked;
      st.nci.framework = val('nci-name');
      st.nci.levels.forEach((l, i) => {
        l.definition = view().querySelector(`[data-ncidef="${i}"]`).value.trim();
        l.markers = view().querySelector(`[data-ncimark="${i}"]`).value.trim();
        l.scoring = view().querySelector(`[data-nciscore="${i}"]`).value.trim();
      });
      S().save(); UI.toast('Framework saved');
    });
    on('#exp-enc', 'click', () => { UI.download(`casecompass-backup-${UI.today()}.ccbackup.json`, S().exportEncrypted(), 'application/json'); UI.toast('Encrypted backup downloaded'); });
    on('#exp-json', 'click', async () => {
      if (await UI.confirm('Unencrypted export', 'This file will contain <strong>readable clinical data</strong>. Store it only on an encrypted volume and delete it after use.', 'Export unencrypted')) {
        UI.download(`casecompass-export-${UI.today()}.json`, S().exportJSON(), 'application/json');
      }
    });
    view().querySelector('#imp-file').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const text = await f.text();
      try {
        const parsed = JSON.parse(text);
        if (parsed.kind === 'encrypted-backup') {
          if (await UI.confirm('Restore encrypted backup', 'This replaces the data on this device with the backup, then locks the app. Unlock with the backup’s passphrase.', 'Restore')) {
            S().importEncrypted(text);
          }
        } else if (parsed.db) {
          if (await UI.confirm('Import JSON export', 'This replaces all current data with the imported export. Continue?', 'Import')) {
            S().importJSON(text); UI.toast('Data imported'); V.route();
          }
        } else UI.toast('Unrecognized file', true);
      } catch { UI.toast('Could not read that file', true); }
    });
    on('#erase-all', 'click', async () => {
      if (await UI.confirm('Erase all data', 'Permanently delete <strong>every client, note, plan, and setting</strong> from this device? Export a backup first if in doubt. This cannot be undone.', 'Erase everything', true)) {
        S().eraseAll();
      }
    });
  };

  /* ============================================================
     router
     ============================================================ */
  V.route = () => {
    if (S().locked) return;
    const hash = location.hash.replace(/^#\/?/, '') || 'clients';
    const [path, query] = hash.split('?');
    const params = new URLSearchParams(query || '');
    const parts = path.split('/').filter(Boolean);

    /* client-first: old tool-first routes land on Choose Client */
    const redirects = { dap: 'clients', plans: 'clients', profiles: 'clients', formulation: 'clients', safety: 'clients', assessments: 'clients', dashboard: 'practice' };
    if (redirects[parts[0]]) { location.hash = '#/' + redirects[parts[0]]; return; }

    const routes = {
      clients: () => V.clients(params),
      practice: () => V.dashboard(),
      interventions: () => V.interventionsLibrary(),
      risk: () => V.riskTracking(),
      knowledge: () => V.knowledge(params),
      settings: () => V.settings(),
    };

    if (parts[0] === 'client' && parts[1]) {
      const c = S().client(parts[1]);
      const tab = TABS.some(t => t[0] === parts[2]) ? parts[2] : 'overview';
      V.renderNav(c, tab);
      V.client(parts[1], parts[2]);
    } else {
      const key = routes[parts[0]] ? parts[0] : 'clients';
      V.renderNav(null, key === 'risk' ? 'practice' : key === 'interventions' ? 'knowledge' : key);
      routes[key]();
    }
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarScrim').hidden = true;
  };
})();
