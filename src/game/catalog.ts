import type { AvatarId, CatalogAsset, HomeOption } from "./types";

export const STARTING_CASH = 50_000;

export const avatars: Record<
  AvatarId,
  { name: string; image: string; color: string }
> = {
  alex: { name: "Alex", image: "/assets/alex.png", color: "#ff775f" },
  mina: { name: "Mina", image: "/assets/mina.png", color: "#b991ff" },
  dante: { name: "Dante", image: "/assets/dante.png", color: "#ff4f7b" },
  jules: { name: "Jules", image: "/assets/jules.png", color: "#f0bc4d" },
};

export const marketSeeds = [
  { symbol: "NVDA", name: "Nova Dynamics", price: 186.4 },
  { symbol: "TSLA", name: "Tessara Motors", price: 328.2 },
  { symbol: "AAPL", name: "Orchard Systems", price: 214.6 },
  { symbol: "BTC", name: "Bitmark", price: 10_420 },
];

export const homeOptions: HomeOption[] = [
  {
    id: "studio",
    name: "Starter Studio",
    moveInCost: 0,
    resaleValue: 0,
    happiness: 42,
    upkeep: 350,
    icon: "🏢",
    description: "Cheap, cramped and conveniently close to instant noodles.",
  },
  {
    id: "loft",
    name: "Market Loft",
    moveInCost: 7_500,
    resaleValue: 5_500,
    happiness: 58,
    upkeep: 850,
    icon: "🌆",
    description: "Exposed brick, fast internet and just enough room for ambition.",
  },
  {
    id: "penthouse",
    name: "Skyline Penthouse",
    moveInCost: 22_000,
    resaleValue: 18_000,
    happiness: 76,
    upkeep: 2_200,
    icon: "🌃",
    description: "A view impressive enough to conceal several questionable positions.",
  },
  {
    id: "villa",
    name: "Riverside Villa",
    moveInCost: 36_000,
    resaleValue: 31_000,
    happiness: 90,
    upkeep: 3_800,
    icon: "🏡",
    description: "Space, privacy and far more windows for burglars to consider.",
  },
];

export const assetCatalog: CatalogAsset[] = [
  {
    id: "steel-watch",
    name: "Steel Chronograph",
    category: "watch",
    price: 4_800,
    happiness: 4,
    volatility: 0.008,
    insuranceRate: 0.045,
    icon: "⌚",
    description: "Discreet enough for work, expensive enough to mention.",
  },
  {
    id: "gold-watch",
    name: "Heritage Gold Watch",
    category: "watch",
    price: 12_500,
    happiness: 9,
    volatility: 0.014,
    insuranceRate: 0.052,
    icon: "✨",
    description: "A small portable asset with a very visible happiness dividend.",
  },
  {
    id: "sport-coupe",
    name: "Apex Sport Coupé",
    category: "car",
    price: 18_000,
    happiness: 11,
    volatility: 0.012,
    insuranceRate: 0.06,
    icon: "🏎️",
    description: "Fast, impractical and statistically attracted to expensive incidents.",
  },
  {
    id: "grand-tourer",
    name: "Velour Grand Tourer",
    category: "car",
    price: 32_000,
    happiness: 18,
    volatility: 0.016,
    insuranceRate: 0.068,
    icon: "🚘",
    description: "Luxury transportation and a monthly reminder that luxury needs coverage.",
  },
];

export const durationOptions = [
  { value: 15 as const, label: "15 min", note: "Quick market sprint" },
  { value: 30 as const, label: "30 min", note: "Balanced match" },
  { value: 60 as const, label: "1 hour", note: "Full life session" },
];
