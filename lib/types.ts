export type Profile = {
  name: string;
  title: string;
  ageRange: string;
  industry: string;
  func: string;
  homeCountry: string;
  topics: string[];
};

export type Leg = {
  id: string;
  city: string;
  country: string;
  arrive: string; // YYYY-MM-DD
  depart: string;
};

export type Article = {
  outlet: string;
  original_headline: string;
  english_headline: string;
  date: string;
  summary: string;
  why_it_matters: string;
  url: string;
  category: string; // one of TOPICS, assigned by the model
  verified: boolean; // url appeared in the search engine's own results
  origin?: string; // client-side: which filter request loaded it ("top" or a topic)
};

export type Briefing = {
  landing_note: string;
  articles: Article[];
  source: "live" | "sample";
  error?: string;
};

export type Stage = "now" | "next" | "later" | "past";

export const INDUSTRIES = [
  "Automotive",
  "Financial Services",
  "Healthcare & Life Sciences",
  "Management Consulting",
  "Technology",
  "Energy",
  "Consumer Goods",
];

export const FUNCTIONS = [
  "Marketing & Communications",
  "Sales & Business Development",
  "General Management",
  "M&A / Investment",
  "Operations & Supply Chain",
];

export const TOPICS = [
  "Regulation & Policy",
  "Competitors",
  "Markets & Economy",
  "Consumer Trends",
  "Labor",
  "Trade & Tariffs",
  "Technology",
];

export const AGE_RANGES = ["Prefer not to say", "25–34", "35–44", "45–54", "55+"];
