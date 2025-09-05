Deployment (Vercel MVP)

Fast path to deploy this app on Vercel.

1) Provision a hosted Postgres DB
   - Recommended: Vercel Postgres (or Neon).
   - Copy the connection string into `DATABASE_URL`.

2) Set Vercel Environment Variables
   Required (Server only):
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REDIRECT_URI` → `https://<your-app>.vercel.app/api/auth/spotify/callback`
   - `DATABASE_URL` → Postgres connection string

   Optional (Server):
   - `QUIZ_TKO_TRACK_ID` (default baked in)
   - `QUIZ_TKO_TRACK_WINDOW_MINUTES` (default 10)
   - `QUIZ_TKO_ALBUM_ID` (default baked in)

   Client (NEXT_PUBLIC_*):
   - `NEXT_PUBLIC_OFFICIAL_COVER` (e.g. `official-cover.jpg`)
   - `NEXT_PUBLIC_FEATURE_PODCASTS` (e.g. `-1` to hide)
   - `NEXT_PUBLIC_QUIZ_TKO_TRACK_ID`
   - `NEXT_PUBLIC_QUIZ_TKO_ALBUM_ID`
   - `NEXT_PUBLIC_OFFICIAL_IVE_PLAYLIST_ID`

3) Update Spotify Dashboard Redirect
   - Add the exact URI: `https://<your-app>.vercel.app/api/auth/spotify/callback`.
   - (Optional) Add a stable staging domain and a matching callback if you want OAuth on preview.

4) Build on Vercel
   - This repo is already configured for fast deploys:
     - `prisma/schema.prisma` uses `postgresql` provider.
     - `package.json` build: `prisma db push && next build` to sync schema quickly.
   - Node 20+ is recommended in Vercel project settings.

5) Smoke test
   - Connect Spotify.
   - Run missions 1, 2, 3, 6, 8 and verify completions.
   - Verify cover upload (can take a few minutes to show in Spotify clients).

Local development notes
   - Local now expects Postgres (`postgresql` provider). If you prefer SQLite locally, you can revert the provider during dev and use `DATABASE_URL="file:./dev.db"`, then switch back before deploy, but sticking to Postgres everywhere is simplest.
