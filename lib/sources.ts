// Curated list of trusted local outlets per market. The live search is restricted
// to these domains, so every story in a briefing traces back to one of them.

export type Outlet = { name: string; domain: string; note: string };

export type Market = {
  country: string;
  language: string;
  cities: string[];
  outlets: Outlet[];
};

export const MARKETS: Market[] = [
  {
    country: "Germany",
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
    language: "Japanese",
    cities: ["Tokyo", "Osaka", "Nagoya", "Yokohama"],
    outlets: [
      { name: "Nikkei", domain: "nikkei.com", note: "Leading business daily" },
      { name: "NHK", domain: "nhk.or.jp", note: "Public broadcaster" },
      { name: "Asahi Shimbun", domain: "asahi.com", note: "National daily" },
    ],
  },
  {
    country: "Brazil",
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
    language: "Chinese",
    cities: ["Shanghai", "Beijing", "Shenzhen"],
    outlets: [
      { name: "Caixin", domain: "caixin.com", note: "Independent business weekly" },
      { name: "Yicai", domain: "yicai.com", note: "Business daily" },
    ],
  },
];

export const CITIES = MARKETS.flatMap((m) => m.cities.map((city) => ({ city, country: m.country })));

export function marketFor(country: string): Market | undefined {
  return MARKETS.find((m) => m.country === country);
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
