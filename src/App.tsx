import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clipboard,
  Clock3,
  Copy,
  Crown,
  Gauge,
  Heart,
  HelpCircle,
  Home,
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
  RefreshCcw,
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
} from "./game/catalog";
import {
  addEvent,
  buyAsset,
  buyStock,
  createGameSnapshot,
  finalScore,
  formatMoney,
  getCatalogAsset,
  getHome,
  happinessMultiplier,
  holdingProfit,
  insureAsset,
  makePlayer,
  moveHome,
  netWorth,
  portfolioValue,
  possessionsValue,
  sellAsset,
  sellStock,
  tickGame,
} from "./game/engine";
import type {
  AvatarId,
  GameEvent,
  GameSnapshot,
  MarketState,
  PersistedGame,
  PlayerState,
} from "./game/types";
import {
  createPersistedGame,
  ensureIdentity,
  hasSupabase,
  loadPersistedGame,
  subscribeToGame,
  updatePersistedGame,
} from "./lib/gameStore";

type DeskTab = "trade" | "life" | "assets";

const money = (value: number, compact = false) => formatMoney(value, compact);

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
    title: "Build wealth without forgetting to live.",
    body: "Stocks are the main way to earn money. Cars, watches and homes can add value and happiness. When time expires, the highest life-adjusted score wins.",
    icon: Trophy,
    accent: "#f4bd57",
  },
  {
    eyebrow: "THE CENTRAL BOARD",
    title: "Everyone’s public life unfolds here.",
    body: "The shared board shows standings, happiness, important trades, possessions and incidents. It is designed for a television, stream or second monitor.",
    icon: Radio,
    accent: "#68e5c4",
  },
  {
    eyebrow: "YOUR TRADING DESK",
    title: "Buying and selling is intentionally simple.",
    body: "Choose a stock, choose an amount and buy. Sell the entire position whenever you want. Prices move for every player at the same time.",
    icon: TrendingUp,
    accent: "#b991ff",
  },
  {
    eyebrow: "LIFE & HAPPINESS",
    title: "A better life can overturn a narrow money lead.",
    body: "Homes and luxury assets raise happiness. Final Score equals Net Worth multiplied by a happiness factor between 0.85× and 1.05×.",
    icon: Heart,
    accent: "#ff775f",
  },
  {
    eyebrow: "RISK & INSURANCE",
    title: "Expensive things attract expensive problems.",
    body: "Insured possessions cost premiums but survive accidents and burglaries. Uninsured items can disappear completely. No refunds from fate.",
    icon: Shield,
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
        <div className="eyebrow">A REAL-TIME SOCIAL TRADING GAME</div>
        <h1>Make a fortune.<br />Try to enjoy it.</h1>
        <p>
          Invite your friends, trade the same moving market and build the happiest
          expensive life before the clock reaches zero.
        </p>
        <div className="feature-row">
          <span><Timer size={16} /> 15–60 minute matches</span>
          <span><Users size={16} /> Private invite rooms</span>
          <span><Heart size={16} /> Wealth + happiness scoring</span>
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
  onBegin,
  onLeave,
}: {
  snapshot: GameSnapshot;
  me: PlayerState;
  onBegin: () => void;
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
            The market opens after a short optional briefing. Share this invite with up to
            three friends.
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
                <span>{player.id === snapshot.hostId ? "Host" : "Ready to learn"}</span>
              </div>
              <Check size={18} />
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - players.length) }, (_, index) => (
            <div className="lobby-player empty" key={index}>
              <span className="empty-avatar"><Users size={20} /></span>
              <div><strong>Waiting for friend…</strong><span>Send the invite link</span></div>
            </div>
          ))}
        </div>

        {isHost ? (
          <button className="primary-button lobby-start" onClick={onBegin}>
            <Play size={18} /> Begin pre-game briefing
          </button>
        ) : (
          <div className="waiting-message"><LoaderCircle className="spin" size={17} /> Waiting for the host to begin</div>
        )}
      </section>
    </main>
  );
}

function Tutorial({
  snapshot,
  me,
  onReady,
  onStart,
}: {
  snapshot: GameSnapshot;
  me: PlayerState;
  onReady: () => void;
  onStart: () => void;
}) {
  const [step, setStep] = useState(0);
  const content = tutorialSteps[step];
  const Icon = content.icon;
  const allReady = Object.values(snapshot.players).every((player) => player.ready);
  const isHost = me.id === snapshot.hostId;

  if (me.ready) {
    return (
      <main className="briefing-wait">
        <img className="briefing-city" src="/assets/city-board.png" alt="" />
        <div className="briefing-shade" />
        <section className="ready-card glass-panel">
          <span className="ready-icon"><Check size={30} /></span>
          <small>BRIEFING COMPLETE</small>
          <h1>You know enough to be dangerous.</h1>
          <p>
            {isHost
              ? allReady
                ? "Everyone is ready. Open the market when you are."
                : "You can wait for everyone or start the match now."
              : "Waiting for the host to open the market."}
          </p>
          <div className="ready-list">
            {Object.values(snapshot.players).map((player) => (
              <div key={player.id} className={player.ready ? "ready" : ""}>
                <img src={avatars[player.avatar].image} alt="" />
                <span>{player.name}</span>
                {player.ready ? <Check size={15} /> : <LoaderCircle className="spin" size={15} />}
              </div>
            ))}
          </div>
          {isHost && (
            <button className="primary-button" onClick={onStart}>
              <Play size={18} /> {allReady ? "Open the market" : "Start anyway"}
            </button>
          )}
        </section>
      </main>
    );
  }

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
        <button className="skip-button" onClick={onReady}>Skip tutorial</button>
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
            onClick={() => step === tutorialSteps.length - 1 ? onReady() : setStep((value) => value + 1)}
          >
            {step === tutorialSteps.length - 1 ? "I’m ready" : "Next"}
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
          return (
            <button
              key={player.id}
              className={`standing-card ${selectedId === player.id ? "active" : ""}`}
              onClick={() => onSelect(player.id)}
              style={{ "--player": player.color } as React.CSSProperties}
            >
              <span className="standing-rank">{index + 1}</span>
              <span className="standing-avatar"><img src={avatars[player.avatar].image} alt="" /></span>
              <span className="standing-copy">
                <strong>{player.name}</strong>
                <small>{getHome(player.homeId).name}</small>
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
}: {
  snapshot: GameSnapshot;
  me: PlayerState;
  onBuy: (symbol: string, amount: number) => void;
  onSell: (symbol: string) => void;
}) {
  const [selected, setSelected] = useState(Object.keys(snapshot.markets)[0]);
  const [amount, setAmount] = useState(1000);
  const market = snapshot.markets[selected];
  const holding = me.holdings[selected];
  const change = (market.price / market.openingPrice - 1) * 100;
  return (
    <div className="desk-content trade-desk">
      <div className="asset-tabs">
        {Object.values(snapshot.markets).map((item) => (
          <button className={selected === item.symbol ? "active" : ""} key={item.symbol} onClick={() => setSelected(item.symbol)}>
            <strong>{item.symbol}</strong>
            <span className={item.price >= item.openingPrice ? "positive-text" : "negative-text"}>
              {((item.price / item.openingPrice - 1) * 100).toFixed(2)}%
            </span>
          </button>
        ))}
      </div>
      <div className="trade-quote">
        <div>
          <small>{market.name}</small>
          <strong>{money(market.price)}</strong>
          <span className={change >= 0 ? "positive-text" : "negative-text"}>
            {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(change).toFixed(2)}% this match
          </span>
        </div>
        <MiniChart market={market} />
      </div>
      <div className="order-card">
        <div className="amount-buttons">
          {[1000, 2500, 5000, 10000].map((value) => (
            <button key={value} className={amount === value ? "active" : ""} onClick={() => setAmount(value)}>
              {money(value, true)}
            </button>
          ))}
        </div>
        <button className="buy-button" disabled={me.cash < amount} onClick={() => onBuy(selected, amount)}>
          Buy {selected} for {money(amount)}
        </button>
      </div>
      <div className="position-card">
        <div>
          <small>YOUR POSITION</small>
          {holding ? (
            <>
              <strong>{money(holding.shares * market.price)}</strong>
              <span className={holdingProfit(holding, market.price) >= 0 ? "positive-text" : "negative-text"}>
                {holdingProfit(holding, market.price) >= 0 ? "+" : "−"}{money(Math.abs(holdingProfit(holding, market.price)))} profit
              </span>
            </>
          ) : <p>No position in {selected}.</p>}
        </div>
        {holding && <button className="sell-button" onClick={() => onSell(selected)}>Sell all</button>}
      </div>
    </div>
  );
}

function LifeDesk({
  snapshot,
  me,
  onMove,
}: {
  snapshot: GameSnapshot;
  me: PlayerState;
  onMove: (homeId: string) => void;
}) {
  return (
    <div className="desk-content life-desk">
      <div className="life-summary">
        <div><Heart size={18} /><span><small>Happiness</small><strong>{Math.round(me.happiness)} / 100</strong></span></div>
        <div><Gauge size={18} /><span><small>Score multiplier</small><strong>{happinessMultiplier(me.happiness).toFixed(2)}×</strong></span></div>
      </div>
      <p className="desk-explainer">Homes set a stronger happiness baseline but charge upkeep at every billing cycle.</p>
      <div className="shop-list">
        {homeOptions.map((home) => {
          const owned = me.homeId === home.id;
          return (
            <article className={owned ? "owned" : ""} key={home.id}>
              <span className="shop-emoji">{home.icon}</span>
              <div>
                <strong>{home.name}</strong>
                <p>{home.description}</p>
                <span className="shop-meta">
                  <em><Heart size={11} /> {home.happiness}</em>
                  <em><CircleDollarSign size={11} /> {money(home.upkeep)} bills</em>
                </span>
              </div>
              <button disabled={owned || me.cash < home.moveInCost} onClick={() => onMove(home.id)}>
                {owned ? "Current home" : home.moveInCost ? `Move · ${money(home.moveInCost, true)}` : "Starter"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function AssetDesk({
  me,
  onBuy,
  onInsure,
  onSell,
}: {
  me: PlayerState;
  onBuy: (id: string, insured: boolean) => void;
  onInsure: (instanceId: string) => void;
  onSell: (instanceId: string) => void;
}) {
  const [insuranceChoice, setInsuranceChoice] = useState<Record<string, boolean>>({});
  return (
    <div className="desk-content asset-desk">
      <p className="desk-explainer">Collectibles can appreciate and raise happiness. Insurance costs money now and during billing, but protects the whole item.</p>
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
              <button disabled={me.cash < item.price + (insured ? premium : 0)} onClick={() => onBuy(item.id, insured)}>
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
  onAction: (reducer: (game: GameSnapshot) => void) => void;
  onHelp: () => void;
}) {
  const [deskTab, setDeskTab] = useState<DeskTab>("trade");
  const [selectedId, setSelectedId] = useState(me.id);
  const [mobileDesk, setMobileDesk] = useState(false);
  const [, forceClock] = useState(0);
  const selected = snapshot.players[selectedId] ?? me;
  const primaryMarket = snapshot.markets.NVDA ?? Object.values(snapshot.markets)[0];

  useEffect(() => {
    const timer = window.setInterval(() => forceClock((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = (snapshot.endsAt ?? Date.now()) - Date.now();
  const worth = netWorth(me, snapshot.markets);

  const buy = (symbol: string, amount: number) => onAction((game) => { buyStock(game, me.id, symbol, amount); });
  const sell = (symbol: string) => onAction((game) => { sellStock(game, me.id, symbol); });
  const move = (homeId: string) => onAction((game) => { moveHome(game, me.id, homeId); });
  const purchaseAsset = (id: string, insured: boolean) => onAction((game) => { buyAsset(game, me.id, id, insured); });
  const insure = (instanceId: string) => onAction((game) => { insureAsset(game, me.id, instanceId); });
  const sellPossession = (instanceId: string) => onAction((game) => { sellAsset(game, me.id, instanceId); });

  return (
    <main className="game-shell">
      <header className="game-header">
        <Brand compact />
        <div className="match-status">
          <span className="live-dot" /> LIVE · {snapshot.durationMinutes} MIN MATCH
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
              <strong>{money(primaryMarket.price)}</strong>
              <em className={primaryMarket.price >= primaryMarket.openingPrice ? "positive-text" : "negative-text"}>
                {((primaryMarket.price / primaryMarket.openingPrice - 1) * 100).toFixed(2)}%
              </em>
            </div>
            <MiniChart market={primaryMarket} />
          </div>

          {Object.values(snapshot.players).map((player, index) => {
            const positions = [
              { left: "25%", top: "33%" },
              { left: "72%", top: "32%" },
              { left: "29%", top: "70%" },
              { left: "73%", top: "70%" },
            ];
            return (
              <button
                className={`board-player ${selectedId === player.id ? "active" : ""}`}
                key={player.id}
                style={{ ...positions[index % positions.length], "--player": player.color } as React.CSSProperties}
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
            <div className="public-stat"><span>Stocks</span><strong>{money(portfolioValue(selected, snapshot.markets), true)}</strong></div>
            <div className="public-stat"><span>Possessions</span><strong>{money(possessionsValue(selected), true)}</strong></div>
            <div className="public-stat"><span>Best trade</span><strong>{selected.bestTrade}</strong></div>
          </div>
        </section>

        <aside className={`player-desk glass-panel ${mobileDesk ? "mobile-open" : ""}`}>
          <div className="desk-header">
            <div>
              <span>MY PRIVATE DESK</span>
              <strong>{money(me.cash)} cash</strong>
            </div>
            <button className="desk-close" onClick={() => setMobileDesk(false)}><X size={18} /></button>
          </div>
          <div className="desk-tabs">
            <button className={deskTab === "trade" ? "active" : ""} onClick={() => setDeskTab("trade")}><BarChart3 size={15} /> Trade</button>
            <button className={deskTab === "life" ? "active" : ""} onClick={() => setDeskTab("life")}><House size={15} /> Home</button>
            <button className={deskTab === "assets" ? "active" : ""} onClick={() => setDeskTab("assets")}><ShoppingBag size={15} /> Assets</button>
          </div>
          {deskTab === "trade" && <TradeDesk snapshot={snapshot} me={me} onBuy={buy} onSell={sell} />}
          {deskTab === "life" && <LifeDesk snapshot={snapshot} me={me} onMove={move} />}
          {deskTab === "assets" && <AssetDesk me={me} onBuy={purchaseAsset} onInsure={insure} onSell={sellPossession} />}
        </aside>

        <EventFeed events={snapshot.events} players={snapshot.players} />
      </div>

      <button className="mobile-desk-button" onClick={() => setMobileDesk(true)}>
        <BriefcaseBusiness size={18} /> Open my desk
      </button>
      <footer className="game-ticker">
        <span><Radio size={13} /> FAST LANE LIVE</span>
        <div>Stocks remain the main engine of wealth · Happiness adjusts final score · Insure what you cannot afford to lose · Next billing cycle approaching</div>
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
          <article><TrendingUp size={22} /><strong>Trade stocks</strong><p>Buy fixed cash amounts and sell whole positions. Market prices are shared live.</p></article>
          <article><Home size={22} /><strong>Upgrade your home</strong><p>Better housing raises happiness but charges larger recurring bills.</p></article>
          <article><Car size={22} /><strong>Own valuables</strong><p>Cars and watches change value, add happiness and can be sold before time expires.</p></article>
          <article><Shield size={22} /><strong>Manage insurance</strong><p>Coverage costs premiums. Uninsured possessions can be lost to accidents or burglary.</p></article>
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
  const gameCode = persisted?.snapshot.code ?? getInviteCode();
  const tickBusy = useRef(false);

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
    updateUrl(updated.snapshot.code);
  };

  const commit = useCallback(
    async (reducer: (snapshot: GameSnapshot) => void) => {
      if (!persisted) return;
      try {
        const next = await updatePersistedGame(persisted.snapshot.code, reducer);
        setPersisted(next);
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
    updateUrl();
  };

  useEffect(() => {
    const snapshot = persisted?.snapshot;
    if (!snapshot || snapshot.status !== "playing" || snapshot.hostId !== identity) return;
    const interval = window.setInterval(async () => {
      if (tickBusy.current) return;
      tickBusy.current = true;
      try {
        const next = await updatePersistedGame(snapshot.code, (game) => tickGame(game));
        setPersisted(next);
      } finally {
        tickBusy.current = false;
      }
    }, 2500);
    return () => window.clearInterval(interval);
  }, [identity, persisted?.snapshot.code, persisted?.snapshot.hostId, persisted?.snapshot.status]);

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

  if (snapshot.status === "lobby") {
    return (
      <Lobby
        snapshot={snapshot}
        me={me}
        onLeave={leave}
        onBegin={() => void commit((game) => {
          game.status = "briefing";
          Object.values(game.players).forEach((player) => { player.ready = false; });
        })}
      />
    );
  }

  if (snapshot.status === "briefing") {
    return (
      <Tutorial
        snapshot={snapshot}
        me={me}
        onReady={() => void commit((game) => { game.players[identity].ready = true; })}
        onStart={() => void commit((game) => {
          const now = Date.now();
          game.status = "playing";
          game.startedAt = now;
          game.endsAt = now + game.durationMinutes * 60_000;
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
      <GameBoard snapshot={snapshot} me={me} onAction={(reducer) => void commit(reducer)} onHelp={() => setHelpOpen(true)} />
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {error && <div className="global-toast"><ShieldAlert size={16} />{error}<button onClick={() => setError("")}><X size={14} /></button></div>}
    </>
  );
}

export default App;
