# Alter — run it locally

This is your Alter app, stripped of every Manus-specific piece (their private
build plugins, debug collectors, hosted assets) so it runs as a completely
ordinary Vite + React project on your own machine. Nothing about the app
itself changed — same food/product recommendation logic, same pages, same
fixes for the mode-switching crash.

## What was removed / changed for local use

- **Manus build plugins** (`vite-plugin-manus-runtime`, the debug-log
  collector, the storage proxy) — these are private packages only available
  inside Manus's environment. Removed from `vite.config.ts` entirely.
- **Unused scaffold code** — the project template included a large pile of
  shadcn/radix UI components, `pages/Home.tsx`, `contexts/`, `hooks/`, etc.
  None of it was ever imported by the actual app (`App.tsx` is a single
  self-contained file), so it's been deleted along with the matching
  dependencies in `package.json`. This makes `npm install` much faster and
  the dependency tree much easier to reason about.
- **The three images** hosted on `/manus-storage/...` — those URLs only
  resolve inside a live Manus deployment. They now point to
  [Lorem Picsum](https://picsum.photos) placeholder photos (hero + food
  images) and a small local SVG (`client/public/logo.svg`) for the brand
  mark/favicon. Swap in your own images anytime — see below.
- **The Express static server** — it existed only to serve the production
  build in Manus's deployment environment. For local use, `vite preview`
  does the same job with zero extra dependencies, so it's been removed.

## Requirements

- [Node.js](https://nodejs.org) 18 or newer (20 LTS recommended)
- npm (comes with Node)

## Run it

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**.

## Other useful commands

```bash
npm run build     # production build -> dist/
npm run preview   # serve the production build locally, for a final check
npm run check     # TypeScript type-check, no output = no errors
```

## Swapping in your own images

Open `client/src/App.tsx` and edit these three lines near the top:

```ts
const heroImage = "https://picsum.photos/seed/alter-hero/1200/900";
const foodImage = "https://picsum.photos/seed/alter-food/1000/900";
const brandMark = "/logo.svg";
```

Drop any image file into `client/public/` (e.g. `client/public/hero.jpg`)
and point the constant at `/hero.jpg`.

## Where things live

```
client/
  index.html          entry HTML
  public/              static assets (logo.svg lives here)
  src/
    main.tsx            React root
    App.tsx              the entire app: routing, pages, UI
    index.css            Tailwind v4 + design tokens
    lib/engine.ts        recommendation/scoring logic (pure functions, no UI)
    data/foods.json      food dataset
    data/products.json   product dataset
vite.config.ts
package.json
tsconfig.json
```

Everything is plain, ordinary React/TypeScript — no Manus-specific APIs
remain anywhere in the app logic. You can deploy this `dist/` output
(after `npm run build`) to any static host (Vercel, Netlify, GitHub Pages,
your own server, etc.).
