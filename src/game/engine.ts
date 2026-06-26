import {
  STARTING_CASH,
  assetCatalog,
  avatars,
  botProfiles,
  homeOptions,
  jobOptions,
  locations,
  marketSeeds,
  personas,
  skillOptions,
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
  SkillId,
  LocationId,
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
  persona: personas[Math.floor(Math.random() * personas.length)],
  locationId: "apartment",
  travelingFrom: null,
  travelingTo: null,
  travelStartedAt: null,
  travelArrivesAt: null,
  timeRemaining: 60,
  hunger: 82,
  health: 100,
  energy: 85,
  skills: {},
  studyProgress: {},
  jobId: null,
  reputation: 50,
});

const normalizeLegacyPlayer = (player: PlayerState) => {
  player.persona ??= personas[Math.floor(Math.random() * personas.length)];
  player.locationId ??= "apartment";
  player.travelingFrom ??= null;
  player.travelingTo ??= null;
  player.travelStartedAt ??= null;
  player.travelArrivesAt ??= null;
  player.timeRemaining ??= 60;
  player.hunger ??= 82;
  player.health ??= 100;
  player.energy ??= 85;
  player.skills ??= {};
  player.studyProgress ??= {};
  player.jobId ??= null;
  player.reputation ??= 50;
};

const makeMarket = (
  symbol: string,
  name: string,
  price: number,
  source: MarketState["source"] = "simulated",
  metadata: Partial<MarketState> = {},
): MarketState => ({
  ...metadata,
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
  quote: {
    marketKey?: string;
    symbol: string;
    name: string;
    price: number;
    assetClass?: MarketState["assetClass"];
    provider?: MarketState["provider"];
    providerId?: string;
    imageUrl?: string;
    marketCap?: number | null;
    volume24h?: number | null;
    change24hPct?: number | null;
    marketCapRank?: number | null;
    chain?: string;
    contractAddress?: string;
    contracts?: Array<{ chain: string; address: string }>;
  },
) => {
  const symbol = quote.symbol.trim().toUpperCase();
  if (!symbol || !Number.isFinite(quote.price) || quote.price <= 0) return false;
  const marketKey = quote.marketKey || symbol;
  const metadata = {
    assetClass: quote.assetClass,
    provider: quote.provider,
    providerId: quote.providerId,
    imageUrl: quote.imageUrl,
    marketCap: quote.marketCap,
    volume24h: quote.volume24h,
    change24hPct: quote.change24hPct,
    marketCapRank: quote.marketCapRank,
    chain: quote.chain,
    contractAddress: quote.contractAddress,
    contracts: quote.contracts,
  };
  const existing = snapshot.markets[marketKey];
  if (existing) {
    const firstLivePrice = existing.source === "simulated";
    Object.assign(existing, metadata);
    existing.name = quote.name || existing.name;
    existing.price = quote.price;
    existing.openingPrice = firstLivePrice ? quote.price : existing.openingPrice;
    existing.history = firstLivePrice
      ? Array.from({ length: 24 }, () => quote.price)
      : [...existing.history.slice(-39), quote.price];
    existing.source = quote.provider || "alpaca";
    existing.lastUpdatedAt = Date.now();
  } else {
    snapshot.markets[marketKey] = makeMarket(
      symbol,
      quote.name || symbol,
      quote.price,
      quote.provider || "alpaca",
      metadata,
    );
  }
  return marketKey;
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
      market.key,
      makeMarket(market.symbol, market.name, market.price, "simulated", {
        assetClass: market.assetClass,
        provider: market.provider,
        providerId: market.providerId,
        chain: "chain" in market ? market.chain : undefined,
      }),
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
    roundNumber: 0,
    roundEndsAt: null,
  };
};

export const getHome = (id: string) =>
  homeOptions.find((home) => home.id === id) ?? homeOptions[0];

export const getCatalogAsset = (id: string) =>
  assetCatalog.find((asset) => asset.id === id);

export const getLocation = (id: LocationId) =>
  locations.find((location) => location.id === id) ?? locations[0];

export const getSkill = (id: SkillId) =>
  skillOptions.find((skill) => skill.id === id) ?? skillOptions[0];

export const getJob = (id: string | null) =>
  jobOptions.find((job) => job.id === id);

export const resolveTravel = (player: PlayerState, at = Date.now()) => {
  normalizeLegacyPlayer(player);
  if (!player.travelingTo || !player.travelArrivesAt || at < player.travelArrivesAt) {
    return false;
  }
  player.locationId = player.travelingTo;
  player.travelingFrom = null;
  player.travelingTo = null;
  player.travelStartedAt = null;
  player.travelArrivesAt = null;
  return true;
};

const playerTravelSpeed = (player: PlayerState) => {
  const cars = player.assets
    .map((owned) => getCatalogAsset(owned.catalogId))
    .filter((asset) => asset?.category === "car");
  if (cars.some((car) => car?.id === "grand-tourer")) return 1.65;
  if (cars.some((car) => car?.id === "sport-coupe")) return 1.45;
  return 1;
};

export const travelDurationMs = (
  player: PlayerState,
  destinationId: LocationId,
) => {
  normalizeLegacyPlayer(player);
  const from = getLocation(player.locationId);
  const destination = getLocation(destinationId);
  const distance = Math.hypot(destination.x - from.x, destination.y - from.y);
  return Math.round(Math.max(2_000, Math.min(9_000, (1_700 + distance * 95) / playerTravelSpeed(player))));
};

const spendTime = (player: PlayerState, cost: number) => {
  normalizeLegacyPlayer(player);
  resolveTravel(player);
  if (player.travelingTo) return false;
  if (player.timeRemaining < cost) return false;
  player.timeRemaining -= cost;
  player.energy = Math.max(0, player.energy - cost * 0.35);
  return true;
};

export const travelTo = (
  snapshot: GameSnapshot,
  playerId: string,
  locationId: LocationId,
) => {
  const player = snapshot.players[playerId];
  if (!player) return false;
  normalizeLegacyPlayer(player);
  resolveTravel(player);
  if (player.travelingTo) return false;
  if (player.locationId === locationId) return true;
  const duration = travelDurationMs(player, locationId);
  const actionCost = Math.max(2, Math.ceil(duration / 1_500));
  if (!spendTime(player, actionCost)) return false;
  const now = Date.now();
  player.travelingFrom = player.locationId;
  player.travelingTo = locationId;
  player.travelStartedAt = now;
  player.travelArrivesAt = now + duration;
  addEvent(snapshot, {
    type: "life",
    playerId,
    title: `${player.name} is driving to ${getLocation(locationId).name}`,
    detail: `${Math.ceil(duration / 1000)} seconds through Fast Lane traffic in their starter car.`,
  });
  return true;
};

export const studySkill = (
  snapshot: GameSnapshot,
  playerId: string,
  skillId: SkillId,
) => {
  const player = snapshot.players[playerId];
  const skill = skillOptions.find((item) => item.id === skillId);
  if (!player || !skill) return false;
  normalizeLegacyPlayer(player);
  if (skill.prerequisite && !player.skills[skill.prerequisite]) return false;
  if (player.locationId !== "academy" || !spendTime(player, 20)) return false;

  const current = player.studyProgress[skillId] ?? 0;
  const next = Math.min(skill.studyRequired, current + 20);
  player.studyProgress[skillId] = next;
  if (next >= skill.studyRequired && !player.skills[skillId]) {
    player.skills[skillId] = 1;
    player.happiness = Math.min(100, player.happiness + 5);
    player.reputation = Math.min(100, player.reputation + 4);
    addEvent(snapshot, {
      type: "life",
      playerId,
      title: `${player.name} qualified in ${skill.name}`,
      detail: `${skill.name} actions and careers are now unlocked.`,
      positive: true,
    });
  } else {
    addEvent(snapshot, {
      type: "life",
      playerId,
      title: `${player.name} studied ${skill.name}`,
      detail: `${next}/${skill.studyRequired} qualification progress.`,
      positive: true,
    });
  }
  return true;
};

export const applyForJob = (
  snapshot: GameSnapshot,
  playerId: string,
  jobId: string,
) => {
  const player = snapshot.players[playerId];
  const job = jobOptions.find((item) => item.id === jobId);
  if (!player || !job) return false;
  normalizeLegacyPlayer(player);
  if (job.skill && (player.skills[job.skill] ?? 0) < (job.skillLevel ?? 1)) return false;
  if (player.locationId !== "work_hub" || !spendTime(player, 8)) return false;
  player.jobId = job.id;
  player.reputation = Math.min(100, player.reputation + 2);
  addEvent(snapshot, {
    type: "life",
    playerId,
    title: `${player.name} landed a job as ${job.name}`,
    detail: `${formatMoney(job.pay)} per completed work shift.`,
    positive: true,
  });
  return true;
};

export const workShift = (snapshot: GameSnapshot, playerId: string) => {
  const player = snapshot.players[playerId];
  if (!player) return false;
  normalizeLegacyPlayer(player);
  const job = getJob(player.jobId);
  if (!job || player.locationId !== "work_hub" || !spendTime(player, job.timeCost)) return false;
  const healthPenalty = player.health < 45 ? 0.75 : 1;
  const pay = job.pay * healthPenalty;
  player.cash += pay;
  player.happiness = Math.max(0, Math.min(100, player.happiness + job.happiness));
  player.hunger = Math.max(0, player.hunger - 9);
  addEvent(snapshot, {
    type: "life",
    playerId,
    title: `${player.name} completed a ${job.name} shift`,
    detail: `${formatMoney(pay)} earned${healthPenalty < 1 ? " after a sick-day penalty" : ""}.`,
    positive: true,
  });
  return true;
};

export const buyMeal = (
  snapshot: GameSnapshot,
  playerId: string,
  meal: "noodles" | "proper_meal" | "brain_food",
) => {
  const player = snapshot.players[playerId];
  if (!player) return false;
  normalizeLegacyPlayer(player);
  if (player.locationId !== "food_market") return false;
  const options = {
    noodles: { cost: 90, hunger: 24, health: -1, happiness: 0, name: "Instant Block Noodles" },
    proper_meal: { cost: 260, hunger: 48, health: 4, happiness: 2, name: "Proof-of-Steak Dinner" },
    brain_food: { cost: 480, hunger: 38, health: 7, happiness: 4, name: "Quantum Superfood Bowl" },
  };
  const food = options[meal];
  if (player.cash < food.cost || !spendTime(player, 6)) return false;
  player.cash -= food.cost;
  player.hunger = Math.min(100, player.hunger + food.hunger);
  player.health = Math.max(0, Math.min(100, player.health + food.health));
  player.happiness = Math.min(100, player.happiness + food.happiness);
  addEvent(snapshot, {
    type: "life",
    playerId,
    title: `${player.name} ate ${food.name}`,
    detail: `${formatMoney(food.cost)} converted into temporary survival.`,
    positive: true,
  });
  return true;
};

export const restAtHome = (snapshot: GameSnapshot, playerId: string) => {
  const player = snapshot.players[playerId];
  if (!player) return false;
  normalizeLegacyPlayer(player);
  if (player.locationId !== "apartment" || !spendTime(player, 15)) return false;
  const ownsBed = player.assets.some((asset) => asset.catalogId === "proper-bed");
  player.energy = Math.min(100, player.energy + (ownsBed ? 48 : 28));
  player.health = Math.min(100, player.health + (ownsBed ? 5 : 2));
  player.stress = Math.max(0, player.stress - (ownsBed ? 12 : 7));
  return true;
};

export type ApartmentActionId =
  | "bug_bounty"
  | "persuasion_hustle"
  | "viral_campaign"
  | "shadow_market";

export const attemptApartmentAction = (
  snapshot: GameSnapshot,
  playerId: string,
  actionId: ApartmentActionId,
) => {
  const player = snapshot.players[playerId];
  if (!player) return false;
  normalizeLegacyPlayer(player);
  if (player.locationId !== "apartment") return false;

  const actions = {
    bug_bounty: { skill: "cybersecurity" as SkillId, time: 18, success: 0.62, reward: [900, 5_500], risk: 0.08, name: "security bug bounty" },
    persuasion_hustle: { skill: "social_engineering" as SkillId, time: 15, success: 0.55, reward: [600, 3_600], risk: 0.28, name: "dubious persuasion hustle" },
    viral_campaign: { skill: "digital_marketing" as SkillId, time: 16, success: 0.64, reward: [700, 4_200], risk: 0.12, name: "viral token campaign" },
    shadow_market: { skill: "blockchain" as SkillId, time: 24, success: 0.42, reward: [2_500, 12_000], risk: 0.36, name: "underground marketplace prototype" },
  };
  const action = actions[actionId];
  if (!player.skills[action.skill] || !spendTime(player, action.time)) return false;

  const roll = Math.random();
  const skillBoost = Math.min(0.12, player.reputation / 1000);
  if (roll < action.success + skillBoost) {
    const reward = action.reward[0] + Math.random() * (action.reward[1] - action.reward[0]);
    player.cash += reward;
    player.reputation = Math.min(100, player.reputation + (actionId === "bug_bounty" ? 5 : 1));
    addEvent(snapshot, {
      type: "life",
      playerId,
      title: `${player.name}'s ${action.name} paid off`,
      detail: `${formatMoney(reward)} earned. The exact method remains tastefully abstract.`,
      positive: true,
    });
  } else if (Math.random() < action.risk) {
    const fine = Math.min(player.cash, 600 + Math.random() * 3_400);
    player.cash -= fine;
    player.reputation = Math.max(0, player.reputation - 12);
    player.stress = Math.min(100, player.stress + 18);
    addEvent(snapshot, {
      type: "life",
      playerId,
      title: `${player.name}'s ${action.name} backfired`,
      detail: `${formatMoney(fine)} vanished into fines, refunds and emergency legal advice.`,
    });
  } else {
    player.stress = Math.min(100, player.stress + 5);
    addEvent(snapshot, {
      type: "life",
      playerId,
      title: `${player.name}'s ${action.name} fizzled`,
      detail: "Time was spent. Nothing useful happened. Very authentic.",
    });
  }
  return true;
};

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
  player.latestTrade = `Opened ${options.side.toUpperCase()} ${market.symbol} at ${leverage}×`;
  player.stress = Math.min(100, player.stress + Math.min(14, leverage * 0.12));
  addEvent(snapshot, {
    type: "trade",
    playerId,
    title: `${player.name} opened ${leverage}× ${options.side.toUpperCase()} ${market.symbol}`,
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
  const market = snapshot.markets[holding.symbol];
  const symbol = market?.symbol || holding.symbol;
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
  resolveTravel(player);
  const requiredLocation: LocationId =
    item.category === "car" ? "car_dealer"
      : item.category === "watch" || item.category === "collectible" || item.category === "nft"
        ? "collectibles_store"
        : "furniture_store";
  if (player.travelingTo || player.locationId !== requiredLocation) return false;
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

export const advanceGameRounds = (
  snapshot: GameSnapshot,
  at = Date.now(),
) => {
  if (snapshot.status !== "playing") return;
  snapshot.roundNumber ??= 1;
  snapshot.roundEndsAt ??= at + 60_000;
  if (at < snapshot.roundEndsAt) return;
  const roundsPassed = Math.max(1, Math.floor((at - snapshot.roundEndsAt) / 60_000) + 1);
  snapshot.roundNumber += roundsPassed;
  snapshot.roundEndsAt += roundsPassed * 60_000;
  Object.values(snapshot.players).forEach((player) => {
    normalizeLegacyPlayer(player);
    player.timeRemaining = 60;
    player.hunger = Math.max(0, player.hunger - 8 * roundsPassed);
    player.energy = Math.min(100, player.energy + 8 * roundsPassed);
    if (player.hunger < 25) {
      player.health = Math.max(0, player.health - 6 * roundsPassed);
      player.happiness = Math.max(0, player.happiness - 3 * roundsPassed);
    }
    if (player.health <= 0) {
      player.cash = Math.max(0, player.cash - 1_500);
      player.health = 35;
      player.locationId = "apartment";
      addEvent(snapshot, {
        type: "life",
        playerId: player.id,
        title: `${player.name} collapsed from neglect`,
        detail: "A costly clinic visit restored minimal health and delivered a stern lecture.",
      });
    }
  });
  addEvent(snapshot, {
    type: "system",
    title: `Week ${snapshot.roundNumber} began`,
    detail: "Everyone received 60 fresh minutes. Hunger continues to disrespect ambition.",
    positive: true,
  });
};

export const tickGame = (
  snapshot: GameSnapshot,
  at = Date.now(),
  livePrices: Record<string, number> = {},
) => {
  if (snapshot.status !== "playing") return;
  advanceGameRounds(snapshot, at);
  if (snapshot.status !== "playing") {
    return;
  }
  const elapsedSeconds = Math.max(1, (at - snapshot.lastMarketTick) / 1000);

  Object.entries(snapshot.markets).forEach(([marketKey, market], index) => {
    const livePrice = Number(livePrices[marketKey]);
    if (Number.isFinite(livePrice) && livePrice > 0) {
      const firstLivePrice =
        market.source === "simulated" &&
        (market.provider === "coingecko" || market.provider === "alpaca");
      market.price = livePrice;
      market.openingPrice = firstLivePrice ? livePrice : market.openingPrice;
      market.history = firstLivePrice
        ? Array.from({ length: 24 }, () => livePrice)
        : [...market.history.slice(-39), livePrice];
      market.source =
        market.provider ||
        (market.assetClass === "crypto" ? "coingecko" : "alpaca");
      market.lastUpdatedAt = at;
      return;
    }
    if (market.source === "alpaca" || market.source === "coingecko") return;
    const volatility = market.symbol === "BTC" ? 0.007 : 0.0045;
    const drift = Math.sin(at / 45_000 + index) * 0.0003;
    const movement = ((Math.random() - 0.49) * volatility + drift) * Math.sqrt(elapsedSeconds);
    market.price = Math.max(1, market.price * (1 + movement));
    market.history = [...market.history.slice(-39), market.price];
    market.source = "simulated";
    market.lastUpdatedAt = at;
  });

  Object.values(snapshot.players).forEach((player) => {
    normalizeLegacyPlayer(player);
    resolveTravel(player, at);
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

const runBotLifeAction = (
  snapshot: GameSnapshot,
  player: PlayerState,
) => {
  normalizeLegacyPlayer(player);
  if (player.timeRemaining < 6) return false;

  const travelOr = (locationId: LocationId, action: () => boolean) =>
    player.locationId === locationId
      ? action()
      : travelTo(snapshot, player.id, locationId);

  if (player.hunger < 48) {
    return travelOr("food_market", () =>
      buyMeal(
        snapshot,
        player.id,
        player.cash > 3_000 ? "proper_meal" : "noodles",
      ));
  }
  if (player.energy < 28) {
    return travelOr("apartment", () => restAtHome(snapshot, player.id));
  }

  const qualifiedJobs = jobOptions
    .filter((job) => !job.skill || (player.skills[job.skill] ?? 0) >= (job.skillLevel ?? 1))
    .sort((a, b) => b.pay / b.timeCost - a.pay / a.timeCost);
  const bestJob = qualifiedJobs[0];
  const currentJob = getJob(player.jobId);

  if (bestJob && (!currentJob || bestJob.pay > currentJob.pay)) {
    return travelOr("work_hub", () => applyForJob(snapshot, player.id, bestJob.id));
  }

  if (currentJob && player.timeRemaining >= currentJob.timeCost && Math.random() < 0.52) {
    return travelOr("work_hub", () => workShift(snapshot, player.id));
  }

  const studyPlan: SkillId[] = player.botSkill > 0.84
    ? ["programming", "blockchain", "cybersecurity", "quantum"]
    : player.botSkill > 0.79
      ? ["digital_marketing", "social_engineering", "programming"]
      : ["programming", "digital_marketing", "blockchain"];
  const nextSkill = studyPlan.find((skillId) => {
    if (player.skills[skillId]) return false;
    const skill = getSkill(skillId);
    return !skill.prerequisite || Boolean(player.skills[skill.prerequisite]);
  });
  if (nextSkill && player.timeRemaining >= 20 && Math.random() < 0.72) {
    return travelOr("academy", () => studySkill(snapshot, player.id, nextSkill));
  }

  const unlockedAction: ApartmentActionId | undefined =
    player.skills.cybersecurity ? "bug_bounty"
      : player.skills.digital_marketing ? "viral_campaign"
        : player.skills.social_engineering ? "persuasion_hustle"
          : player.skills.blockchain ? "shadow_market"
            : undefined;
  if (unlockedAction && player.timeRemaining >= 18) {
    return travelOr("apartment", () =>
      attemptApartmentAction(snapshot, player.id, unlockedAction));
  }

  return false;
};

const runBotAction = (
  snapshot: GameSnapshot,
  player: PlayerState,
  at: number,
) => {
  player.nextBotActionAt = at + 6_000 + Math.random() * 9_000;
  if (Math.random() < 0.64 && runBotLifeAction(snapshot, player)) return;
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
  const candidates = Object.entries(snapshot.markets)
    .filter(([marketKey]) => !openSymbols.has(marketKey))
    .map(([marketKey, market]) => ({ marketKey, market, momentum: marketMomentum(market) }))
    .sort((a, b) => Math.abs(b.momentum) - Math.abs(a.momentum));
  const choice = candidates[0];
  if (!choice) return;

  const side: PositionSide = choice.momentum >= 0 ? "long" : "short";
  const confidence = Math.min(1.4, Math.abs(choice.momentum) * 3 + player.botSkill);
  const leverage = confidence > 1.15 ? 25 : confidence > 0.95 ? 10 : 5;
  const margin = Math.min(player.cash * (0.1 + player.botSkill * 0.08), 4_500);
  buyStock(snapshot, player.id, choice.marketKey, margin, {
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
