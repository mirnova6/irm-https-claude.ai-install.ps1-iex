# BLS Cockpit — EMDR Bilateral Stimulation

A therapist-controlled bilateral stimulation (BLS) cockpit for EMDR clinicians.
One static web page, no server, no account — it runs in any modern browser on
**Windows, Mac, iPhone/iPad, and Android**, and works offline once loaded.

> **For clinician use.** This is a stimulation delivery tool for use *within*
> EMDR therapy by a trained clinician. It is not a medical device and not a
> self-therapy app. There is deliberately no unsupervised client mode.

---

## Quick start

### Telehealth (screen-share) — recommended workflow
1. Open the app and click **Client window** (top right). A second, clean window
   opens showing only the moving dot — no controls, no client data.
2. In Zoom/Meet/Teams, share **that window only** (tick *"Share sound"* so the
   client hears the clock/tones).
3. Drive everything — start/stop, speed, direction, set length — from the main
   cockpit window, which stays private on your screen.
4. The client can say "stop" at any time and you press **Space**; the giant
   STOP button and tap-anywhere-to-stop also work in the client window itself
   for in-person use.

### In person
Click **Present** (or press `F`) to take the stimulus fullscreen on your own
device and turn the screen toward the client. Floating controls appear when you
move the mouse.

---

## Features

**Stimulation**
- Visual dot with smooth sinusoidal motion — horizontal, vertical, two
  diagonals, or random direction each pass
- Speed 10–120 passes/min, adjustable **live mid-set** without a restart
  (`↑`/`↓` keys or the +/− buttons)
- Sets by number of passes, by seconds, or continuous; optional 3/5-second
  lead-in countdown; automatic return-to-center at the end of a set
- Dot size, six colors + custom color, glow, or **upload your own icon**
- Background white / gray / black / custom color, or **upload an image** with a
  dim slider
- **Audio BLS**: grandfather-clock tick-tock, soft alternating tones, clicks, or
  chimes — panned hard left/right in sync with the dot (headphones recommended)
- **Tactile BLS**: vibration pulse on each pass on phones/tablets that support it
- Presets: *Slow grounding*, *Standard processing*, *High cognitive load*, plus
  save-your-own

**Clinical workflow**
- Instant stop for both therapist (Space/Esc/button) and client (tap or STOP)
- SUD (0–10) and VOC (1–7) check-in pop-up between sets, plus on-demand logging
- Set log with passes, speed, SUD/VOC and notes; SUD trend mini-chart
- Full Phase-3 assessment fields (target, image, NC, PC, VOC, emotion, SUD,
  body location) and an 8-phase protocol guide
- Safety prompts shown on every screen: orientation check, body check,
  present-time check, safe/calm place, breathing — all editable
- Emergency tab: editable grounding script (5-4-3-2-1), crisis plan, supports
- Export sessions as text or JSON, print a clean session report

**Privacy**
- Everything is stored **only in your browser** (localStorage) on your device.
  No account, no server, no analytics, no AI. Export and erase controls are in
  Settings. Use client initials rather than names.

---

## Hosting it (get your permanent link)

The app is pure static files, so any static host works. With GitHub Pages:

1. Merge this branch to `main` (or use the branch directly).
2. In the repository: **Settings → Pages → Source: Deploy from a branch**,
   pick the branch and `/ (root)`, save.
3. Your app appears at `https://<user>.github.io/<repo>/` in about a minute.
   Bookmark it, install it to your dock/home screen (it's a PWA), and it keeps
   working even if you're offline.

Note: on a free GitHub plan, Pages requires the repository to be **public**.
That's fine — the app contains no client data; all data stays in your browser.

## Local development

No build step. Serve the folder and open it:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

`vendor/motion.js` is the [motion](https://motion.dev) animation library
(vendored so the site stays fully self-contained). UI icons are inline SVG.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell — cockpit and client window (`#client`) |
| `styles.css` | Dark + light themes, stage, controls, print styles |
| `app.js` | BLS engine, Web-Audio synthesis, window sync, sessions |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support / installable PWA |
| `vendor/motion.js` | Motion animation library (UI micro-animations) |
