# Trade in the Fast Lane

A real-time multiplayer trading-and-life game prototype. A host creates a private match, sends the invite URL to friends, and everyone plays simultaneously against the same market clock.

## What is playable

- Create a private 15, 30 or 60-minute match
- Join through an invite URL or room code
- Optional guided pre-game tutorial
- Shared real-time stock market
- Simplified fixed-amount stock buying and whole-position selling
- Housing upgrades with happiness and recurring bills
- Cars and watches that change in value
- Optional insurance with premiums
- Accidents and burglaries that can destroy uninsured assets
- Live central board for television, streaming or a second monitor
- Final wealth-and-happiness scoring

## Winning formula

```text
Final Score = Net Worth × (0.85 + Happiness × 0.002)
```

The happiness multiplier ranges from `0.85×` to `1.05×`. Wealth remains the main objective, but a slightly poorer and much happier player can win.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:4173`.

Supabase is required. The game intentionally has no offline/local game-state fallback.

## Supabase setup

1. Create a Supabase project.
2. In **Authentication → Providers**, enable anonymous sign-ins.
3. Open the SQL Editor and run:
   - `supabase/migrations/001_create_games.sql`
4. Copy `.env.example` to `.env.local`.
5. Add the project URL and browser-safe anon key:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

6. Restart the development server.

The current schema is appropriate for a private prototype. Before a public launch, game actions should move into validated database functions or a trusted game server so clients cannot modify arbitrary snapshot fields.

## Render deployment

The repository includes `render.yaml`.

1. Push the project to GitHub.
2. In Render, create a new Blueprint from the repository.
3. Enter these environment variables when Render asks:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy.

The Render route rewrite sends invite URLs such as `/?game=ABC123` back to the React app.

## Project structure

- `src/game/catalog.ts` — homes, collectibles, avatars and market seeds
- `src/game/engine.ts` — economy, trading, billing, incidents and scoring
- `src/lib/gameStore.ts` — Supabase realtime persistence with local fallback
- `supabase/migrations/` — database schema and policies
- `render.yaml` — Render static-site Blueprint
