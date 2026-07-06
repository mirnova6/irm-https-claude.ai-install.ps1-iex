# CaseCompass — Therapist Assistant

A professional, HIPAA-conscious assistant for licensed clinicians: client dashboards,
DAP notes, master treatment plans, case formulation with visual change tracking,
intervention matching, safety & rapport strategy, assessments, risk tracking, and a
searchable clinical knowledge base — for up to **50 clients**, entirely on your device.

One static web app, no server, no account. Runs in any modern browser on
**Windows, macOS, iPhone/iPad, and Android**, works fully offline once loaded, and
installs as an app (PWA).

> **It assists the therapist — it does not replace the therapist.** Everything the
> assistant generates is a clearly labeled *draft or hypothesis for licensed-clinician
> review*. It never makes diagnoses and never substitutes for clinical judgment,
> supervision, or crisis protocols.

---

## Quick start

1. Open the app and create your encrypted workspace with a passphrase
   (**it cannot be recovered** — store it in a password manager).
2. Add a client (initials are enough to start).
3. Work in the client's tabs: paste rough session notes → generate a DAP draft →
   edit → save. Generate a master treatment plan. Build the 31-domain profile over time.

## Features

**Client dashboard (per client)** — demographics, diagnoses/impressions, medications,
level of care, presenting problem, risk level, assessment scores, goals with progress,
current formulation, recent notes, themes, core issues, attachment hypothesis, trauma
themes, substance-use patterns, safety concerns, recommended interventions, and change
history — updating as the record grows.

**DAP note generator** — feed it transcripts, rough notes, bullets, or dictated text
plus structured fields (mood, affect, quotes, interventions, risk, homework). Produces
polished, editable Data / Assessment / Plan drafts in nine styles: Standard, Brief,
Highly detailed, Insurance-friendly, Residential, Substance-use, Trauma-informed,
Psychodynamic, CBT/DBT. Session content is screened for risk language (SI, self-harm,
harm-to-others, relapse, mandated-reporting, IPV) and every flag pairs with a protocol
reminder.

**Master treatment plan generator** — a holistic plan built from everything on file:
(A) clinical identity formulation organized around *"what happened to this person, how
did they adapt, and what does that adaptation now cost them"*, (B) ranked hierarchy of
needs (safety first), (C) evidenced-by paragraph, (D) short/long-term goal plan, and
(E) 4–5 measurable objective/plan pairs that import as trackable goals.

**Holistic client profile** — a living psychological "resume" across 31 domains
(presenting problem → subjective distress → triggers → core fears/beliefs → attachment
→ family system → trauma → defenses → regulation → shame map → values → strengths →
substance use → risk/protective factors → mental status → culture → personality →
motivation → secondary gains → unmet needs → repetition patterns → therapeutic
relationship clues). Every field is versioned with per-field history.

**Longitudinal memory & change tracking** — nothing important is overwritten.
Formulations, risk levels, and profile fields are versioned; changes render as
**old (red) → arrow → updated (green)** with a recorded *why it changed* rationale,
timestamps, and a full audit trail per client.

**Best-interventions matcher** — 23-entry library (MI, CBT, DBT, ACT, psychodynamic,
attachment-based, trauma stabilization, EMDR prep, relapse prevention, parts work,
somatic grounding, shame resilience, behavioral activation, safety planning, grief,
values, boundaries, interpersonal effectiveness, and more), scored against the client's
diagnoses, attachment, stage of change, risk, and profile — each with *why it fits,
how to use it, what to avoid, signs it's working, signs of not-ready*.

**Safety, trust & rapport strategy** — per-client guidance (tone, pacing, validation,
tolerable confrontation, rupture repair, what to avoid saying) driven by attachment
style playbooks plus trauma, shame, regulation, and cultural data on file.

**Assessments** — PHQ-9, GAD-7, PCL-5, AUDIT, DAST-10, BAM-R, C-SSRS, ACE, ORS, SRS
with standard interpretation bands, trend charts, and instrument guidance.

**Clinical knowledge base** — searchable working answers: score meanings, next-session
triage, documentation phrasing ("how do I write this clinically"), plain-language
psychoeducation scripts, formulation method and blind spots, risk protocol, mandated
reporting and consent reminders, stages-of-change matching, model cheat-sheets.

**Profiling frameworks (optional, clinician-provided)** — for NCI / Behavior-Ops-style
work the app never invents proprietary definitions; you enter *your own* rubric in
Settings and the profile gains structured scoring fields, framed in clinical, ethical,
non-manipulative language.

## Security & privacy model

- **Local-first**: all client data lives in this browser, encrypted at rest with
  **AES-256-GCM**; the key is derived from your passphrase (PBKDF2-SHA-256, 310k
  iterations) and held only in memory while unlocked.
- **Auto-lock** after configurable inactivity (default 5 min), optional lock-on-hide,
  manual lock (Ctrl/Cmd+L). Lost passphrases are unrecoverable by design.
- **No network by default.** Offline mode is the default and complete: nothing is
  transmitted anywhere.
- **Optional online AI polish**: bring your own Anthropic API key to add
  "Polish with Claude" buttons. The app warns before *every* send that PHI would leave
  the device, and Settings spells out the compliance requirements (BAA where required,
  consent, organizational approval).
- **Export / import / erase**: encrypted backups (restore with the same passphrase),
  unencrypted JSON export (with warnings), print/PDF and copy-ready clinical text for
  notes, plans, profiles, and strategies. One-click erase of everything.
- **Honest compliance framing**: the app *supports* HIPAA-conscious practice
  (encryption, access control, audit-style change logs, local processing) but no tool
  can make a practice HIPAA-compliant by itself — that lives in your policies, BAAs,
  device security, and legal review. Use initials, enable OS full-disk encryption, and
  protect exports.

## Hosting / installing

Pure static files — any static host works (GitHub Pages included). Serve the folder
and open it:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Install to your dock/home screen from the browser menu (it's a PWA and keeps working
offline). Note: hosting the app publicly is safe in itself — the repository and pages
contain **no client data**; all records stay in each clinician's own browser.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell, icon sprite, lock screen |
| `styles.css` | Clinical design system, light + dark themes, print styles |
| `js/data.js` | Clinical reference: profile schema, assessments, interventions, knowledge base |
| `js/store.js` | Encrypted storage (AES-GCM/PBKDF2), versioning, change log, import/export |
| `js/engine.js` | Drafting engine: DAP, treatment plans, formulations, matching, risk scanner |
| `js/ui.js` | Components: modals, toasts, diff blocks, trend charts |
| `js/views.js` | All twelve sections + twelve client tabs |
| `js/app.js` | Boot, lock flow, theme, search, routing |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support / installable PWA |

## Scope & disclaimer

CaseCompass is a documentation and clinical-reasoning aid for licensed professionals.
It is not a medical device, not an EHR of record unless your policies designate it,
not an emergency tool, and not a substitute for supervision or consultation. Crisis
resources (US): call/text **988**, text **HOME to 741741**, or call **911**.
