Understood — here’s the entire instruction set in one single copy-and-paste-ready Markdown file, with no splits. Paste this once into your repo (e.g., claude-tasks.md) and Claude Code should follow it step by step. I’ve made it machine-readable and clearly sequenced.

⸻


# Claude Code Task List — Build K-pop Duolingo Spotify Missions MVP

**Prerequisite:** `mission.md` is present in the project root and defines API specs, endpoints, models, and workflows.

Claude Code, follow these instructions **exactly** to produce a fully working user-facing MVP, enabling fans to connect Spotify, pick an idol’s recent release, and complete three missions: Play Verification, Add to Playlist, Save to Library.

---

## Task 0: Project Scaffold

1. Initialize **Next.js (App Router) + TypeScript** project.
2. Install dependencies:
   - `prisma`, `@prisma/client`
   - `dotenv`, `axios` (or `undici`)
   - `jsonwebtoken`, `zod`
3. Create `.env.local`:

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
DATABASE_URL=“file:./dev.db”
JWT_SECRET=change_me

4. Create file tree:

/app
page.tsx
/auth/spotify/login/route.ts
/auth/spotify/callback/route.ts
/search/route.ts
/missions/execute/route.ts
/me/recently-played/route.ts
/me/playlists/route.ts
/playlists/[playlistId]/items/route.ts
/me/tracks/route.ts
/me/albums/route.ts
/campaign/page.tsx
/me/page.tsx
/lib/spotify.ts
/lib/db.ts
mission.md

---

## Task 1: Database Schema via Prisma

Create `prisma/schema.prisma` with the following models. Then run `npx prisma migrate dev`.

```prisma
model User {
id            String   @id @default(cuid())
email         String?  @unique
createdAt     DateTime @default(now())
tokens        OAuthToken[]
completions   MissionCompletion[]
}

model OAuthToken {
id           String   @id @default(cuid())
userId       String
provider     String
accessToken  String
refreshToken String
scope        String
expiresAt    DateTime
user         User     @relation(fields: [userId], references: [id])
}

model AdminCampaign {
id            String   @id @default(cuid())
idol          String
releaseName   String?
targetTrackId String?
targetAlbumId String?
createdAt     DateTime @default(now())
}

enum MissionType {
PLAY_VERIFY
ADD_TO_PLAYLIST
SAVE_TRACK
SAVE_ALBUM
}

model Mission {
id               String      @id @default(cuid())
type             MissionType
targetSpotifyId  String
active           Boolean     @default(true)
windowHours      Int         @default(24)
createdAt        DateTime    @default(now())
updatedAt        DateTime    @updatedAt
}

enum CompletionStatus {
SUCCESS
FAILED
}

model MissionCompletion {
id          String            @id @default(cuid())
userId      String
missionId   String
status      CompletionStatus
details     Json
createdAt   DateTime          @default(now())
user        User              @relation(fields: [userId], references: [id])
}


⸻

Task 2: Spotify OAuth Integration (Server)
	•	Implement GET /api/auth/spotify/login:
	•	Redirect to Spotify OAuth with scopes:
	•	user-read-recently-played
	•	playlist-modify-public
	•	playlist-modify-private
	•	user-library-modify
	•	ugc-image-upload
	•	user-follow-modify
	•	(optional) playlist-read-private, user-library-read, user-follow-read
	•	Implement GET /api/auth/spotify/callback:
	•	Exchange code for access & refresh tokens.
	•	Save in OAuthToken table.
	•	Calculate and store expiresAt.
	•	Create token refresh helper in lib/spotify.ts:
	•	Fetch fresh token if Date.now() > expiresAt - 60_000.

⸻

Task 3: Search & Campaign Selection
	•	Implement GET /search route:
	•	Proxy to GET https://api.spotify.com/v1/search?q=artist:"{idol}" tag:new&type=album,track&limit=5.
	•	Return necessary data to UI.
	•	On /campaign/page.tsx, implement:
	•	Idol input and fetch('/search?q=...') call.
	•	Display options and let user pick track/album.
	•	Pass selection as query or session to /campaign.

⸻

Task 4: Mission Execution (User Flows)

A) Play Verification
	•	UI: Button “Verify I played it today”.
	•	Server:
	•	Call /v1/me/player/recently-played?limit=50.
	•	Check for target track ID within windowHours.
	•	Save MissionCompletion with SUCCESS or FAILED.

B) Add to Playlist
	•	UI:
	•	Fetch user’s playlists (GET /v1/me/playlists?limit=20).
	•	Allow selection or creation (“KPD Missions”).
	•	Server:
	•	POST /playlists/{playlistId}/tracks with URI.
	•	On success, save completion with snapshot ID.

C) Save to Library
	•	UI: Buttons “Save Track” and “Save Album”.
	•	Server:
	•	Use PUT /v1/me/tracks or PUT /v1/me/albums.
	•	On success, record completion.

⸻

Task 4B: Playlist Top (Pin target to index 0)
	•	UI:
	•	On campaign page for a track, let the user select a playlist they own and click “Pin to Top”.
	•	Server:
	•	PATCH /api/playlists/{playlistId}/reorder-top with { trackId }.
	•	Under the hood: PUT /v1/playlists/{playlistId}/tracks with { range_start, insert_before: 0, range_length: 1 }.
	•	On success, verify first item == target track; log snapshot_id.

⸻

Task 4C: Playlist Profile Image (Apply campaign cover)
	•	UI:
	•	Select a user-owned playlist; upload or pick provided campaign JPEG.
	•	Server:
	•	PUT /api/playlists/{playlistId}/image with base64 JPEG; forwards to PUT /v1/playlists/{playlistId}/images.
	•	Accept 202 as success; optionally re-fetch image later to confirm.

⸻

Task 4D: Pre-save Upcoming Release (Album)
	•	UI:
	•	Show prerelease deep link and/or accept albumId + releaseAt; explain native pre-save vs auto-save.
	•	Server:
	•	POST /api/presave to register job; POST /api/presave/{id}/execute for manual trigger in dev.
	•	At release, PUT /v1/me/albums with albumId; or verify native pre-save via GET /v1/me/albums/contains.
	•	Record completion with path and executedAt.

⸻

Task 4E: Follow Artist Profile
	•	UI:
	•	Artist card shows “Follow Artist” mission.
	•	Server:
	•	POST /api/me/following/artist with { artistId } → PUT /v1/me/following?type=artist&ids=...
	•	Verify via GET /v1/me/following/contains?type=artist&ids=...
	•	Log completion.

⸻

Task 4F: Save Show / Save Episode
	•	UI:
	•	Show tiles offer “Save Show” or episode rows “Save Episode”.
	•	Server:
	•	PUT /api/me/shows with { showId } → PUT /v1/me/shows.
	•	PUT /api/me/episodes with { episodeId } → PUT /v1/me/episodes.
	•	Verify via GET /v1/me/shows/contains and /v1/me/episodes/contains.
	•	Log completion.

⸻

Task 5: Minimal UI Pages
	•	/app/page.tsx: Home page with “Connect Spotify” + idol search.
	•	/app/campaign/page.tsx: Shows mission cards with buttons.
	•	/app/me/page.tsx: Table listing past mission completions (time, mission, status).
	•	Enhancements on /campaign:
	•	- Add “Pin to Top of Playlist” card (select playlist → call reorder-top → show snapshot).
	•	- Add “Change Playlist Cover” card (select playlist → upload JPEG → show success note).
	•	- Add “Pre-save” card (enter prerelease URL or albumId + releaseAt; dev-only manual trigger button).
	•	- Add “Follow Artist” button on artist results or campaign — calls follow + verify.
	•	- Add “Save Show/Episode” actions where relevant (or a simple input form for show/episode IDs during dev).

Use the earlier wireframe HTML for layout guidance.

⸻

Task 6: Analytics & Logging
	•	Track mission attempts/completions in MissionCompletion.
	•	Store response payloads in details to debug.
	•	(Optional) Simple server log or admin route for debugging.

⸻

Task 7: Manual Testing Checklist
	1.	Connect Spotify and consent to all scopes.
	2.	Search for an idol and pick a track/album.
	3.	Save to Library: Success => appears on /me.
	4.	Add to Playlist: Create/select playlist and add track => success logged.
	5.	Play track manually, then click “Verify it today” => mark success.
	6.	Pin to Top: Ensure playlist has multiple songs → Pin target to top → verify first item and snapshot logged.
	7.	Playlist Cover: Upload a small JPEG (e.g., 600x600) → expect 202; visually confirm cover in Spotify after cache delay.
	8.	Pre-save: Register job (or use native prerelease) → at release/trigger, verify via /me/albums/contains or successful PUT.
	9.	Follow Artist: Follow target artist → verify contains true.
	10.	Save Show/Episode: Save a show and an episode → verify contains true for both.
	11.	Confirm error/fail behaviors (e.g., not played recently, non-owned playlist, invalid base64, missing scopes, region availability).

⸻

Task 8: Review and Validate with mission.md

After implementation, revisit mission.md to ensure:
	•	Endpoint accuracy.
	•	Scope coverage.
	•	Data model alignment.
	•	Acceptance criteria (e.g., snapshot ID, play-window logic).

⸻

Task 9: Deployment & Documentation
	•	Deploy to Vercel or equivalent.
	•	Update README with instructions:
	•	How to run locally.
	•	How to connect Spotify.
	•	How to test each mission.

⸻

IMPORTANT: This must result in a working MVP if:
	•	Spotify app settings (redirect URIs & scopes) are correct.
	•	Tokens are stored and refreshed properly.
	•	Dev tests user actually plays the track before “Verify”.
	•	Additional scopes added for new missions: ugc-image-upload (cover), user-library-read (pre-save verify).

Following exactly ensures your MVP for Spotify missions works for users.

⸻

API References Used in Mission.md:
	•	Spotify OAuth Flow: developer.spotify.com
	•	Recently Played: developer.spotify.com
	•	Add to Playlist: developer.spotify.com
	•	Save Tracks/Albums: developer.spotify.com

You may copy/paste this entire file as claude-tasks.md and then run Claude Code against it.
