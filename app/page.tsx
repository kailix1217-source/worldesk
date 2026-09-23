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

      {step === "welcome" && (
        <Welcome
          returning={returning} name={profile.name}
          onStart={() => setStep("profile")} onOpen={() => setStep("briefing")}
          onEdit={() => setStep("profile")} onDemo={startDemo}
        />
      )}
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
    <>
      <section className="hero">
        <div className="kicker">{returning ? `Welcome back, ${name}` : "For executives who cross borders"}</div>
        <h1 className="display" style={{ marginTop: 10 }}>Know the market before you land.</h1>
        <p className="lede">
          Worldesk reads the local business press in the local language: Handelsblatt in Munich, Nikkei in Tokyo,
          Valor in São Paulo. It briefs you in English on what matters to your industry, timed to your itinerary.
        </p>
        <div className="row">
          {returning ? (
            <>
              <button className="btn" onClick={onOpen}>Open my briefing</button>
              <button className="btn ghost" onClick={onEdit}>Edit profile</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={onStart}>Set up my briefing</button>
              <button className="btn ghost" onClick={onDemo}>See a sample executive</button>
            </>
          )}
        </div>
        {returning && <button className="btn link small" onClick={onDemo}>Or view the sample executive</button>}
      </section>

      <section className="pillars">
        <div><div className="kicker">01</div><h3>Local sources only</h3><p>A vetted list of respected papers in each market. Every story links to the original.</p></div>
        <div><div className="kicker">02</div><h3>Filtered to your job</h3><p>Your industry and role decide what makes the cut, and why it matters to you.</p></div>
        <div><div className="kicker">03</div><h3>Follows your trip</h3><p>Briefings get more frequent as each stop gets closer, from weekly to every morning.</p></div>
      </section>

      <section className="how">
        <div className="kicker">How it works</div>
        <ol>
          <li><b>Tell us your role.</b> Industry, function and the topics you track. Two minutes, no login.</li>
          <li><b>Add your trip.</b> Each city and your dates. We pick that market&apos;s trusted local papers.</li>
          <li><b>Get your briefing.</b> Local-language reporting, translated and ranked for you, refreshed daily until you land.</li>
        </ol>
      </section>

      <section className="example">
        <div className="kicker">What a story looks like</div>
        <article className="story example-card">
          <div className="story-meta">
            <span className="tag">Competitors</span>
            <span className="outlet">Handelsblatt</span>
            <span className="verified">✓ Source verified</span>
          </div>
          <div className="orig">Mercedes erwägt Abzug von Produktion aus Deutschland</div>
          <h3>Mercedes is considering moving production out of Germany</h3>
          <div className="why"><b>Why it matters to you</b>Expect questions on &quot;Made in Germany&quot; brand claims and labor
            relations in any Munich meeting with automotive partners.</div>
        </article>
      </section>

      {!returning && (
        <section className="cta-end">
          <h2>Your next trip, briefed by the local press.</h2>
          <button className="btn" onClick={onStart}>Set up my briefing</button>
        </section>
      )}
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

type Feed = { note: string; articles: Article[]; source?: "live" | "sample"; fetched: string[]; updatedAt: string };
type Alerts = { channel: "email" | "push" | "off"; breaking: boolean };

// Reminder cadence tightens as the trip approaches (the itinerary-aware pillar).
const RHYTHM = [
  { title: "Weekly digest", when: "More than a week out", detail: "Mondays, 7:00 your time" },
  { title: "Daily briefing", when: "Final week", detail: "Every morning, 7:00 your time" },
  { title: "Pre-arrival brief", when: "Day before", detail: "5 things to know before you land" },
  { title: "In-city mode", when: "While you're there", detail: "7:00 local brief + breaking alerts" },
];
function rhythmIndex(leg: Leg, stage: Stage) {
  if (stage === "past") return -1;
  if (stage === "now") return 3;
  const days = Math.round((Date.parse(leg.arrive) - Date.parse(iso(new Date()))) / 86400000);
  return days <= 1 ? 2 : days <= 7 ? 1 : 0;
}
function nextUpdate(idx: number) {
  if (idx === 0) {
    const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    return `Next digest ${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}, 7:00`;
  }
  if (idx === 1) return "Next briefing tomorrow, 7:00";
  if (idx === 2) return "Pre-arrival brief tomorrow, 7:00";
  if (idx === 3) return "Next local brief tomorrow, 7:00";
  return "Trip complete";
}

function BriefingView({ profile, legs }: { profile: Profile; legs: Leg[] }) {
  const stages = useMemo(() => stagesFor(legs), [legs]);
  const defaultLeg = legs.find((l) => stages[l.id] === "now" || stages[l.id] === "next") ?? legs[0];
  const [sel, setSel] = useState(defaultLeg?.id);
  const [filter, setFilter] = useState("top");
  const [feeds, setFeeds] = useState<Record<string, Feed>>({});
  const [busy, setBusy] = useState<Record<string, string | null>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState<Alerts>(() => load("wd.alerts", { channel: "email", breaking: true }));
  const [alertMsg, setAlertMsg] = useState("");
  const [notice, setNotice] = useState<Record<string, string | undefined>>({});
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;

  // "New since last visit": snapshot what was seen before this visit, then record everything shown now.
  const seenBefore = useRef<Set<string>>(new Set(load<string[]>("wd.seen", [])));
  const lastVisit = useRef<string | null>(load<string | null>("wd.lastVisit", null));
  useEffect(() => { save("wd.lastVisit", new Date().toISOString()); }, []);
  useEffect(() => {
    const all = new Set(load<string[]>("wd.seen", []));
    Object.values(feeds).forEach((f) => f.articles.forEach((a) => all.add(a.url)));
    save("wd.seen", [...all].slice(-500));
  }, [feeds]);

  const topicOrder = [...profile.topics, ...TOPICS.filter((t) => !profile.topics.includes(t))];
  const cacheKey = (leg: Leg) => `wd.feed.${leg.city}.${profile.industry}.${profile.func}.${profile.topics.join(",")}.${iso(new Date())}`;

  const fetchMore = async (leg: Leg, f: string, reset = false) => {
    const existing = reset ? undefined : feedsRef.current[leg.id];
    setBusy((b) => ({ ...b, [leg.id]: f }));
    setErrors((e) => ({ ...e, [leg.id]: undefined }));
    setNotice((n) => ({ ...n, [leg.id]: undefined }));
    try {
      const res = await fetch("/api/briefing", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
        setNotice((n) => ({ ...n, [leg.id]: `No new ${f === "top" ? "" : f + " "}stories from ${leg.country}'s outlets right now. Check back after tomorrow's update.` }));
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
    } catch (e) {
      setErrors((x) => ({ ...x, [leg.id]: (e as Error).message }));
    } finally {
      setBusy((b) => ({ ...b, [leg.id]: null }));
    }
  };

  useEffect(() => {
    legs.forEach((l) => {
      const cached = load<Feed | null>(cacheKey(l), null);
      if (cached) setFeeds((all) => ({ ...all, [l.id]: cached }));
      else fetchMore(l, "top");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leg = legs.find((l) => l.id === sel) ?? legs[0];
  if (!leg) return null;
  const stage = stages[leg.id];
  const market = marketFor(leg.country);
  const feed = feeds[leg.id];
  const loadingNow = busy[leg.id];
  const error = errors[leg.id];
  const hour = new Date().getHours();
  const rIdx = rhythmIndex(leg, stage);

  const visible = (feed?.articles ?? []).filter((a) => (filter === "top" ? a.origin === "top" : a.category === filter));
  const countFor = (t: string) => (feed?.articles ?? []).filter((a) => a.category === t).length;
  const isNew = (url: string) => seenBefore.current.size > 0 && !seenBefore.current.has(url);
  const newCount = (feed?.articles ?? []).filter((a) => isNew(a.url)).length;

  const pick = (f: string) => {
    setFilter(f);
    setNotice({});
    if (f !== "top" && feed && !feed.fetched.includes(f) && !loadingNow) fetchMore(leg, f);
  };
  const selectLeg = (id: string) => { setSel(id); setFilter("top"); setNotice({}); };

  const saveAlerts = async (next: Alerts) => {
    setAlerts(next);
    save("wd.alerts", next);
    setAlertMsg("Saved.");
  };
  const testAlert = async () => {
    const story = visible[0] ?? feed?.articles[0];
    if (!("Notification" in window)) { setAlertMsg("This browser doesn't support notifications."); return; }
    const perm = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (perm !== "granted") { setAlertMsg("Notifications are blocked for this site in your browser settings."); return; }
    new Notification(`Worldesk · ${leg.city}`, {
      body: story ? `${story.outlet}: ${story.english_headline}` : `Your ${leg.city} briefing is ready.`,
    });
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
            <button key={l.id} className={`stop ${s} ${l.id === leg.id ? "sel" : ""}`} onClick={() => selectLeg(l.id)}>
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
            {feed?.updatedAt && <> · Updated {new Date(feed.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>}
            {newCount > 0 && lastVisit.current && (
              <> · <b className="new-count">{newCount} new since {new Date(lastVisit.current).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</b></>
            )}
            {" · "}
            <button className="btn link small" style={{ padding: 0, fontSize: 13 }} disabled={!!loadingNow}
              onClick={() => { setFilter("top"); fetchMore(leg, "top", true); }}>Refresh</button>
          </div>
        )}
      </div>

      {rIdx >= 0 && (
        <div className="rhythm">
          <div className="rhythm-top">
            <div>
              <div className="label">Briefing rhythm</div>
              <div className="rhythm-next">{nextUpdate(rIdx)} · {alerts.channel === "off" ? "alerts off" : alerts.channel === "email" ? "by email" : "by notification"}</div>
            </div>
            <button className="btn ghost small-btn" onClick={() => setShowAlerts((v) => !v)}>
              {showAlerts ? "Close" : "Alert settings"}
            </button>
          </div>
          <ol className="rhythm-steps">
            {RHYTHM.map((r, i) => (
              <li key={r.title} className={i === rIdx ? "on" : i < rIdx ? "done" : ""}>
                <span className="dot" />
                <b>{r.title}</b>
                <span>{r.when}</span>
              </li>
            ))}
          </ol>
          <p className="small muted" style={{ margin: "6px 0 0" }}>Now: {RHYTHM[rIdx].detail}.</p>

          {showAlerts && (
            <div className="alerts">
              <div className="label">Deliver my briefings by</div>
              <div className="chips" style={{ margin: "8px 0 14px" }}>
                {([["email", "Email digest"], ["push", "Browser notification"], ["off", "Off"]] as const).map(([k, label]) => (
                  <button key={k} className={`chip ${alerts.channel === k ? "on" : ""}`} onClick={() => saveAlerts({ ...alerts, channel: k })}>{label}</button>
                ))}
              </div>
              <label className="check">
                <input type="checkbox" checked={alerts.breaking} onChange={(e) => saveAlerts({ ...alerts, breaking: e.target.checked })} />
                <span>Breaking alerts, only for {profile.topics.length ? profile.topics.join(", ") : "my topics"}</span>
              </label>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn ghost small-btn" onClick={testAlert}>Send test alert</button>
                {alertMsg && <span className="small muted">{alertMsg}</span>}
              </div>
              <p className="small muted" style={{ marginBottom: 0 }}>
                Prototype: scheduled email and push delivery aren&apos;t connected yet. The test alert is a real browser notification.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="filters" role="tablist" aria-label="Filter stories">
        <button role="tab" aria-selected={filter === "top"} className={`chip ${filter === "top" ? "on" : ""}`} onClick={() => pick("top")}>Top stories</button>
        {topicOrder.map((t) => (
          <button key={t} role="tab" aria-selected={filter === t} className={`chip ${filter === t ? "on" : ""}`} onClick={() => pick(t)}>
            {t}{countFor(t) > 0 && <span className="count">{countFor(t)}</span>}
          </button>
        ))}
      </div>

      {feed?.source === "sample" && (
        <div className="banner">Sample mode: no API key is configured, so these are placeholders. Live mode pulls real articles.</div>
      )}
      {feed?.note && filter === "top" && <p className="landing">{feed.note}</p>}
      {filter !== "top" && (
        <p className="small muted" style={{ marginTop: 16 }}>
          {filter} stories from {leg.country}&apos;s local press{loadingNow === filter ? "" : `, ${visible.length} loaded`}.
        </p>
      )}

      {visible.length === 0 && loadingNow && <Skeleton />}
      {error && (
        <div className="error">
          Couldn&apos;t load stories ({error}).{" "}
          <button className="btn link" onClick={() => fetchMore(leg, filter)}>Try again</button>
        </div>
      )}
      {visible.length === 0 && !loadingNow && !error && feed && (
        <p className="muted">No {filter === "top" ? "" : filter + " "}stories from our {leg.country} outlets yet. Try &quot;Load more&quot;.</p>
      )}

      {visible.map((a, i) => (
        <article key={a.url} className={`story ${i === 0 && filter === "top" ? "lead" : ""}`}>
          <div className="story-meta">
            <button className="tag" onClick={() => pick(a.category)} title={`Show more ${a.category}`}>{a.category}</button>
            {isNew(a.url) && <span className="new">New</span>}
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

      {notice[leg.id] && <p className="small muted" style={{ textAlign: "center", marginTop: 16 }}>{notice[leg.id]}</p>}
      {feed && visible.length > 0 && (
        <div className="more">
          {loadingNow ? (
            <p className="muted small">Reading the local press for more {loadingNow === "top" ? "stories" : loadingNow + " stories"}…</p>
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
