import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.APCA_API_KEY_ID || "";
const API_SECRET = process.env.APCA_API_SECRET_KEY || "";
const DATA_BASE_URL = "https://data.alpaca.markets";
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

async function fetchQuotes(requested) {
  const now = Date.now();
  const result = {};
  const missing = requested.filter((item) => {
    const cached = quoteCache.get(item.gameSymbol);
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      result[item.gameSymbol] = cached.quote;
      return false;
    }
    return true;
  });

  const stocks = missing.filter((item) => item.assetClass === "stock");
  const crypto = missing.filter((item) => item.assetClass === "crypto");

  const [stockData, cryptoData] = await Promise.all([
    stocks.length
      ? alpaca("/v2/stocks/trades/latest", {
          feed: "iex",
          symbols: stocks.map((item) => item.providerSymbol).join(","),
        })
      : Promise.resolve({ trades: {} }),
    crypto.length
      ? alpaca("/v1beta3/crypto/us/latest/trades", {
          symbols: crypto.map((item) => item.providerSymbol).join(","),
        })
      : Promise.resolve({ trades: {} }),
  ]);

  for (const item of missing) {
    const trade =
      item.assetClass === "crypto"
        ? cryptoData.trades?.[item.providerSymbol]
        : stockData.trades?.[item.providerSymbol];
    const price = Number(trade?.p);
    if (!Number.isFinite(price) || price <= 0) continue;
    const quote = {
      assetClass: item.assetClass,
      asOf: trade.t || new Date().toISOString(),
      name: item.name,
      price,
      provider: "alpaca",
      providerSymbol: item.providerSymbol,
      symbol: item.gameSymbol,
    };
    result[item.gameSymbol] = quote;
    quoteCache.set(item.gameSymbol, { fetchedAt: now, quote });
  }

  return result;
}

async function handleApi(request, response, url) {
  if (url.pathname === "/health") {
    json(response, 200, {
      configured: Boolean(API_KEY && API_SECRET),
      service: "trade-in-the-fast-lane-market-api",
      status: "ok",
    });
    return true;
  }

  if (url.pathname !== "/api/quotes") return false;
  if (!API_KEY || !API_SECRET) {
    json(response, 503, { error: "Alpaca credentials are not configured on this service." });
    return true;
  }

  const rawSymbols = (url.searchParams.get("symbols") || "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .slice(0, 30);
  const requested = rawSymbols
    .map(normalizeRequestedSymbol)
    .filter(Boolean);
  if (!requested.length) {
    json(response, 400, { error: "Enter at least one valid stock or crypto ticker." });
    return true;
  }

  try {
    const quotes = await fetchQuotes(requested);
    const missing = requested
      .filter((item) => !quotes[item.gameSymbol])
      .map((item) => item.gameSymbol);
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
