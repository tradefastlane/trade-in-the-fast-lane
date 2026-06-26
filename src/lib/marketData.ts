import type { MarketState } from "../game/types";

export type CryptoSearchResult = {
  change24hPct: number | null;
  id: string;
  imageUrl: string;
  marketCap: number | null;
  marketCapRank: number | null;
  name: string;
  price: number | null;
  symbol: string;
  volume24h: number | null;
};

export type CryptoCoinDetail = {
  assetClass: "crypto";
  chain: string;
  change24hPct: number | null;
  contractAddress: string;
  contracts: Array<{ chain: string; address: string }>;
  imageUrl: string;
  marketCap: number | null;
  marketCapRank: number | null;
  marketKey: string;
  name: string;
  price: number;
  provider: "coingecko";
  providerId: string;
  providerSymbol: string;
  symbol: string;
  volume24h: number | null;
};

export type LiveMarketQuote = {
  assetClass: "stock" | "crypto";
  asOf: string;
  change24hPct: number | null;
  marketCap: number | null;
  marketKey: string;
  name: string;
  price: number;
  provider: "alpaca" | "coingecko";
  providerId: string;
  providerSymbol: string;
  symbol: string;
  volume24h: number | null;
};

type QuoteResponse = {
  error?: string;
  missing?: string[];
  quotes?: Record<string, LiveMarketQuote>;
};

const configuredBaseUrl = (import.meta.env.VITE_MARKET_API_URL as string | undefined)
  ?.trim()
  .replace(/\/$/, "");

export const marketApiBaseUrl = configuredBaseUrl || "";

async function apiJson<T>(path: string, timeoutMs = 8_000): Promise<T> {
  const bases = [...new Set([marketApiBaseUrl, ""])];
  let lastError: unknown = new Error("Market information is unavailable.");
  for (const base of bases) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${base}${path}`, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as T & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Market information is unavailable.");
      }
      return payload;
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timeout);
    }
  }
  if (lastError instanceof DOMException && lastError.name === "AbortError") {
    throw new Error("The market service took too long to respond.");
  }
  throw lastError;
}

const assetToken = (marketKey: string, market: MarketState) => {
  if (market.assetClass === "crypto" || market.provider === "coingecko") {
    const providerId = market.providerId || (marketKey === "BTC" ? "bitcoin" : "");
    return providerId ? `crypto:${providerId}` : "";
  }
  return `stock:${market.symbol}`;
};

export async function fetchMarketQuotes(markets: Record<string, MarketState>) {
  const keyByAsset = new Map<string, string>();
  Object.entries(markets).forEach(([marketKey, market]) => {
    const token = assetToken(marketKey, market);
    if (token) keyByAsset.set(token, marketKey);
  });
  if (!keyByAsset.size) return {};

  const payload = await apiJson<QuoteResponse>(
    `/api/quotes?assets=${encodeURIComponent([...keyByAsset.keys()].join(","))}`,
  );
  return Object.fromEntries(
    Object.entries(payload.quotes ?? {}).map(([assetKey, quote]) => [
      keyByAsset.get(assetKey) ?? assetKey,
      quote,
    ]),
  );
}

export async function searchCryptoCoins(query: string) {
  const payload = await apiJson<{ coins: CryptoSearchResult[] }>(
    `/api/crypto/search?q=${encodeURIComponent(query.trim())}`,
  );
  return payload.coins;
}

export async function fetchCryptoCoin(id: string) {
  const payload = await apiJson<{ coin: CryptoCoinDetail }>(
    `/api/crypto/coin?id=${encodeURIComponent(id)}`,
    12_000,
  );
  return payload.coin;
}
