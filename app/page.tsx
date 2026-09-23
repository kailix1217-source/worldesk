"use client";

import { useEffect, useMemo, useState } from "react";
import { CITIES, MARKETS, marketFor } from "@/lib/sources";
import {
  AGE_RANGES, FUNCTIONS, INDUSTRIES, TOPICS,
  type Briefing, type Leg, type Profile, type Stage,
} from "@/lib/types";

type Step = "welcome" | "profile" | "trip" | "briefing";

const EMPTY_PROFILE: Profile = {
  name: "", title: "", ageRange: AGE_RANGES[0], industry: "", func: "", homeCountry: "", topics: [],
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const newLeg = (): Leg => ({ id: Math.random().toString(36).slice(2), city: "", country: "", arrive: "", depart: "" });

function demoData(): { profile: Profile; legs: Leg[] } {
  return {
    profile: {
      name: "Maya", title: "Marketing Director, EMEA & APAC", ageRange: "35–44", industry: "Automotive",
      func: "Marketing & Communications", homeCountry: "United States",
      topics: ["Competitors", "Consumer Trends", "Regulation & Policy"],
    },
    legs: [
      { id: "demo-muc", city: "Munich", country: "Germany", arrive: addDays(3), depart: addDays(5) },
      { id: "demo-tyo", city: "Tokyo", country: "Japan", arrive: addDays(8), depart: addDays(11) },
    ],
  };
}

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

// Itinerary-aware weighting: the leg you're in (or heading to next) gets the full
// briefing; later legs get a short preview; past legs shrink to a recap.
function stagesFor(legs: Leg[]): Record<string, Stage> {
  const today = iso(new Date());
  const out: Record<string, Stage> = {};
  let nextAssigned = legs.some((l) => l.arrive <= today && today <= l.depart);
  for (const l of legs) {
    if (l.depart < today) out[l.id] = "past";
    else if (l.arrive <= today) out[l.id] = "now";
    else if (!nextAssigned) { out[l.id] = "next"; nextAssigned = true; }
    else out[l.id] = "later";
  }
  return out;
}
const STORY_COUNT: Record<Stage, number> = { now: 6, next: 6, later: 3, past: 3 };
const FOCUS: Record<Stage, number> = { now: 4, next: 4, later: 2, past: 1 };

function countdown(leg: Leg, stage: Stage) {
  if (stage === "now") return "You're here";
  if (stage === "past") return "Completed";
  const days = Math.round((Date.parse(leg.arrive) - Date.parse(iso(new Date()))) / 86400000);
  return days === 1 ? "Tomorrow" : `In ${days} days`;
}
const fmt = (d: string) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

export default function Home() {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("welcome");
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [legs, setLegs] = useState<Leg[]>([newLeg()]);

  useEffect(() => {
    setStep(load("wd.step", "welcome"));
    setProfile(load("wd.profile", EMPTY_PROFILE));
    setLegs(load("wd.legs", [newLeg()]));
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { save("wd.step", step); save("wd.profile", profile); save("wd.legs", legs); } }, [ready, step, profile, legs]);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const startDemo = () => { const d = demoData(); setProfile(d.profile); setLegs(d.legs); setStep("briefing"); };
  const reset = () => { setProfile(EMPTY_PROFILE); setLegs([newLeg()]); setStep("welcome"); };

  if (!ready) return null;

  return (
    <main className="wrap">
      <header className="mast">
        <button className="wordmark" onClick={() => setStep(profile.industry ? "briefing" : "welcome")}>
          Worl<span>desk</span>
        </button>
        <div className="mast-meta">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          {step === "briefing" && (
            <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setStep("profile")}>Profile</button>
              <button onClick={() => setStep("trip")}>Edit trip</button>
              <button onClick={reset}>Start over</button>
            </div>
          )}
        </div>
      </header>

      {step === "welcome" && <Welcome onStart={() => setStep("profile")} onDemo={startDemo} />}
      {step === "profile" && (
        <ProfileStep profile={profile} setProfile={setProfile} onBack={() => setStep("welcome")} onNext={() => setStep("trip")} />
      )}
      {step === "trip" && (
        <TripStep legs={legs} setLegs={setLegs} onBack={() => setStep("profile")} onNext={() => setStep("briefing")} />
      )}
      {step === "briefing" && <BriefingView profile={profile} legs={legs} />}
    </main>
  );
}

function Welcome({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return (
    <>
      <section className="hero">
        <div className="kicker">For executives who cross borders</div>
        <h1 className="display" style={{ marginTop: 10 }}>Know the market before you land.</h1>
        <p className="lede">
          Worldesk reads the local business press in the local language: Handelsblatt in Munich, Nikkei in Tokyo,
          Valor in São Paulo. It briefs you in English on what matters to your industry, timed to your itinerary.
        </p>
        <div className="row">
          <button className="btn" onClick={onStart}>Set up my briefing</button>
          <button className="btn ghost" onClick={onDemo}>See a sample executive</button>
        </div>
      </section>
      <section className="pillars">
        <div><div className="kicker">01</div><h3>Local sources only</h3><p>A vetted list of respected papers in each market. Every story links to the original.</p></div>
        <div><div className="kicker">02</div><h3>Filtered to your job</h3><p>Your industry and role decide what makes the cut, and why it matters to you.</p></div>
        <div><div className="kicker">03</div><h3>Follows your trip</h3><p>The next city gets the full briefing. Later stops get a preview until they&apos;re close.</p></div>
      </section>
    </>
  );
}

function ProfileStep({ profile, setProfile, onBack, onNext }: {
  profile: Profile; setProfile: (p: Profile) => void; onBack: () => void; onNext: () => void;
}) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile({ ...profile, [k]: v });
  const toggle = (t: string) =>
    set("topics", profile.topics.includes(t) ? profile.topics.filter((x) => x !== t) : [...profile.topics, t]);
  const valid = profile.name && profile.industry && profile.func;

  return (
    <section className="step">
      <div className="step-head">
        <div className="kicker">Step 1 of 2</div>
        <h2>Tell us about your work</h2>
        <p className="muted small">Your briefing is ranked by what affects your role. We never ask for your employer or contacts.</p>
      </div>
      <div className="grid2">
        <div className="field"><label>First name</label>
          <input value={profile.name} onChange={(e) => set("name", e.target.value)} placeholder="Maya" /></div>
        <div className="field"><label>Job title</label>
          <input value={profile.title} onChange={(e) => set("title", e.target.value)} placeholder="Marketing Director, APAC" /></div>
        <div className="field"><label>Industry</label>
          <select value={profile.industry} onChange={(e) => set("industry", e.target.value)}>
            <option value="">Select…</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select></div>
        <div className="field"><label>Function</label>
          <select value={profile.func} onChange={(e) => set("func", e.target.value)}>
            <option value="">Select…</option>{FUNCTIONS.map((i) => <option key={i}>{i}</option>)}
          </select></div>
        <div className="field"><label>Home country</label>
          <input value={profile.homeCountry} onChange={(e) => set("homeCountry", e.target.value)} placeholder="United States" /></div>
        <div className="field"><label>Age range (optional)</label>
          <select value={profile.ageRange} onChange={(e) => set("ageRange", e.target.value)}>
            {AGE_RANGES.map((i) => <option key={i}>{i}</option>)}
          </select></div>
      </div>
      <div className="field"><span className="label">Topics to follow</span>
        <div className="chips">
          {TOPICS.map((t) => (
            <button key={t} className={`chip ${profile.topics.includes(t) ? "on" : ""}`} onClick={() => toggle(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="actions">
        <button className="btn link" onClick={onBack}>Back</button>
        <button className="btn" disabled={!valid} onClick={onNext}>Continue</button>
      </div>
    </section>
  );
}

function TripStep({ legs, setLegs, onBack, onNext }: {
  legs: Leg[]; setLegs: (l: Leg[]) => void; onBack: () => void; onNext: () => void;
}) {
  const update = (id: string, patch: Partial<Leg>) => setLegs(legs.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const valid = legs.length > 0 && legs.every((l) => l.city && l.arrive && l.depart && l.depart >= l.arrive);
  const finish = () => { setLegs([...legs].sort((a, b) => a.arrive.localeCompare(b.arrive))); onNext(); };

  return (
    <section className="step">
      <div className="step-head">
        <div className="kicker">Step 2 of 2</div>
        <h2>Where are you headed?</h2>
        <p className="muted small">Add each city on your trip. Covering {MARKETS.length} markets in this preview.</p>
      </div>
      {legs.map((leg, i) => {
        const market = marketFor(leg.country);
        return (
          <div className="leg" key={leg.id}>
            <div className="leg-num">Stop {i + 1}</div>
            {legs.length > 1 && <button className="remove" onClick={() => setLegs(legs.filter((l) => l.id !== leg.id))}>Remove</button>}
            <div className="field"><label>City</label>
              <select value={leg.city} onChange={(e) => {
                const c = CITIES.find((x) => x.city === e.target.value);
                update(leg.id, { city: c?.city ?? "", country: c?.country ?? "" });
              }}>
                <option value="">Select a city…</option>
                {MARKETS.map((m) => (
                  <optgroup key={m.country} label={m.country}>
                    {m.cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            {market && (
              <p className="sources-line">
                Sourced in {market.language} from <b>{market.outlets.map((o) => o.name).join(" · ")}</b>
              </p>
            )}
            <div className="grid2">
              <div className="field"><label>Arrive</label>
                <input type="date" value={leg.arrive} onChange={(e) => update(leg.id, { arrive: e.target.value })} /></div>
              <div className="field"><label>Depart</label>
                <input type="date" value={leg.depart} min={leg.arrive} onChange={(e) => update(leg.id, { depart: e.target.value })} /></div>
            </div>
          </div>
        );
      })}
      {legs.length < 4 && <button className="btn ghost" onClick={() => setLegs([...legs, newLeg()])}>+ Add another city</button>}
      <div className="actions">
        <button className="btn link" onClick={onBack}>Back</button>
        <button className="btn" disabled={!valid} onClick={finish}>Build my briefing</button>
      </div>
    </section>
  );
}

type LoadState = { loading: boolean; data?: Briefing; error?: string };

function BriefingView({ profile, legs }: { profile: Profile; legs: Leg[] }) {
  const stages = useMemo(() => stagesFor(legs), [legs]);
  const defaultLeg = legs.find((l) => stages[l.id] === "now" || stages[l.id] === "next") ?? legs[0];
  const [sel, setSel] = useState(defaultLeg?.id);
  const [state, setState] = useState<Record<string, LoadState>>({});

  const cacheKey = (leg: Leg) =>
    `wd.brief.${leg.city}.${stages[leg.id]}.${profile.industry}.${profile.func}.${profile.topics.join(",")}.${iso(new Date())}`;

  const fetchLeg = async (leg: Leg, force = false) => {
    const key = cacheKey(leg);
    const cached = !force && load<Briefing | null>(key, null);
    if (cached && cached.source === "live") { setState((s) => ({ ...s, [leg.id]: { loading: false, data: cached } })); return; }
    setState((s) => ({ ...s, [leg.id]: { loading: true } }));
    try {
      const res = await fetch("/api/briefing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, leg, count: STORY_COUNT[stages[leg.id]] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      save(key, json);
      setState((s) => ({ ...s, [leg.id]: { loading: false, data: json } }));
    } catch (e) {
      setState((s) => ({ ...s, [leg.id]: { loading: false, error: (e as Error).message } }));
    }
  };

  useEffect(() => { legs.forEach((l) => fetchLeg(l)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const leg = legs.find((l) => l.id === sel) ?? legs[0];
  if (!leg) return null;
  const stage = stages[leg.id];
  const market = marketFor(leg.country);
  const st = state[leg.id] ?? { loading: true };
  const hour = new Date().getHours();

  return (
    <section>
      <div className="greet">
        <div className="kicker">Your trip briefing</div>
        <h1>Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, {profile.name || "there"}.</h1>
        <p className="muted small" style={{ margin: "4px 0 0" }}>
          Tuned for {profile.func.toLowerCase()} in {profile.industry.toLowerCase()}
          {profile.topics.length ? `, following ${profile.topics.join(", ").toLowerCase()}` : ""}.
        </p>
      </div>

      <nav className="timeline" aria-label="Itinerary">
        {legs.map((l) => {
          const s = stages[l.id];
          return (
            <button key={l.id} className={`stop ${s} ${l.id === leg.id ? "sel" : ""}`} onClick={() => setSel(l.id)}>
              <span className={`stage ${s}`}>{countdown(l, s)}</span>
              <span className="city">{l.city}</span>
              <span className="dates">{fmt(l.arrive)} to {fmt(l.depart)}</span>
              <span className="focus" title="Briefing depth">
                {[0, 1, 2, 3].map((i) => <i key={i} className={i < FOCUS[s] ? "on" : ""} />)}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="city-head">
        <div className="kicker">
          {stage === "now" || stage === "next" ? "Full briefing" : stage === "later" ? "Early preview · expands as you get closer" : "Trip recap"}
        </div>
        <h2>{leg.city}, {leg.country}</h2>
        {market && (
          <div className="city-sub">
            Read in {market.language} from {market.outlets.map((o) => o.name).join(", ")}
            {" · "}<button className="btn link small" style={{ padding: 0, fontSize: 13 }} onClick={() => fetchLeg(leg, true)}>Refresh</button>
          </div>
        )}
      </div>

      {st.data?.source === "sample" && (
        <div className="banner">Sample mode: no API key is configured, so these are placeholders. Live mode pulls real articles.</div>
      )}

      {st.loading && <Skeleton />}
      {st.error && (
        <div className="error">
          Couldn&apos;t load the {leg.city} briefing ({st.error}).{" "}
          <button className="btn link" onClick={() => fetchLeg(leg, true)}>Try again</button>
        </div>
      )}
      {st.data && !st.loading && (
        <>
          {st.data.landing_note && <p className="landing">{st.data.landing_note}</p>}
          {st.data.articles.length === 0 && (
            <p className="muted">No qualifying stories from our {leg.country} outlets this month. Try refreshing later.</p>
          )}
          {st.data.articles.map((a, i) => (
            <article key={a.url + i} className={`story ${i === 0 ? "lead" : ""}`}>
              <div className="story-meta">
                <span className="outlet">{a.outlet}</span>
                {a.date && <span>{fmt(a.date.slice(0, 10))}</span>}
                {a.verified && <span className="verified">✓ Source verified</span>}
              </div>
              {a.original_headline && <div className="orig" lang={market?.language === "Japanese" ? "ja" : undefined}>{a.original_headline}</div>}
              <h3>{a.english_headline}</h3>
              <p className="sum">{a.summary}</p>
              <div className="why"><b>Why it matters to you</b>{a.why_it_matters}</div>
              <a className="read" href={a.url} target="_blank" rel="noopener noreferrer">
                Read the original in {market?.language ?? "the local language"} ↗
              </a>
            </article>
          ))}
        </>
      )}

      <footer className="foot">
        Worldesk prototype · Stories are selected and translated by AI from a fixed list of local outlets. Always check the original before you quote it.
      </footer>
    </section>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" style={{ paddingTop: 16 }}>
      <p className="muted small">Reading the local press…</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="story">
          <div className="skel" style={{ width: 120, height: 12 }} />
          <div className="skel" style={{ width: "90%", height: 22, marginTop: 12 }} />
          <div className="skel" style={{ width: "70%", height: 22, marginTop: 8 }} />
          <div className="skel" style={{ width: "100%", height: 48, marginTop: 12 }} />
        </div>
      ))}
    </div>
  );
}
