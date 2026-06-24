export type LiveMarketQuote = {
  assetClass: "stock" | "crypto";
  asOf: string;
  name: string;
  price: number;
  provider: "alpaca";
  providerSymbol: string;
  symbol: string;
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

export async function fetchMarketQuotes(symbols: string[]) {
  const unique = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
  if (!unique.length) return {};

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(
      `${marketApiBaseUrl}/api/quotes?symbols=${encodeURIComponent(unique.join(","))}`,
      { signal: controller.signal },
    );
    const payload = (await response.json()) as QuoteResponse;
    if (!response.ok) {
      throw new Error(payload.error || "Live prices are unavailable.");
    }
    return payload.quotes ?? {};
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The live price service took too long to respond.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchMarketQuote(symbol: string) {
  const quotes = await fetchMarketQuotes([symbol]);
  const quote = Object.values(quotes)[0];
  if (!quote) {
    throw new Error(`No Alpaca price was found for ${symbol.trim().toUpperCase()}.`);
  }
  return quote;
}
