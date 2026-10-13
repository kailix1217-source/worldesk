export type Profile = {
  name: string;
  email: string; // kept only in this browser; passwords are never stored
  title: string;
  company: string; // optional
  industry: string;
  func: string;
  markets: string[]; // country names from ONBOARD_MARKETS
  topics: string[];
  keywords?: string[]; // free-text terms the reader tracks (companies, products, policies); max 10
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
  "Aerospace & Defense",
  "Agriculture & Food",
  "Automotive",
  "Chemicals & Materials",
  "Consumer Goods",
  "Education",
  "Energy",
  "Financial Services",
  "Healthcare & Life Sciences",
  "Industrial Manufacturing",
  "Insurance",
  "Management Consulting",
  "Media & Entertainment",
  "Mining & Metals",
  "Public Sector",
  "Real Estate & Construction",
  "Retail & E-commerce",
  "Technology",
  "Telecommunications",
  "Transportation & Logistics",
  "Travel & Hospitality",
  "Other",
];

// Suggested keywords per industry, offered as one-tap chips on the About you step.
export const KEYWORD_SUGGESTIONS: Record<string, string[]> = {
  Automotive: [
    "EV batteries", "Chinese EV brands", "Autonomous driving", "Tariffs on cars", "Charging infrastructure",
    "EV subsidies", "Emissions standards", "Software-defined vehicles", "Auto chip supply", "Price wars",
  ],
  "Financial Services": [
    "Interest rates", "Central bank policy", "Banking regulation", "Fintech", "Digital payments",
    "Stablecoins", "Bank M&A", "Credit risk", "Wealth management", "Anti-money laundering",
  ],
  "Healthcare & Life Sciences": [
    "Drug pricing", "Clinical trials", "Drug approvals", "Medical devices", "Biotech funding",
    "GLP-1 drugs", "Biosimilars", "Health insurance reform", "Hospital capacity", "AI in diagnostics",
  ],
  "Management Consulting": [
    "Digital transformation", "AI adoption", "M&A activity", "Public sector contracts", "Cost cutting",
    "Restructuring", "ESG reporting", "Supply chain resilience", "Labor shortages", "Private equity deals",
  ],
  Technology: [
    "Semiconductors", "AI regulation", "Data centers", "Cybersecurity", "Cloud computing",
    "Export controls", "Data privacy", "Startup funding", "5G and 6G", "Big Tech antitrust",
  ],
  Energy: [
    "LNG", "Renewables", "Grid investment", "Carbon pricing", "Oil prices",
    "Hydrogen", "Nuclear power", "Electricity prices", "Energy subsidies", "Critical minerals",
  ],
  "Consumer Goods": [
    "Retail sales", "E-commerce", "Consumer confidence", "Private labels", "Food inflation",
    "Luxury demand", "Social commerce", "Packaging rules", "Supply chain costs", "Store closures",
  ],
  "Aerospace & Defense": [
    "Defense budgets", "Aircraft orders", "Drones", "Space launch", "Missile defense",
    "Arms export controls", "Aerospace supply chain", "Sustainable aviation fuel", "Military procurement", "Satellite internet",
  ],
  "Agriculture & Food": [
    "Crop prices", "Fertilizer prices", "Food safety rules", "Agricultural subsidies", "Weather and harvests",
    "Food exports", "Alternative proteins", "Agritech", "Water scarcity", "Grain trade",
  ],
  "Chemicals & Materials": [
    "Chemical feedstock prices", "Natural gas prices", "REACH regulation", "Plastics recycling", "Battery materials",
    "Specialty chemicals", "PFAS rules", "Plant closures", "Carbon border tax", "Green hydrogen",
  ],
  Education: [
    "Education policy", "International students", "Student visas", "EdTech", "University funding",
    "Skills training", "AI in education", "Tuition fees", "Teacher shortages", "Online learning",
  ],
  "Industrial Manufacturing": [
    "Factory output", "Automation and robotics", "Industrial policy", "Reshoring", "Steel prices",
    "Machinery orders", "Industrial energy costs", "Skilled labor shortages", "Industrial AI", "Export orders",
  ],
  Insurance: [
    "Climate risk", "Natural catastrophes", "Reinsurance rates", "Insurance regulation", "Health insurance",
    "Cyber insurance", "Life insurance demand", "Motor insurance", "Insurtech", "Solvency rules",
  ],
  "Media & Entertainment": [
    "Streaming", "Advertising market", "Box office", "Gaming", "Content regulation",
    "AI and copyright", "Social media platforms", "Sports rights", "Music industry", "Influencer marketing",
  ],
  "Mining & Metals": [
    "Critical minerals", "Lithium", "Copper prices", "Iron ore", "Rare earths",
    "Mining permits", "Gold prices", "Smelting", "Resource nationalism", "Mine safety",
  ],
  "Public Sector": [
    "Government budget", "Public procurement", "Elections", "Infrastructure spending", "Digital government",
    "Tax policy", "Public sector pay", "Regulatory reform", "Defense spending", "Healthcare spending",
  ],
  "Real Estate & Construction": [
    "Housing prices", "Mortgage rates", "Commercial property", "Construction costs", "Building permits",
    "Office vacancy", "Infrastructure projects", "Property developers", "Green buildings", "Rental market",
  ],
  "Retail & E-commerce": [
    "Retail sales", "E-commerce platforms", "Cross-border e-commerce", "Store closures", "Consumer spending",
    "Discount retailers", "Social commerce", "Last-mile delivery", "Retail media", "Payment methods",
  ],
  Telecommunications: [
    "5G rollout", "Spectrum auctions", "Telecom mergers", "Fiber broadband", "Satellite internet",
    "Network security", "Data center demand", "Mobile pricing", "Telecom regulation", "Undersea cables",
  ],
  "Transportation & Logistics": [
    "Freight rates", "Shipping routes", "Port congestion", "Air cargo", "Rail freight",
    "Trucking", "Warehouse demand", "Fuel costs", "Customs rules", "Supply chain disruption",
  ],
  "Travel & Hospitality": [
    "Tourism arrivals", "Hotel occupancy", "Airline capacity", "Visa rules", "Business travel",
    "Airfares", "Short-term rentals", "Cruise industry", "Travel restrictions", "Events and conferences",
  ],
};
export const MAX_KEYWORDS = 10;

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
