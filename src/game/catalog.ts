import type {
  AvatarId,
  CatalogAsset,
  HomeOption,
  JobOption,
  LocationOption,
  SkillOption,
} from "./types";

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
  { key: "crypto:bitcoin", symbol: "BTC", name: "Bitcoin", price: 10_420, assetClass: "crypto" as const, provider: "coingecko" as const, providerId: "bitcoin", chain: "native blockchain" },
  { key: "crypto:ethereum", symbol: "ETH", name: "Ethereum", price: 2_600, assetClass: "crypto" as const, provider: "coingecko" as const, providerId: "ethereum", chain: "ethereum" },
  { key: "crypto:solana", symbol: "SOL", name: "Solana", price: 145, assetClass: "crypto" as const, provider: "coingecko" as const, providerId: "solana", chain: "solana" },
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
    id: "proper-bed",
    name: "Actually Comfortable Bed",
    category: "furniture",
    price: 1_800,
    happiness: 8,
    volatility: 0.002,
    insuranceRate: 0.02,
    icon: "🛏️",
    description: "Sleep is the original proof-of-rest protocol.",
  },
  {
    id: "dev-workstation",
    name: "Mining-Class Workstation",
    category: "computer",
    price: 4_200,
    happiness: 6,
    volatility: 0.01,
    insuranceRate: 0.04,
    icon: "🖥️",
    description: "Required by nobody, desired by every aspiring protocol founder.",
  },
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

export const botProfiles = [
  { name: "Laser-Eye Larry", avatar: "alex" as const, skill: 0.84 },
  { name: "Protocol Prophet", avatar: "dante" as const, skill: 0.78 },
  { name: "Whale Whisperer", avatar: "mina" as const, skill: 0.88 },
  { name: "Privacy Max", avatar: "jules" as const, skill: 0.82 },
  { name: "The Yield Baron", avatar: "alex" as const, skill: 0.76 },
  { name: "Hashrate Harriet", avatar: "dante" as const, skill: 0.8 },
];

export const personas = [
  "Laser-Eyed Maximalist",
  "Mysterious Protocol Founder",
  "Privacy-Tech Mogul",
  "Loud Token Influencer",
  "Underground Marketplace Dreamer",
  "Corporate Treasury Oracle",
  "Meme-Coin Aristocrat",
  "Anonymous Cypherpunk",
];

export const locations: LocationOption[] = [
  { id: "apartment", name: "Apartment", icon: "🏠", description: "Rest, use your computer and attempt skill-based side projects." },
  { id: "academy", name: "Chain Academy", icon: "🎓", description: "Study modern technical and persuasion skills." },
  { id: "work_hub", name: "Gig & Career Hub", icon: "💼", description: "Apply for jobs and clock paid work." },
  { id: "food_market", name: "Satoshi Snacks", icon: "🍜", description: "Buy food before hunger wrecks your health." },
  { id: "furniture_store", name: "Block & Bed", icon: "🛏️", description: "Furniture and equipment improve quality of life." },
  { id: "crypto_exchange", name: "Fast Lane Exchange", icon: "📈", description: "Search markets and manage leveraged crypto trades." },
];

export const skillOptions: SkillOption[] = [
  { id: "programming", name: "Programming", icon: "💻", description: "The foundation for technical careers.", studyRequired: 60 },
  { id: "blockchain", name: "Blockchain Engineering", icon: "⛓️", description: "Build protocols and smart-contract products.", studyRequired: 80, prerequisite: "programming" },
  { id: "cybersecurity", name: "Cybersecurity", icon: "🛡️", description: "Unlock legal security challenges and bug bounties.", studyRequired: 80, prerequisite: "programming" },
  { id: "quantum", name: "Quantum Computing", icon: "⚛️", description: "Elite research qualification with rare high-paying work.", studyRequired: 120, prerequisite: "blockchain" },
  { id: "social_engineering", name: "Social Engineering", icon: "🎭", description: "Read people, negotiate and attempt risky persuasion hustles.", studyRequired: 60 },
  { id: "digital_marketing", name: "Online Marketing", icon: "📣", description: "Build audiences, campaigns and questionable hype machines.", studyRequired: 50 },
];

export const jobOptions: JobOption[] = [
  { id: "courier", name: "Hardware Wallet Courier", locationId: "work_hub", pay: 650, timeCost: 20, happiness: -1, description: "No qualifications required. Your calves become decentralized." },
  { id: "moderator", name: "Community Moderator", locationId: "work_hub", pay: 1_100, timeCost: 20, happiness: 0, skill: "digital_marketing", skillLevel: 1, description: "Manage a community that is permanently asking when moon." },
  { id: "junior_dev", name: "Junior Developer", locationId: "work_hub", pay: 1_600, timeCost: 20, happiness: 1, skill: "programming", skillLevel: 1, description: "Fix bugs introduced by someone whose avatar is an ape." },
  { id: "contract_dev", name: "Protocol Engineer", locationId: "work_hub", pay: 2_500, timeCost: 20, happiness: 2, skill: "blockchain", skillLevel: 1, description: "Ship code while the treasury nervously watches." },
  { id: "security_analyst", name: "Security Analyst", locationId: "work_hub", pay: 2_800, timeCost: 20, happiness: 1, skill: "cybersecurity", skillLevel: 1, description: "Find vulnerabilities before someone with fewer ethics does." },
  { id: "quantum_researcher", name: "Quantum Ledger Researcher", locationId: "work_hub", pay: 4_500, timeCost: 25, happiness: 3, skill: "quantum", skillLevel: 1, description: "Explain qubits to executives using increasingly desperate metaphors." },
];
