/* ============================================================
   CaseCompass — encrypted storage layer
   AES-256-GCM at rest; key derived from the clinician's
   passphrase via PBKDF2-SHA-256 (310k iterations). The key lives
   only in memory while unlocked. No network. localStorage only.
   ============================================================ */
'use strict';

(function () {
  const CC = window.CC;
  const LS_BLOB = 'cc.blob.v1';       // {salt, iv, ct} base64 — the encrypted database
  const LS_META = 'cc.meta.v1';       // non-sensitive prefs: theme, banner dismissed
  const KDF_ITERS = 310000;

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const b64 = {
    from(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); },
    to(str) { return Uint8Array.from(atob(str), c => c.charCodeAt(0)); },
  };

  async function deriveKey(pass, salt) {
    const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: KDF_ITERS, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
    );
  }

  const Store = CC.store = {
    db: null,            // decrypted database (in memory only)
    key: null,           // CryptoKey (in memory only)
    salt: null,
    locked: true,
    _saveTimer: null,
    _lockTimer: null,
    onLock: null,        // set by app.js

    exists() { return !!localStorage.getItem(LS_BLOB); },

    /* ---- non-sensitive meta prefs (theme etc.) ---- */
    meta(key, val) {
      let m = {};
      try { m = JSON.parse(localStorage.getItem(LS_META) || '{}'); } catch {}
      if (val === undefined) return m[key];
      m[key] = val;
      localStorage.setItem(LS_META, JSON.stringify(m));
    },

    /* ---- lifecycle ---- */
    async create(pass, clinicianName) {
      this.salt = crypto.getRandomValues(new Uint8Array(16));
      this.key = await deriveKey(pass, this.salt);
      this.db = Store.freshDb(clinicianName);
      this.locked = false;
      await this.persist();
      this.armAutoLock();
    },

    async unlock(pass) {
      const raw = localStorage.getItem(LS_BLOB);
      if (!raw) throw new Error('no-data');
      const blob = JSON.parse(raw);
      const salt = b64.to(blob.salt);
      const key = await deriveKey(pass, salt);
      let plain;
      try {
        plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.to(blob.iv) }, key, b64.to(blob.ct));
      } catch {
        throw new Error('bad-pass');
      }
      this.key = key;
      this.salt = salt;
      this.db = JSON.parse(dec.decode(plain));
      this.locked = false;
      this.migrate();
      this.armAutoLock();
    },

    lock() {
      this.db = null;
      this.key = null;
      this.locked = true;
      clearTimeout(this._saveTimer);
      clearTimeout(this._lockTimer);
      if (typeof this.onLock === 'function') this.onLock();
    },

    async persist() {
      if (this.locked || !this.key) return;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, enc.encode(JSON.stringify(this.db)));
      try {
        localStorage.setItem(LS_BLOB, JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256', iters: KDF_ITERS, salt: b64.from(this.salt), iv: b64.from(iv), ct: b64.from(ct) }));
      } catch (e) {
        alert('Could not save — browser storage is full. Export a backup, then remove old documents or notes.');
        throw e;
      }
    },

    save() {
      // debounce writes; every mutation path calls save()
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this.persist(), 250);
      this.armAutoLock();
    },

    async changePassphrase(newPass) {
      this.salt = crypto.getRandomValues(new Uint8Array(16));
      this.key = await deriveKey(newPass, this.salt);
      await this.persist();
    },

    eraseAll() {
      localStorage.removeItem(LS_BLOB);
      this.lock();
    },

    /* ---- auto-lock ---- */
    armAutoLock() {
      clearTimeout(this._lockTimer);
      if (this.locked) return;
      const mins = this.db?.settings?.autoLockMin ?? 5;
      if (mins > 0) this._lockTimer = setTimeout(() => this.lock(), mins * 60000);
    },

    /* ---- schema ---- */
    freshDb(clinicianName) {
      return {
        version: 1,
        createdAt: Date.now(),
        settings: {
          clinicianName: clinicianName || '',
          autoLockMin: 5,
          lockOnHide: false,
          bannerDismissed: false,
          ai: { mode: 'local', apiKey: '', model: 'claude-opus-4-8', warned: false },
          nci: { enabled: false, framework: '', levels: [1, 2, 3, 4].map(n => ({ key: 'NCI-' + n, definition: '', markers: '', scoring: '' })) },
        },
        clients: [],
      };
    },

    migrate() {
      const s = this.db.settings;
      if (!s.ai) s.ai = { mode: 'local', apiKey: '', model: 'claude-opus-4-8', warned: false };
      if (!s.nci) s.nci = { enabled: false, framework: '', levels: [1, 2, 3, 4].map(n => ({ key: 'NCI-' + n, definition: '', markers: '', scoring: '' })) };
      (this.db.clients || []).forEach(c => Store.migrateClient(c));
    },

    migrateClient(c) {
      c.diagnoses ||= []; c.medications ||= []; c.assessments ||= [];
      c.goals ||= []; c.formulations ||= []; c.dapNotes ||= []; c.treatmentPlans ||= [];
      c.profile ||= {}; c.interventions ||= []; c.safetyStrategies ||= [];
      c.documents ||= []; c.timeline ||= []; c.changeLog ||= [];
      c.riskFactors ||= []; c.protectiveFactors ||= []; c.themes ||= []; c.coreIssues ||= []; c.traumaThemes ||= [];
      c.nci ||= { scores: {}, notes: '' };
      return c;
    },

    /* ---- ids ---- */
    id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

    /* ---- clients ---- */
    clients() { return (this.db?.clients || []).filter(c => !c.archived); },

    client(id) { return (this.db?.clients || []).find(c => c.id === id) || null; },

    addClient(fields) {
      if (this.clients().length >= CC.MAX_CLIENTS) throw new Error('max-clients');
      const c = this.migrateClient({
        id: this.id(), createdAt: Date.now(), updatedAt: Date.now(), archived: false,
        initials: fields.initials || '??', name: fields.name || '', age: fields.age || '', pronouns: fields.pronouns || '',
        levelOfCare: fields.levelOfCare || '', presentingProblem: fields.presentingProblem || '',
        riskLevel: fields.riskLevel || 'low',
        attachmentStyle: fields.attachmentStyle || 'Unknown / assessing',
        motivationStage: fields.motivationStage || '',
        substanceUse: fields.substanceUse || '', safetyConcerns: '',
      });
      this.db.clients.push(c);
      this.logEvent(c, 'client', 'Client record created');
      this.save();
      return c;
    },

    deleteClient(id) {
      this.db.clients = this.db.clients.filter(c => c.id !== id);
      this.save();
    },

    touch(client) { client.updatedAt = Date.now(); this.save(); },

    /* ---- change tracking (never overwrite silently) ---- */
    logChange(client, field, label, oldValue, newValue, reason) {
      if ((oldValue || '') === (newValue || '')) return;
      client.changeLog.push({ id: this.id(), ts: Date.now(), field, label, oldValue: oldValue || '', newValue: newValue || '', reason: reason || '' });
      this.logEvent(client, 'change', label + ' updated');
      this.touch(client);
    },

    logEvent(client, type, summary) {
      client.timeline.push({ id: this.id(), ts: Date.now(), type, summary });
      if (client.timeline.length > 800) client.timeline.splice(0, client.timeline.length - 800);
    },

    /* ---- profile fields (versioned per field) ---- */
    setProfileField(client, key, text, reason) {
      const cur = client.profile[key];
      const oldText = cur?.text || '';
      if (oldText === text) return;
      const history = cur?.history || [];
      if (oldText) history.push({ ts: cur.updatedAt || Date.now(), text: oldText });
      client.profile[key] = { text, updatedAt: Date.now(), history: history.slice(-20) };
      const label = (CC.PROFILE_SCHEMA.find(f => f.key === key) || { label: key }).label;
      this.logChange(client, 'profile.' + key, label, oldText, text, reason);
    },

    /* ---- versioned artifacts (formulations, safety strategies) ---- */
    addFormulation(client, text, rationale, author) {
      const prev = client.formulations[client.formulations.length - 1] || null;
      const f = { id: this.id(), ts: Date.now(), text, rationale: rationale || '', author: author || 'clinician', supersedes: prev?.id || null };
      client.formulations.push(f);
      this.logEvent(client, 'formulation', prev ? 'Formulation updated' : 'Initial formulation recorded');
      if (prev) this.logChange(client, 'formulation', 'Case formulation', prev.text, text, rationale);
      else this.touch(client);
      return f;
    },

    /* ---- export / import ---- */
    exportJSON() {
      return JSON.stringify({ app: 'CaseCompass', exportedAt: new Date().toISOString(), warning: 'UNENCRYPTED EXPORT — contains clinical data. Store on an encrypted volume and delete after use.', db: this.db }, null, 2);
    },

    exportEncrypted() {
      // the at-rest blob is already ciphertext — wrap it as a portable backup
      const raw = localStorage.getItem(LS_BLOB);
      return JSON.stringify({ app: 'CaseCompass', kind: 'encrypted-backup', exportedAt: new Date().toISOString(), note: 'Restore from the lock screen with the same passphrase.', blob: JSON.parse(raw) }, null, 2);
    },

    importEncrypted(text) {
      const parsed = JSON.parse(text);
      if (parsed.kind !== 'encrypted-backup' || !parsed.blob?.ct) throw new Error('not-a-backup');
      localStorage.setItem(LS_BLOB, JSON.stringify(parsed.blob));
      this.lock();
    },

    importJSON(text) {
      const parsed = JSON.parse(text);
      if (!parsed.db?.clients) throw new Error('not-an-export');
      this.db = parsed.db;
      this.migrate();
      this.save();
    },
  };

  /* activity listeners re-arm the auto-lock timer */
  ['pointerdown', 'keydown'].forEach(ev =>
    document.addEventListener(ev, () => { if (!Store.locked) Store.armAutoLock(); }, { passive: true })
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !Store.locked && Store.db?.settings?.lockOnHide) Store.lock();
  });
})();
