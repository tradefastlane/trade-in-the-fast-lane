export type GameStatus = "lobby" | "briefing" | "playing" | "finished";

export type AvatarId = "alex" | "mina" | "dante" | "jules";

export type PositionSide = "long" | "short";
export type LocationId =
  | "apartment"
  | "academy"
  | "work_hub"
  | "food_market"
  | "furniture_store"
  | "car_dealer"
  | "collectibles_store"
  | "crypto_exchange";
export type SkillId =
  | "programming"
  | "blockchain"
  | "cybersecurity"
  | "quantum"
  | "social_engineering"
  | "digital_marketing";

export type Holding = {
  id: string;
  symbol: string;
  openedAt: number;
  shares: number;
  averagePrice: number;
  side: PositionSide;
  leverage: number;
  margin: number;
  stopLossPct: number;
  takeProfitPct: number;
  trailingPct: number;
  bestRoiPct: number;
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
  isBot: boolean;
  botSkill: number;
  nextBotActionAt: number;
  persona: string;
  locationId: LocationId;
  travelingFrom: LocationId | null;
  travelingTo: LocationId | null;
  travelStartedAt: number | null;
  travelArrivesAt: number | null;
  timeRemaining: number;
  hunger: number;
  health: number;
  energy: number;
  skills: Partial<Record<SkillId, number>>;
  studyProgress: Partial<Record<SkillId, number>>;
  jobId: string | null;
  reputation: number;
};

export type MarketState = {
  symbol: string;
  name: string;
  price: number;
  openingPrice: number;
  history: number[];
  assetClass?: "stock" | "crypto";
  provider?: "alpaca" | "coingecko" | "simulated";
  providerId?: string;
  imageUrl?: string;
  marketCap?: number | null;
  volume24h?: number | null;
  change24hPct?: number | null;
  marketCapRank?: number | null;
  chain?: string;
  contractAddress?: string;
  contracts?: Array<{ chain: string; address: string }>;
  source?: "alpaca" | "coingecko" | "simulated";
  lastUpdatedAt?: number;
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
  roundNumber: number;
  roundEndsAt: number | null;
};

export type PersistedGame = {
  snapshot: GameSnapshot;
  version: number;
};

export type CatalogAsset = {
  id: string;
  name: string;
  category: "watch" | "car" | "furniture" | "computer" | "collectible";
  price: number;
  happiness: number;
  volatility: number;
  insuranceRate: number;
  icon: string;
  description: string;
};

export type LocationOption = {
  id: LocationId;
  name: string;
  mapName?: string;
  icon: string;
  description: string;
  x: number;
  y: number;
};

export type SkillOption = {
  id: SkillId;
  name: string;
  icon: string;
  description: string;
  studyRequired: number;
  prerequisite?: SkillId;
};

export type JobOption = {
  id: string;
  name: string;
  locationId: LocationId;
  pay: number;
  timeCost: number;
  happiness: number;
  skill?: SkillId;
  skillLevel?: number;
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
