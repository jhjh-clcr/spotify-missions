product: "K-pop Duolingo — Spotify Missions MVP"

date: "2025-09-01"
environment:
  runtime: "Node 18+"
  language: "TypeScript"
  framework: "Next.js App Router (BFF under /api)"
  db: "SQLite via Prisma (dev) or Postgres"
  http_client: "fetch/undici or axios"

spotify_app:
  required_env:
    - SPOTIFY_CLIENT_ID
    - SPOTIFY_CLIENT_SECRET
    - SPOTIFY_REDIRECT_URI
    - JWT_SECRET
  auth_flow: "Authorization Code Flow with refresh tokens"
  scopes:
    - user-read-recently-played    # verify daily play
    - playlist-modify-public       # add/modify public playlists
    - playlist-modify-private      # add/modify private playlists
    - playlist-read-private        # optional, list private playlists
    - user-library-modify          # save track/album (incl. pre-save)
    - user-library-read            # verify saved album after prerelease (optional but recommended)
    - ugc-image-upload             # update playlist cover image
    - user-follow-modify           # follow artist profiles
    - user-follow-read             # verify follows (contains)

data_model:
  tables:
    - name: User
      fields: [id, email, created_at]
    - name: OAuthToken
      fields:
        - user_id
        - provider: "spotify"
        - access_token
        - refresh_token
        - scope
        - expires_at
    - name: AdminCampaign
      fields:
        - id
        - idol
        - release_name
        - target_track_id
        - target_album_id
        - created_at
    - name: Mission
      fields:
        - id
        - type: "PLAY_VERIFY | ADD_TO_PLAYLIST | SAVE_TRACK | SAVE_ALBUM | PLAYLIST_REORDER_TOP | PLAYLIST_SET_COVER | PRE_SAVE_ALBUM | FOLLOW_ARTIST | SAVE_SHOW | SAVE_EPISODE"
        - target_spotify_id
        - active: boolean
        - window_hours: int   # for PLAY_VERIFY; default 24
        - created_at
        - updated_at
    - name: MissionCompletion
      fields:
        - id
        - user_id
        - mission_id
        - status: "SUCCESS | FAILED"
        - details: json
        - created_at

api_routes:
  # OAuth (implemented)
  - method: GET
    path: /api/auth/spotify/login
    desc: Redirect to Spotify consent with required scopes
  - method: GET
    path: /api/auth/spotify/callback
    desc: Exchange code→tokens; persist tokens; set cookie

  # Search & Campaign (implemented)
  - method: GET
    path: /api/search
    query: { q: string, type: "album,track", limit?: number }
    desc: Proxy to Spotify Search; return {name,id,uri,artists,release_date}

  # User playlists (implemented)
  - method: GET
    path: /api/me/playlists
    desc: List current user playlists
  - method: POST
    path: /api/me/playlists
    body: { name: string, public?: boolean, description?: string }
    desc: Create playlist for the connected user
  - method: POST
    path: /api/playlists/:playlist_id/items
    body: { uris?: string[], trackId?: string }
    desc: Add track to selected playlist; expect snapshot_id

  # Library & playback history (implemented)
  - method: PUT
    path: /api/me/tracks
    body: { trackId: string }
    desc: Save track for current user
  - method: PUT
    path: /api/me/albums
    body: { albumId: string }
    desc: Save album for current user
  - method: GET
    path: /api/me/recently-played
    query: { limit?: number, targetTrackId?: string, windowHours?: number }
    desc: Verify target track id appears within window_hours

  # New missions (to implement)
  - method: PATCH
    path: /api/playlists/:playlist_id/reorder-top
    body: { trackId: string }
    desc: Move the track to index 0; return snapshot_id
  - method: PUT
    path: /api/playlists/:playlist_id/image
    headers: { Content-Type: image/jpeg (base64) } or body: { imageBase64: string }
    desc: Upload a new JPEG cover image; returns 202
  - method: GET
    path: /api/me/albums/contains
    query: { ids: string }
    desc: Verify saved album after release (for native prerelease)
  - method: POST
    path: /api/presave
    body: { albumId?: string, prereleaseUrl?: string, releaseAt: string, notes?: string }
    desc: Register a pre-save job (auto-save at release time)
  - method: POST
    path: /api/presave/:id/execute
    body: { albumId: string }
    desc: Manually trigger save for testing
  - method: POST
    path: /api/me/following/artist
    body: { artistId: string }
    desc: Follow an artist profile for the current user
  - method: GET
    path: /api/me/following/artist/contains
    query: { ids: string }
    desc: Verify if current user follows given artist id(s)
  - method: PUT
    path: /api/me/shows
    body: { showId: string }
    desc: Save a show to library
  - method: PUT
    path: /api/me/episodes
    body: { episodeId: string }
    desc: Save an episode to library
  - method: GET
    path: /api/me/shows/contains
    query: { ids: string }
    desc: Verify saved shows
  - method: GET
    path: /api/me/episodes/contains
    query: { ids: string }
    desc: Verify saved episodes

mission_execution_api:
  - method: POST
    path: /missions/:id/execute
    body: { user_id: "<uuid>" }
    steps:
      - Load mission, fetch user’s Spotify token
      - If type == SAVE_TRACK: PUT /me/tracks with target id
      - If type == SAVE_ALBUM: PUT /me/albums with target id
      - If type == ADD_TO_PLAYLIST:
          - require playlist_id (user-selected) or auto-create one
          - POST /playlists/{playlist_id}/tracks with track URI
      - If type == PLAY_VERIFY:
          - GET /me/player/recently-played?limit=50
          - success if any items[].track.id == target AND played_at >= now - window_hours
      - If type == PLAYLIST_REORDER_TOP:
          - Find current index of target in playlist via GET /playlists/{id}/tracks (fields minimal)
          - PUT /playlists/{id}/tracks with { range_start, insert_before: 0 }
          - Verify first item equals target; persist snapshot_id
      - If type == PLAYLIST_SET_COVER:
          - Upload base64 JPEG via PUT /playlists/{id}/images
          - Treat 202 as success; optionally re-fetch cover after cache delay
      - If type == PRE_SAVE_ALBUM:
          - Option A: Native prerelease — after release, GET /me/albums/contains?ids={album_id}
          - Option B: Auto-save — at releaseAt, PUT /me/albums with album_id
          - Persist MissionCompletion with path taken and result
      - If type == FOLLOW_ARTIST:
          - PUT /me/following?type=artist&ids={artist_id}
          - Verify via GET /me/following/contains?type=artist&ids={artist_id}
      - If type == SAVE_SHOW:
          - PUT /me/shows with { ids: [show_id] }
          - Verify via GET /me/shows/contains?ids={show_id}
      - If type == SAVE_EPISODE:
          - PUT /me/episodes with { ids: [episode_id] }
          - Verify via GET /me/episodes/contains?ids={episode_id}
      - Persist MissionCompletion {status, details}

spotify_calls:
  search:
    method: GET
    url: "https://api.spotify.com/v1/search"
    params: { q: 'artist:{idol}', type: "album,track", limit: 10 }
  recently_played:
    method: GET
    url: "https://api.spotify.com/v1/me/player/recently-played"
    params: { limit: 50 }
    scope: user-read-recently-played
  add_to_playlist:
    method: POST
    url: "https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
    body: { uris: ["spotify:track:{id}"] }
    scopes: [playlist-modify-public, playlist-modify-private]
  save_tracks:
    method: PUT
    url: "https://api.spotify.com/v1/me/tracks"
    body: { ids: ["{track_id}"] }
    scope: user-library-modify
  save_albums:
    method: PUT
    url: "https://api.spotify.com/v1/me/albums"
    body: { ids: ["{album_id}"] }
    scope: user-library-modify
  list_playlists:
    method: GET
    url: "https://api.spotify.com/v1/me/playlists"
    params: { limit: 20 }
  reorder_playlist:
    method: PUT
    url: "https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
    body: { range_start: 5, insert_before: 0, range_length: 1 }
    scopes: [playlist-modify-public, playlist-modify-private]
  upload_playlist_image:
    method: PUT
    url: "https://api.spotify.com/v1/playlists/{playlist_id}/images"
    headers: { 'Content-Type': 'image/jpeg' }
    body: "<base64 JPEG>"
    scope: ugc-image-upload
  albums_contains:
    method: GET
    url: "https://api.spotify.com/v1/me/albums/contains?ids={album_id}"
    scope: user-library-read
  follow_artist:
    method: PUT
    url: "https://api.spotify.com/v1/me/following?type=artist&ids={artist_id}"
    scopes: [user-follow-modify]
  follow_artist_contains:
    method: GET
    url: "https://api.spotify.com/v1/me/following/contains?type=artist&ids={artist_id}"
    scopes: [user-follow-read]
  save_show:
    method: PUT
    url: "https://api.spotify.com/v1/me/shows"
    body: { ids: ["{show_id}"] }
    scope: user-library-modify
  save_episode:
    method: PUT
    url: "https://api.spotify.com/v1/me/episodes"
    body: { ids: ["{episode_id}"] }
    scope: user-library-modify
  shows_contains:
    method: GET
    url: "https://api.spotify.com/v1/me/shows/contains?ids={show_id}"
    scope: user-library-read
  episodes_contains:
    method: GET
    url: "https://api.spotify.com/v1/me/episodes/contains?ids={episode_id}"
    scope: user-library-read

token_management:
  store: "access_token, refresh_token, expires_at per user"
  refresh_strategy: "Refresh when now() > expires_at - 60s"

acceptance_criteria:
  PLAY_VERIFY:
    - user connected with scope user-read-recently-played
    - pressing Verify calls recently-played (limit=50)
    - SUCCESS if target track appears with played_at within window_hours
    - log completion + raw payload pointer
  ADD_TO_PLAYLIST:
    - user selects/creates a playlist
    - POST /playlists/{id}/tracks returns 201 and snapshot_id
    - SUCCESS recorded + snapshot_id stored
  SAVE_TRACK_ALBUM:
    - PUT /me/tracks or /me/albums returns 200
    - SUCCESS recorded
  PLAYLIST_REORDER_TOP:
    - Track exists in selected playlist
    - PUT reorder returns 200 and snapshot_id
    - First item in GET /playlists/{id}/tracks matches target track id
    - SUCCESS recorded + snapshot_id stored
  PLAYLIST_SET_COVER:
    - PUT /playlists/{id}/images returns 202
    - SUCCESS recorded (note: visual update may take time due to caching)
  PRE_SAVE_ALBUM:
    - If native prerelease: after release, GET /me/albums/contains returns true
    - If auto-save: PUT /me/albums returns 200 at releaseAt
    - SUCCESS recorded + executedAt stored
  FOLLOW_ARTIST:
    - PUT /me/following?type=artist&ids={artist_id} returns 204
    - Or GET /me/following/contains?type=artist&ids={artist_id} returns true
    - SUCCESS recorded
  SAVE_SHOW:
    - PUT /me/shows with ids returns 200
    - Or GET /me/shows/contains returns true
    - SUCCESS recorded
  SAVE_EPISODE:
    - PUT /me/episodes with ids returns 200
    - Or GET /me/episodes/contains returns true
    - SUCCESS recorded

analytics:
  counters:
    - missions_started
    - missions_completed
    - per_mission_type_daily
    - per_campaign_daily
  logs:
    - completion_log: [timestamp, user_id, mission_type, target_id, status]

testing_scripts_curl:
  search:
    - 'curl -H "Authorization: Bearer ${TOKEN}" "https://api.spotify.com/v1/search?q=aespa&type=album,track&limit=5"'
  recently_played:
    - 'curl -H "Authorization: Bearer ${TOKEN}" "https://api.spotify.com/v1/me/player/recently-played?limit=50"'
  save_track:
    - 'curl -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d "{\"ids\":[\"{track_id}\"]}" "https://api.spotify.com/v1/me/tracks"'
  save_album:
    - 'curl -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d "{\"ids\":[\"{album_id}\"]}" "https://api.spotify.com/v1/me/albums"'
  list_playlists:
    - 'curl -H "Authorization: Bearer ${TOKEN}" "https://api.spotify.com/v1/me/playlists?limit=20"'
  add_to_playlist:
    - 'curl -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d "{\"uris\":[\"spotify:track:{track_id}\"]}" "https://api.spotify.com/v1/playlists/{playlist_id}/tracks"'
  reorder_top:
    - 'curl -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d "{\"range_start\":{from_index},\"insert_before\":0,\"range_length\":1}" "https://api.spotify.com/v1/playlists/{playlist_id}/tracks"'
  set_playlist_cover:
    - 'curl -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: image/jpeg" --data-binary @cover.jpg "https://api.spotify.com/v1/playlists/{playlist_id}/images"'
  albums_contains:
    - 'curl -H "Authorization: Bearer ${TOKEN}" "https://api.spotify.com/v1/me/albums/contains?ids={album_id}"'
  follow_artist:
    - 'curl -X PUT -H "Authorization: Bearer ${TOKEN}" "https://api.spotify.com/v1/me/following?type=artist&ids={artist_id}"'
  follow_artist_contains:
    - 'curl -H "Authorization: Bearer ${TOKEN}" "https://api.spotify.com/v1/me/following/contains?type=artist&ids={artist_id}"'
  save_show:
    - 'curl -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d "{\"ids\":[\"{show_id}\"]}" "https://api.spotify.com/v1/me/shows"'
  save_episode:
    - 'curl -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d "{\"ids\":[\"{episode_id}\"]}" "https://api.spotify.com/v1/me/episodes"'
  shows_contains:
    - 'curl -H "Authorization: Bearer ${TOKEN}" "https://api.spotify.com/v1/me/shows/contains?ids={show_id}"'
  episodes_contains:
    - 'curl -H "Authorization: Bearer ${TOKEN}" "https://api.spotify.com/v1/me/episodes/contains?ids={episode_id}"'

caveats:
  - "Recently Played returns ~last 50 items; encourage 'play then verify' to avoid misses."
  - "snapshot_id is returned from playlist add; retain for concurrency audits."
  - "Reorder works only on user-owned playlists and when Sort is Custom."
  - "Playlist image upload requires base64 JPEG and may take time to propagate across clients."
  - "Prerelease pages are not exposed in the Web API; use album_id at release time or search fallback."
  - "Following requires user-follow-modify; verification requires user-follow-read."
  - "Saving shows/episodes may be restricted by region/availability; verification uses *contains endpoints."

timeline:
  week_1: ["OAuth + token store", "PLAY_VERIFY endpoint + test console"]
  week_2: ["ADD_TO_PLAYLIST + playlist helpers", "SAVE_TRACK/ALBUM"]
  week_3: ["mission_execution_api", "completions log + simple counters"]
  week_4: ["PLAYLIST_REORDER_TOP", "PLAYLIST_SET_COVER", "PRE_SAVE_ALBUM (manual trigger)"]
  week_5: ["FOLLOW_ARTIST", "SAVE_SHOW", "SAVE_EPISODE"]
