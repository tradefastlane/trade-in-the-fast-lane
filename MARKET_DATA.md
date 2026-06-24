# Live market data

TradingView widgets may be embedded for chart display, but TradingView does not
provide an API that lets this game read or export the widget prices. The game
must receive executable prices from a licensed market-data provider.

Recommended first production feed:

- Alpaca Market Data for searchable US equities and crypto.
- A server-side Render service keeps `ALPACA_API_KEY` and
  `ALPACA_API_SECRET` private.
- The server searches the provider's asset list and receives live prices over
  its WebSocket feed.
- The game host writes normalized prices into the shared Supabase game
  snapshot, so every player settles against the same authoritative price.
- A TradingView chart can still be displayed as a visual companion, but never
  as the source used to calculate trades.

Exact parity with every symbol visible on TradingView is not available through
TradingView widgets. Worldwide exchange coverage requires contracts and
entitlements from a provider or the exchanges themselves.
