# Setup Guide

## Prerequisites
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Supabase CLI (`brew install supabase/tap/supabase`)
- Render CLI (`brew install render`)

## Local Development Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Start Supabase locally
```bash
supabase start
```

This will output your local credentials:
- `API URL`: Use as `SUPABASE_URL`
- `anon key`: Use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key`: Use as `SUPABASE_SERVICE_ROLE_KEY`
- `Studio URL`: Open for database admin UI

### 3. Create environment files
```bash
# API
cp apps/api/.env.example apps/api/.env
# Edit with your local Supabase credentials

# Web
cp apps/web/.env.example apps/web/.env.local
# Edit with your local Supabase credentials
```

### 4. Apply database migrations
```bash
supabase db reset
```
This runs migrations + seed data.

### 5. Generate TypeScript types
```bash
pnpm db:types
```

### 6. Start development servers
```bash
pnpm dev
```
- API: http://localhost:3001
- Web: http://localhost:3000

## Production Deployment

### Supabase (Database, Auth, Storage)

1. Create a new project at [supabase.com](https://supabase.com)
2. Link your local project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
3. Push migrations to production:
   ```bash
   supabase db push
   ```
4. Copy your production credentials from Supabase Dashboard > Settings > API

### Render (API + Web)

1. Push your code to GitHub
2. Create a new Blueprint in Render Dashboard
3. Connect your GitHub repo
4. Render will detect `render.yaml` and create services
5. Set environment variables for each service:
   - `guild-ads-api`:
     - `SUPABASE_URL` = your production Supabase URL
     - `SUPABASE_SERVICE_ROLE_KEY` = your production service role key
   - `guild-ads-web`:
     - `NEXT_PUBLIC_SUPABASE_URL` = your production Supabase URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your production anon key
     - `SUPABASE_SERVICE_ROLE_KEY` = your production service role key
     - `STRIPE_SECRET_KEY` = Stripe API secret key
     - `STRIPE_WEBHOOK_SECRET` = Stripe webhook signing secret
     - `APP_BASE_URL` = canonical app URL (for Stripe success/cancel + onboarding returns)
     - `BILLING_CRON_SECRET` = shared secret for internal billing cron endpoints

### Alternative: Deploy web to Vercel

If you prefer Vercel for the web app:
1. Import the repo to Vercel
2. Set root directory to `apps/web`
3. Set environment variables
4. Deploy

## Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm dev:api` | Start API only |
| `pnpm dev:web` | Start web only |
| `pnpm build` | Build all packages |
| `pnpm db:migrate` | Push migrations to linked DB |
| `pnpm db:reset` | Reset local DB (migrations + seed) |
| `pnpm db:types` | Regenerate TypeScript types |
| `supabase start` | Start local Supabase |
| `supabase stop` | Stop local Supabase |
| `supabase status` | Show local Supabase URLs/keys |
