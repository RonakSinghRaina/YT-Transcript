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
APIFY_TRANSCRIPT_METHOD=captions
APIFY_PREFERRED_LANGUAGE=en
```

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

## Deploying to GitHub Pages

The live site is at `https://ronaksinghraina.github.io/YT-Transcript/`.

**Important:** GitHub Pages only hosts static files. The workflow in `.github/workflows/deploy-pages.yml` builds the Vite app and deploys the `dist/` folder (not raw source).

### One-time GitHub setup

1. Repo → **Settings** → **Pages** → **Build and deployment**
2. Set **Source** to **GitHub Actions** (not “Deploy from branch” on the repo root).
3. Repo → **Settings** → **Secrets and variables** → **Actions** → add:

| Secret | Value |
|--------|--------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_TRANSCRIPT_API` | Optional. Apify API URL on Vercel, e.g. `https://your-app.vercel.app/api/transcript`. If omitted, the app uses your Supabase edge function. |

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
