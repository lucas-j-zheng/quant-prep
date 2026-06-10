# Quant Prep — Offline-First Interview Study PWA

A fast, minimal, **offline-first** Progressive Web App for drilling
quantitative-finance interview material on your phone. Install it to your home
screen and study with **zero internet** after the first load.

- **185 problems** across Probability, Brainteasers, Discrete Math, Statistics,
  Finance, Machine Learning, Data Wrangling, and Algorithmic Programming — each
  with a full worked solution, and many with multiple labelled approaches.
- **A comprehensive, teach-from-scratch lesson for every chapter** (concepts,
  intuition, KaTeX-rendered formulas, worked examples, and common pitfalls).
- **Concept-based sections** — within each chapter, problems are grouped by the
  idea they test (e.g. Counting, Conditional Probability & Bayes, Expectation,
  Variance/Covariance, Recursion & States), each with its own focused lesson.
- **Two progress signals per section** — **READ** (manual check-off) and
  **SOLVED** (auto-set once every problem in the section is solved). Progress is
  stored locally in IndexedDB and survives reload / offline.
- Formulas render with **KaTeX**; content ships as a static, precached
  `content.json` (no backend).

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | React 18 + Vite 6 |
| PWA / service worker | `vite-plugin-pwa` (Workbox) |
| Styling | Tailwind CSS 3 |
| Type | Fraunces (display), Hanken Grotesk (body), JetBrains Mono (numbers) — self-hosted |
| Math | KaTeX |
| Local storage | IndexedDB via `idb` |
| Routing | `react-router-dom` (HashRouter — works on any static host) |

`npm audit` → 0 vulnerabilities.

---

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build + preview (what gets deployed):

```bash
npm run build      # outputs dist/ (app shell + content.json + service worker)
npm run preview    # serves dist/ locally
```

To test **offline**: `npm run preview`, load once, then go offline and reload —
the app and all content still work (the service worker precached everything).

---

## Deploy

The app is fully static — host `dist/` anywhere with HTTPS.

### GitHub Pages
A workflow at `.github/workflows/deploy.yml` builds and deploys on every push to
`main`. Enable it once: **Settings → Pages → Build and deployment → Source:
GitHub Actions.** The site publishes at `https://<user>.github.io/<repo>/`.

### Netlify / Vercel
- Build command: `npm run build`
- Publish directory: `dist`

For a host that serves from a sub-path (GitHub Pages project sites), build with a
matching base path: `BASE_PATH=/<repo>/ npm run build` (wired through
`vite.config.js`). For domain-root hosts the default `/` is correct.

---

## Add to Home Screen (iPhone)

1. Open the site in **Safari**, tap **Share → Add to Home Screen → Add**
   (keep **Open as Web App** enabled).
2. Launch from the icon — it opens full-screen and works offline from then on.

---

## Project layout

```
src/
  main.jsx, App.jsx          # entry + routes + content provider
  content/loadContent.js     # loads & indexes content.json
  db/progress.js             # IndexedDB: READ + auto-SOLVED signals
  components/                # Markdown(+KaTeX, code blocks, tables), ProgressRing, ui
  pages/                     # Home, Lesson, Section, Problem
public/
  content.json              # the bundled question bank + lessons
  icons/, manifest, favicon
```
