# TubeScribe Chrome Extension

Side panel extension that reads captions directly from YouTube (no Apify) and saves transcripts through your Vercel API.

## Setup

1. Copy env file and set your values:

   ```bash
   cp .env.extension.example .env.extension
   ```

   Set `VITE_TRANSCRIPT_API` to your Vercel URL, e.g.  
   `https://yt-transcript-virid-seven.vercel.app/api/transcript`

   Use the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as the web app.

2. Build:

   ```bash
   npm run build:extension
   ```

3. Load in Chrome:

   - Open `chrome://extensions`
   - Enable **Developer mode**
   - **Load unpacked** → select the `dist-extension` folder

4. Use on YouTube:

   - Open any `youtube.com/watch` or Shorts page
   - Click the TubeScribe extension icon → side panel opens
   - Log in → **Generate transcript**

## Supabase auth redirect

After loading the unpacked extension, copy its ID from `chrome://extensions` and add this redirect URL in Supabase → Authentication → URL configuration:

```
chrome-extension://YOUR_EXTENSION_ID/
```

## Features

- Captions fetched in the extension service worker (YouTube `youtubeCaptions` path)
- Transcript saved via `POST /api/transcript` with `clientTranscript`
- AI summary via `/api/summary`
- History, favorites, settings, copy/export
- Click a timestamp → seeks the YouTube tab video and scrolls the player into view
- Toggle between timestamped lines and single-paragraph view

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `supabaseUrl is required` on summary | Redeploy Vercel after pulling latest `api/summary.js` fix |
| Generate fails / no API | Set `VITE_TRANSCRIPT_API` in `.env.extension` and rebuild |
| No captions | Video may have no captions; try another video |
| Seek does not work | Reload the YouTube tab after installing/updating the extension |
