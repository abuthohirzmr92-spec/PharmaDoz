# Deployment Guide

## Vercel Deploy Steps

1. Push the repository to GitHub (`https://github.com/abuthohirzmr92-spec/PharmaDoz.git`)
2. Go to [vercel.com](https://vercel.com) and click **Add New > Project**
3. Import the `PharmaDoz` GitHub repository
4. **Framework Preset**: Next.js (auto-detected)
5. **Build Command**: `next build` (Turbopack is used for local development only)
6. **Output Directory**: `.next` (default)
7. **Root Directory**: `./` (default)
8. Click **Deploy**

## Environment Variables

Configure these in Vercel (Project Settings > Environment Variables):

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (deployed domain) |
| `NEXT_PUBLIC_APP_NAME` | App name displayed in UI |

## Demo Mode

The application runs in **demo mode** automatically when Supabase environment variables contain placeholder values (`your-project.supabase.co` / `your-anon-key`). In demo mode:

- Authentication is bypassed (middleware returns early)
- Data is served from in-memory mocks — no real database required
- All pages and features are navigable

**To go live**: replace `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with real Supabase project credentials in your Vercel environment variables. Restart the deployment — middleware will activate real auth and database connections.

## Rollback Steps

### Via Vercel Dashboard (recommended)
1. Go to your project on Vercel
2. Navigate to **Deployments**
3. Find the last known-good deployment
4. Click the three-dot menu > **Promote to Production**

### Via Git Revert
```bash
git revert HEAD
git push origin master
```
Vercel will automatically redeploy the reverted commit.

### Via Vercel CLI
```bash
vercel rollback
```
