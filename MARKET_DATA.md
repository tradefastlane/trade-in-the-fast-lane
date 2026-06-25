# Live market data

TradingView widgets may be embedded for chart display, but TradingView does not
provide an API that lets this game read or export the widget prices. The game
must receive executable prices from a licensed market-data provider.

Current provider split:

- Alpaca Market Data for searchable US equities.
- CoinGecko for canonical cryptocurrency identity, logos, market cap, volume,
  24-hour change, chain/contract metadata and USD prices.
- DexScreener can later add pool-level liquidity and DEX information after a
  specific chain and contract have been identified.
- The Render Web Service keeps `APCA_API_KEY_ID` and
  `APCA_API_SECRET_KEY` private.
- The server requests the latest Alpaca trade for active tickers and briefly
  caches responses to control API usage.
- The game host writes normalized prices into the shared Supabase game
  snapshot, so every player settles against the same authoritative price.
- A TradingView chart can still be displayed as a visual companion, but never
  as the source used to calculate trades.

Exact parity with every symbol visible on TradingView is not available through
TradingView widgets. Worldwide exchange coverage requires contracts and
entitlements from a provider or the exchanges themselves.

Players search crypto by name or ticker, inspect a verification card, and then
explicitly add the selected CoinGecko asset to the shared match. This prevents
unrelated assets that share a ticker from being silently substituted.
