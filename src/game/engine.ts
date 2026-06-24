import {
  STARTING_CASH,
  assetCatalog,
  avatars,
  botProfiles,
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
  PositionSide,
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
  isBot: false,
  botSkill: 0,
  nextBotActionAt: 0,
});

const makeMarket = (
  symbol: string,
  name: string,
  price: number,
  source: MarketState["source"] = "simulated",
): MarketState => ({
  symbol,
  name,
  price,
  openingPrice: price,
  history: Array.from({ length: 24 }, (_, index) => price * (0.985 + index * 0.0007)),
  source,
  lastUpdatedAt: Date.now(),
});

export const upsertLiveMarket = (
  snapshot: GameSnapshot,
  quote: { symbol: string; name: string; price: number },
) => {
  const symbol = quote.symbol.trim().toUpperCase();
  if (!symbol || !Number.isFinite(quote.price) || quote.price <= 0) return false;
  const existing = snapshot.markets[symbol];
  if (existing) {
    existing.name = quote.name || existing.name;
    existing.price = quote.price;
    existing.history = [...existing.history.slice(-39), quote.price];
    existing.source = "alpaca";
    existing.lastUpdatedAt = Date.now();
  } else {
    snapshot.markets[symbol] = makeMarket(symbol, quote.name || symbol, quote.price, "alpaca");
  }
  return true;
};

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

export const addEvent = (
  snapshot: GameSnapshot,
  event: Omit<GameEvent, "id" | "at">,
) => {
  snapshot.events = [
    { ...event, id: nowId(), at: Date.now() },
    ...snapshot.events,
  ].slice(0, 16);
};

export const addSmartBot = (snapshot: GameSnapshot) => {
  if (Object.keys(snapshot.players).length >= 4) return false;
  const existingNames = new Set(Object.values(snapshot.players).map((player) => player.name));
  const profile =
    botProfiles.find((candidate) => !existingNames.has(candidate.name)) ??
    botProfiles[Math.floor(Math.random() * botProfiles.length)];
  const id = `bot-${crypto.randomUUID()}`;
  const bot = makePlayer(id, profile.name, profile.avatar);
  bot.isBot = true;
  bot.ready = true;
  bot.botSkill = profile.skill;
  bot.nextBotActionAt = Date.now() + 4_000 + Math.random() * 5_000;
  snapshot.players[id] = bot;
  addEvent(snapshot, {
    type: "system",
    playerId: id,
    title: `${bot.name} joined as a smart bot`,
    detail: "It has read three finance books and misunderstood only one of them.",
    positive: true,
  });
  return true;
};

export const removeBot = (snapshot: GameSnapshot, playerId: string) => {
  const player = snapshot.players[playerId];
  if (!player?.isBot || snapshot.status !== "lobby") return false;
  delete snapshot.players[playerId];
  addEvent(snapshot, {
    type: "system",
    title: `${player.name} was dismissed`,
    detail: "The algorithm has been escorted from the lobby.",
  });
  return true;
};

const normalizeLegacyHolding = (
  holding: Holding,
  fallbackSymbol = "",
  fallbackId = fallbackSymbol || crypto.randomUUID(),
) => {
  holding.id ??= fallbackId;
  if (!holding.symbol && fallbackSymbol) holding.symbol = fallbackSymbol;
  holding.openedAt ??= Date.now();
  holding.side ??= "long";
  holding.leverage ??= 1;
  holding.margin ??= holding.shares * holding.averagePrice;
  holding.stopLossPct ??= 0;
  holding.takeProfitPct ??= 0;
  holding.trailingPct ??= 0;
  holding.bestRoiPct ??= 0;
};

export const positionProfit = (holding: Holding, price: number) => {
  normalizeLegacyHolding(holding);
  const movement = price - holding.averagePrice;
  return holding.shares * movement * (holding.side === "short" ? -1 : 1);
};

export const positionEquity = (holding: Holding, price: number) => {
  normalizeLegacyHolding(holding);
  return Math.max(0, holding.margin + positionProfit(holding, price));
};

export const positionRoiPct = (holding: Holding, price: number) => {
  normalizeLegacyHolding(holding);
  return holding.margin > 0 ? (positionProfit(holding, price) / holding.margin) * 100 : 0;
};

export const portfolioValue = (
  player: PlayerState,
  markets: GameSnapshot["markets"],
) =>
  Object.entries(player.holdings).reduce(
    (total, [positionId, holding]) => {
      normalizeLegacyHolding(holding, positionId, positionId);
      return total + positionEquity(
        holding,
        markets[holding.symbol]?.price ?? holding.averagePrice,
      );
    },
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

export const buyStock = (
  snapshot: GameSnapshot,
  playerId: string,
  symbol: string,
  amount: number,
  options: {
    side: PositionSide;
    leverage: number;
    stopLossPct: number;
    takeProfitPct: number;
    trailingPct: number;
  },
) => {
  const player = snapshot.players[playerId];
  const market = snapshot.markets[symbol];
  if (
    !player ||
    !market ||
    amount <= 0 ||
    player.cash < amount
  ) {
    return false;
  }

  const leverage = Math.max(1, Math.min(100, Math.round(options.leverage)));
  const notional = amount * leverage;
  const positionId = crypto.randomUUID();
  player.cash -= amount;
  player.holdings[positionId] = {
    id: positionId,
    symbol,
    openedAt: Date.now(),
    shares: notional / market.price,
    averagePrice: market.price,
    side: options.side,
    leverage,
    margin: amount,
    stopLossPct: Math.max(0, options.stopLossPct),
    takeProfitPct: Math.max(0, options.takeProfitPct),
    trailingPct: Math.max(0, options.trailingPct),
    bestRoiPct: 0,
  };
  player.latestTrade = `Opened ${options.side.toUpperCase()} ${symbol} at ${leverage}×`;
  player.stress = Math.min(100, player.stress + Math.min(14, leverage * 0.12));
  addEvent(snapshot, {
    type: "trade",
    playerId,
    title: `${player.name} opened ${leverage}× ${options.side.toUpperCase()} ${symbol}`,
    detail: `${formatMoney(amount)} margin controls ${formatMoney(notional)} of exposure.`,
  });
  return true;
};

export const sellStock = (
  snapshot: GameSnapshot,
  playerId: string,
  positionId: string,
  reason = "manual exit",
) => {
  const player = snapshot.players[playerId];
  const holding = player?.holdings[positionId];
  if (holding) normalizeLegacyHolding(holding, positionId, positionId);
  const market = holding ? snapshot.markets[holding.symbol] : undefined;
  if (!player || !market || !holding || holding.shares <= 0) return false;
  closePosition(snapshot, player, positionId, market.price, reason);
  return true;
};

const closePosition = (
  snapshot: GameSnapshot,
  player: PlayerState,
  positionId: string,
  price: number,
  reason: string,
) => {
  const holding = player.holdings[positionId];
  if (!holding) return;
  normalizeLegacyHolding(holding, positionId, positionId);
  const symbol = holding.symbol;
  const profit = positionProfit(holding, price);
  const returned = positionEquity(holding, price);
  player.cash += returned;
  delete player.holdings[positionId];
  player.latestTrade = `${holding.side.toUpperCase()} ${symbol} ${signedMoney(profit)}`;
  if (
    profit > 0 &&
    (!player.bestTrade.includes("+") || parseTradeProfit(player.bestTrade) < profit)
  ) {
    player.bestTrade = `${symbol} ${signedMoney(profit)}`;
  }
  player.happiness = Math.max(
    0,
    Math.min(100, player.happiness + (profit >= 0 ? 2 : -4)),
  );
  player.stress = Math.max(
    0,
    Math.min(100, player.stress + (profit >= 0 ? -5 : 10)),
  );
  addEvent(snapshot, {
    type: "trade",
    playerId: player.id,
    title: `${player.name}'s ${symbol} position closed`,
    detail: `${reason}: ${signedMoney(profit)} at ${holding.leverage}× leverage.`,
    positive: profit >= 0,
  });
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

export const tickGame = (
  snapshot: GameSnapshot,
  at = Date.now(),
  livePrices: Record<string, number> = {},
) => {
  if (snapshot.status !== "playing") return;
  const elapsedSeconds = Math.max(1, (at - snapshot.lastMarketTick) / 1000);

  Object.values(snapshot.markets).forEach((market, index) => {
    const livePrice = Number(livePrices[market.symbol]);
    if (Number.isFinite(livePrice) && livePrice > 0) {
      market.price = livePrice;
      market.history = [...market.history.slice(-39), livePrice];
      market.source = "alpaca";
      market.lastUpdatedAt = at;
      return;
    }
    if (market.source === "alpaca") return;
    const volatility = market.symbol === "BTC" ? 0.007 : 0.0045;
    const drift = Math.sin(at / 45_000 + index) * 0.0003;
    const movement = ((Math.random() - 0.49) * volatility + drift) * Math.sqrt(elapsedSeconds);
    market.price = Math.max(1, market.price * (1 + movement));
    market.history = [...market.history.slice(-39), market.price];
    market.source = "simulated";
    market.lastUpdatedAt = at;
  });

  Object.values(snapshot.players).forEach((player) => {
    Object.entries(player.holdings).forEach(([positionId, holding]) => {
      normalizeLegacyHolding(holding, positionId, positionId);
      const market = snapshot.markets[holding.symbol];
      if (!market) return;
      const roi = positionRoiPct(holding, market.price);
      holding.bestRoiPct = Math.max(holding.bestRoiPct, roi);

      let reason = "";
      if (roi <= -95) reason = "margin liquidation";
      else if (holding.stopLossPct > 0 && roi <= -holding.stopLossPct) reason = "stop loss";
      else if (holding.takeProfitPct > 0 && roi >= holding.takeProfitPct) reason = "take profit";
      else if (
        holding.trailingPct > 0 &&
        holding.bestRoiPct >= holding.trailingPct &&
        roi <= holding.bestRoiPct - holding.trailingPct
      ) {
        reason = "trailing exit";
      }
      if (reason) closePosition(snapshot, player, positionId, market.price, reason);
    });

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

    if (player.isBot && at >= player.nextBotActionAt) {
      runBotAction(snapshot, player, at);
    }
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
    snapshot.nextBillingAt = at + snapshot.durationMinutes * 60_000 / 6;
  }

  if (at >= snapshot.nextIncidentAt) {
    runIncident(snapshot);
    snapshot.nextIncidentAt = at + 28_000 + Math.random() * 35_000;
  }

  snapshot.lastMarketTick = at;
  if (snapshot.endsAt && at >= snapshot.endsAt) finishGame(snapshot);
};

const marketMomentum = (market: MarketState) => {
  const lookback = market.history.slice(-7);
  if (lookback.length < 2) return 0;
  return (lookback[lookback.length - 1] / lookback[0] - 1) * 100;
};

const runBotAction = (
  snapshot: GameSnapshot,
  player: PlayerState,
  at: number,
) => {
  player.nextBotActionAt = at + 6_000 + Math.random() * 9_000;
  const openPositions = Object.entries(player.holdings).map(([positionId, holding]) => {
    normalizeLegacyHolding(holding, positionId, positionId);
    return [positionId, holding] as const;
  });

  if (openPositions.length) {
    const closeCandidate = openPositions
      .map(([positionId, holding]) => ({
        positionId,
        symbol: holding.symbol,
        roi: positionRoiPct(
          holding,
          snapshot.markets[holding.symbol]?.price ?? holding.averagePrice,
        ),
        momentum: marketMomentum(snapshot.markets[holding.symbol]),
        side: holding.side,
      }))
      .sort((a, b) => Math.abs(b.roi) - Math.abs(a.roi))[0];
    const momentumTurned =
      (closeCandidate.side === "long" && closeCandidate.momentum < -0.08) ||
      (closeCandidate.side === "short" && closeCandidate.momentum > 0.08);
    if (
      closeCandidate.roi > 34 ||
      closeCandidate.roi < -28 ||
      (momentumTurned && Math.random() < player.botSkill)
    ) {
      sellStock(snapshot, player.id, closeCandidate.positionId, "bot signal");
      return;
    }
  }

  if (openPositions.length >= 2 || player.cash < 900) return;
  const openSymbols = new Set(openPositions.map(([, holding]) => holding.symbol));
  const candidates = Object.values(snapshot.markets)
    .filter((market) => !openSymbols.has(market.symbol))
    .map((market) => ({ market, momentum: marketMomentum(market) }))
    .sort((a, b) => Math.abs(b.momentum) - Math.abs(a.momentum));
  const choice = candidates[0];
  if (!choice) return;

  const side: PositionSide = choice.momentum >= 0 ? "long" : "short";
  const confidence = Math.min(1.4, Math.abs(choice.momentum) * 3 + player.botSkill);
  const leverage = confidence > 1.15 ? 25 : confidence > 0.95 ? 10 : 5;
  const margin = Math.min(player.cash * (0.1 + player.botSkill * 0.08), 4_500);
  buyStock(snapshot, player.id, choice.market.symbol, margin, {
    side,
    leverage,
    stopLossPct: 28,
    takeProfitPct: 65,
    trailingPct: 18,
  });
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
  positionProfit(holding, price);
