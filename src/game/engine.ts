import {
  STARTING_CASH,
  assetCatalog,
  avatars,
  homeOptions,
  marketSeeds,
} from "./catalog";
import type {
  AvatarId,
  GameEvent,
  GameSnapshot,
  Holding,
  MarketState,
  OwnedAsset,
  PlayerState,
} from "./types";

const nowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[01IO]/g, "X");

export const makePlayer = (
  id: string,
  name: string,
  avatar: AvatarId,
): PlayerState => ({
  id,
  name: name.trim() || "Unnamed Broker",
  avatar,
  color: avatars[avatar].color,
  cash: STARTING_CASH,
  happiness: homeOptions[0].happiness,
  stress: 12,
  homeId: homeOptions[0].id,
  holdings: {},
  assets: [],
  ready: false,
  latestTrade: "No trades yet",
  bestTrade: "No closed profit yet",
  connectedAt: Date.now(),
});

const makeMarket = (symbol: string, name: string, price: number): MarketState => ({
  symbol,
  name,
  price,
  openingPrice: price,
  history: Array.from({ length: 24 }, (_, index) => price * (0.985 + index * 0.0007)),
});

export const createGameSnapshot = (
  hostId: string,
  hostName: string,
  avatar: AvatarId,
  durationMinutes: 15 | 30 | 60,
): GameSnapshot => {
  const code = createCode();
  const markets = Object.fromEntries(
    marketSeeds.map((market) => [
      market.symbol,
      makeMarket(market.symbol, market.name, market.price),
    ]),
  );
  return {
    id: crypto.randomUUID(),
    code,
    hostId,
    status: "lobby",
    durationMinutes,
    createdAt: Date.now(),
    startedAt: null,
    endsAt: null,
    winnerId: null,
    players: {
      [hostId]: makePlayer(hostId, hostName, avatar),
    },
    markets,
    events: [
      {
        id: nowId(),
        at: Date.now(),
        type: "system",
        title: "Lobby opened",
        detail: `${hostName} is assembling a dangerously confident group of friends.`,
      },
    ],
    lastMarketTick: Date.now(),
    nextIncidentAt: Date.now() + 35_000,
    nextBillingAt: Date.now() + durationMinutes * 60_000 / 6,
  };
};

export const getHome = (id: string) =>
  homeOptions.find((home) => home.id === id) ?? homeOptions[0];

export const getCatalogAsset = (id: string) =>
  assetCatalog.find((asset) => asset.id === id);

export const portfolioValue = (
  player: PlayerState,
  markets: GameSnapshot["markets"],
) =>
  Object.entries(player.holdings).reduce(
    (total, [symbol, holding]) =>
      total + holding.shares * (markets[symbol]?.price ?? 0),
    0,
  );

export const possessionsValue = (player: PlayerState) =>
  player.assets.reduce((total, asset) => total + asset.currentValue, 0);

export const netWorth = (
  player: PlayerState,
  markets: GameSnapshot["markets"],
) =>
  player.cash +
  portfolioValue(player, markets) +
  possessionsValue(player) +
  getHome(player.homeId).resaleValue;

export const happinessMultiplier = (happiness: number) =>
  0.85 + Math.max(0, Math.min(100, happiness)) * 0.002;

export const finalScore = (
  player: PlayerState,
  markets: GameSnapshot["markets"],
) => netWorth(player, markets) * happinessMultiplier(player.happiness);

export const addEvent = (
  snapshot: GameSnapshot,
  event: Omit<GameEvent, "id" | "at">,
) => {
  snapshot.events = [
    { ...event, id: nowId(), at: Date.now() },
    ...snapshot.events,
  ].slice(0, 16);
};

export const buyStock = (
  snapshot: GameSnapshot,
  playerId: string,
  symbol: string,
  amount: number,
) => {
  const player = snapshot.players[playerId];
  const market = snapshot.markets[symbol];
  if (!player || !market || amount <= 0 || player.cash < amount) return false;

  const shares = amount / market.price;
  const existing = player.holdings[symbol] ?? { shares: 0, averagePrice: 0 };
  const newShares = existing.shares + shares;
  const averagePrice =
    (existing.shares * existing.averagePrice + amount) / newShares;

  player.cash -= amount;
  player.holdings[symbol] = { shares: newShares, averagePrice };
  player.latestTrade = `Bought ${symbol} for ${formatMoney(amount)}`;
  player.stress = Math.min(100, player.stress + 2);
  addEvent(snapshot, {
    type: "trade",
    playerId,
    title: `${player.name} bought ${symbol}`,
    detail: `${formatMoney(amount)} entered the market at ${formatMoney(market.price)}.`,
  });
  return true;
};

export const sellStock = (
  snapshot: GameSnapshot,
  playerId: string,
  symbol: string,
) => {
  const player = snapshot.players[playerId];
  const market = snapshot.markets[symbol];
  const holding = player?.holdings[symbol];
  if (!player || !market || !holding || holding.shares <= 0) return false;

  const saleValue = holding.shares * market.price;
  const cost = holding.shares * holding.averagePrice;
  const profit = saleValue - cost;
  player.cash += saleValue;
  delete player.holdings[symbol];
  player.latestTrade = `Sold ${symbol}: ${signedMoney(profit)}`;
  if (profit > 0 && (!player.bestTrade.includes("+") || parseTradeProfit(player.bestTrade) < profit)) {
    player.bestTrade = `${symbol} ${signedMoney(profit)}`;
  }
  player.happiness = Math.max(0, Math.min(100, player.happiness + (profit >= 0 ? 2 : -3)));
  player.stress = Math.max(0, Math.min(100, player.stress + (profit >= 0 ? -4 : 8)));
  addEvent(snapshot, {
    type: "trade",
    playerId,
    title: `${player.name} closed ${symbol}`,
    detail: `The position settled at ${signedMoney(profit)}.`,
    positive: profit >= 0,
  });
  return true;
};

export const moveHome = (
  snapshot: GameSnapshot,
  playerId: string,
  homeId: string,
) => {
  const player = snapshot.players[playerId];
  const home = getHome(homeId);
  if (!player || player.homeId === homeId || player.cash < home.moveInCost) return false;
  player.cash -= home.moveInCost;
  player.homeId = home.id;
  player.happiness = Math.max(player.happiness, home.happiness);
  player.stress = Math.max(0, player.stress - 4);
  addEvent(snapshot, {
    type: "life",
    playerId,
    title: `${player.name} moved into ${home.name}`,
    detail: `${formatMoney(home.moveInCost)} bought a better view and ${home.happiness} baseline happiness.`,
    positive: true,
  });
  return true;
};

export const buyAsset = (
  snapshot: GameSnapshot,
  playerId: string,
  catalogId: string,
  insure: boolean,
) => {
  const player = snapshot.players[playerId];
  const item = getCatalogAsset(catalogId);
  if (!player || !item) return false;
  const premium = insure ? item.price * item.insuranceRate : 0;
  const total = item.price + premium;
  if (player.cash < total) return false;

  const owned: OwnedAsset = {
    instanceId: crypto.randomUUID(),
    catalogId,
    purchasePrice: item.price,
    currentValue: item.price,
    insured: insure,
  };
  player.cash -= total;
  player.assets.push(owned);
  player.happiness = Math.min(100, player.happiness + item.happiness);
  addEvent(snapshot, {
    type: "life",
    playerId,
    title: `${player.name} bought ${item.name}`,
    detail: insure
      ? `${formatMoney(item.price)} plus ${formatMoney(premium)} insurance.`
      : `${formatMoney(item.price)}, uninsured and living dangerously.`,
    positive: true,
  });
  return true;
};

export const insureAsset = (
  snapshot: GameSnapshot,
  playerId: string,
  instanceId: string,
) => {
  const player = snapshot.players[playerId];
  const owned = player?.assets.find((asset) => asset.instanceId === instanceId);
  const item = owned ? getCatalogAsset(owned.catalogId) : undefined;
  if (!player || !owned || !item || owned.insured) return false;
  const premium = owned.currentValue * item.insuranceRate;
  if (player.cash < premium) return false;
  player.cash -= premium;
  owned.insured = true;
  addEvent(snapshot, {
    type: "insurance",
    playerId,
    title: `${item.name} is now insured`,
    detail: `${player.name} paid ${formatMoney(premium)} for the remainder of the match.`,
    positive: true,
  });
  return true;
};

export const sellAsset = (
  snapshot: GameSnapshot,
  playerId: string,
  instanceId: string,
) => {
  const player = snapshot.players[playerId];
  const index = player?.assets.findIndex((asset) => asset.instanceId === instanceId) ?? -1;
  if (!player || index < 0) return false;
  const [owned] = player.assets.splice(index, 1);
  const item = getCatalogAsset(owned.catalogId);
  player.cash += owned.currentValue;
  player.happiness = Math.max(0, player.happiness - (item?.happiness ?? 0));
  addEvent(snapshot, {
    type: "life",
    playerId,
    title: `${player.name} sold ${item?.name ?? "an asset"}`,
    detail: `${formatMoney(owned.currentValue)} returned to cash.`,
    positive: owned.currentValue >= owned.purchasePrice,
  });
  return true;
};

export const tickGame = (snapshot: GameSnapshot, at = Date.now()) => {
  if (snapshot.status !== "playing") return;
  const elapsedSeconds = Math.max(1, (at - snapshot.lastMarketTick) / 1000);

  Object.values(snapshot.markets).forEach((market, index) => {
    const volatility = market.symbol === "BTC" ? 0.006 : 0.0035;
    const drift = Math.sin(at / 45_000 + index) * 0.00025;
    const movement = ((Math.random() - 0.49) * volatility + drift) * Math.sqrt(elapsedSeconds);
    market.price = Math.max(1, market.price * (1 + movement));
    market.history = [...market.history.slice(-39), market.price];
  });

  Object.values(snapshot.players).forEach((player) => {
    player.assets.forEach((owned) => {
      const item = getCatalogAsset(owned.catalogId);
      if (!item) return;
      const movement =
        ((Math.random() - 0.47) * item.volatility) * Math.sqrt(elapsedSeconds);
      owned.currentValue = Math.max(
        owned.purchasePrice * 0.45,
        owned.currentValue * (1 + movement),
      );
    });
    player.stress = Math.max(0, Math.min(100, player.stress - 0.08 * elapsedSeconds));
  });

  if (at >= snapshot.nextBillingAt) {
    Object.values(snapshot.players).forEach((player) => {
      const home = getHome(player.homeId);
      const insuredUpkeep = player.assets
        .filter((asset) => asset.insured)
        .reduce((sum, asset) => {
          const item = getCatalogAsset(asset.catalogId);
          return sum + asset.currentValue * (item?.insuranceRate ?? 0) * 0.18;
        }, 0);
      const bill = home.upkeep + insuredUpkeep;
      player.cash = Math.max(0, player.cash - bill);
      player.happiness = Math.max(0, player.happiness - (player.cash === 0 ? 4 : 0));
      addEvent(snapshot, {
        type: "life",
        playerId: player.id,
        title: `${player.name}'s bills cleared`,
        detail: `${formatMoney(bill)} paid for housing and active insurance.`,
      });
    });
    snapshot.nextBillingAt =
      at + snapshot.durationMinutes * 60_000 / 6;
  }

  if (at >= snapshot.nextIncidentAt) {
    runIncident(snapshot);
    snapshot.nextIncidentAt = at + 28_000 + Math.random() * 35_000;
  }

  snapshot.lastMarketTick = at;

  if (snapshot.endsAt && at >= snapshot.endsAt) finishGame(snapshot);
};

export const finishGame = (snapshot: GameSnapshot) => {
  snapshot.status = "finished";
  const ranking = Object.values(snapshot.players).sort(
    (a, b) => finalScore(b, snapshot.markets) - finalScore(a, snapshot.markets),
  );
  snapshot.winnerId = ranking[0]?.id ?? null;
  if (ranking[0]) {
    addEvent(snapshot, {
      type: "system",
      playerId: ranking[0].id,
      title: `${ranking[0].name} wins the Fast Lane`,
      detail: `Final life-adjusted score: ${formatMoney(finalScore(ranking[0], snapshot.markets))}.`,
      positive: true,
    });
  }
};

const runIncident = (snapshot: GameSnapshot) => {
  const candidates = Object.values(snapshot.players).filter((player) => player.assets.length);
  if (!candidates.length) return;
  const player = candidates[Math.floor(Math.random() * candidates.length)];
  const owned = player.assets[Math.floor(Math.random() * player.assets.length)];
  const item = getCatalogAsset(owned.catalogId);
  if (!item) return;

  if (owned.insured) {
    player.stress = Math.min(100, player.stress + 3);
    addEvent(snapshot, {
      type: "insurance",
      playerId: player.id,
      title: `${item.name} survived an incident`,
      detail: `Insurance covered the loss. ${player.name} keeps the asset.`,
      positive: true,
    });
    return;
  }

  player.assets = player.assets.filter((asset) => asset.instanceId !== owned.instanceId);
  player.happiness = Math.max(0, player.happiness - item.happiness - 5);
  player.stress = Math.min(100, player.stress + 18);
  addEvent(snapshot, {
    type: "insurance",
    playerId: player.id,
    title: `${item.name} was lost`,
    detail: `An uninsured ${item.category === "car" ? "accident" : "burglary"} wiped out ${formatMoney(owned.currentValue)}.`,
  });
};

const parseTradeProfit = (trade: string) => {
  const digits = trade.replace(/[^\d.-]/g, "");
  return Number(digits) || 0;
};

export const formatMoney = (value: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(value);

export const signedMoney = (value: number) =>
  `${value >= 0 ? "+" : "−"}${formatMoney(Math.abs(value))}`;

export const holdingProfit = (holding: Holding, price: number) =>
  holding.shares * (price - holding.averagePrice);
