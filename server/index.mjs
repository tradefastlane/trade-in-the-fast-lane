import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.APCA_API_KEY_ID || "";
const API_SECRET = process.env.APCA_API_SECRET_KEY || "";
const DATA_BASE_URL = "https://data.alpaca.markets";
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "";
const COINGECKO_PRO_API_KEY = process.env.COINGECKO_PRO_API_KEY || "";
const COINGECKO_BASE_URL = COINGECKO_PRO_API_KEY
  ? "https://pro-api.coingecko.com/api/v3"
  : "https://api.coingecko.com/api/v3";
const DIST_DIR = fileURLToPath(new URL("../dist/", import.meta.url));
const CACHE_TTL_MS = 2_500;
const quoteCache = new Map();

const cryptoNames = {
  AAVE: "Aave / U.S. Dollar",
  AVAX: "Avalanche / U.S. Dollar",
  BCH: "Bitcoin Cash / U.S. Dollar",
  BTC: "Bitcoin / U.S. Dollar",
  DOGE: "Dogecoin / U.S. Dollar",
  DOT: "Polkadot / U.S. Dollar",
  ETH: "Ethereum / U.S. Dollar",
  LINK: "Chainlink / U.S. Dollar",
  LTC: "Litecoin / U.S. Dollar",
  SHIB: "Shiba Inu / U.S. Dollar",
  SOL: "Solana / U.S. Dollar",
  UNI: "Uniswap / U.S. Dollar",
  USDC: "USD Coin / U.S. Dollar",
  USDT: "Tether / U.S. Dollar",
  XRP: "XRP / U.S. Dollar",
};

const stockNames = {
  AAPL: "Apple",
  AMD: "Advanced Micro Devices",
  AMZN: "Amazon",
  GOOGL: "Alphabet",
  META: "Meta Platforms",
  MSFT: "Microsoft",
  NFLX: "Netflix",
  NVDA: "NVIDIA",
  SPY: "SPDR S&P 500 ETF",
  TSLA: "Tesla",
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function json(response, status, body) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function normalizeRequestedSymbol(value) {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return null;

  const slashMatch = cleaned.match(/^([A-Z0-9]{2,10})\/USD$/);
  if (slashMatch) {
    const base = slashMatch[1];
    return {
      assetClass: "crypto",
      gameSymbol: base,
      name: cryptoNames[base] || `${base} / U.S. Dollar`,
      providerSymbol: `${base}/USD`,
    };
  }

  const compactCryptoMatch = cleaned.match(/^([A-Z0-9]{2,10})USD$/);
  if (compactCryptoMatch && cryptoNames[compactCryptoMatch[1]]) {
    const base = compactCryptoMatch[1];
    return {
      assetClass: "crypto",
      gameSymbol: base,
      name: cryptoNames[base],
      providerSymbol: `${base}/USD`,
    };
  }

  if (cryptoNames[cleaned]) {
    return {
      assetClass: "crypto",
      gameSymbol: cleaned,
      name: cryptoNames[cleaned],
      providerSymbol: `${cleaned}/USD`,
    };
  }

  if (!/^[A-Z][A-Z0-9.-]{0,14}$/.test(cleaned)) return null;
  return {
    assetClass: "stock",
    gameSymbol: cleaned,
    name: stockNames[cleaned] || cleaned,
    providerSymbol: cleaned,
  };
}

async function alpaca(pathname, searchParams) {
  const url = new URL(pathname, DATA_BASE_URL);
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  const response = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID": API_KEY,
      "APCA-API-SECRET-KEY": API_SECRET,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Alpaca returned ${response.status}: ${message.slice(0, 180)}`);
  }
  return response.json();
}

async function coingecko(pathname, searchParams = {}) {
  const url = new URL(`${COINGECKO_BASE_URL}${pathname}`);
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  const headers = {};
  if (COINGECKO_PRO_API_KEY) headers["x-cg-pro-api-key"] = COINGECKO_PRO_API_KEY;
  else if (COINGECKO_API_KEY) headers["x-cg-demo-api-key"] = COINGECKO_API_KEY;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`CoinGecko returned ${response.status}: ${message.slice(0, 180)}`);
  }
  return response.json();
}

function parseAssetToken(value) {
  const [kind, ...rest] = value.split(":");
  const id = rest.join(":").trim();
  if (kind === "crypto" && /^[a-z0-9-]{1,100}$/.test(id)) {
    return { assetClass: "crypto", gameKey: `crypto:${id}`, providerId: id };
  }
  if (kind === "stock" && /^[A-Z][A-Z0-9.-]{0,14}$/.test(id.toUpperCase())) {
    const symbol = id.toUpperCase();
    return {
      assetClass: "stock",
      gameKey: symbol,
      gameSymbol: symbol,
      name: stockNames[symbol] || symbol,
      providerId: symbol,
      providerSymbol: symbol,
    };
  }
  return null;
}

async function fetchQuotes(requested) {
  const now = Date.now();
  const result = {};
  const missing = requested.filter((item) => {
    const cached = quoteCache.get(item.gameKey);
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      result[item.gameKey] = cached.quote;
      return false;
    }
    return true;
  });

  const stocks = missing.filter((item) => item.assetClass === "stock");
  const crypto = missing.filter((item) => item.assetClass === "crypto");

  const [stockData, cryptoData] = await Promise.all([
    stocks.length && API_KEY && API_SECRET
      ? alpaca("/v2/stocks/trades/latest", {
          feed: "iex",
          symbols: stocks.map((item) => item.providerSymbol).join(","),
        })
      : Promise.resolve({ trades: {} }),
    crypto.length
      ? coingecko("/simple/price", {
          ids: crypto.map((item) => item.providerId).join(","),
          vs_currencies: "usd",
          include_market_cap: "true",
          include_24hr_vol: "true",
          include_24hr_change: "true",
          include_last_updated_at: "true",
          precision: "full",
        })
      : Promise.resolve({}),
  ]);

  for (const item of missing) {
    const cryptoQuote = item.assetClass === "crypto" ? cryptoData[item.providerId] : null;
    const trade = item.assetClass === "stock" ? stockData.trades?.[item.providerSymbol] : null;
    const price = Number(item.assetClass === "crypto" ? cryptoQuote?.usd : trade?.p);
    if (!Number.isFinite(price) || price <= 0) continue;
    const quote = {
      assetClass: item.assetClass,
      asOf:
        item.assetClass === "crypto" && cryptoQuote?.last_updated_at
          ? new Date(cryptoQuote.last_updated_at * 1000).toISOString()
          : trade?.t || new Date().toISOString(),
      change24hPct: Number(cryptoQuote?.usd_24h_change) || null,
      marketCap: Number(cryptoQuote?.usd_market_cap) || null,
      marketKey: item.gameKey,
      name: item.name || item.providerId,
      price,
      provider: item.assetClass === "crypto" ? "coingecko" : "alpaca",
      providerId: item.providerId,
      providerSymbol: item.providerSymbol || item.providerId,
      symbol: item.gameSymbol || item.providerId.toUpperCase(),
      volume24h: Number(cryptoQuote?.usd_24h_vol) || null,
    };
    result[item.gameKey] = quote;
    quoteCache.set(item.gameKey, { fetchedAt: now, quote });
  }

  return result;
}

async function handleApi(request, response, url) {
  if (url.pathname === "/health") {
    json(response, 200, {
      alpacaConfigured: Boolean(API_KEY && API_SECRET),
      coingeckoConfigured: Boolean(COINGECKO_API_KEY || COINGECKO_PRO_API_KEY),
      service: "trade-in-the-fast-lane-market-api",
      status: "ok",
    });
    return true;
  }

  if (url.pathname === "/api/crypto/search") {
    const query = (url.searchParams.get("q") || "").trim();
    if (query.length < 2) {
      json(response, 400, { error: "Type at least two letters to search crypto." });
      return true;
    }
    try {
      const data = await coingecko("/search", { query });
      json(response, 200, {
        coins: (data.coins || []).slice(0, 12).map((coin) => ({
          id: coin.id,
          imageUrl: coin.large || coin.thumb || "",
          marketCapRank: coin.market_cap_rank || null,
          name: coin.name,
          symbol: String(coin.symbol || "").toUpperCase(),
        })),
      });
    } catch (error) {
      console.error(error);
      json(response, 502, { error: "Crypto search is temporarily unavailable." });
    }
    return true;
  }

  if (url.pathname === "/api/crypto/coin") {
    const id = (url.searchParams.get("id") || "").trim().toLowerCase();
    if (!/^[a-z0-9-]{1,100}$/.test(id)) {
      json(response, 400, { error: "Choose a valid crypto search result." });
      return true;
    }
    try {
      const coin = await coingecko(`/coins/${encodeURIComponent(id)}`, {
        localization: "false",
        tickers: "false",
        community_data: "false",
        developer_data: "false",
        sparkline: "false",
      });
      const contracts = Object.entries(coin.platforms || {})
        .filter(([, address]) => typeof address === "string" && address.trim())
        .map(([chain, address]) => ({ chain, address }))
        .slice(0, 8);
      json(response, 200, {
        coin: {
          assetClass: "crypto",
          chain: coin.asset_platform_id || "native blockchain",
          change24hPct: coin.market_data?.price_change_percentage_24h ?? null,
          contractAddress:
            contracts.find((contract) => contract.chain === coin.asset_platform_id)?.address ||
            contracts[0]?.address ||
            "",
          contracts,
          imageUrl: coin.image?.large || coin.image?.small || coin.image?.thumb || "",
          marketCap: coin.market_data?.market_cap?.usd ?? null,
          marketCapRank: coin.market_cap_rank ?? null,
          marketKey: `crypto:${coin.id}`,
          name: coin.name,
          price: coin.market_data?.current_price?.usd ?? null,
          provider: "coingecko",
          providerId: coin.id,
          providerSymbol: coin.id,
          symbol: String(coin.symbol || "").toUpperCase(),
          volume24h: coin.market_data?.total_volume?.usd ?? null,
        },
      });
    } catch (error) {
      console.error(error);
      json(response, 502, { error: "That coin's details could not be loaded." });
    }
    return true;
  }

  if (url.pathname !== "/api/quotes") return false;
  const rawAssets = (url.searchParams.get("assets") || "")
    .split(",")
    .map((asset) => asset.trim())
    .filter(Boolean)
    .slice(0, 30);
  const legacySymbols = (url.searchParams.get("symbols") || "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .slice(0, 30);
  const requested = rawAssets.length
    ? rawAssets.map(parseAssetToken).filter(Boolean)
    : legacySymbols.map((symbol) => {
        const normalized = normalizeRequestedSymbol(symbol);
        if (!normalized) return null;
        return {
          ...normalized,
          gameKey: normalized.gameSymbol,
          providerId: normalized.providerSymbol,
        };
      }).filter(Boolean);
  if (!requested.length) {
    json(response, 400, { error: "Enter at least one valid market." });
    return true;
  }
  try {
    const quotes = await fetchQuotes(requested);
    const missing = requested
      .filter((item) => !quotes[item.gameKey])
      .map((item) => item.gameKey);
    json(response, 200, {
      missing,
      quotes,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    json(response, 502, {
      error: "The live market feed could not be reached.",
    });
  }
  return true;
}

async function serveStatic(response, pathname) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(DIST_DIR, safePath);

  try {
    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) filePath = join(filePath, "index.html");
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    try {
      const body = await readFile(join(DIST_DIR, "index.html"));
      response.writeHead(200, {
        "Cache-Control": "no-cache",
        "Content-Type": "text/html; charset=utf-8",
      });
      response.end(body);
    } catch {
      json(response, 404, { error: "Frontend build not found." });
    }
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method !== "GET") {
    json(response, 405, { error: "Method not allowed." });
    return;
  }
  if (await handleApi(request, response, url)) return;
  await serveStatic(response, url.pathname);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Trade in the Fast Lane listening on 0.0.0.0:${PORT}`);
});
