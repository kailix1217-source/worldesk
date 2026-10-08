export type Profile = {
  name: string;
  email: string; // kept only in this browser; passwords are never stored
  title: string;
  company: string; // optional
  industry: string;
  func: string;
  markets: string[]; // country names from ONBOARD_MARKETS
  topics: string[];
  keywords?: string[]; // free-text terms the reader tracks (companies, products, policies); max 8
  ageRange?: string; // legacy fields from the first version
  homeCountry?: string;
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
  sources?: { outlet: string; url: string }[]; // every whitelisted outlet that ran the story, primary first
  image?: string; // the article's own preview image (og:image), when the outlet publishes one
  images?: string[]; // candidate pictures from the article page (preview tag first, then in-article photos)
  country?: string; // client-side: the market the story was loaded for
  keywords?: string[]; // which of the reader's keywords this story is about (checked against their list)
  also_reported_by?: { outlet: string; url: string }[]; // raw model output, verified into `sources`
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

// Suggested keywords per industry, offered as one-tap chips on the About you step.
export const KEYWORD_SUGGESTIONS: Record<string, string[]> = {
  Automotive: ["EV batteries", "Autonomous driving", "Chinese EV brands", "Tariffs on cars"],
  "Financial Services": ["Interest rates", "Fintech", "Banking regulation", "Digital payments"],
  "Healthcare & Life Sciences": ["Drug pricing", "Clinical trials", "Medical devices", "Biotech funding"],
  "Management Consulting": ["Digital transformation", "M&A activity", "Public sector contracts", "AI adoption"],
  Technology: ["Semiconductors", "AI regulation", "Data centers", "Cybersecurity"],
  Energy: ["LNG", "Renewables", "Grid investment", "Carbon pricing"],
  "Consumer Goods": ["Retail sales", "E-commerce", "Consumer confidence", "Private labels"],
};
export const MAX_KEYWORDS = 8;

export const FUNCTIONS = [
  "General Management",
  "Strategy & Consulting",
  "Marketing & Communications",
  "Sales & Business Development",
  "Product Management",
  "Data & Analytics",
  "Software & Engineering",
  "Research & Analysis",
  "Finance & Accounting",
  "M&A / Investment",
  "Operations & Supply Chain",
  "Legal & Compliance",
  "HR & People",
  "Other",
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
