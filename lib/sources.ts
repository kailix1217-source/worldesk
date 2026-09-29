// Curated list of trusted local outlets per market. The live search is restricted
// to these domains, so every story in a briefing traces back to one of them.

export type Outlet = { name: string; domain: string; note: string };

export type Market = {
  country: string;
  code: string; // shown on the market picker
  hub: string; // main business city, used to frame the search
  language: string;
  cities: string[];
  outlets: Outlet[];
};

export const MARKETS: Market[] = [
  {
    country: "Germany",
    code: "DE",
    hub: "Frankfurt",
    language: "German",
    cities: ["Munich", "Berlin", "Frankfurt", "Stuttgart", "Hamburg"],
    outlets: [
      { name: "Handelsblatt", domain: "handelsblatt.com", note: "Leading business daily" },
      { name: "Frankfurter Allgemeine", domain: "faz.net", note: "National daily of record" },
      { name: "Süddeutsche Zeitung", domain: "sueddeutsche.de", note: "Munich-based national daily" },
      { name: "Automobilwoche", domain: "automobilwoche.de", note: "Automotive trade weekly" },
    ],
  },
  {
    country: "Japan",
    code: "JP",
    hub: "Tokyo",
    language: "Japanese",
    cities: ["Tokyo", "Osaka", "Nagoya", "Yokohama"],
    outlets: [
      { name: "Nikkei", domain: "nikkei.com", note: "Leading business daily" },
      { name: "NHK", domain: "nhk.or.jp", note: "Public broadcaster" },
      { name: "Asahi Shimbun", domain: "asahi.com", note: "National daily" },
      { name: "Nikkan Kogyo Shimbun", domain: "nikkan.co.jp", note: "Industry and manufacturing daily" },
      { name: "Toyo Keizai", domain: "toyokeizai.net", note: "Business weekly" },
    ],
  },
  {
    country: "Brazil",
    code: "BR",
    hub: "São Paulo",
    language: "Portuguese",
    cities: ["São Paulo", "Rio de Janeiro", "Brasília"],
    outlets: [
      { name: "Valor Econômico", domain: "valor.globo.com", note: "Leading business daily" },
      { name: "Folha de S.Paulo", domain: "folha.uol.com.br", note: "National daily" },
      { name: "O Estado de S. Paulo", domain: "estadao.com.br", note: "National daily" },
    ],
  },
  {
    country: "France",
    code: "FR",
    hub: "Paris",
    language: "French",
    cities: ["Paris", "Lyon"],
    outlets: [
      { name: "Les Echos", domain: "lesechos.fr", note: "Leading business daily" },
      { name: "Le Monde", domain: "lemonde.fr", note: "National daily of record" },
      { name: "Le Figaro", domain: "lefigaro.fr", note: "National daily" },
    ],
  },
  {
    country: "Mexico",
    code: "MX",
    hub: "Mexico City",
    language: "Spanish",
    cities: ["Mexico City", "Monterrey", "Guadalajara"],
    outlets: [
      { name: "El Financiero", domain: "elfinanciero.com.mx", note: "Business daily" },
      { name: "El Economista", domain: "eleconomista.com.mx", note: "Business daily" },
      { name: "Expansión", domain: "expansion.mx", note: "Business magazine" },
    ],
  },
  {
    country: "South Korea",
    code: "KR",
    hub: "Seoul",
    language: "Korean",
    cities: ["Seoul", "Busan"],
    outlets: [
      { name: "Korea Economic Daily", domain: "hankyung.com", note: "Business daily" },
      { name: "Maeil Business", domain: "mk.co.kr", note: "Business daily" },
      { name: "Yonhap", domain: "yna.co.kr", note: "National news agency" },
    ],
  },
  {
    country: "China",
    code: "CN",
    hub: "Shanghai",
    language: "Chinese",
    cities: ["Shanghai", "Beijing", "Shenzhen"],
    outlets: [
      { name: "Caixin", domain: "caixin.com", note: "Independent business weekly" },
      { name: "Yicai", domain: "yicai.com", note: "Business daily" },
    ],
  },
  {
    country: "United States",
    code: "US",
    hub: "New York",
    language: "English",
    cities: ["New York", "San Francisco", "Chicago", "Washington"],
    outlets: [
      { name: "The Wall Street Journal", domain: "wsj.com", note: "Leading business daily" },
      { name: "The New York Times", domain: "nytimes.com", note: "National daily of record" },
      { name: "The Washington Post", domain: "washingtonpost.com", note: "National daily" },
    ],
  },
  {
    country: "United Kingdom",
    code: "UK",
    hub: "London",
    language: "English",
    cities: ["London", "Manchester", "Edinburgh"],
    outlets: [
      { name: "Financial Times", domain: "ft.com", note: "Leading business daily" },
      { name: "The Guardian", domain: "theguardian.com", note: "National daily" },
      { name: "BBC News", domain: "bbc.co.uk", note: "Public broadcaster" },
    ],
  },
  {
    country: "Australia",
    code: "AU",
    hub: "Sydney",
    language: "English",
    cities: ["Sydney", "Melbourne"],
    outlets: [
      { name: "Australian Financial Review", domain: "afr.com", note: "Leading business daily" },
      { name: "The Sydney Morning Herald", domain: "smh.com.au", note: "Metropolitan daily" },
      { name: "ABC News", domain: "abc.net.au", note: "Public broadcaster" },
    ],
  },
  {
    country: "India",
    code: "IN",
    hub: "Mumbai",
    language: "English",
    cities: ["Mumbai", "New Delhi", "Bengaluru"],
    outlets: [
      { name: "The Economic Times", domain: "economictimes.indiatimes.com", note: "Leading business daily" },
      { name: "Mint", domain: "livemint.com", note: "Business daily" },
      { name: "Business Standard", domain: "business-standard.com", note: "Business daily" },
      { name: "The Hindu", domain: "thehindu.com", note: "National daily" },
    ],
  },
  {
    country: "Canada",
    code: "CA",
    hub: "Toronto",
    language: "English",
    cities: ["Toronto", "Vancouver", "Montreal"],
    outlets: [
      { name: "The Globe and Mail", domain: "theglobeandmail.com", note: "National daily" },
      { name: "Financial Post", domain: "financialpost.com", note: "Business daily" },
      { name: "CBC News", domain: "cbc.ca", note: "Public broadcaster" },
    ],
  },
  {
    country: "Singapore",
    code: "SG",
    hub: "Singapore",
    language: "English",
    cities: ["Singapore"],
    outlets: [
      { name: "The Straits Times", domain: "straitstimes.com", note: "National daily" },
      { name: "The Business Times", domain: "businesstimes.com.sg", note: "Business daily" },
      { name: "CNA", domain: "channelnewsasia.com", note: "Broadcaster" },
    ],
  },
  {
    country: "UAE",
    code: "AE",
    hub: "Dubai",
    language: "English",
    cities: ["Dubai", "Abu Dhabi"],
    outlets: [
      { name: "The National", domain: "thenationalnews.com", note: "Abu Dhabi-based daily" },
      { name: "Gulf News", domain: "gulfnews.com", note: "Dubai-based daily" },
      { name: "Khaleej Times", domain: "khaleejtimes.com", note: "Dubai-based daily" },
    ],
  },
];

// Markets offered in onboarding, in picker order.
export const ONBOARD_MARKETS = ["US", "UK", "DE", "JP", "AU", "FR", "IN", "BR", "CN", "CA", "SG", "AE"]
  .map((code) => MARKETS.find((m) => m.code === code)!)
  .filter(Boolean);


export function marketFor(country: string): Market | undefined {
  return MARKETS.find((m) => m.country === country);
}

// English-language editions hosted on otherwise local domains. For non-English markets the
// promise is local-language reporting, so these are rejected even though the domain is trusted.
const ENGLISH_EDITIONS = [/^(en|english)\./, /^asia\.nikkei\.com$/, /^www\.caixinglobal\.com$/];
const ENGLISH_PATHS = [/\/nhkworld\//, /\/english\//, /\/en\//];

export function isEnglishEdition(url: string): boolean {
  try {
    const u = new URL(url);
    return ENGLISH_EDITIONS.some((r) => r.test(u.hostname)) || ENGLISH_PATHS.some((r) => r.test(u.pathname));
  } catch {
    return true;
  }
}

export function outletForUrl(url: string, market: Market): Outlet | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
  return market.outlets.find((o) => host === o.domain || host.endsWith("." + o.domain));
}
