"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES, MARKETS, marketFor } from "@/lib/sources";
import {
  AGE_RANGES, FUNCTIONS, INDUSTRIES, TOPICS,
  type Article, type Briefing, type Leg, type Profile, type Stage,
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
    setProfile(load("wd.profile", EMPTY_PROFILE));
    setLegs(load("wd.legs", [newLeg()]));
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { save("wd.profile", profile); save("wd.legs", legs); } }, [ready, step, profile, legs]);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const startDemo = () => { const d = demoData(); setProfile(d.profile); setLegs(d.legs); setStep("briefing"); };
  const reset = () => { setProfile(EMPTY_PROFILE); setLegs([newLeg()]); setStep("welcome"); };

  if (!ready) return null;
  const returning = !!(profile.industry && legs.length && legs.every((l) => l.city && l.arrive && l.depart));

  if (step === "welcome") {
    return (
      <Welcome
        returning={returning} name={profile.name}
        onStart={() => setStep("profile")} onOpen={() => setStep("briefing")}
        onEdit={() => setStep("profile")} onDemo={startDemo}
      />
    );
  }

  return (
    <main className="wrap">
      <header className="mast">
        <button className="wordmark" onClick={() => setStep("welcome")}>
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

function Welcome({ returning, name, onStart, onOpen, onEdit, onDemo }: {
  returning: boolean; name: string; onStart: () => void; onOpen: () => void; onEdit: () => void; onDemo: () => void;
}) {
  return (
    <div className="ld">
      <header className="ld-top">
        <span className="ld-mono">WORLDESK // {MARKETS.length} MARKETS ONLINE</span>
        <span className="ld-mono ld-muted">V0.1 PROTOTYPE</span>
      </header>

      <div className="ld-art" aria-hidden="true">
        <svg viewBox="0 0 600 600">
          <defs>
            <linearGradient id="ldRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#eef2f7" />
              <stop offset="0.45" stopColor="#a9b6c8" />
              <stop offset="1" stopColor="#dfe5ee" />
            </linearGradient>
            <filter id="ldBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16" /></filter>
            <filter id="ldSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" /></filter>
          </defs>
          <g className="ld-spin">
            <path d="M300,80 C430,66 528,168 532,286 C536,404 468,522 336,532 C214,541 86,472 72,338 C58,206 172,94 300,80 Z"
              fill="none" stroke="url(#ldRing)" strokeWidth="70" filter="url(#ldBlur)" />
            <path d="M300,96 C418,86 506,176 512,288 C516,396 454,504 338,514 C226,522 104,460 92,338 C80,216 184,108 300,96 Z"
              fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="10" filter="url(#ldSoft)" />
          </g>
        </svg>
      </div>

      <main className="ld-card">
        <span className="ld-pill-tag">{returning ? `WELCOME BACK, ${name.toUpperCase()}` : "WORLDESK.BRIEFING"}</span>
        <h1 className="ld-title">Know the market before you land.</h1>
        <p className="ld-sub">Local business press, read in the local language and briefed in English for your role and your trip.</p>

        <div className="ld-markets">
          {[["MUC", "Handelsblatt"], ["TYO", "Nikkei"], ["SAO", "Valor"]].map(([code, paper]) => (
            <div key={code} className="ld-market"><b>{code}</b><span>{paper}</span></div>
          ))}
        </div>

        <div className="ld-divider"><span>HOW IT WORKS</span></div>

        <ol className="ld-steps">
          <li><span className="ld-mono">01</span>Tell us your industry, role and topics</li>
          <li><span className="ld-mono">02</span>Add the cities on your trip</li>
          <li><span className="ld-mono">03</span>Get local news, ranked for you, daily until you land</li>
        </ol>

        {returning ? (
          <>
            <button className="ld-cta" onClick={onOpen}>OPEN MY BRIEFING <span aria-hidden="true">→</span></button>
            <div className="ld-links">
              <button onClick={onEdit}>Edit profile</button>
              <button onClick={onDemo}>View sample executive</button>
            </div>
          </>
        ) : (
          <>
            <button className="ld-cta" onClick={onStart}>SET UP MY BRIEFING <span aria-hidden="true">→</span></button>
            <div className="ld-links">
              <button onClick={onDemo}>See a sample executive</button>
            </div>
          </>
        )}
      </main>

      <span className="ld-side ld-mono" aria-hidden="true">LOCAL · LANGUAGE · SOURCES</span>
      <footer className="ld-bottom ld-mono">BRIEFING_READY<span className="ld-cursor">_</span></footer>
    </div>
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

type Feed = { note: string; articles: Article[]; source?: "live" | "sample"; fetched: string[]; updatedAt: string };
type Alerts = { push: boolean; time: string; breaking: boolean };
const ALERT_DEFAULT: Alerts = { push: false, time: "07:00", breaking: true };
const TIMEOUT_MS = 110_000;

function daysUntil(leg: Leg) {
  return Math.round((Date.parse(leg.arrive) - Date.parse(iso(new Date()))) / 86400000);
}

function BriefingView({ profile, legs }: { profile: Profile; legs: Leg[] }) {
  const stages = useMemo(() => stagesFor(legs), [legs]);
  const defaultLeg = legs.find((l) => stages[l.id] === "now" || stages[l.id] === "next") ?? legs[0];
  const [sel, setSel] = useState(defaultLeg?.id);
  const [filter, setFilter] = useState("top");
  const [feeds, setFeeds] = useState<Record<string, Feed>>({});
  // Loading is tracked per city AND per filter, so one slow request never blocks another.
  const [busy, setBusy] = useState<Record<string, number>>({}); // "legId|filter" -> startedAt
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [notice, setNotice] = useState<Record<string, string | undefined>>({});
  const [alerts, setAlerts] = useState<Alerts>(() => ({ ...ALERT_DEFAULT, ...load<Partial<Alerts>>("wd.alerts", {}) }));
  const [showSettings, setShowSettings] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;
  const inflight = useRef<Set<string>>(new Set()); // synchronous guard against duplicate requests

  // "New since last visit": snapshot what was seen before this visit, then record everything shown now.
  const seenBefore = useRef<Set<string>>(new Set(load<string[]>("wd.seen", [])));
  const lastVisit = useRef<string | null>(load<string | null>("wd.lastVisit", null));
  useEffect(() => { save("wd.lastVisit", new Date().toISOString()); }, []);
  useEffect(() => {
    const all = new Set(load<string[]>("wd.seen", []));
    Object.values(feeds).forEach((f) => f.articles.forEach((a) => all.add(a.url)));
    save("wd.seen", [...all].slice(-500));
  }, [feeds]);

  const cacheKey = (leg: Leg) => `wd.feed.${leg.city}.${profile.industry}.${profile.func}.${profile.topics.join(",")}.${iso(new Date())}`;
  const bkey = (leg: Leg, f: string) => `${leg.id}|${f}`;

  const fetchMore = async (leg: Leg, f: string, reset = false) => {
    const k = bkey(leg, f);
    if (inflight.current.has(k)) return;
    inflight.current.add(k);
    const existing = reset ? undefined : feedsRef.current[leg.id];
    setBusy((b) => ({ ...b, [k]: Date.now() }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setNotice((n) => ({ ...n, [k]: undefined }));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({
          profile, leg,
          count: f === "top" ? STORY_COUNT[stages[leg.id]] : 5,
          topic: f === "top" ? undefined : f,
          exclude: existing?.articles.map((a) => a.url) ?? [],
        }),
      });
      const json = (await res.json()) as Briefing & { error?: string };
      if (!res.ok) throw new Error(json.error || "Request failed");
      const known = new Set(existing?.articles.map((a) => a.url));
      const fresh = json.articles.filter((a) => !known.has(a.url)).length;
      if (!reset && existing && fresh === 0) {
        setNotice((n) => ({ ...n, [k]: `No new ${f === "top" ? "" : f + " "}stories from ${leg.country}'s outlets right now. Check back after tomorrow's update.` }));
      }
      setFeeds((all) => {
        const prev = reset ? undefined : all[leg.id];
        const urls = new Set(prev?.articles.map((a) => a.url));
        const added = json.articles.filter((a) => !urls.has(a.url)).map((a) => ({ ...a, origin: f }));
        const next: Feed = {
          note: prev?.note || json.landing_note,
          articles: [...(prev?.articles ?? []), ...added],
          source: json.source,
          fetched: [...new Set([...(prev?.fetched ?? []), f])],
          updatedAt: new Date().toISOString(),
        };
        if (json.source === "live") save(cacheKey(leg), next);
        return { ...all, [leg.id]: next };
      });
      // Preload the reader's own topics for the city that matters most, so topic taps are instant.
      const st = stages[leg.id];
      if (f === "top" && (st === "now" || st === "next")) {
        // wait a tick so feedsRef includes the top stories and they're excluded from topic results
        setTimeout(() => profile.topics.forEach((t) => fetchMore(leg, t)), 50);
      }
    } catch (e) {
      const msg = (e as Error).name === "AbortError" ? "the search took too long" : (e as Error).message;
      setErrors((x) => ({ ...x, [k]: msg }));
    } finally {
      clearTimeout(timer);
      inflight.current.delete(k);
      setBusy((b) => { const n = { ...b }; delete n[k]; return n; });
    }
  };

  useEffect(() => {
    legs.forEach((l) => {
      const cached = load<Feed | null>(cacheKey(l), null);
      if (cached) {
        setFeeds((all) => ({ ...all, [l.id]: cached }));
        const st = stages[l.id];
        if (st === "now" || st === "next") profile.topics.filter((t) => !cached.fetched.includes(t)).forEach((t) => fetchMore(l, t));
      } else fetchMore(l, "top");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leg = legs.find((l) => l.id === sel) ?? legs[0];
  if (!leg) return null;
  const stage = stages[leg.id];
  const market = marketFor(leg.country);
  const feed = feeds[leg.id];
  const k = bkey(leg, filter);
  const startedAt = busy[k];
  const error = errors[k];
  const hour = new Date().getHours();

  const visible = (feed?.articles ?? []).filter((a) => (filter === "top" ? a.origin === "top" : a.category === filter));
  const countFor = (t: string) => (feed?.articles ?? []).filter((a) => a.category === t).length;
  const isNew = (url: string) => seenBefore.current.size > 0 && !seenBefore.current.has(url);
  const newCount = (feed?.articles ?? []).filter((a) => isNew(a.url)).length;

  const pick = (f: string) => {
    setFilter(f);
    if (f !== "top" && !(feed?.fetched.includes(f)) && !busy[bkey(leg, f)]) fetchMore(leg, f);
  };

  const saveAlerts = (next: Alerts) => { setAlerts(next); save("wd.alerts", next); };

  // Push notification: readable on its own; tapping it opens this city and scrolls to the story.
  const notify = (l: Leg, a: Article | undefined) => {
    const days = daysUntil(l);
    const when = stages[l.id] === "now" ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    const n = new Notification(`${l.city} · ${when}`, {
      body: a ? `${a.outlet}: ${a.english_headline}\n${a.why_it_matters}`.slice(0, 220) : `Your ${l.city} briefing is ready.`,
      tag: `worldesk-${l.id}`,
    });
    n.onclick = () => {
      window.focus();
      setSel(l.id);
      setFilter("top");
      setTimeout(() => {
        const el = a && document.querySelector(`[data-url="${CSS.escape(a.url)}"]`);
        (el ?? document.querySelector(".city-head"))?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      n.close();
    };
  };
  const permission = async () => {
    if (!("Notification" in window)) { setAlertMsg("This browser doesn't support notifications."); return false; }
    const p = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (p !== "granted") { setAlertMsg("Notifications are blocked. Allow them for this site in your browser settings."); return false; }
    return true;
  };
  const turnOn = async () => {
    if (!(await permission())) return;
    saveAlerts({ ...alerts, push: true });
    notify(leg, visible[0] ?? feed?.articles[0]);
    setAlertMsg("Alerts on. We just sent you a sample.");
  };
  const testAlert = async () => {
    if (!(await permission())) return;
    notify(leg, visible[0] ?? feed?.articles[0]);
    setAlertMsg("Test alert sent.");
  };

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
            <button key={l.id} className={`stop ${s} ${l.id === leg.id ? "sel" : ""}`} onClick={() => { setSel(l.id); setFilter("top"); }}>
              <span className={`stage ${s}`}>{countdown(l, s)}</span>
              <span className="city">{l.city}</span>
              <span className="dates">{fmt(l.arrive)} to {fmt(l.depart)}</span>
              <span className="depth">{s === "now" || s === "next" ? "Full briefing" : s === "later" ? "Preview" : "Recap"}</span>
            </button>
          );
        })}
      </nav>

      <div className="city-head">
        <div className="kicker">
          {stage === "now" || stage === "next" ? "Full briefing" : stage === "later" ? "Preview · expands as you get closer" : "Trip recap"}
        </div>
        <h2>{leg.city}, {leg.country}</h2>
        {market && (
          <div className="city-sub">
            Read in {market.language} from {market.outlets.map((o) => o.name).join(", ")}
            {feed?.updatedAt && <> · Updated {new Date(feed.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>}
            {newCount > 0 && lastVisit.current && (
              <> · <b className="new-count">{newCount} new since {new Date(lastVisit.current).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</b></>
            )}
            {" · "}
            <button className="btn link small" style={{ padding: 0, fontSize: 13 }} disabled={!!busy[bkey(leg, "top")]}
              onClick={() => { setFilter("top"); fetchMore(leg, "top", true); }}>Refresh</button>
          </div>
        )}
      </div>

      {stage !== "past" && (
        <div className="alert-card">
          {!alerts.push ? (
            <div className="alert-row">
              <div>
                <b>Get this briefing on your phone</b>
                <div className="small muted">A morning push with the top {leg.city} story, more often as your trip gets closer.</div>
              </div>
              <button className="btn small-btn" onClick={turnOn}>Turn on alerts</button>
            </div>
          ) : (
            <div className="alert-row">
              <div className="small">
                <b>Alerts on</b> · Daily at {alerts.time}{alerts.breaking ? " · breaking news on your topics" : ""}
              </div>
              <button className="btn link small" style={{ padding: 0 }} onClick={() => setShowSettings((v) => !v)}>
                {showSettings ? "Done" : "Settings"}
              </button>
            </div>
          )}
          {alerts.push && showSettings && (
            <div className="alerts">
              <div className="field" style={{ maxWidth: 200 }}>
                <label>Daily briefing time</label>
                <select value={alerts.time} onChange={(e) => saveAlerts({ ...alerts, time: e.target.value })}>
                  {["06:00", "06:30", "07:00", "07:30", "08:00", "12:00", "18:00"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <label className="check">
                <input type="checkbox" checked={alerts.breaking} onChange={(e) => saveAlerts({ ...alerts, breaking: e.target.checked })} />
                <span>Breaking alerts, only for {profile.topics.length ? profile.topics.join(", ") : "my topics"}</span>
              </label>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn ghost small-btn" onClick={testAlert}>Send test alert</button>
                <button className="btn link small" onClick={() => { saveAlerts({ ...alerts, push: false }); setShowSettings(false); setAlertMsg(""); }}>Turn off</button>
              </div>
              <p className="small muted" style={{ marginBottom: 0 }}>
                Prototype: scheduled daily and breaking pushes aren&apos;t connected yet. Test alerts are real notifications; tap one to jump to the story.
              </p>
            </div>
          )}
          {alertMsg && <p className="small muted" style={{ margin: "8px 0 0" }}>{alertMsg}</p>}
        </div>
      )}

      <div className="filters" role="tablist" aria-label="Filter stories">
        <button role="tab" aria-selected={filter === "top"} className={`chip ${filter === "top" ? "on" : ""}`} onClick={() => pick("top")}>Top stories</button>
        {profile.topics.map((t) => {
          const loadingT = !!busy[bkey(leg, t)];
          return (
            <button key={t} role="tab" aria-selected={filter === t} className={`chip ${filter === t ? "on" : ""}`} onClick={() => pick(t)}>
              {t}
              {loadingT ? <span className="spin" aria-label="loading" /> : countFor(t) > 0 && <span className="count">{countFor(t)}</span>}
            </button>
          );
        })}
      </div>

      {feed?.source === "sample" && (
        <div className="banner">Sample mode: no API key is configured, so these are placeholders. Live mode pulls real articles.</div>
      )}
      {feed?.note && filter === "top" && <p className="landing">{feed.note}</p>}

      {visible.length === 0 && startedAt && (
        <Progress startedAt={startedAt} leg={leg} profile={profile} topic={filter === "top" ? undefined : filter} />
      )}
      {error && (
        <div className="error">
          Couldn&apos;t load stories ({error}).{" "}
          <button className="btn link" onClick={() => fetchMore(leg, filter)}>Try again</button>
        </div>
      )}
      {visible.length === 0 && !startedAt && !error && feed && (
        <p className="muted">No {filter === "top" ? "" : filter + " "}stories from our {leg.country} outlets yet. Try &quot;Load more&quot;.</p>
      )}

      {visible.map((a, i) => (
        <article key={a.url} data-url={a.url} className={`story ${i === 0 && filter === "top" ? "lead" : ""}`}>
          <div className="story-meta">
            <button className="tag" onClick={() => profile.topics.includes(a.category) && pick(a.category)}>{a.category}</button>
            {isNew(a.url) && <span className="new">New</span>}
            <span className="outlet">{a.outlet}</span>
            {a.date && <span>{fmt(a.date.slice(0, 10))}</span>}
            {a.verified && <span className="verified">✓ Source verified</span>}
          </div>
          <h3>{a.english_headline}</h3>
          <p className="sum">{a.summary}</p>
          <div className="why"><b>Why it matters to you</b>{a.why_it_matters}</div>
          <a className="read" href={a.url} target="_blank" rel="noopener noreferrer">
            Read the original in {market?.language ?? "the local language"} ↗
          </a>
        </article>
      ))}

      {notice[k] && <p className="small muted" style={{ textAlign: "center", marginTop: 16 }}>{notice[k]}</p>}
      {feed && visible.length > 0 && (
        <div className="more">
          {startedAt ? (
            <Progress startedAt={startedAt} leg={leg} profile={profile} topic={filter === "top" ? undefined : filter} compact />
          ) : (
            <button className="btn ghost" onClick={() => fetchMore(leg, filter)}>
              Load 5 more {filter === "top" ? "stories" : filter}
            </button>
          )}
        </div>
      )}

      <footer className="foot">
        Worldesk prototype · Stories are selected and translated by AI from a fixed list of local outlets. Always check the original before you quote it.
      </footer>
    </section>
  );
}

// Honest progress: the percentage is estimated from typical run time and never
// passes 95% until results actually arrive; the steps name what the search is doing.
function Progress({ startedAt, leg, profile, topic, compact }: {
  startedAt: number; leg: Leg; profile: Profile; topic?: string; compact?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const market = marketFor(leg.country);
  const elapsed = (now - startedAt) / 1000;
  const pct = Math.min(95, Math.round(100 * (1 - Math.exp(-elapsed / 11))));
  const steps = [
    { at: 0, text: `Searching ${market?.outlets.slice(0, 3).map((o) => o.name).join(", ")} in ${market?.language}` },
    { at: 6, text: `Reading ${topic ? topic.toLowerCase() + " " : ""}articles` },
    { at: 13, text: "Translating to English" },
    { at: 20, text: `Ranking for ${profile.func.toLowerCase()} in ${profile.industry.toLowerCase()}` },
  ];
  const cur = steps.filter((s) => elapsed >= s.at).length - 1;
  const R = 26, C = 2 * Math.PI * R;

  if (compact) {
    return (
      <div className="progress compact" role="status">
        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        <span className="small muted">{steps[cur].text}… {pct}%</span>
      </div>
    );
  }
  return (
    <div className="progress" role="status" aria-live="polite">
      <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
        <circle cx="34" cy="34" r={R} fill="none" stroke="var(--rule)" strokeWidth="5" />
        <circle cx="34" cy="34" r={R} fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform="rotate(-90 34 34)"
          style={{ transition: "stroke-dashoffset 0.25s linear" }} />
        <text x="34" y="39" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--ink)">{pct}%</text>
      </svg>
      <div>
        <div className="progress-title">Building your {leg.city} {topic ? topic : "briefing"}</div>
        <ol className="progress-steps">
          {steps.map((s, i) => (
            <li key={i} className={i < cur ? "done" : i === cur ? "on" : ""}>{i < cur ? "✓ " : ""}{s.text}</li>
          ))}
        </ol>
        <div className="small muted">Usually 20–40 seconds. You can switch topics or cities meanwhile.</div>
      </div>
    </div>
  );
}
