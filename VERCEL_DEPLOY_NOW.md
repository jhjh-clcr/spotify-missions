# 🚀 Deploy to Vercel - Step by Step

## Step 1: Push to GitHub
```bash
git push origin main
```

If you don't have a GitHub repo yet:
1. Go to https://github.com/new
2. Create a new repository (name: spotify-missions)
3. Run these commands:
```bash
git remote add origin https://github.com/YOUR_USERNAME/spotify-missions.git
git push -u origin main
```

## Step 2: Deploy on Vercel

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure your project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: Leave default (uses package.json)
   - **Install Command**: Leave default

## Step 3: Add Environment Variables in Vercel

Click "Environment Variables" and add these ONE BY ONE:

```bash
# 1. Spotify OAuth
SPOTIFY_CLIENT_ID
fd1ff72aa93a4033ba52d813a6a21b21

SPOTIFY_CLIENT_SECRET
cd8d771ffeea4af1b3d985ca045f06cb

# 2. IMPORTANT: Update this with your Vercel domain after first deploy
SPOTIFY_REDIRECT_URI
https://YOUR-APP-NAME.vercel.app/api/auth/spotify/callback

# 3. JWT Secret
JWT_SECRET
6b481322db08db0c9c78cb9b4e128d6df30c0cf6e8689ff687e34294814956cf7f6500b3ac9b0fe0d76f8911ecc9fac058e1162cbabadeceb7cead3941d557ca

# 4. Supabase Database (COPY EXACTLY AS IS - already URL-encoded)
DATABASE_URL
postgresql://postgres.ysikhubouawavchfocua:120202Ee%21%3Fz%5E%5Ework@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true

# 5. Public Variables
NEXT_PUBLIC_FEATURE_PODCASTS
-1

NEXT_PUBLIC_OFFICIAL_COVER
official-cover.jpg
```

## Step 4: Deploy
Click "Deploy" and wait 2-3 minutes

## Step 5: Get Your Production URL
After deployment, you'll see your URL like:
- `https://spotify-missions-abc123.vercel.app`

## Step 6: Update Spotify App Settings

⚠️ **CRITICAL - DO THIS IMMEDIATELY**:

1. Go to https://developer.spotify.com/dashboard
2. Click on your app
3. Click "Settings"
4. Add your production redirect URI:
   ```
   https://YOUR-APP-NAME.vercel.app/api/auth/spotify/callback
   ```
5. Click "Save"

## Step 7: Update Vercel Environment Variable

1. Go back to Vercel Dashboard
2. Settings → Environment Variables
3. Edit `SPOTIFY_REDIRECT_URI`
4. Change to: `https://YOUR-APP-NAME.vercel.app/api/auth/spotify/callback`
5. Save and Redeploy (Deployments → ... → Redeploy)

## Step 8: Add Test Users to Spotify App

Since app is in Development Mode:
1. Go to Spotify Dashboard → Your App → Users
2. Add email addresses of internal testers (max 25)
3. They can now login and test

## ✅ Testing Checklist

1. Visit your production URL
2. Click "Login with Spotify"
3. Authorize the app
4. Complete a mission
5. Check Supabase dashboard to see if data is being saved

## 🔴 Common Issues

### "Invalid redirect URI"
→ Make sure production URL is added to Spotify app settings

### "User not registered"  
→ Add tester's email to Spotify app dashboard

### Database errors
→ Check DATABASE_URL in Vercel matches exactly what I provided

### Missions not working
→ Check all NEXT_PUBLIC_* variables are set

## 📱 Share With Testers

Once deployed, share this with your testers:
```
URL: https://YOUR-APP-NAME.vercel.app
Note: You must be added as a tester first. Send me your Spotify email.
```

## Need Help?
The app should work immediately after following these steps. If you see any errors, check:
1. Vercel logs (Functions tab)
2. Supabase dashboard (for database issues)
3. Browser console (for frontend errors)