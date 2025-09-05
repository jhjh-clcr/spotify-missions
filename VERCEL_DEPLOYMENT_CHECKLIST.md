# Vercel Deployment Checklist for Spotify Missions

## 🚨 Main Obstacles for Deployment

### 1. **Spotify Development Mode Limitation (Critical)**
- **Issue**: App is in Development Mode, limiting access to 25 manually added users
- **Impact**: Users can't authenticate without being manually added to Spotify app dashboard
- **Solution**: Apply for Extended Quota Mode after deployment
- **Requirements for Extended Quota Mode**:
  - Deployed production URL
  - Complete app description
  - Privacy policy and terms of service
  - Compliance with Spotify's Developer Terms

### 2. **Database Migration Required**
- **Current**: SQLite (`dev.db`)
- **Required**: PostgreSQL for Vercel
- **Action**: Set up PostgreSQL database (Vercel Postgres, Supabase, or Neon)

### 3. **Hardcoded Redirect URI**
- **Current**: `http://127.0.0.1:3003/api/auth/spotify/callback`
- **Required**: Update to production domain in both:
  - Spotify App Dashboard
  - Environment variables

## ✅ Pre-Deployment Steps

### 1. Set Up PostgreSQL Database
```bash
# Option 1: Vercel Postgres (Recommended)
# - Go to Vercel Dashboard > Storage > Create Database
# - Select Postgres
# - Copy connection string

# Option 2: Supabase
# - Create account at supabase.com
# - Create new project
# - Get connection string from Settings > Database

# Option 3: Neon
# - Create account at neon.tech
# - Create database
# - Copy connection string
```

### 2. Update Spotify App Settings
1. Go to [Spotify Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Click "Edit Settings"
4. Add production redirect URI:
   - Format: `https://your-domain.vercel.app/api/auth/spotify/callback`
5. Save changes

### 3. Prepare Environment Variables for Vercel
Create these in Vercel Dashboard > Settings > Environment Variables:

```env
# Spotify OAuth (from current .env.local)
SPOTIFY_CLIENT_ID=fd1ff72aa93a4033ba52d813a6a21b21
SPOTIFY_CLIENT_SECRET=cd8d771ffeea4af1b3d985ca045f06cb
SPOTIFY_REDIRECT_URI=https://your-domain.vercel.app/api/auth/spotify/callback

# JWT Secret (from current .env.local)
JWT_SECRET=6b481322db08db0c9c78cb9b4e128d6df30c0cf6e8689ff687e34294814956cf7f6500b3ac9b0fe0d76f8911ecc9fac058e1162cbabadeceb7cead3941d557ca

# Database (PostgreSQL connection string)
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Public Environment Variables
NEXT_PUBLIC_FEATURE_PODCASTS=-1
NEXT_PUBLIC_OFFICIAL_COVER=official-cover.jpg

# Optional Quiz Mission IDs (if different from defaults)
NEXT_PUBLIC_QUIZ_TKO_ALBUM_ID=0YaLbDxHTeZLT3CpDunKuT
NEXT_PUBLIC_QUIZ_TKO_TRACK_ID=0Q5VnK2DYzRyfqQRJuUtvi
NEXT_PUBLIC_OFFICIAL_IVE_PLAYLIST_ID=37i9dQZF1DX6pLfLmbGM3d
```

## 🚀 Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Configure project:
   - Framework Preset: Next.js
   - Build Command: `prisma db push && next build` (already in package.json)
   - Output Directory: `.next`
4. Add all environment variables from above
5. Deploy

### 3. Post-Deployment Database Setup
```bash
# After first deployment, run in Vercel console or locally:
npx prisma db push
```

## 🔍 Testing Checklist

### Phase 1: Internal Testing (Development Mode)
1. [ ] Add test Spotify accounts to app (max 25 users)
2. [ ] Test OAuth flow with production URL
3. [ ] Verify all missions work:
   - [ ] Play verification missions
   - [ ] Playlist missions
   - [ ] Save to library missions
   - [ ] Quiz missions
   - [ ] Follow playlist mission
4. [ ] Check scoring system
5. [ ] Verify image uploads work

### Phase 2: Extended Testing (After Extended Quota)
1. [ ] Apply for Extended Quota Mode
2. [ ] Test with users not manually added
3. [ ] Monitor API rate limits
4. [ ] Check error handling

## ⚠️ Important Security Notes

1. **Never commit `.env.local` to GitHub** (already in .gitignore)
2. **Rotate secrets after deployment**:
   - Generate new JWT_SECRET for production
   - Consider using different Spotify app for production
3. **Enable Vercel authentication** for internal testing phase

## 🐛 Common Issues & Solutions

### Issue: "User not registered" error
**Cause**: App in Development Mode
**Solution**: Add user email to Spotify app dashboard

### Issue: Database connection fails
**Cause**: Incorrect DATABASE_URL format
**Solution**: Ensure PostgreSQL URL includes `?sslmode=require`

### Issue: Redirect URI mismatch
**Cause**: Production URL not added to Spotify app
**Solution**: Add exact production URL to Spotify app settings

### Issue: Missions not working
**Cause**: Missing environment variables
**Solution**: Verify all NEXT_PUBLIC_* variables are set in Vercel

## 📊 Monitoring After Deployment

1. **Vercel Analytics**: Monitor performance and errors
2. **Database**: Check connection pool usage
3. **Spotify API**: Monitor rate limits (180 requests per minute)
4. **User Feedback**: Track mission completion rates

## 🎯 Next Steps After Successful Deployment

1. **Week 1-2**: Internal testing with team
2. **Week 3**: Apply for Extended Quota Mode
3. **Week 4+**: Public beta launch (after approval)

## 📝 Notes

- The app uses PostgreSQL in production (changed from SQLite)
- Build script includes automatic Prisma migration
- All sensitive credentials should be rotated for production
- Consider implementing rate limiting for API routes
- Add error tracking (Sentry, LogRocket) for production monitoring
