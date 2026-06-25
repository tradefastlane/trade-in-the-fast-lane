# Trade in the Fast Lane

A real-time multiplayer trading-and-life game prototype. A host creates a private match, sends the invite URL to friends, and everyone plays simultaneously against the same market clock.

## What is playable

- Create a private 15, 30 or 60-minute match
- Join through an invite URL or room code
- Optional guided pre-game tutorial
- Briefing returns each player to the private lobby; only the host starts the match
- Host-controlled smart bots with distinct trading personalities
- Shared real-time stock market
- CoinGecko crypto search with logos, rank, market cap, volume, chain and
  contract verification
- Search cryptocurrencies by full name or ticker
- Simplified long and short trades with leverage from 1× to 100×
- Stop-loss, take-profit and trailing-exit presets
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

The repository includes `render.yaml` for one Node Web Service that serves both
the React game and the private Alpaca price proxy.

1. Push the project to GitHub.
2. In Render, create a new **Web Service** from the repository.
3. Use:
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
   - Health check path: `/health`
4. Enter these environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Optional future stock support: `APCA_API_KEY_ID`
   - Optional future stock support: `APCA_API_SECRET_KEY`
   - Optional: `COINGECKO_API_KEY` for higher CoinGecko demo limits
5. Deploy. Never prefix the Alpaca variables with `VITE_`; that would expose
   them in the browser bundle.

The current game interface is crypto-only. Alpaca variables may remain on the
private service without affecting CoinGecko crypto search or prices.

The Node service sends invite URLs such as `/?game=ABC123` back to the React
app and keeps Alpaca credentials on the server.

## Project structure

- `src/game/catalog.ts` — homes, collectibles, avatars and market seeds
- `src/game/engine.ts` — economy, trading, billing, incidents and scoring
- `src/lib/gameStore.ts` — Supabase realtime persistence with local fallback
- `src/lib/marketData.ts` — browser client for the private market API
- `server/index.mjs` — private Alpaca proxy and production frontend server
- `supabase/migrations/` — database schema and policies
- `render.yaml` — Render Web Service Blueprint
