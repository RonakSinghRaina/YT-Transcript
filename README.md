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
