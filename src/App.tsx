import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clipboard,
  Clock3,
  Copy,
  Crown,
  Gauge,
  GraduationCap,
  Heart,
  HeartPulse,
  HelpCircle,
  House,
  Info,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Menu,
  Play,
  Plus,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  assetCatalog,
  avatars,
  durationOptions,
  homeOptions,
  jobOptions,
  locations,
  skillOptions,
} from "./game/catalog";
import {
  addSmartBot,
  addEvent,
  advanceGameRounds,
  applyForJob,
  attemptApartmentAction,
  buyAsset,
  buyMeal,
  buyStock,
  createGameSnapshot,
  finalScore,
  formatMoney,
  getCatalogAsset,
  getHome,
  getJob,
  getLocation,
  getSkill,
  happinessMultiplier,
  holdingProfit,
  insureAsset,
  makePlayer,
  moveHome,
  netWorth,
  portfolioValue,
  positionEquity,
  positionRoiPct,
  possessionsValue,
  removeBot,
  restAtHome,
  sellAsset,
  sellStock,
  studySkill,
  tickGame,
  travelTo,
  upsertLiveMarket,
  workShift,
} from "./game/engine";
import type {
  AvatarId,
  GameEvent,
  GameSnapshot,
  MarketState,
  PersistedGame,
  PlayerState,
  PositionSide,
  SkillId,
  LocationId,
} from "./game/types";
import type { ApartmentActionId } from "./game/engine";
import {
  createPersistedGame,
  ensureIdentity,
  hasSupabase,
  loadPersistedGame,
  subscribeToGame,
  updatePersistedGame,
} from "./lib/gameStore";
import {
  fetchCryptoCoin,
  fetchMarketQuotes,
  searchCryptoCoins,
  type CryptoCoinDetail,
  type CryptoSearchResult,
} from "./lib/marketData";

type DeskTab = "trade" | "life" | "assets";

const money = (value: number, compact = false) => formatMoney(value, compact);
const marketPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumSignificantDigits: 7,
  }).format(value);

const formatClock = (milliseconds: number) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`
    : `${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
};

const getInviteCode = () =>
  new URLSearchParams(window.location.search).get("game")?.toUpperCase() ?? "";

const updateUrl = (code?: string) => {
  const url = code ? `${window.location.pathname}?game=${code}` : window.location.pathname;
  window.history.replaceState({}, "", url);
};

const tutorialSteps = [
  {
    eyebrow: "THE OBJECTIVE",
    title: "Build a career, a fortune and a life.",
    body: "Each one-minute week gives every player 60 action minutes. Travel, study, work, eat and rest before the week resets. When the match ends, the highest life-adjusted score wins.",
    icon: Trophy,
    accent: "#f4bd57",
  },
  {
    eyebrow: "THE CITY",
    title: "Go where the opportunity is.",
    body: "Visit Chain Academy to qualify, the Career Hub to apply and work, Satoshi Snacks to eat, Block & Bed to shop, or return home to rest and use your computer.",
    icon: House,
    accent: "#68e5c4",
  },
  {
    eyebrow: "SKILLS & CAREERS",
    title: "Qualifications unlock better choices.",
    body: "Study programming, blockchain engineering, cybersecurity, quantum computing, social engineering or online marketing. Skills unlock jobs and fictional risk-and-reward computer actions.",
    icon: GraduationCap,
    accent: "#b991ff",
  },
  {
    eyebrow: "HEALTH & HAPPINESS",
    title: "Success is difficult on an empty stomach.",
    body: "Food, rest, housing and possessions affect your happiness and health. Ignore hunger for too long and your health—and eventually your wallet—will suffer.",
    icon: HeartPulse,
    accent: "#ff775f",
  },
  {
    eyebrow: "TRADING & THE PUBLIC BOARD",
    title: "Crypto never waits for your turn.",
    body: "Trading is a fast side game and does not consume weekly action time. Open long or short positions, manage risk, and watch every player’s open trades beneath their public profile.",
    icon: TrendingUp,
    accent: "#76d4ff",
  },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark">
        <TrendingUp size={compact ? 19 : 25} />
      </span>
      <span>
        <small>TRADE IN THE</small>
        <strong>FAST LANE</strong>
      </span>
    </div>
  );
}

function MiniChart({ market }: { market: MarketState }) {
  const values = market.history;
  const width = 500;
  const height = 145;
  const min = Math.min(...values) * 0.997;
  const max = Math.max(...values) * 1.003;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / Math.max(0.001, max - min)) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const direction = market.price >= market.openingPrice;

  return (
    <svg className="mini-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`fill-${market.symbol}`} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={direction ? "#68e5c4" : "#ff596d"}
            stopOpacity=".35"
          />
          <stop
            offset="100%"
            stopColor={direction ? "#68e5c4" : "#ff596d"}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      {[29, 58, 87, 116].map((y) => (
        <line key={y} x1="0" x2={width} y1={y} y2={y} className="chart-grid" />
      ))}
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#fill-${market.symbol})`} />
      <polyline
        points={points}
        className={`chart-line ${direction ? "up" : "down"}`}
      />
    </svg>
  );
}

function Meter({
  value,
  tone,
}: {
  value: number;
  tone: "happy" | "stress" | "score";
}) {
  return (
    <div className={`meter meter-${tone}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function Landing({
  loading,
  initialCode,
  onCreate,
  onJoin,
}: {
  loading: boolean;
  initialCode: string;
  onCreate: (name: string, avatar: AvatarId, duration: 15 | 30 | 60) => Promise<void>;
  onJoin: (code: string, name: string, avatar: AvatarId) => Promise<void>;
}) {
  const [mode, setMode] = useState<"create" | "join">(initialCode ? "join" : "create");
  const [name, setName] = useState(localStorage.getItem("fastlane:player-name") ?? "");
  const [avatar, setAvatar] = useState<AvatarId>("mina");
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Give your broker a name first.");
      return;
    }
    try {
      localStorage.setItem("fastlane:player-name", name.trim());
      if (mode === "create") await onCreate(name.trim(), avatar, duration);
      else if (code.trim()) await onJoin(code.trim(), name.trim(), avatar);
      else setError("Enter the invite code from your friend.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    }
  };

  return (
    <main className="welcome-screen">
      <img className="welcome-city" src="/assets/city-board.png" alt="" />
      <div className="welcome-shade" />
      <header className="welcome-header">
        <Brand />
        <div className={`backend-pill ${hasSupabase ? "online" : ""}`}>
          <span />
          {hasSupabase ? "Online multiplayer ready" : "Local prototype mode"}
        </div>
      </header>

      <section className="welcome-copy">
        <div className="eyebrow">A SIMULTANEOUS CRYPTO-LIFE GAME</div>
        <h1>Build a future.<br />Survive the fast lane.</h1>
        <p>
          Invite your friends, race through one-minute weeks, study, work, eat,
          build a home and trade the same live crypto market.
        </p>
        <div className="feature-row">
          <span><Timer size={16} /> Simultaneous 60-second weeks</span>
          <span><Users size={16} /> Private invite rooms</span>
          <span><Heart size={16} /> Wealth + life scoring</span>
        </div>
      </section>

      <section className="entry-card glass-panel">
        <div className="mode-switch">
          <button className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>
            <Plus size={16} /> Create game
          </button>
          <button className={mode === "join" ? "active" : ""} onClick={() => setMode("join")}>
            <LogIn size={16} /> Join friend
          </button>
        </div>

        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter broker name"
            maxLength={24}
          />
        </label>

        <div className="field">
          <span>Choose a character</span>
          <div className="avatar-picker">
            {(Object.keys(avatars) as AvatarId[]).map((id) => (
              <button
                key={id}
                className={avatar === id ? "active" : ""}
                onClick={() => setAvatar(id)}
                style={{ "--avatar": avatars[id].color } as React.CSSProperties}
              >
                <img src={avatars[id].image} alt="" />
                <small>{avatars[id].name}</small>
              </button>
            ))}
          </div>
        </div>

        {mode === "create" ? (
          <div className="field">
            <span>Match length</span>
            <div className="duration-picker">
              {durationOptions.map((option) => (
                <button
                  key={option.value}
                  className={duration === option.value ? "active" : ""}
                  onClick={() => setDuration(option.value)}
                >
                  <strong>{option.label}</strong>
                  <small>{option.note}</small>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <label className="field">
            <span>Invite code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
            />
          </label>
        )}

        {error && <div className="form-error">{error}</div>}
        <button className="primary-button entry-submit" onClick={submit} disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={18} /> : mode === "create" ? <Play size={18} /> : <LogIn size={18} />}
          {loading ? "Connecting…" : mode === "create" ? "Create private game" : "Join this game"}
        </button>
      </section>
    </main>
  );
}

function Lobby({
  snapshot,
  me,
  onTutorial,
  onStart,
  onAddBot,
  onRemoveBot,
  onLeave,
}: {
  snapshot: GameSnapshot;
  me: PlayerState;
  onTutorial: () => void;
  onStart: () => void;
  onAddBot: () => void;
  onRemoveBot: (id: string) => void;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}${window.location.pathname}?game=${snapshot.code}`;
  const isHost = me.id === snapshot.hostId;
  const players = Object.values(snapshot.players);

  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="lobby-screen">
      <img className="lobby-city" src="/assets/city-board.png" alt="" />
      <div className="lobby-shade" />
      <header className="app-header">
        <Brand compact />
        <button className="quiet-button" onClick={onLeave}>Leave lobby</button>
      </header>

      <section className="lobby-panel glass-panel">
        <div className="lobby-title">
          <span>PRIVATE MATCH</span>
          <h1>Friends in the Fast Lane</h1>
          <p>
            Share this invite, complete the optional briefing, add smart bots if needed,
            then the host decides when the market opens.
          </p>
        </div>

        <div className="invite-box">
          <div>
            <small>GAME CODE</small>
            <strong>{snapshot.code}</strong>
          </div>
          <div className="invite-link">
            <span>{inviteUrl}</span>
            <button onClick={copyInvite}>
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? "Copied" : "Copy invite"}
            </button>
          </div>
        </div>

        <div className="lobby-meta">
          <div><Clock3 size={17} /><span><small>Match length</small><strong>{snapshot.durationMinutes} minutes</strong></span></div>
          <div><WalletCards size={17} /><span><small>Starting cash</small><strong>$50,000 each</strong></span></div>
          <div><Trophy size={17} /><span><small>Winner</small><strong>Best life-adjusted score</strong></span></div>
        </div>

        <div className="lobby-players">
          {players.map((player) => (
            <div className="lobby-player" key={player.id} style={{ "--player": player.color } as React.CSSProperties}>
              <img src={avatars[player.avatar].image} alt="" />
              <div>
                <strong>{player.name}</strong>
                <span>
                  {player.isBot
                    ? "Smart bot · market ready"
                    : player.id === snapshot.hostId
                      ? `Host · ${player.ready ? "briefing complete" : "briefing optional"}`
                      : player.ready
                        ? "Briefing complete"
                        : "Joined · briefing optional"}
                </span>
              </div>
              {isHost && player.isBot ? (
                <button
                  className="remove-bot-button"
                  onClick={() => onRemoveBot(player.id)}
                  aria-label={`Remove ${player.name}`}
                >
                  <X size={16} />
                </button>
              ) : player.ready || player.isBot ? <Check size={18} /> : <Users size={18} />}
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - players.length) }, (_, index) => (
            <div className="lobby-player empty" key={index}>
              <span className="empty-avatar"><Users size={20} /></span>
              <div><strong>Waiting for friend…</strong><span>Send the invite link</span></div>
            </div>
          ))}
        </div>

        <div className="lobby-actions">
          <button className="secondary-button" onClick={onTutorial}>
            <Info size={18} /> {me.ready ? "Review briefing" : "Take pre-game briefing"}
          </button>
          {isHost && players.length < 4 && (
            <button className="secondary-button" onClick={onAddBot}>
              <Plus size={18} /> Add smart bot
            </button>
          )}
          {isHost ? (
            <button className="primary-button" onClick={onStart}>
              <Play size={18} /> Start match with {players.length} player{players.length === 1 ? "" : "s"}
            </button>
          ) : (
            <div className="waiting-message">
              <LoaderCircle className="spin" size={17} /> Waiting for the host to start
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Tutorial({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const content = tutorialSteps[step];
  const Icon = content.icon;

  return (
    <main className="tutorial-screen">
      <section className="tutorial-visual">
        <img src="/assets/city-board.png" alt="" />
        <div className="tutorial-visual-shade" />
        <Brand />
        <div className="tutorial-demo-card" style={{ "--accent": content.accent } as React.CSSProperties}>
          <Icon size={36} />
          <span>{content.eyebrow}</span>
          <strong>{step + 1} / {tutorialSteps.length}</strong>
        </div>
      </section>
      <section className="tutorial-copy">
        <button className="skip-button" onClick={onComplete}>Skip and return to lobby</button>
        <div className="tutorial-progress">
          {tutorialSteps.map((_, index) => <span key={index} className={index <= step ? "active" : ""} />)}
        </div>
        <small style={{ color: content.accent }}>{content.eyebrow}</small>
        <h1>{content.title}</h1>
        <p>{content.body}</p>

        {step === 3 && (
          <div className="formula-card">
            <span>FINAL SCORE</span>
            <strong>Net Worth × (0.85 + Happiness × 0.002)</strong>
            <em>At 100 happiness your wealth scores at 1.05×.</em>
          </div>
        )}

        <div className="tutorial-actions">
          <button className="secondary-button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
            <ChevronLeft size={18} /> Back
          </button>
          <button
            className="primary-button"
            onClick={() => step === tutorialSteps.length - 1 ? onComplete() : setStep((value) => value + 1)}
          >
            {step === tutorialSteps.length - 1 ? "Return to private lobby" : "Next"}
            {step === tutorialSteps.length - 1 ? <Check size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
        <div className="tutorial-advice"><Info size={15} /> Recommended for your first match. It takes about one minute.</div>
      </section>
    </main>
  );
}

function Standings({
  snapshot,
  selectedId,
  onSelect,
}: {
  snapshot: GameSnapshot;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const ranked = [...Object.values(snapshot.players)].sort(
    (a, b) => finalScore(b, snapshot.markets) - finalScore(a, snapshot.markets),
  );
  return (
    <aside className="standings-panel glass-panel">
      <div className="panel-heading">
        <span><Trophy size={14} /> LIVE STANDINGS</span>
        <small>Score includes happiness</small>
      </div>
      <div className="standings-list">
        {ranked.map((player, index) => {
          const worth = netWorth(player, snapshot.markets);
          const score = finalScore(player, snapshot.markets);
          const trades = Object.values(player.holdings).slice(0, 3);
          return (
            <div className="standing-group" key={player.id}>
              <button
                className={`standing-card ${selectedId === player.id ? "active" : ""}`}
                onClick={() => onSelect(player.id)}
                style={{ "--player": player.color } as React.CSSProperties}
              >
                <span className="standing-rank">{index + 1}</span>
                <span className="standing-avatar"><img src={avatars[player.avatar].image} alt="" /></span>
                <span className="standing-copy">
                  <strong>{player.name}</strong>
                  <small>{player.persona ?? "Crypto hopeful"} · {getLocation(player.locationId ?? "apartment").name}</small>
                  <span className="mini-stats">
                    <em><Heart size={10} /> {Math.round(player.happiness)}</em>
                    <em><Gauge size={10} /> {happinessMultiplier(player.happiness).toFixed(2)}×</em>
                  </span>
                </span>
                <span className="standing-money">
                  <strong>{money(score, true)}</strong>
                  <small>{money(worth, true)} wealth</small>
                </span>
              </button>
              <div className="standing-trades">
                <span>TRADES</span>
                {trades.length ? trades.map((holding) => {
                  const market = snapshot.markets[holding.symbol];
                  const roi = positionRoiPct(holding, market?.price ?? holding.averagePrice);
                  return (
                    <div key={holding.id}>
                      <strong>{market?.symbol ?? "?"} {holding.side === "long" ? "LONG" : "SHORT"} {holding.leverage}×</strong>
                      <em className={roi >= 0 ? "positive-text" : "negative-text"}>
                        {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
                      </em>
                    </div>
                  );
                }) : <small>No open trades</small>}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function EventFeed({
  events,
  players,
}: {
  events: GameEvent[];
  players: Record<string, PlayerState>;
}) {
  return (
    <section className="event-feed glass-panel">
      <div className="panel-heading">
        <span><Radio size={14} /> CITY WIRE</span>
        <small>Live public events</small>
      </div>
      <div className="event-list">
        {events.slice(0, 6).map((event) => {
          const player = event.playerId ? players[event.playerId] : undefined;
          const Icon = event.type === "trade" ? TrendingUp : event.type === "insurance" ? ShieldAlert : event.type === "life" ? Sparkles : Zap;
          return (
            <article key={event.id}>
              <span className={`event-icon ${event.positive ? "positive" : ""}`} style={{ "--player": player?.color ?? "#68e5c4" } as React.CSSProperties}><Icon size={14} /></span>
              <div>
                <strong>{event.title}</strong>
                <p>{event.detail}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TradeDesk({
  snapshot,
  me,
  onBuy,
  onSell,
  onAddCrypto,
}: {
  snapshot: GameSnapshot;
  me: PlayerState;
  onBuy: (
    symbol: string,
    amount: number,
    options: {
      side: PositionSide;
      leverage: number;
      stopLossPct: number;
      takeProfitPct: number;
      trailingPct: number;
    },
  ) => void;
  onSell: (positionId: string) => void;
  onAddCrypto: (coin: CryptoCoinDetail) => Promise<string>;
}) {
  const [selected, setSelected] = useState(Object.keys(snapshot.markets)[0]);
  const [symbolQuery, setSymbolQuery] = useState(Object.values(snapshot.markets)[0]?.symbol ?? "");
  const [symbolLoading, setSymbolLoading] = useState(false);
  const [symbolError, setSymbolError] = useState("");
  const [cryptoResults, setCryptoResults] = useState<CryptoSearchResult[]>([]);
  const [amount, setAmount] = useState(1000);
  const [side, setSide] = useState<PositionSide>("long");
  const [leverage, setLeverage] = useState(10);
  const [stopLossPct, setStopLossPct] = useState(25);
  const [takeProfitPct, setTakeProfitPct] = useState(50);
  const [trailingPct, setTrailingPct] = useState(20);
  const market = snapshot.markets[selected] ?? Object.values(snapshot.markets)[0];
  const activeSymbol = market.symbol;
  const maximumAmount = Math.max(1, Math.floor(me.cash));
  const selectedPositions = Object.entries(me.holdings)
    .filter(([positionId, holding]) => (holding.symbol ?? positionId) === selected)
    .map(([positionId, holding]) => ({ positionId, holding }));
  const change = (market.price / market.openingPrice - 1) * 100;
  const validAmount = Math.max(1, Math.min(maximumAmount, Number(amount) || 1));
  const exposure = validAmount * leverage;

  useEffect(() => {
    setAmount((current) => Math.max(1, Math.min(maximumAmount, current)));
  }, [maximumAmount]);

  const chooseSymbol = (value: string) => {
    const normalized = value.trim().toUpperCase();
    setSymbolQuery(normalized);
    setSymbolError("");
    const existing = Object.entries(snapshot.markets).find(
      ([, item]) => item.symbol === normalized && item.assetClass === "crypto",
    );
    if (existing) setSelected(existing[0]);
  };

  const searchCrypto = async () => {
    const query = symbolQuery.trim();
    if (query.length < 2) {
      setSymbolError("Type at least two letters from a coin name or ticker.");
      return;
    }
    setSymbolLoading(true);
    setSymbolError("");
    try {
      const results = await searchCryptoCoins(query);
      setCryptoResults(results);
      if (!results.length) setSymbolError("No matching cryptocurrency was found.");
    } catch (cause) {
      setSymbolError(cause instanceof Error ? cause.message : "Crypto search failed.");
    } finally {
      setSymbolLoading(false);
    }
  };

  const inspectCrypto = async (result: CryptoSearchResult) => {
    setSymbolLoading(true);
    setSymbolError("");
    try {
      const coin = await fetchCryptoCoin(result.id);
      const marketKey = await onAddCrypto(coin);
      setSelected(marketKey);
      setSymbolQuery(coin.symbol);
      setCryptoResults([]);
    } catch (cause) {
      setSymbolError(cause instanceof Error ? cause.message : "That coin could not be selected.");
    } finally {
      setSymbolLoading(false);
    }
  };

  useEffect(() => {
    const query = symbolQuery.trim();
    if (query.length < 2) {
      if (query.length < 2) setCryptoResults([]);
      return;
    }
    if (market.symbol.toUpperCase() === query.toUpperCase()) {
      setCryptoResults([]);
      return;
    }
    const timer = window.setTimeout(() => void searchCrypto(), 450);
    return () => window.clearTimeout(timer);
  }, [symbolQuery, market.symbol]);

  return (
    <div className="desk-content trade-desk">
      <section className="symbol-search">
        <span>Search cryptocurrency by name or ticker</span>
        <div className="symbol-entry">
          <input
            value={symbolQuery}
            onChange={(event) => chooseSymbol(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchCrypto();
              }
            }}
            placeholder="Search coin name or ticker…"
          />
          <button type="button" disabled={symbolLoading} onClick={() => void searchCrypto()}>
            {symbolLoading ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}
            Search
          </button>
        </div>
        {cryptoResults.length > 0 && (
          <div className="crypto-results">
            {cryptoResults.map((coin) => (
              <button key={coin.id} onClick={() => void inspectCrypto(coin)}>
                <img src={coin.imageUrl} alt="" />
                <span>
                  <strong>{coin.name}</strong>
                  <small>{coin.symbol} · {coin.marketCapRank ? `Rank #${coin.marketCapRank}` : "Unranked"}</small>
                </span>
                <span className="crypto-result-market">
                  <strong>{coin.price == null ? "Price unavailable" : marketPrice(coin.price)}</strong>
                  <small>Cap {coin.marketCap == null ? "—" : money(coin.marketCap, true)}</small>
                  <small>Vol {coin.volume24h == null ? "—" : money(coin.volume24h, true)}</small>
                </span>
              </button>
            ))}
          </div>
        )}
        <small>
          {market.source === "coingecko"
            ? "LIVE CRYPTO PRICE · CoinGecko identity and market data"
            : market.source === "alpaca"
              ? "LIVE STOCK PRICE · Alpaca Market Data"
              : "SIMULATED PRICE · waiting for the live feed"}
        </small>
        {symbolError && <em className="symbol-error">{symbolError}</em>}
      </section>
      <div className="asset-tabs">
        {Object.entries(snapshot.markets).map(([marketKey, item]) => (
          <button
            className={selected === marketKey ? "active" : ""}
            key={marketKey}
            onClick={() => {
              setSelected(marketKey);
              setSymbolQuery(item.symbol);
            }}
          >
            {item.imageUrl && <img src={item.imageUrl} alt="" />}
            <strong>{item.symbol}</strong>
            <span className={item.price >= item.openingPrice ? "positive-text" : "negative-text"}>
              {((item.price / item.openingPrice - 1) * 100).toFixed(2)}%
            </span>
          </button>
        ))}
      </div>
      <div className="trade-quote">
        <div>
          <small>
            {market.name}
            {market.chain ? ` · ${market.chain}` : ""}
            {market.marketCap ? ` · Cap ${money(market.marketCap, true)}` : ""}
            {market.volume24h ? ` · Vol ${money(market.volume24h, true)}` : ""}
          </small>
          <strong>{marketPrice(market.price)}</strong>
          <span className={change >= 0 ? "positive-text" : "negative-text"}>
            {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(change).toFixed(2)}% this match
          </span>
        </div>
        <MiniChart market={market} />
      </div>
      <div className="order-card">
        <div className="side-toggle">
          <button className={side === "long" ? "active long" : ""} onClick={() => setSide("long")}>
            <ArrowUpRight size={15} /> LONG
          </button>
          <button className={side === "short" ? "active short" : ""} onClick={() => setSide("short")}>
            <ArrowDownRight size={15} /> SHORT
          </button>
        </div>
        <span className="control-label">Margin to risk</span>
        <div className="amount-editor">
          <input
            aria-label="Trade amount slider"
            type="range"
            min={1}
            max={maximumAmount}
            step={1}
            value={validAmount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
          <label>
            <span>$</span>
            <input
              aria-label="Trade amount"
              type="number"
              min={1}
              max={maximumAmount}
              step={1}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              onBlur={() => setAmount(validAmount)}
            />
          </label>
        </div>
        <div className="amount-buttons">
          {[0.1, 0.25, 0.5, 1].map((portion) => {
            const value = Math.max(1, Math.floor(me.cash * portion));
            return (
              <button key={portion} onClick={() => setAmount(value)}>
                {portion === 1 ? "All cash" : `${portion * 100}%`}
              </button>
            );
          })}
        </div>
        <span className="control-label">Leverage</span>
        <div className="leverage-buttons">
          {[1, 5, 10, 25, 50, 100].map((value) => (
            <button
              key={value}
              className={leverage === value ? "active" : ""}
              onClick={() => setLeverage(value)}
            >
              {value}×
            </button>
          ))}
        </div>
        <div className="auto-exit-grid">
          <label>
            <span>Stop loss</span>
            <select value={stopLossPct} onChange={(event) => setStopLossPct(Number(event.target.value))}>
              <option value={0}>Off</option>
              <option value={10}>−10%</option>
              <option value={25}>−25%</option>
              <option value={50}>−50%</option>
              <option value={75}>−75%</option>
            </select>
          </label>
          <label>
            <span>Take profit</span>
            <select value={takeProfitPct} onChange={(event) => setTakeProfitPct(Number(event.target.value))}>
              <option value={0}>Off</option>
              <option value={25}>+25%</option>
              <option value={50}>+50%</option>
              <option value={100}>+100%</option>
              <option value={200}>+200%</option>
            </select>
          </label>
          <label>
            <span>Trailing exit</span>
            <select value={trailingPct} onChange={(event) => setTrailingPct(Number(event.target.value))}>
              <option value={0}>Off</option>
              <option value={10}>10%</option>
              <option value={20}>20%</option>
              <option value={30}>30%</option>
            </select>
          </label>
        </div>
        <div className="exposure-summary">
          <span>{money(validAmount)} margin</span>
          <ArrowRight size={14} />
          <strong>{money(exposure)} exposure</strong>
        </div>
        <button
          className={`buy-button ${side}`}
          disabled={me.cash < validAmount || validAmount <= 0}
          onClick={() =>
            onBuy(selected, validAmount, {
              side,
              leverage,
              stopLossPct,
              takeProfitPct,
              trailingPct,
            })
          }
        >
          {selectedPositions.length ? "Open another" : "Open"} {side.toUpperCase()} {activeSymbol} trade at {leverage}×
        </button>
        <p className="risk-note">
          Leverage multiplies gains and losses. At 100×, a move near 1% against you can liquidate the margin.
        </p>
      </div>
      <div className="positions-list">
        <div className="positions-heading">
          <strong>OPEN {activeSymbol} TRADES</strong>
          <span>{selectedPositions.length}</span>
        </div>
        {selectedPositions.length ? selectedPositions.map(({ positionId, holding }, index) => {
          const roi = positionRoiPct(holding, market.price);
          const profit = holdingProfit(holding, market.price);
          const liquidationRisk = roi <= -70;
          return (
            <div
              className={`position-card ${liquidationRisk ? "liquidation-warning" : ""}`}
              key={positionId}
            >
              <div>
                <small>TRADE #{index + 1} · {liquidationRisk ? "LIQUIDATION RISK" : "OPEN"}</small>
                <strong>
                  {holding.side.toUpperCase()} {holding.leverage}× · {money(positionEquity(holding, market.price))}
                </strong>
                <span className={roi >= 0 ? "positive-text" : "negative-text"}>
                  {roi >= 0 ? "+" : "−"}{Math.abs(roi).toFixed(1)}% · {profit >= 0 ? "+" : "−"}
                  {money(Math.abs(profit))}
                </span>
                <em>
                  Entry {marketPrice(holding.averagePrice)} · SL {holding.stopLossPct ? `−${holding.stopLossPct}%` : "off"} · TP {holding.takeProfitPct ? `+${holding.takeProfitPct}%` : "off"} · Trail {holding.trailingPct ? `${holding.trailingPct}%` : "off"}
                </em>
              </div>
              <button className="sell-button" onClick={() => onSell(positionId)}>Close trade</button>
            </div>
          );
        }) : (
          <div className="position-card empty-position">
            <p>No open {activeSymbol} trades.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CityDesk({
  me,
  onTravel,
  onStudy,
  onApply,
  onWork,
  onEat,
  onRest,
  onScheme,
  onMoveHome,
}: {
  me: PlayerState;
  onTravel: (locationId: LocationId) => void;
  onStudy: (skillId: SkillId) => void;
  onApply: (jobId: string) => void;
  onWork: () => void;
  onEat: (meal: "noodles" | "proper_meal" | "brain_food") => void;
  onRest: () => void;
  onScheme: (actionId: ApartmentActionId) => void;
  onMoveHome: (homeId: string) => void;
}) {
  const locationId = me.locationId ?? "apartment";
  const currentJob = getJob(me.jobId);
  return (
    <div className="desk-content life-desk city-desk">
      <div className="life-summary">
        <div><Clock3 size={18} /><span><small>Week time</small><strong>{Math.round(me.timeRemaining ?? 60)} / 60</strong></span></div>
        <div><Heart size={18} /><span><small>Health / Hunger</small><strong>{Math.round(me.health ?? 100)} / {Math.round(me.hunger ?? 80)}</strong></span></div>
      </div>
      <div className="current-location">
        <span>{getLocation(locationId).icon}</span>
        <div><small>CURRENT LOCATION</small><strong>{getLocation(locationId).name}</strong><p>{getLocation(locationId).description}</p></div>
      </div>

      <small className="section-label">TRAVEL · 6 MINUTES</small>
      <div className="city-location-grid">
        {locations.map((location) => (
          <button
            key={location.id}
            className={locationId === location.id ? "active" : ""}
            disabled={locationId === location.id || (me.timeRemaining ?? 60) < 6}
            onClick={() => onTravel(location.id)}
          >
            <span>{location.icon}</span><strong>{location.name}</strong>
          </button>
        ))}
      </div>

      {locationId === "academy" && (
        <section className="city-action-section">
          <small className="section-label">CHAIN ACADEMY · 20 MINUTES PER SESSION</small>
          {skillOptions.map((skill) => {
            const progress = me.studyProgress?.[skill.id] ?? 0;
            const qualified = Boolean(me.skills?.[skill.id]);
            const blocked = Boolean(skill.prerequisite && !me.skills?.[skill.prerequisite]);
            return (
              <article className="study-card" key={skill.id}>
                <span>{skill.icon}</span>
                <div>
                  <strong>{skill.name}</strong>
                  <p>{skill.description}</p>
                  <em>{qualified ? "QUALIFIED" : `${progress}/${skill.studyRequired} study`}</em>
                </div>
                <button disabled={qualified || blocked || (me.timeRemaining ?? 0) < 20} onClick={() => onStudy(skill.id)}>
                  {blocked ? `Needs ${getSkill(skill.prerequisite!).name}` : qualified ? "Complete" : "Study"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {locationId === "work_hub" && (
        <section className="city-action-section">
          {currentJob && (
            <article className="current-job-card">
              <div><small>CURRENT JOB</small><strong>{currentJob.name}</strong><p>{money(currentJob.pay)} per shift · {currentJob.timeCost} minutes</p></div>
              <button disabled={(me.timeRemaining ?? 0) < currentJob.timeCost} onClick={onWork}>Clock in</button>
            </article>
          )}
          <small className="section-label">CAREER BOARD</small>
          {jobOptions.map((job) => {
            const qualified = !job.skill || (me.skills?.[job.skill] ?? 0) >= (job.skillLevel ?? 1);
            return (
              <article className="job-card" key={job.id}>
                <div><strong>{job.name}</strong><p>{job.description}</p><em>{money(job.pay)} / shift</em></div>
                <button disabled={!qualified || me.jobId === job.id || (me.timeRemaining ?? 0) < 8} onClick={() => onApply(job.id)}>
                  {!qualified ? `Needs ${getSkill(job.skill!).name}` : me.jobId === job.id ? "Employed" : "Apply · 8m"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {locationId === "food_market" && (
        <section className="city-action-section food-actions">
          <small className="section-label">EAT · 6 MINUTES</small>
          <button onClick={() => onEat("noodles")} disabled={me.cash < 90}>🍜 Noodles · $90</button>
          <button onClick={() => onEat("proper_meal")} disabled={me.cash < 260}>🥩 Proper meal · $260</button>
          <button onClick={() => onEat("brain_food")} disabled={me.cash < 480}>🥗 Brain food · $480</button>
        </section>
      )}

      {locationId === "apartment" && (
        <section className="city-action-section">
          <button className="rest-button" disabled={(me.timeRemaining ?? 0) < 15} onClick={onRest}>😴 Rest at home · 15m</button>
          <small className="section-label">COMPUTER ACTIONS</small>
          {[
            ["bug_bounty", "🛡️ Security bug bounty", "cybersecurity", 18],
            ["persuasion_hustle", "☎️ Persuasion hustle", "social_engineering", 15],
            ["viral_campaign", "📣 Viral token campaign", "digital_marketing", 16],
            ["shadow_market", "🕶️ Underground market prototype", "blockchain", 24],
          ].map(([id, label, skill, cost]) => (
            <button
              className="scheme-button"
              key={id}
              disabled={!me.skills?.[skill as SkillId] || (me.timeRemaining ?? 0) < Number(cost)}
              onClick={() => onScheme(id as ApartmentActionId)}
            >
              <strong>{label}</strong><small>{me.skills?.[skill as SkillId] ? `${cost} minutes · random outcome` : `Requires ${getSkill(skill as SkillId).name}`}</small>
            </button>
          ))}
          <small className="section-label">HOUSING</small>
          {homeOptions.map((home) => {
            const owned = me.homeId === home.id;
            return (
              <article className={`compact-home ${owned ? "owned" : ""}`} key={home.id}>
                <span>{home.icon}</span><div><strong>{home.name}</strong><small>♥ {home.happiness} · {money(home.upkeep)} bills</small></div>
                <button disabled={owned || me.cash < home.moveInCost} onClick={() => onMoveHome(home.id)}>
                  {owned ? "Current" : home.moveInCost ? money(home.moveInCost, true) : "Starter"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {locationId === "furniture_store" && (
        <p className="desk-explainer">Open the Assets tab to buy beds, computers, cars and watches while you are here.</p>
      )}

      {locationId === "crypto_exchange" && (
        <p className="desk-explainer">Open the Trade tab to search coins and manage positions. Trading does not consume weekly action time.</p>
      )}
    </div>
  );
}

function AssetDesk({
  me,
  canShop,
  onBuy,
  onInsure,
  onSell,
}: {
  me: PlayerState;
  canShop: boolean;
  onBuy: (id: string, insured: boolean) => void;
  onInsure: (instanceId: string) => void;
  onSell: (instanceId: string) => void;
}) {
  const [insuranceChoice, setInsuranceChoice] = useState<Record<string, boolean>>({});
  return (
    <div className="desk-content asset-desk">
      <p className="desk-explainer">Collectibles can appreciate and raise happiness. Insurance costs money now and during billing, but protects the whole item.</p>
      {!canShop && <div className="location-warning">Travel to Block & Bed before buying new possessions.</div>}
      {me.assets.length > 0 && (
        <section className="owned-assets">
          <small>YOUR COLLECTION</small>
          {me.assets.map((owned) => {
            const item = getCatalogAsset(owned.catalogId)!;
            return (
              <article key={owned.instanceId}>
                <span className="shop-emoji">{item.icon}</span>
                <div>
                  <strong>{item.name}</strong>
                  <p>{money(owned.currentValue)} · {owned.currentValue >= owned.purchasePrice ? "appreciating" : "below purchase price"}</p>
                </div>
                <span className={`insurance-state ${owned.insured ? "insured" : ""}`}>
                  {owned.insured ? <Shield size={12} /> : <ShieldAlert size={12} />}
                  {owned.insured ? "Insured" : "At risk"}
                </span>
                <div className="asset-actions">
                  {!owned.insured && <button onClick={() => onInsure(owned.instanceId)}>Insure</button>}
                  <button onClick={() => onSell(owned.instanceId)}>Sell</button>
                </div>
              </article>
            );
          })}
        </section>
      )}
      <section className="asset-shop">
        <small>ASSET MARKET</small>
        {assetCatalog.map((item) => {
          const insured = insuranceChoice[item.id] ?? true;
          const premium = item.price * item.insuranceRate;
          return (
            <article key={item.id}>
              <span className="shop-emoji">{item.icon}</span>
              <div>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
                <span className="shop-meta">
                  <em><Heart size={11} /> +{item.happiness}</em>
                  <em><TrendingUp size={11} /> Variable value</em>
                </span>
              </div>
              <label className="insurance-toggle">
                <input type="checkbox" checked={insured} onChange={(event) => setInsuranceChoice((current) => ({ ...current, [item.id]: event.target.checked }))} />
                <span><Shield size={12} /> Insurance {money(premium, true)}</span>
              </label>
              <button disabled={!canShop || me.cash < item.price + (insured ? premium : 0)} onClick={() => onBuy(item.id, insured)}>
                Buy · {money(item.price + (insured ? premium : 0), true)}
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function GameBoard({
  snapshot,
  me,
  onAction,
  onHelp,
}: {
  snapshot: GameSnapshot;
  me: PlayerState;
  onAction: (reducer: (game: GameSnapshot) => void) => Promise<void>;
  onHelp: () => void;
}) {
  const [deskTab, setDeskTab] = useState<DeskTab>("trade");
  const [selectedId, setSelectedId] = useState(me.id);
  const [mobileDesk, setMobileDesk] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [, forceClock] = useState(0);
  const selected = snapshot.players[selectedId] ?? me;
  const primaryMarket = snapshot.markets["crypto:bitcoin"] ?? Object.values(snapshot.markets)[0];

  useEffect(() => {
    const timer = window.setInterval(() => forceClock((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = (snapshot.endsAt ?? Date.now()) - Date.now();
  const roundRemaining = (snapshot.roundEndsAt ?? Date.now()) - Date.now();
  const worth = netWorth(me, snapshot.markets);
  const runAction = async (reducer: (game: GameSnapshot) => void) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await onAction(reducer);
    } finally {
      setActionBusy(false);
    }
  };

  const buy = (
    symbol: string,
    amount: number,
    options: {
      side: PositionSide;
      leverage: number;
      stopLossPct: number;
      takeProfitPct: number;
      trailingPct: number;
    },
  ) => runAction((game) => { buyStock(game, me.id, symbol, amount, options); });
  const sell = (positionId: string) => runAction((game) => { sellStock(game, me.id, positionId); });
  const addCrypto = async (coin: CryptoCoinDetail) => {
    await runAction((game) => {
      upsertLiveMarket(game, coin);
    });
    return coin.marketKey;
  };
  const move = (homeId: string) => runAction((game) => { moveHome(game, me.id, homeId); });
  const travel = (locationId: LocationId) => runAction((game) => { travelTo(game, me.id, locationId); });
  const study = (skillId: SkillId) => runAction((game) => { studySkill(game, me.id, skillId); });
  const apply = (jobId: string) => runAction((game) => { applyForJob(game, me.id, jobId); });
  const work = () => runAction((game) => { workShift(game, me.id); });
  const eat = (meal: "noodles" | "proper_meal" | "brain_food") => runAction((game) => { buyMeal(game, me.id, meal); });
  const rest = () => runAction((game) => { restAtHome(game, me.id); });
  const scheme = (actionId: ApartmentActionId) => runAction((game) => { attemptApartmentAction(game, me.id, actionId); });
  const purchaseAsset = (id: string, insured: boolean) => runAction((game) => { buyAsset(game, me.id, id, insured); });
  const insure = (instanceId: string) => runAction((game) => { insureAsset(game, me.id, instanceId); });
  const sellPossession = (instanceId: string) => runAction((game) => { sellAsset(game, me.id, instanceId); });

  return (
    <main className="game-shell">
      <header className="game-header">
        <Brand compact />
        <div className="match-status">
          <span className="live-dot" /> WEEK {snapshot.roundNumber ?? 1} · {formatClock(roundRemaining)}
        </div>
        <div className="header-score">
          <span><WalletCards size={14} /> {money(worth)}</span>
          <span><Heart size={14} /> {Math.round(me.happiness)}</span>
          <strong><Timer size={16} /> {formatClock(remaining)}</strong>
          <button onClick={onHelp}><HelpCircle size={17} /></button>
        </div>
      </header>

      <div className="game-grid">
        <Standings snapshot={snapshot} selectedId={selectedId} onSelect={setSelectedId} />

        <section className="central-board">
          <img className="board-city" src="/assets/city-board.png" alt="" />
          <div className="board-vignette" />
          <div className="market-overlay glass-panel">
            <div>
              <span>FAST LANE MARKET · {primaryMarket.symbol}</span>
              <strong>{marketPrice(primaryMarket.price)}</strong>
              <em className={primaryMarket.price >= primaryMarket.openingPrice ? "positive-text" : "negative-text"}>
                {((primaryMarket.price / primaryMarket.openingPrice - 1) * 100).toFixed(2)}%
              </em>
            </div>
            <MiniChart market={primaryMarket} />
          </div>

          {Object.values(snapshot.players).map((player, index) => {
            const locationPositions: Record<LocationId, { left: string; top: string }> = {
              apartment: { left: "20%", top: "70%" },
              academy: { left: "23%", top: "35%" },
              work_hub: { left: "76%", top: "34%" },
              food_market: { left: "50%", top: "72%" },
              furniture_store: { left: "78%", top: "70%" },
              crypto_exchange: { left: "50%", top: "37%" },
            };
            const base = locationPositions[player.locationId ?? "apartment"];
            const offset = (index % 3) * 4;
            return (
              <button
                className={`board-player ${selectedId === player.id ? "active" : ""}`}
                key={player.id}
                style={{ left: `calc(${base.left} + ${offset}px)`, top: `calc(${base.top} + ${offset}px)`, "--player": player.color } as React.CSSProperties}
                onClick={() => setSelectedId(player.id)}
              >
                <span><img src={avatars[player.avatar].image} alt="" /></span>
                <strong>{player.name}</strong>
                <small>{money(netWorth(player, snapshot.markets), true)} · ♥ {Math.round(player.happiness)}</small>
              </button>
            );
          })}

          <div className="selected-player-strip glass-panel" style={{ "--player": selected.color } as React.CSSProperties}>
            <img src={avatars[selected.avatar].image} alt="" />
            <div>
              <small>PUBLIC LIFE PROFILE</small>
              <h2>{selected.name}</h2>
              <p>{getHome(selected.homeId).name} · {selected.latestTrade}</p>
            </div>
            <div className="public-stat"><span>Crypto</span><strong>{money(portfolioValue(selected, snapshot.markets), true)}</strong></div>
            <div className="public-stat"><span>Possessions</span><strong>{money(possessionsValue(selected), true)}</strong></div>
            <div className="public-stat"><span>Best trade</span><strong>{selected.bestTrade}</strong></div>
          </div>
        </section>

        <aside className={`player-desk glass-panel ${mobileDesk ? "mobile-open" : ""} ${actionBusy ? "desk-saving" : ""}`} aria-busy={actionBusy}>
          <div className="desk-header">
            <div>
              <span>MY PRIVATE DESK</span>
              <strong>{actionBusy ? "Saving action…" : `${money(me.cash)} cash`}</strong>
            </div>
            <button className="desk-close" onClick={() => setMobileDesk(false)}><X size={18} /></button>
          </div>
          <div className="desk-tabs">
            <button className={deskTab === "trade" ? "active" : ""} onClick={() => setDeskTab("trade")}><BarChart3 size={15} /> Trade</button>
            <button className={deskTab === "life" ? "active" : ""} onClick={() => setDeskTab("life")}><House size={15} /> City</button>
            <button className={deskTab === "assets" ? "active" : ""} onClick={() => setDeskTab("assets")}><ShoppingBag size={15} /> Assets</button>
          </div>
          {deskTab === "trade" && (
            <TradeDesk
              snapshot={snapshot}
              me={me}
              onBuy={buy}
              onSell={sell}
              onAddCrypto={addCrypto}
            />
          )}
          {deskTab === "life" && (
            <CityDesk
              me={me}
              onTravel={travel}
              onStudy={study}
              onApply={apply}
              onWork={work}
              onEat={eat}
              onRest={rest}
              onScheme={scheme}
              onMoveHome={move}
            />
          )}
          {deskTab === "assets" && <AssetDesk me={me} canShop={(me.locationId ?? "apartment") === "furniture_store"} onBuy={purchaseAsset} onInsure={insure} onSell={sellPossession} />}
        </aside>

        <EventFeed events={snapshot.events} players={snapshot.players} />
      </div>

      <button className="mobile-desk-button" onClick={() => setMobileDesk(true)}>
        <BriefcaseBusiness size={18} /> Open my desk
      </button>
      <footer className="game-ticker">
        <span><Radio size={13} /> FAST LANE LIVE</span>
        <div>One-minute weeks · Study, work, eat and rest · Trading continues between actions · Happiness adjusts the final score</div>
      </footer>
    </main>
  );
}

function Results({
  snapshot,
  me,
  onExit,
}: {
  snapshot: GameSnapshot;
  me: PlayerState;
  onExit: () => void;
}) {
  const ranking = [...Object.values(snapshot.players)].sort(
    (a, b) => finalScore(b, snapshot.markets) - finalScore(a, snapshot.markets),
  );
  const winner = ranking[0];
  return (
    <main className="results-screen">
      <img className="results-city" src="/assets/city-board.png" alt="" />
      <div className="results-shade" />
      <section className="results-panel glass-panel">
        <Crown className="results-crown" size={42} />
        <small>MARKET CLOSED</small>
        <h1>{winner?.name} wins the Fast Lane</h1>
        <p>
          Wealth won the race, but happiness decided how much of that wealth counted.
        </p>
        <div className="results-list">
          {ranking.map((player, index) => (
            <article key={player.id} className={player.id === me.id ? "is-me" : ""}>
              <span>{index + 1}</span>
              <img src={avatars[player.avatar].image} alt="" />
              <div><strong>{player.name}</strong><small>{getHome(player.homeId).name}</small></div>
              <div><small>Net worth</small><strong>{money(netWorth(player, snapshot.markets))}</strong></div>
              <div><small>Happiness</small><strong>{Math.round(player.happiness)} · {happinessMultiplier(player.happiness).toFixed(2)}×</strong></div>
              <div className="result-score"><small>Final score</small><strong>{money(finalScore(player, snapshot.markets))}</strong></div>
            </article>
          ))}
        </div>
        <button className="primary-button" onClick={onExit}>Return to main menu <ArrowRight size={18} /></button>
      </section>
    </main>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <section className="help-modal glass-panel">
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <span><HelpCircle size={20} /> QUICK RULES</span>
        <h2>How to win the Fast Lane</h2>
        <div className="help-grid">
          <article><Timer size={22} /><strong>Use each week</strong><p>Everyone acts simultaneously. Travel, study, work, food and rest consume your 60 weekly action minutes.</p></article>
          <article><GraduationCap size={22} /><strong>Build useful skills</strong><p>Qualifications unlock careers and fictional computer actions with uncertain rewards and consequences.</p></article>
          <article><HeartPulse size={22} /><strong>Stay functional</strong><p>Food, rest, housing and possessions support health and happiness. Neglect creates penalties.</p></article>
          <article><TrendingUp size={22} /><strong>Trade on the side</strong><p>Crypto positions use no action minutes. Leverage and automatic exits can help—or erase margin quickly.</p></article>
        </div>
        <div className="formula-card">
          <span>WINNING FORMULA</span>
          <strong>Final Score = Net Worth × Happiness Multiplier</strong>
          <em>Multiplier ranges from 0.85× to 1.05×.</em>
        </div>
        <button className="primary-button" onClick={onClose}>Back to the game</button>
      </section>
    </div>
  );
}

function App() {
  const [identity, setIdentity] = useState("");
  const [persisted, setPersisted] = useState<PersistedGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const gameCode = persisted?.snapshot.code ?? getInviteCode();
  const tickBusy = useRef(false);
  const tickRetryAt = useRef(0);
  const lastUserActionAt = useRef(0);

  const load = useCallback(async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const game = await loadPersistedGame(code);
      setPersisted(game);
      if (!game) setError("That game could not be found. Check the invite link.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this game.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const id = await ensureIdentity();
        setIdentity(id);
        const code = getInviteCode();
        if (code) await load(code);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not initialize multiplayer.");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  useEffect(() => {
    if (!gameCode) return;
    return subscribeToGame(gameCode, setPersisted);
  }, [gameCode]);

  const createGame = async (
    name: string,
    avatar: AvatarId,
    duration: 15 | 30 | 60,
  ) => {
    const snapshot = createGameSnapshot(identity, name, avatar, duration);
    const game = await createPersistedGame(snapshot);
    setPersisted(game);
    setError("");
    updateUrl(snapshot.code);
  };

  const joinGame = async (code: string, name: string, avatar: AvatarId) => {
    const current = await loadPersistedGame(code);
    if (!current) throw new Error("That game could not be found.");
    if (current.snapshot.status !== "lobby") throw new Error("That match has already started.");
    if (Object.keys(current.snapshot.players).length >= 4) throw new Error("That lobby is already full.");
    const usedAvatars = new Set(Object.values(current.snapshot.players).map((player) => player.avatar));
    const chosen = usedAvatars.has(avatar)
      ? (Object.keys(avatars) as AvatarId[]).find((id) => !usedAvatars.has(id)) ?? avatar
      : avatar;
    const updated = await updatePersistedGame(code, (game) => {
      game.players[identity] = makePlayer(identity, name, chosen);
      addEvent(game, {
        type: "system",
        playerId: identity,
        title: `${name} joined the lobby`,
        detail: "Another future financial genius has arrived.",
        positive: true,
      });
    });
    setPersisted(updated);
    setError("");
    updateUrl(updated.snapshot.code);
  };

  const commit = useCallback(
    async (reducer: (snapshot: GameSnapshot) => void) => {
      if (!persisted) return;
      lastUserActionAt.current = Date.now();
      try {
        const next = await updatePersistedGame(persisted.snapshot.code, (game) => {
          advanceGameRounds(game, Date.now());
          reducer(game);
        });
        setPersisted(next);
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "The action could not be saved.");
      }
    },
    [persisted],
  );

  const leave = () => {
    setPersisted(null);
    setError("");
    setHelpOpen(false);
    setShowTutorial(false);
    updateUrl();
  };

  useEffect(() => {
    const snapshot = persisted?.snapshot;
    if (
      !snapshot ||
      snapshot.status !== "playing" ||
      snapshot.hostId !== identity ||
      !snapshot.roundEndsAt
    ) return;

    let cancelled = false;
    let retryTimer = 0;
    const advanceRound = async () => {
      if (cancelled) return;
      try {
        const next = await updatePersistedGame(snapshot.code, (game) => {
          advanceGameRounds(game, Date.now());
        });
        if (!cancelled) setPersisted(next);
      } catch (cause) {
        console.warn("Week reset will retry shortly.", cause);
        if (!cancelled) {
          retryTimer = window.setTimeout(advanceRound, 2_500);
        }
      }
    };
    const delay = Math.max(100, snapshot.roundEndsAt - Date.now() + 150);
    const timer = window.setTimeout(advanceRound, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
    };
  }, [
    identity,
    persisted?.snapshot.code,
    persisted?.snapshot.hostId,
    persisted?.snapshot.roundEndsAt,
    persisted?.snapshot.status,
  ]);

  useEffect(() => {
    const snapshot = persisted?.snapshot;
    if (!snapshot || snapshot.status !== "playing" || snapshot.hostId !== identity) return;
    const interval = window.setInterval(async () => {
      if (
        tickBusy.current ||
        Date.now() < tickRetryAt.current ||
        Date.now() - lastUserActionAt.current < 4_000
      ) return;
      tickBusy.current = true;
      try {
        let quotes: Awaited<ReturnType<typeof fetchMarketQuotes>> = {};
        let livePrices: Record<string, number> = {};
        try {
          quotes = await fetchMarketQuotes(snapshot.markets);
          livePrices = Object.fromEntries(
            Object.entries(quotes).map(([marketKey, quote]) => [marketKey, quote.price]),
          );
        } catch (cause) {
          console.warn("Live market prices are temporarily unavailable.", cause);
        }
        const next = await updatePersistedGame(
          snapshot.code,
          (game) => {
            Object.entries(quotes).forEach(([marketKey, quote]) => {
              const existing = game.markets[marketKey];
              if (!existing) return;
              existing.marketCap = quote.marketCap;
              existing.volume24h = quote.volume24h;
              existing.change24hPct = quote.change24hPct;
              existing.provider = quote.provider;
            });
            tickGame(game, Date.now(), livePrices);
          },
        );
        setPersisted(next);
        tickRetryAt.current = 0;
      } catch (cause) {
        tickRetryAt.current = Date.now() + 30_000;
        console.warn("Market update will retry on the next tick.", cause);
      } finally {
        tickBusy.current = false;
      }
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [
    identity,
    persisted?.snapshot.code,
    persisted?.snapshot.hostId,
    persisted?.snapshot.status,
    persisted ? Object.keys(persisted.snapshot.markets).sort().join(",") : "",
  ]);

  const snapshot = persisted?.snapshot;
  const me = snapshot?.players[identity];

  if (loading && !snapshot) {
    return <main className="loading-screen"><LoaderCircle className="spin" size={34} /><span>Opening the market…</span></main>;
  }

  if (!snapshot || !me) {
    return (
      <>
        <Landing loading={loading} initialCode={getInviteCode()} onCreate={createGame} onJoin={joinGame} />
        {error && <div className="global-toast"><ShieldAlert size={16} />{error}<button onClick={() => setError("")}><X size={14} /></button></div>}
      </>
    );
  }

  if (showTutorial && (snapshot.status === "lobby" || snapshot.status === "briefing")) {
    return (
      <Tutorial
        onComplete={() => {
          void commit((game) => {
            if (game.status === "briefing") game.status = "lobby";
            const player = game.players[identity];
            if (player) player.ready = true;
          });
          setShowTutorial(false);
        }}
      />
    );
  }

  if (snapshot.status === "lobby" || snapshot.status === "briefing") {
    return (
      <Lobby
        snapshot={snapshot}
        me={me}
        onLeave={leave}
        onTutorial={() => setShowTutorial(true)}
        onAddBot={() => void commit((game) => { addSmartBot(game); })}
        onRemoveBot={(id) => void commit((game) => { removeBot(game, id); })}
        onStart={() => void commit((game) => {
          const now = Date.now();
          game.status = "playing";
          game.startedAt = now;
          game.endsAt = now + game.durationMinutes * 60_000;
          game.roundNumber = 1;
          game.roundEndsAt = now + 60_000;
          Object.values(game.players).forEach((player) => {
            player.timeRemaining = 60;
          });
          game.lastMarketTick = now;
          game.nextIncidentAt = now + 35_000;
          game.nextBillingAt = now + game.durationMinutes * 60_000 / 6;
          addEvent(game, {
            type: "system",
            title: "The market is open",
            detail: `${game.durationMinutes} minutes remain. Make money and try to enjoy it.`,
            positive: true,
          });
        })}
      />
    );
  }

  if (snapshot.status === "finished") {
    return <Results snapshot={snapshot} me={me} onExit={leave} />;
  }

  return (
    <>
      <GameBoard snapshot={snapshot} me={me} onAction={commit} onHelp={() => setHelpOpen(true)} />
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {error && <div className="global-toast"><ShieldAlert size={16} />{error}<button onClick={() => setError("")}><X size={14} /></button></div>}
    </>
  );
}

export default App;
