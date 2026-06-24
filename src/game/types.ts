export type GameStatus = "lobby" | "briefing" | "playing" | "finished";

export type AvatarId = "alex" | "mina" | "dante" | "jules";

export type Holding = {
  shares: number;
  averagePrice: number;
};

export type OwnedAsset = {
  instanceId: string;
  catalogId: string;
  purchasePrice: number;
  currentValue: number;
  insured: boolean;
};

export type PlayerState = {
  id: string;
  name: string;
  avatar: AvatarId;
  color: string;
  cash: number;
  happiness: number;
  stress: number;
  homeId: string;
  holdings: Record<string, Holding>;
  assets: OwnedAsset[];
  ready: boolean;
  latestTrade: string;
  bestTrade: string;
  connectedAt: number;
};

export type MarketState = {
  symbol: string;
  name: string;
  price: number;
  openingPrice: number;
  history: number[];
};

export type GameEvent = {
  id: string;
  at: number;
  type: "trade" | "life" | "insurance" | "system";
  playerId?: string;
  title: string;
  detail: string;
  positive?: boolean;
};

export type GameSnapshot = {
  id: string;
  code: string;
  hostId: string;
  status: GameStatus;
  durationMinutes: 15 | 30 | 60;
  createdAt: number;
  startedAt: number | null;
  endsAt: number | null;
  winnerId: string | null;
  players: Record<string, PlayerState>;
  markets: Record<string, MarketState>;
  events: GameEvent[];
  lastMarketTick: number;
  nextIncidentAt: number;
  nextBillingAt: number;
};

export type PersistedGame = {
  snapshot: GameSnapshot;
  version: number;
};

export type CatalogAsset = {
  id: string;
  name: string;
  category: "watch" | "car";
  price: number;
  happiness: number;
  volatility: number;
  insuranceRate: number;
  icon: string;
  description: string;
};

export type HomeOption = {
  id: string;
  name: string;
  moveInCost: number;
  resaleValue: number;
  happiness: number;
  upkeep: number;
  icon: string;
  description: string;
};
