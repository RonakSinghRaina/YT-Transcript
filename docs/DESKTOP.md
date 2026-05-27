# TubeScribe Windows desktop app

The desktop app is the same React UI as the website, packaged with Electron. Transcript and summary requests go to your **Vercel API** (cloud keys stay on Vercel, not in the installer).

## Prerequisites

1. **Vercel** — Deploy this repo with server env vars (`APIFY_TOKEN`, `SUPABASE_*`, `GEMINI_API_KEY`, etc.).
2. **Supabase auth URLs** — In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL configuration**:
   - **Site URL**: can stay your GitHub Pages URL.
   - **Redirect URLs** — add all of:
     - `http://127.0.0.1:5173/**` (desktop dev with Vite)
     - `http://127.0.0.1:**/**` (desktop app static server uses a random port)
     - `https://ronaksinghraina.github.io/YT-Transcript/**` (web, if used)

   Supabase OAuth/email links must be allowed to return to the origin the app runs on.

## Build the installer (on Windows)

1. Copy env template:
   ```bash
   copy .env.desktop.example .env.desktop
   ```
2. Edit `.env.desktop`:
   - `VITE_TRANSCRIPT_API=https://YOUR-APP.vercel.app/api/transcript`
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build installer:
   ```bash
   npm run dist:win
   ```
5. Output: `release/TubeScribe Setup 0.1.0.exe` (version may vary).

Unsigned builds may show Windows SmartScreen — choose **More info** → **Run anyway**, or code-sign the installer later.

### Build troubleshooting (Windows)

- **`signAndEditExecutable: false`** is set in `package.json` so code signing does not require admin symlinks.
- If `dist:win` fails with **Cannot create symbolic link**, enable **Developer Mode** (Settings → System → For developers) or run the terminal as Administrator, then retry.
- If **`app.asar` is in use**, close all Electron/TubeScribe windows, delete the `release/` folder, and run `npm run dist:win` again.
- Test without an installer: after `npm run build:desktop`, run `npx electron .` (production UI uses the embedded static server).

## Development

```bash
npm run electron:dev
```

Starts Vite (`npm run dev`) and opens an Electron window at `http://127.0.0.1:5173` (uses local `/api` if `.env` is configured).

## Optional app icon

Place `build/icon.ico` (256×256) before `npm run dist:win` for a custom installer icon. If omitted, the default Electron icon is used.

## Architecture

| Component | Role |
|-----------|------|
| Electron | Native window |
| `electron/static-server.mjs` | Serves `dist/` at `http://127.0.0.1:<port>` |
| React `dist/` | UI (built with `npm run build:desktop`) |
| Vercel `/api/transcript`, `/api/summary` | Transcript + AI summary |
| Supabase | Auth, history, favorites |
