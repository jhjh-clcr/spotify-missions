# Supabase PostgreSQL Setup Guide

## Step 1: Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email

## Step 2: Create New Project
1. Click "New project"
2. Fill in details:
   - **Name**: `spotify-missions`
   - **Database Password**: Generate strong password (SAVE THIS!)
   - **Region**: Choose closest to you (e.g., North Virginia for US East)
   - **Pricing Plan**: Free tier (default)
3. Click "Create new project" (takes ~2 minutes to provision)

## Step 3: Get Connection String
1. Once project is ready, go to **Settings** (gear icon in sidebar)
2. Click **Database** in the left menu
3. Scroll to **Connection string** section
4. Select **URI** tab
5. You'll see something like:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

6. **IMPORTANT**: Replace `[YOUR-PASSWORD]` with the password you created in Step 2

## Step 4: Update Your Connection String for Prisma
Prisma requires a specific connection string format. Modify your connection string:

### Original from Supabase:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

### For Prisma (add connection pooling):
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:6543/postgres?pgbouncer=true&connect_timeout=10
```

Note: Changed port from `5432` to `6543` for connection pooling (recommended for serverless)

## Step 5: Update Local Environment
Edit your `.env.local`:

```bash
# Old (SQLite)
DATABASE_URL="file:./dev.db"

# New (Supabase PostgreSQL) - paste your modified connection string
DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@db.xxxxxxxxxxxx.supabase.co:6543/postgres?pgbouncer=true&connect_timeout=10"
```

## Step 6: Push Schema to Supabase
```bash
# Push the schema to Supabase
npx prisma db push

# Generate Prisma client for PostgreSQL
npx prisma generate

# (Optional) View your database
npx prisma studio
```

## Step 7: Test Connection
```bash
# Restart your dev server
npm run dev
```

Visit http://127.0.0.1:3003 and test the OAuth flow

## Supabase Dashboard Features
- **Table Editor**: Visual database editor (like Excel)
- **SQL Editor**: Run SQL queries directly
- **Database Backups**: Daily backups on free tier
- **Logs**: Monitor database queries
- **Auth**: Built-in auth (not needed for your app)

## For Vercel Deployment

### Option A: Direct Connection (Simple)
Use the same connection string in Vercel:
```
DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@db.xxxxxxxxxxxx.supabase.co:6543/postgres?pgbouncer=true&connect_timeout=10"
```

### Option B: Prisma Data Proxy (Better for production)
For better connection pooling in production:
1. Keep using the pooled connection (port 6543)
2. This prevents connection limit issues

## Vercel Environment Setup
1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add `DATABASE_URL` with your Supabase connection string
3. Redeploy

## Troubleshooting

### Error: "password authentication failed"
- Double-check password in connection string
- Make sure you replaced [YOUR-PASSWORD] placeholder

### Error: "too many connections"
- Use port 6543 (pooled) instead of 5432 (direct)
- Add `?pgbouncer=true` to connection string

### Error: "relation does not exist"
- Run `npx prisma db push` again
- Check Supabase Table Editor if tables exist

## Supabase Free Tier Benefits
- **500 MB database storage** (plenty for MVP)
- **2 GB bandwidth**
- **50,000 monthly active users** (if using Auth)
- **Daily backups**
- **Unlimited API requests**

## Bonus: View Your Data in Supabase
1. Go to your project dashboard
2. Click "Table Editor" in sidebar
3. You'll see all your tables (User, OAuthToken, Mission, etc.)
4. You can view/edit data directly here (great for debugging!)

Perfect for your internal testing!