# Transcript Studio

A one-page React app for generating YouTube transcripts with Supabase auth/history and Apify extraction.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` into `.env` and fill in the values:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
APIFY_TOKEN=
APIFY_ACTOR_ID=prodiger/youtube-transcript-scraper---transcriber
APIFY_TRANSCRIPT_METHOD=auto
APIFY_PREFERRED_LANGUAGE=en
OPENAI_API_KEY=
```

`auto` uses YouTube captions when available, then Whisper when `OPENAI_API_KEY` is set. Without OpenAI, videos with no captions show a clear error instead of raw `no-captions`.

The Supabase anon key is safe to use in browser code when row-level security is enabled. Keep `APIFY_TOKEN` server-only in Vercel environment variables.

3. In Supabase, run `supabase.schema.sql` in the SQL editor.

4. Run locally:

```bash
npm run dev
```

`npm run dev` serves the React app and the `/api/transcript` route together (Apify extraction). Share links like `https://youtu.be/VIDEO_ID?si=...` are normalized automatically.

For the standalone `preview.html` server:

```bash
node preview-server.cjs
```

Then open `http://127.0.0.1:8080/`.

## Windows desktop app

Installable `.exe` via Electron (UI local, API on Vercel). See **[docs/DESKTOP.md](docs/DESKTOP.md)** for full steps.

```bash
copy .env.desktop.example .env.desktop
# Edit .env.desktop — set VITE_TRANSCRIPT_API to your Vercel URL
npm install
npm run dist:win
```

Dev with Electron + Vite: `npm run electron:dev`

## Chrome extension

Side panel on YouTube — captions fetched directly from YouTube (no Apify). See **[docs/EXTENSION.md](docs/EXTENSION.md)**.

```bash
copy .env.extension.example .env.extension
# Set VITE_TRANSCRIPT_API and Supabase keys
npm run build:extension
```

Load `dist-extension` as an unpacked extension in `chrome://extensions`.

## Deploying to GitHub Pages

The live site is at `https://ronaksinghraina.github.io/YT-Transcript/`.

**Important:** GitHub Pages only hosts static files. The workflow in `.github/workflows/deploy-pages.yml` builds the Vite app and deploys the `dist/` folder (not raw source).

### One-time GitHub setup (required — fixes blank page)

Your site was blank because GitHub Pages published **raw source** (`index.html` loading `/src/main.jsx`) instead of the Vite build. Two deploy workflows can run at once; the wrong one wins if this step is skipped.

1. Open [Pages settings](https://github.com/RonakSinghRaina/YT-Transcript/settings/pages)
2. **Source** can be **GitHub Actions** (recommended) or **Deploy from a branch** → `main` → **`/` (root)**.  
   The workflow commits the built `index.html` and `assets/` to the repo root on every push, so the deploy link in Actions always serves the real app.

3. Wait for the latest workflow run to finish (green).
4. Hard-refresh the site (`Ctrl+Shift+R`). View source should show `/YT-Transcript/assets/...js`, not `/src/main.jsx`.
3. Repo → **Settings** → **Secrets and variables** → **Actions** → add:

| Secret | Value |
|--------|--------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_TRANSCRIPT_API` | **Required for Generate on GitHub Pages.** Your Vercel API URL, e.g. `https://your-app.vercel.app/api/transcript` (no trailing slash). |

### GitHub Pages + Vercel API (fixes 405 on Generate)

GitHub Pages only hosts the React UI. Transcript generation runs on **Vercel** (same repo):

1. Sign in at [vercel.com](https://vercel.com) → **Add New Project** → import `YT-Transcript`.
2. Add environment variables (same as local `.env` server keys): `APIFY_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, etc. (not `VITE_*` only — add both `VITE_` and non-prefixed for server).
3. Deploy. Copy your deployment URL, e.g. `https://yt-transcript-abc.vercel.app`.
4. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → set `VITE_TRANSCRIPT_API` to `https://yt-transcript-abc.vercel.app/api/transcript`.
5. Push to `main` (or re-run **Deploy to GitHub Pages** workflow).

Local dev still uses `npm run dev` (`/api/transcript` on the Vite server).

4. Push to `main`. The **Deploy to GitHub Pages** workflow runs automatically.

### Test the production build locally

```bash
npm run build:pages
npm run preview:pages
```

Open `http://localhost:4173/YT-Transcript/`.

## Deploying to Vercel

Add these Vercel environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APIFY_TOKEN`
- `APIFY_ACTOR_ID`
- `APIFY_TRANSCRIPT_METHOD`
- `APIFY_PREFERRED_LANGUAGE`

The app uses `prodiger/youtube-transcript-scraper---transcriber` by default because it supports standard URLs, share links, embed links, Shorts links, bare video IDs, captions-first extraction, and a low-cost captions path.
