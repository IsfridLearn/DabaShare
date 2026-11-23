# DabaShare

**Learn Together, Grow Together.** DabaShare is a skill-sharing platform for college students across Davao City. Students offer and take courses, find learning partners, message each other, and organise study sessions and webinars.

Status: in development. See [docs/DEVELOPMENT_PROGRESS.md](docs/DEVELOPMENT_PROGRESS.md).

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage, Realtime) · Vercel

## Getting started

Requires Node 24 or newer and a Supabase project. Full steps are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#local-setup).

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL and publishable key
npm run dev
```

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run check` | Typecheck, lint and tests |
| `npm run build` | Production build |
| `npm run db:push` | Apply database migrations to the linked Supabase project |
| `npm run db:types` | Regenerate database TypeScript types |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Security](docs/SECURITY.md)
- [Features](docs/FEATURES.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/DEVELOPMENT_ROADMAP.md)
- [Progress](docs/DEVELOPMENT_PROGRESS.md)
- [Original prototype audit](docs/AUDIT.md)

The original academic prototype is kept in [`prototype/`](prototype/) for reference.
