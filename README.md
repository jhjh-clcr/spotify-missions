# K-pop Duolingo - Spotify Missions MVP

A gamified Spotify integration app where K-pop fans complete missions for their favorite idols' new releases.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/spotify/callback
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=file:./dev.db
```

3. Initialize database:
```bash
npx prisma generate
npx prisma migrate dev --name init_mvp
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Features

### Three Mission Types
1. **Play Verification** - Verify you've played a track within the last 24 hours
2. **Add to Playlist** - Add tracks to your Spotify playlists
3. **Save to Library** - Save tracks or albums to your Spotify library

### Required Spotify Scopes
- `user-read-recently-played` - For play verification
- `playlist-modify-public` - Add to public playlists
- `playlist-modify-private` - Add to private playlists
- `user-library-modify` - Save tracks/albums
- `playlist-read-private` - List private playlists

## Usage

1. Click "Connect Spotify" to authenticate
2. Search for your favorite K-pop idol (default: aespa)
3. Select a recent release (track or album)
4. Complete missions on the campaign page
5. View your completion history at `/me`

## Project Structure

```
/app
  /api
    /auth/spotify   - OAuth flow
    /search         - Spotify search proxy
    /me            - User endpoints
    /playlists     - Playlist management
  /campaign        - Mission execution page
  /me             - Completion history
/lib
  spotify.ts      - Spotify API helpers
  db.ts          - Prisma client
/prisma
  schema.prisma  - Database schema
```

## Production Deployment

### ⚠️ IMPORTANT: Current Limitations
This app is in **Spotify Development Mode** which means:
- **Only 25 users maximum** can use the app
- **Each user must be manually added** in Spotify Dashboard
- **NOT ready for public launch**

### To Deploy for Unlimited Users

1. **Apply for Extended Quota Mode**:
   ```
   Spotify Dashboard → Your App → Settings → Request Extension
   ```

2. **Requirements**:
   - Privacy Policy URL (required)
   - Terms of Service URL (required)  
   - App icon and screenshots
   - Justify each API scope
   - 5-15 business day review

3. **Code Changes Needed**:
   - Deploy to HTTPS domain
   - Replace demo user with real user registration
   - Update redirect URI to production URL
   - Add proper error handling

### Development vs Production

| Feature | Development Mode | Extended Quota Mode |
|---------|-----------------|-------------------|
| User Limit | 25 users | Unlimited |
| User Addition | Manual via Dashboard | Automatic |
| Review Required | No | Yes |
| HTTPS Required | No | Yes |
| Timeline | Immediate | 1-3 weeks |

## Known Caveats

- **Development Mode**: Currently limited to 25 manually-added users
- Recently Played API returns ~50 most recent tracks
- Play verification works best if you play the track shortly before verifying
- Token refresh happens automatically when tokens expire
- Demo uses simplified auth (single demo user)
- Playlist cover updates may take minutes to appear
- Shows/episodes availability varies by region
