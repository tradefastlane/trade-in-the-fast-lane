# Live market data

TradingView widgets may be embedded for chart display, but TradingView does not
provide an API that lets this game read or export the widget prices. The game
must receive executable prices from a licensed market-data provider.

Recommended first production feed:

- Alpaca Market Data for searchable US equities and crypto.
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

The current implementation supports Alpaca-covered US equities and supported
USD crypto pairs. Players type a ticker and press **Load** to add it to the
shared match.
