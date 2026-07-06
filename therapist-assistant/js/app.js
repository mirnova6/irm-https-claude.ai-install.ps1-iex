/* ============================================================
   CaseCompass — bootstrap: lock screen, theme, nav, search.
   ============================================================ */
'use strict';

(function () {
  const CC = window.CC;
  const S = CC.store, UI = CC.ui, V = CC.views;
  const $ = (id) => document.getElementById(id);

  /* ---------------- theme ---------------- */
  const applyTheme = () => {
    const pref = S.meta('theme');
    const dark = pref ? pref === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.toggleAttribute('data-theme', false);
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  };
  applyTheme();
  $('btnTheme').addEventListener('click', () => {
    const nowDark = document.documentElement.getAttribute('data-theme') === 'dark';
    S.meta('theme', nowDark ? 'light' : 'dark');
    applyTheme();
  });

  /* ---------------- lock screen flow ---------------- */
  const lockScreen = $('lockScreen'), app = $('app');
  const setupForm = $('setupForm'), unlockForm = $('unlockForm');

  const showLock = () => {
    app.hidden = true; lockScreen.hidden = false;
    const has = S.exists();
    setupForm.hidden = has; unlockForm.hidden = !has;
    $('unlockError').hidden = true;
    $(has ? 'unlockPass' : 'setupName').focus();
    if (has) $('unlockPass').value = '';
  };

  const showApp = () => {
    lockScreen.hidden = true; app.hidden = false;
    $('draftBanner').hidden = !!S.db.settings.bannerDismissed;
    $('aiModePill').textContent = S.db.settings.ai.mode === 'api' ? 'Online polish enabled' : 'Local-only mode';
    V.route();
  };

  S.onLock = showLock;

  /* passphrase strength meter */
  const strength = $('passStrength');
  $('setupPass').addEventListener('input', (e) => {
    const p = e.target.value;
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
    const colors = ['var(--critical)', 'var(--serious)', 'var(--warn)', 'var(--ok)', 'var(--ok)'];
    const widths = [10, 30, 55, 80, 100];
    strength.innerHTML = `<span style="width:${widths[score]}%;background:${colors[score]}"></span>`;
  });

  setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const p1 = $('setupPass').value, p2 = $('setupPass2').value;
    if (p1.length < 8) { UI.toast('Use at least 8 characters', true); return; }
    if (p1 !== p2) { UI.toast('Passphrases do not match', true); return; }
    const btn = setupForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await S.create(p1, $('setupName').value.trim());
      showApp();
      UI.toast('Encrypted workspace created');
    } finally { btn.disabled = false; }
  });

  unlockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = unlockForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await S.unlock($('unlockPass').value);
      showApp();
    } catch {
      const err = $('unlockError');
      err.textContent = 'That passphrase didn’t work. Passphrases are case-sensitive.';
      err.hidden = false;
      $('unlockPass').select();
    } finally { btn.disabled = false; }
  });

  $('btnForgot').addEventListener('click', async () => {
    const ok = await UI.confirm('Forgot passphrase',
      'The passphrase cannot be recovered — that is what makes the encryption real. Your options:<br><br>1) Try variants (case, spacing).<br>2) Restore an encrypted backup whose passphrase you know (Settings → after unlock).<br>3) <strong>Erase everything</strong> and start fresh.<br><br>Erase all data on this device now?',
      'Erase all data', true);
    if (ok) { S.eraseAll(); showLock(); UI.toast('Data erased'); }
  });

  $('btnLock').addEventListener('click', () => S.lock());
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') { e.preventDefault(); if (!S.locked) S.lock(); }
    if (e.key === '/' && !S.locked && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault(); $('globalSearch').focus();
    }
  });

  /* ---------------- draft banner ---------------- */
  $('btnDismissBanner').addEventListener('click', () => {
    S.db.settings.bannerDismissed = true; S.save();
    $('draftBanner').hidden = true;
  });

  /* ---------------- sidebar (mobile) ---------------- */
  const sidebar = $('sidebar'), scrim = $('sidebarScrim');
  $('btnSidebarOpen').addEventListener('click', () => { sidebar.classList.add('open'); scrim.hidden = false; });
  const closeNav = () => { sidebar.classList.remove('open'); scrim.hidden = true; };
  $('btnSidebarClose').addEventListener('click', closeNav);
  scrim.addEventListener('click', closeNav);

  /* ---------------- global search ---------------- */
  const searchInput = $('globalSearch'), results = $('searchResults');
  const doSearch = () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q || S.locked) { results.hidden = true; return; }
    const out = [];
    S.clients().forEach(c => {
      if ((c.initials + ' ' + (c.name || '')).toLowerCase().includes(q)) {
        out.push({ kind: 'Client', label: c.initials + (c.name ? ' — ' + c.name : ''), href: '#/client/' + c.id });
      }
    });
    CC.KNOWLEDGE.forEach(k => {
      if (k.title.toLowerCase().includes(q) || k.tags.some(t => t.includes(q))) {
        out.push({ kind: 'Knowledge', label: k.title, href: '#/knowledge?q=' + encodeURIComponent(k.title) });
      }
    });
    CC.INTERVENTIONS.forEach(iv => {
      if (iv.name.toLowerCase().includes(q)) out.push({ kind: 'Intervention', label: iv.name, href: '#/interventions' });
    });
    results.innerHTML = out.slice(0, 10).map(r => `<a href="${r.href}"><span class="sr-kind">${r.kind}</span>${UI.esc(r.label)}</a>`).join('') || '<a><span class="sr-kind">No results</span></a>';
    results.hidden = false;
  };
  searchInput.addEventListener('input', doSearch);
  searchInput.addEventListener('focus', doSearch);
  document.addEventListener('click', (e) => { if (!e.target.closest('.topbar-search')) results.hidden = true; });
  results.addEventListener('click', () => { results.hidden = true; searchInput.value = ''; });

  /* ---------------- routing ---------------- */
  window.addEventListener('hashchange', () => { if (!S.locked) V.route(); });

  /* ---------------- service worker ---------------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  /* ---------------- boot ---------------- */
  showLock();
})();
