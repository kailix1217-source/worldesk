import { NextResponse } from "next/server";
import { MARKETS } from "@/lib/sources";

// World Bank open data (no key). mrnev=2 returns the two most recent years that have a value,
// so each figure comes with last year's value for the change arrow.
const INDICATORS = [
  { code: "NY.GDP.MKTP.KD.ZG", label: "GDP growth", kind: "rate" },
  { code: "NY.GDP.MKTP.CD", label: "GDP", kind: "usd" },
  { code: "NY.GDP.PCAP.CD", label: "GDP per capita", kind: "usd" },
  { code: "FP.CPI.TOTL.ZG", label: "Inflation", kind: "rate" },
  { code: "SL.UEM.TOTL.ZS", label: "Unemployment", kind: "rate" },
  { code: "SP.POP.TOTL", label: "Population", kind: "count" },
] as const;

export type Indicator = {
  code: string;
  label: string;
  kind: "rate" | "usd" | "count";
  value: number;
  year: string;
  prev?: number;
  prevYear?: string;
};

type WbRow = { date: string; value: number | null };

async function one(iso3: string, ind: (typeof INDICATORS)[number]): Promise<Indicator | null> {
  const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${ind.code}?format=json&mrnev=2`;
  const res = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json = (await res.json()) as [unknown, WbRow[] | null];
  const rows = (json?.[1] ?? []).filter((r) => r.value !== null);
  if (!rows.length) return null;
  const [latest, before] = rows;
  return {
    code: ind.code, label: ind.label, kind: ind.kind,
    value: latest.value as number, year: latest.date,
    prev: before?.value ?? undefined, prevYear: before?.date,
  };
}

export async function GET(req: Request) {
  const iso = new URL(req.url).searchParams.get("iso")?.toUpperCase();
  // Only the markets Worldesk covers; anything else is refused rather than forwarded.
  if (!iso || !MARKETS.some((m) => m.iso3 === iso)) {
    return NextResponse.json({ error: "Unknown market" }, { status: 400 });
  }
  const settled = await Promise.allSettled(INDICATORS.map((i) => one(iso, i)));
  const indicators = settled.flatMap((s) => (s.status === "fulfilled" && s.value ? [s.value] : []));
  if (!indicators.length) return NextResponse.json({ error: "World Bank data unavailable" }, { status: 502 });
  return NextResponse.json({ indicators }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
