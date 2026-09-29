// Curated list of trusted local outlets per market. The live search is restricted
// to these domains, so every story in a briefing traces back to one of them.

export type Outlet = { name: string; domain: string; also?: string[]; note: string };

// Every domain an outlet publishes on (the search filter and the trust check both use this).
export const domainsOf = (o: Outlet) => [o.domain, ...(o.also ?? [])];

export type Market = {
  country: string;
  code: string; // shown on the market picker
  iso3: string; // World Bank country code
  hub: string; // main business city, used to frame the search
  language: string;
  cities: string[];
  outlets: Outlet[];
};

export const MARKETS: Market[] = [
  {
    country: "Germany",
    code: "DE",
    iso3: "DEU",
    hub: "Frankfurt",
    language: "German",
    cities: ["Munich", "Berlin", "Frankfurt", "Stuttgart", "Hamburg"],
    outlets: [
      { name: "Tagesschau (ARD)", domain: "tagesschau.de", note: "Public broadcaster" },
      { name: "Frankfurter Allgemeine", domain: "faz.net", note: "Newspaper of record" },
      { name: "Handelsblatt", domain: "handelsblatt.com", note: "Leading business daily" },
    ],
  },
  {
    country: "Japan",
    // NHK, Nikkei, Asahi and Yomiuri return no Japanese-language articles through the search API
    // (only NHK World in English), so Japan uses the most authoritative outlets that are actually reachable.
    code: "JP",
    iso3: "JPN",
    hub: "Tokyo",
    language: "Japanese",
    cities: ["Tokyo", "Osaka", "Nagoya", "Yokohama"],
    outlets: [
      { name: "Jiji Press", domain: "jiji.com", note: "National news agency" },
      { name: "Toyo Keizai", domain: "toyokeizai.net", note: "Leading business weekly" },
      { name: "Nikkan Kogyo Shimbun", domain: "nikkan.co.jp", note: "Industry and manufacturing daily" },
    ],
  },
  {
    country: "Brazil",
    code: "BR",
    iso3: "BRA",
    hub: "São Paulo",
    language: "Portuguese",
    cities: ["São Paulo", "Rio de Janeiro", "Brasília"],
    outlets: [
      { name: "Folha de S.Paulo", domain: "folha.uol.com.br", note: "National daily" },
      { name: "O Estado de S. Paulo", domain: "estadao.com.br", note: "National daily" },
      { name: "Valor Econômico", domain: "valor.globo.com", note: "Leading business daily" },
    ],
  },
  {
    country: "France",
    code: "FR",
    iso3: "FRA",
    hub: "Paris",
    language: "French",
    cities: ["Paris", "Lyon"],
    outlets: [
      { name: "Le Monde", domain: "lemonde.fr", note: "Newspaper of record" },
      { name: "Le Figaro", domain: "lefigaro.fr", note: "National daily" },
      { name: "Les Echos", domain: "lesechos.fr", note: "Leading business daily" },
    ],
  },
  {
    country: "Mexico",
    code: "MX",
    iso3: "MEX",
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
    iso3: "KOR",
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
    iso3: "CHN",
    hub: "Shanghai",
    language: "Chinese",
    cities: ["Shanghai", "Beijing", "Shenzhen"],
    outlets: [
      { name: "Xinhua", domain: "news.cn", also: ["xinhuanet.com"], note: "State news agency" },
      { name: "People's Daily", domain: "people.com.cn", note: "Official national daily" },
      { name: "CCTV", domain: "cctv.com", note: "State broadcaster" },
    ],
  },
  {
    country: "United States",
    code: "US",
    iso3: "USA",
    hub: "New York",
    language: "English",
    cities: ["New York", "San Francisco", "Chicago", "Washington"],
    outlets: [
      { name: "AP News", domain: "apnews.com", note: "National news agency" },
      { name: "The New York Times", domain: "nytimes.com", note: "Newspaper of record" },
      { name: "The Wall Street Journal", domain: "wsj.com", note: "Leading business daily" },
    ],
  },
  {
    country: "United Kingdom",
    code: "UK",
    iso3: "GBR",
    hub: "London",
    language: "English",
    cities: ["London", "Manchester", "Edinburgh"],
    outlets: [
      { name: "BBC News", domain: "bbc.co.uk", also: ["bbc.com"], note: "Public broadcaster" },
      { name: "The Times", domain: "thetimes.com", also: ["thetimes.co.uk"], note: "Newspaper of record" },
      { name: "Financial Times", domain: "ft.com", note: "Leading business daily" },
    ],
  },
  {
    country: "Australia",
    code: "AU",
    iso3: "AUS",
    hub: "Sydney",
    language: "English",
    cities: ["Sydney", "Melbourne"],
    outlets: [
      { name: "ABC News", domain: "abc.net.au", note: "Public broadcaster" },
      { name: "The Sydney Morning Herald", domain: "smh.com.au", note: "Metropolitan daily of record" },
      { name: "Australian Financial Review", domain: "afr.com", note: "Leading business daily" },
    ],
  },
  {
    country: "India",
    code: "IN",
    iso3: "IND",
    hub: "Mumbai",
    language: "English",
    cities: ["Mumbai", "New Delhi", "Bengaluru"],
    outlets: [
      { name: "The Hindu", domain: "thehindu.com", note: "National daily of record" },
      { name: "The Indian Express", domain: "indianexpress.com", note: "National daily" },
      { name: "The Economic Times", domain: "economictimes.indiatimes.com", note: "Leading business daily" },
    ],
  },
  {
    country: "Canada",
    code: "CA",
    iso3: "CAN",
    hub: "Toronto",
    language: "English",
    cities: ["Toronto", "Vancouver", "Montreal"],
    outlets: [
      { name: "CBC News", domain: "cbc.ca", note: "Public broadcaster" },
      { name: "The Globe and Mail", domain: "theglobeandmail.com", note: "National daily of record" },
      { name: "CTV News", domain: "ctvnews.ca", note: "National broadcaster" },
    ],
  },
  {
    country: "Singapore",
    code: "SG",
    iso3: "SGP",
    hub: "Singapore",
    language: "English",
    cities: ["Singapore"],
    outlets: [
      { name: "CNA", domain: "channelnewsasia.com", note: "Broadcaster, most used online" },
      { name: "The Straits Times", domain: "straitstimes.com", note: "National daily" },
      { name: "The Business Times", domain: "businesstimes.com.sg", note: "Business daily" },
    ],
  },
  {
    country: "UAE",
    code: "AE",
    iso3: "ARE",
    hub: "Dubai",
    language: "English",
    cities: ["Dubai", "Abu Dhabi"],
    outlets: [
      { name: "WAM", domain: "wam.ae", note: "Official news agency" },
      { name: "The National", domain: "thenationalnews.com", note: "Abu Dhabi-based daily" },
      { name: "Gulf News", domain: "gulfnews.com", note: "Dubai-based daily" },
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
  return market.outlets.find((o) => domainsOf(o).some((d) => host === d || host.endsWith("." + d)));
}
