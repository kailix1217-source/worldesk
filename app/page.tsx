"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ONBOARD_MARKETS, marketFor } from "@/lib/sources";
import { DOTS, PINS, WORLD } from "@/lib/worldDots";
import {
  FUNCTIONS, INDUSTRIES, TOPICS,
  type Article, type Briefing, type Leg, type Profile,
} from "@/lib/types";

type Step = "welcome" | "account" | "about" | "markets" | "topics" | "briefing";
const ONBOARDING: Step[] = ["account", "about", "markets", "topics"];

const EMPTY_PROFILE: Profile = {
  name: "", email: "", title: "", company: "", industry: "", func: "", markets: [], topics: [],
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (d: string) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

const DEMO_PROFILE: Profile = {
  name: "Maya", email: "maya@example.com", title: "Marketing Director, EMEA & APAC", company: "",
  industry: "Automotive", func: "Marketing & Communications", markets: ["Germany", "Japan"],
  topics: ["Competitors", "Consumer Trends", "Regulation & Policy"],
};

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

// Profiles saved by the trip-based version have no markets: derive them from the old trip stops.
function loadProfile(): Profile {
  const stored = load<Partial<Profile>>("wd.profile", {});
  const p: Profile = { ...EMPTY_PROFILE, ...stored, markets: stored.markets ?? [], topics: stored.topics ?? [] };
  if (!p.markets.length) {
    const legs = load<Leg[]>("wd.legs", []);
    const offered = new Set(ONBOARD_MARKETS.map((m) => m.country));
    p.markets = [...new Set(legs.map((l) => l.country).filter((c) => offered.has(c)))];
  }
  return p;
}

// The briefing is organised by market; each market is searched through its business hub.
const legsFor = (markets: string[]): Leg[] =>
  markets.map((c) => marketFor(c)).filter((m): m is NonNullable<typeof m> => !!m)
    .map((m) => ({ id: m.country, city: m.hub, country: m.country, arrive: "", depart: "" }));

export default function Home() {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("welcome");
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [signedIn, setSignedIn] = useState(false);
  const [demo, setDemo] = useState(false); // the sample executive never overwrites the user's own account

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    // Profiles from before accounts existed count as signed in.
    setSignedIn(load<boolean | null>("wd.session", null) ?? !!(p.name && p.industry));
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { save("wd.profile", profile); save("wd.session", signedIn); } }, [ready, profile, signedIn]);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const startDemo = () => { setDemo(true); setStep("briefing"); };
  const exitDemo = () => { setDemo(false); setStep("welcome"); };
  const logOut = () => { setSignedIn(false); setStep("welcome"); };

  if (!ready) return null;
  const hasAccount = !!(profile.name && profile.email);
  const returning = !!(signedIn && hasAccount && profile.industry && profile.func && profile.markets.length);

  if (step === "welcome") {
    return (
      <Welcome
        returning={returning} name={profile.name.split(" ")[0]}
        onStart={() => setStep(signedIn && hasAccount ? "about" : "account")} onOpen={() => setStep("briefing")}
        onEdit={() => setStep("about")} onDemo={startDemo}
      />
    );
  }

  const stepNo = ONBOARDING.indexOf(step);
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
              {demo ? (
                <button onClick={exitDemo}>Exit sample</button>
              ) : (
                <>
                  <button onClick={() => setStep("about")}>Profile</button>
                  <button onClick={() => setStep("markets")}>Markets</button>
                  <button onClick={logOut}>Log out</button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {stepNo >= 0 && (
        <div className="ob-progress" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={stepNo + 1} aria-label="Setup progress">
          {ONBOARDING.map((s, i) => <i key={s} className={i <= stepNo ? "on" : ""} />)}
        </div>
      )}
      {step === "account" && (
        <AccountStep profile={profile} setProfile={setProfile} initialMode={hasAccount && !signedIn ? "login" : "create"}
          onNext={() => { setSignedIn(true); setStep("about"); }}
          onLoggedIn={(complete) => { setSignedIn(true); setStep(complete ? "briefing" : "about"); }} />
      )}
      {step === "about" && (
        <AboutStep profile={profile} setProfile={setProfile} onBack={() => setStep(hasAccount ? "welcome" : "account")} onNext={() => setStep("markets")} />
      )}
      {step === "markets" && (
        <MarketsStep profile={profile} setProfile={setProfile} onBack={() => setStep("about")} onNext={() => setStep("topics")} />
      )}
      {step === "topics" && (
        <TopicsStep profile={profile} setProfile={setProfile} onBack={() => setStep("markets")} onNext={() => setStep("briefing")} />
      )}
      {step === "briefing" && (demo
        ? <BriefingView key="demo" profile={DEMO_PROFILE} />
        : <BriefingView key={profile.markets.join(",")} profile={profile} />)}
    </main>
  );
}

function Welcome({ returning, name, onStart, onOpen, onEdit, onDemo }: {
  returning: boolean; name: string; onStart: () => void; onOpen: () => void; onEdit: () => void; onDemo: () => void;
}) {
  // Intro "shuffle" plays once per browser session; reduced-motion users skip straight to the message.
  const [phase, setPhase] = useState<"intro" | "done">(() => {
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "done";
      return sessionStorage.getItem("wd.intro") ? "done" : "intro";
    } catch { return "done"; }
  });
  useEffect(() => {
    if (phase !== "intro") return;
    try { sessionStorage.setItem("wd.intro", "1"); } catch { /* ignore */ }
    const t = setTimeout(() => setPhase("done"), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className={`ld ld-${phase}`} onClick={() => phase === "intro" && setPhase("done")}>
      <WorldCarousel />
      <p className="ld-caption ld-mono" aria-hidden="true">READING THE WORLD&apos;S LOCAL PRESS…</p>
      <header className="ld-top">
        <span />
        <span className="ld-mono ld-muted">V0.1 PROTOTYPE</span>
      </header>

      <div className="ld-spacer" />

      <main className="ld-card">
        <span className="ld-brand">WORLDESK</span>
        <h1 className="ld-title">Know the market before you land.</h1>
        <p className="ld-sub">{returning && <b className="ld-welcome">Welcome back, {name}. </b>}Local business press, read in the local language and briefed in English for your role and the markets you follow.</p>

        <div className="ld-divider"><span>HOW IT WORKS</span></div>

        <ol className="ld-steps">
          <li><span className="ld-mono">01</span>Create an account and tell us your role</li>
          <li><span className="ld-mono">02</span>Pick the markets and topics you follow</li>
          <li><span className="ld-mono">03</span>Get local news, ranked for you, every morning</li>
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

// Sixteen regional windows onto one dotted world map, arranged on a 3D cylinder.
const REGIONS: { name: string; x: number; y: number }[] = [
  { name: "North America", x: 30, y: 22 },
  { name: "Europe", x: 78, y: 19 },
  { name: "East Asia", x: 124, y: 27 },
  { name: "South America", x: 55, y: 48 },
  { name: "Middle East", x: 95, y: 31 },
  { name: "Southeast Asia", x: 122, y: 40 },
  { name: "Central America", x: 38, y: 35 },
  { name: "Africa", x: 81, y: 42 },
  { name: "Oceania", x: 136, y: 54 },
  { name: "Nordics", x: 80, y: 10 },
  { name: "South Asia", x: 105, y: 34 },
  { name: "North Atlantic", x: 60, y: 20 },
  { name: "West Africa", x: 72, y: 40 },
  { name: "Central Asia", x: 101, y: 20 },
  { name: "Caribbean", x: 45, y: 32 },
  { name: "East Africa", x: 90, y: 45 },
];
const WIN_W = 36, WIN_H = 48, DOT_R = 0.3, PIN_R = 0.75;

function dotPath(dots: [number, number][], r: number) {
  return dots.map(([x, y]) => `M${x - r},${y}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`).join("");
}

function WorldCarousel() {
  const cards = useMemo(() => REGIONS.map((r, i) => {
    const x0 = Math.max(0, Math.min(WORLD.width - WIN_W, r.x - WIN_W / 2));
    const y0 = Math.max(0, Math.min(WORLD.height - WIN_H, r.y - WIN_H / 2));
    const inWin = ([x, y]: [number, number]) => x >= x0 - 1 && x <= x0 + WIN_W + 1 && y >= y0 - 1 && y <= y0 + WIN_H + 1;
    return {
      ...r, i, viewBox: `${x0} ${y0} ${WIN_W} ${WIN_H}`,
      dots: dotPath(DOTS.filter(inWin), DOT_R),
      pins: PINS.filter(inWin),
      tone: ["light", "dark", "mist"][i % 3],
    };
  }), []);

  return (
    <div className="ld-stage" aria-hidden="true">
      <div className="ld-ring">
        {cards.map((c) => (
          <figure key={c.name} className={`ld-tile ${c.tone}`} style={{ "--i": c.i } as React.CSSProperties}>
            <svg viewBox={c.viewBox} preserveAspectRatio="xMidYMid slice">
              <path d={c.dots} className="ld-dots" />
              {c.pins.map(([x, y]) => (
                <g key={`${x},${y}`}>
                  <circle cx={x} cy={y} r={PIN_R * 2.2} className="ld-pin-halo" />
                  <circle cx={x} cy={y} r={PIN_R} className="ld-pin" />
                </g>
              ))}
            </svg>
            <figcaption>
              <span>{String(c.i + 1).padStart(2, "0")} / {REGIONS.length}</span>
              <b>{c.name}</b>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

// One window onto the dotted world map, centred on (cx, cy) in map units.
function mapWindow(cx: number, cy: number) {
  const x0 = Math.max(0, Math.min(WORLD.width - WIN_W, cx - WIN_W / 2));
  const y0 = Math.max(0, Math.min(WORLD.height - WIN_H, cy - WIN_H / 2));
  const inWin = ([x, y]: [number, number]) => x >= x0 - 1 && x <= x0 + WIN_W + 1 && y >= y0 - 1 && y <= y0 + WIN_H + 1;
  return { viewBox: `${x0} ${y0} ${WIN_W} ${WIN_H}`, dots: dotPath(DOTS.filter(inWin), DOT_R), pins: PINS.filter(inWin) };
}

// Brand banner from the design-system cover: wordmark left, brand shapes right, never overlapping.
function BrandBanner() {
  const europe = useMemo(() => mapWindow(78, 19), []);
  const asia = useMemo(() => mapWindow(124, 27), []);
  const tile = (w: ReturnType<typeof mapWindow>, x: number, y: number, width: number, height: number, tone: "dark" | "mist") => (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="6" className={`bb-${tone}`} />
      <svg x={x} y={y} width={width} height={height} viewBox={w.viewBox} preserveAspectRatio="xMidYMid slice">
        <path d={w.dots} className={`bb-${tone}-dot`} />
        {w.pins.map(([px, py]) => (
          <g key={`${px},${py}`}>
            <circle cx={px} cy={py} r={PIN_R * 2.2} className="bb-halo" />
            <circle cx={px} cy={py} r={PIN_R} className="bb-pin" />
          </g>
        ))}
      </svg>
    </g>
  );
  return (
    <div className="brand-banner" aria-hidden="true">
      <div className="bb-text">
        <div className="bb-word">Worldesk</div>
        <div className="bb-tag">Know the market before you land.</div>
      </div>
      <svg className="bb-art" viewBox="0 0 320 260" preserveAspectRatio="xMaxYMid meet">
        <rect x="200" y="-60" width="200" height="380" rx="40" className="bb-surface" />
        {tile(europe, 8, 34, 112, 152, "dark")}
        {tile(asia, 132, 104, 86, 116, "mist")}
        <rect x="222" y="30" width="92" height="36" rx="18" className="bb-fill" />
        <rect x="222" y="194" width="98" height="44" rx="22" className="bb-ink" />
      </svg>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function StepHead({ n, title, sub, center }: { n: number; title: string; sub: string; center?: boolean }) {
  return (
    <div className={`ob-head ${center ? "center" : ""}`}>
      <div className="kicker">Step {n} of 4</div>
      <h1>{title}</h1>
      <p>{sub}</p>
    </div>
  );
}

// Prototype account: kept only in this browser. The password is checked for length and then discarded.
function AccountStep({ profile, setProfile, initialMode, onNext, onLoggedIn }: {
  profile: Profile; setProfile: (p: Profile) => void; initialMode: "create" | "login";
  onNext: () => void; onLoggedIn: (complete: boolean) => void;
}) {
  const [mode, setMode] = useState<"create" | "login">(initialMode);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");

  const emailOk = EMAIL_RE.test(email.trim());
  const pwOk = password.length >= 8;
  const canCreate = name.trim() && emailOk && pwOk;

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canCreate) return;
    const addr = email.trim().toLowerCase();
    // A different email on this device is a new person: start from a blank profile.
    const base = profile.email && profile.email !== addr ? EMPTY_PROFILE : profile;
    setProfile({ ...base, name: name.trim(), email: addr });
    setPassword("");
    onNext();
  };
  const login = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailOk || !pwOk) return;
    const saved = loadProfile();
    if (saved.email && saved.email === email.trim().toLowerCase()) {
      setProfile(saved);
      setPassword("");
      onLoggedIn(!!(saved.industry && saved.func && saved.markets.length));
    } else {
      setError("No Worldesk account with that email on this device. Create one instead.");
    }
  };

  return (
    <section className="ob ob-narrow">
      <StepHead n={1} center title={mode === "create" ? "Create your account" : "Log in"}
        sub={mode === "create" ? "Set up your personalized briefing." : "Welcome back. Open your briefing."} />
      <form className="ob-form" onSubmit={mode === "create" ? create : login} noValidate>
        {mode === "create" && (
          <div className="field">
            <label htmlFor="acc-name">Full name</label>
            <input id="acc-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            {touched && !name.trim() && <span className="field-err">Enter your name.</span>}
          </div>
        )}
        <div className="field">
          <label htmlFor="acc-email">Email</label>
          <input id="acc-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="executive@company.com" />
          {touched && !emailOk && <span className="field-err">Enter a valid email address.</span>}
        </div>
        <div className="field">
          <label htmlFor="acc-pw">Password</label>
          <input id="acc-pw" type="password" autoComplete={mode === "create" ? "new-password" : "current-password"}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          {touched && !pwOk && <span className="field-err">Use at least 8 characters.</span>}
        </div>
        {error && <p className="field-err" role="alert">{error}</p>}
        <button type="submit" className="btn ob-full">{mode === "create" ? "Continue" : "Log in"}</button>
      </form>
      <p className="ob-switch">
        {mode === "create" ? "Already have an account? " : "New to Worldesk? "}
        <button className="btn link" onClick={() => { setMode(mode === "create" ? "login" : "create"); setTouched(false); setError(""); }}>
          {mode === "create" ? "Log in" : "Create an account"}
        </button>
      </p>
      <p className="ob-note">Prototype: your account stays in this browser only. Passwords are never saved.</p>
    </section>
  );
}

function AboutStep({ profile, setProfile, onBack, onNext }: {
  profile: Profile; setProfile: (p: Profile) => void; onBack: () => void; onNext: () => void;
}) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile({ ...profile, [k]: v });
  const valid = profile.title.trim() && profile.func && profile.industry;
  return (
    <section className="ob">
      <BrandBanner />
      <StepHead n={2} title="About you" sub="We use this to order stories for your role and industry." />
      <div className="ob-form">
        <div className="field">
          <label htmlFor="ab-title">Job title</label>
          <input id="ab-title" value={profile.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Marketing Director, APAC" />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="ab-func">Function</label>
            <select id="ab-func" value={profile.func} onChange={(e) => set("func", e.target.value)}>
              <option value="">Select…</option>{FUNCTIONS.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ab-ind">Industry</label>
            <select id="ab-ind" value={profile.industry} onChange={(e) => set("industry", e.target.value)}>
              <option value="">Select…</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="ab-co">Company (optional)</label>
          <input id="ab-co" value={profile.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Acme Motors" />
        </div>
      </div>
      <div className="actions">
        <button className="btn link" onClick={onBack}>Back</button>
        <button className="btn" disabled={!valid} onClick={onNext}>Continue</button>
      </div>
    </section>
  );
}

function MarketsStep({ profile, setProfile, onBack, onNext }: {
  profile: Profile; setProfile: React.Dispatch<React.SetStateAction<Profile>>; onBack: () => void; onNext: () => void;
}) {
  const toggle = (c: string) => setProfile((p) => ({
    ...p,
    markets: p.markets.includes(c) ? p.markets.filter((x) => x !== c) : [...p.markets, c],
  }));
  return (
    <section className="ob">
      <StepHead n={3} title="Choose your markets" sub="Your briefing will only show stories from the countries you select." />
      <div className="pick-grid markets">
        {ONBOARD_MARKETS.map((m) => {
          const on = profile.markets.includes(m.country);
          return (
            <button key={m.code} className={`pick ${on ? "on" : ""}`} role="checkbox" aria-checked={on} onClick={() => toggle(m.country)}>
              <span className="pick-code">{m.code}</span>
              <span className="pick-box" aria-hidden="true" />
              <span className="pick-name">{m.country}</span>
              <span className="pick-sub">{m.outlets[0].name}{m.language !== "English" ? ` · in ${m.language}` : ""}</span>
            </button>
          );
        })}
      </div>
      <div className="actions">
        <button className="btn link" onClick={onBack}>Back</button>
        <span className="row" style={{ gap: 14 }}>
          <span className="small muted">{profile.markets.length} selected</span>
          <button className="btn" disabled={!profile.markets.length} onClick={onNext}>Continue</button>
        </span>
      </div>
    </section>
  );
}

function TopicsStep({ profile, setProfile, onBack, onNext }: {
  profile: Profile; setProfile: React.Dispatch<React.SetStateAction<Profile>>; onBack: () => void; onNext: () => void;
}) {
  const toggle = (t: string) => setProfile((p) => ({
    ...p,
    topics: p.topics.includes(t) ? p.topics.filter((x) => x !== t) : [...p.topics, t],
  }));
  return (
    <section className="ob">
      <StepHead n={4} title="Choose topics" sub="Optional. Selected topics appear first in your briefing." />
      <div className="pick-grid topics">
        {TOPICS.map((t) => {
          const on = profile.topics.includes(t);
          return (
            <button key={t} className={`pick row-pick ${on ? "on" : ""}`} role="checkbox" aria-checked={on} onClick={() => toggle(t)}>
              <span className="pick-box" aria-hidden="true" />
              <span className="pick-name">{t}</span>
            </button>
          );
        })}
      </div>
      <div className="actions">
        <button className="btn link" onClick={onBack}>Back</button>
        <button className="btn" onClick={onNext}>Build my briefing</button>
      </div>
    </section>
  );
}

type Feed = { note: string; articles: Article[]; source?: "live" | "sample"; fetched: string[]; updatedAt: string };
type Alerts = { push: boolean; time: string; breaking: boolean };
const ALERT_DEFAULT: Alerts = { push: false, time: "07:00", breaking: true };
const TIMEOUT_MS = 110_000;

const STORY_COUNT = 6;

function BriefingView({ profile }: { profile: Profile }) {
  const legs = useMemo(() => legsFor(profile.markets), [profile.markets]);
  // No topics chosen means no restriction: offer every topic as a filter.
  const topicList = profile.topics.length ? profile.topics : TOPICS;
  const [sel, setSel] = useState(legs[0]?.id);
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

  const cacheKey = (leg: Leg) =>
    `wd.feed.${leg.country}.${profile.industry}.${profile.func}.${profile.company}.${profile.topics.join(",")}.${iso(new Date())}`;
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
          count: f === "top" ? STORY_COUNT : 5,
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
      // Preload the reader's own topics for the market that's open, so topic taps are instant.
      if (f === "top" && !reset) {
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

  // Markets load when their tab is opened (cached for the day), so picking 12 markets doesn't start 12 searches.
  const open = (l: Leg) => {
    if (feedsRef.current[l.id]) return;
    const cached = load<Feed | null>(cacheKey(l), null);
    if (cached) {
      setFeeds((all) => ({ ...all, [l.id]: cached }));
      profile.topics.filter((t) => !cached.fetched.includes(t)).forEach((t) => fetchMore(l, t));
    } else fetchMore(l, "top");
  };
  useEffect(() => {
    if (legs[0]) open(legs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leg = legs.find((l) => l.id === sel) ?? legs[0];
  if (!leg) return <p className="muted" style={{ paddingTop: 32 }}>Choose at least one market to build your briefing.</p>;
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
    const n = new Notification(`${l.country} · today's briefing`, {
      body: a ? `${a.outlet}: ${a.english_headline}\n${a.why_it_matters}`.slice(0, 220) : `Your ${l.country} briefing is ready.`,
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
        <div className="kicker">Your briefing</div>
        <h1>Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, {profile.name.split(" ")[0] || "there"}.</h1>
        <p className="muted small" style={{ margin: "4px 0 0" }}>
          Tuned for {profile.func.toLowerCase()} in {profile.industry.toLowerCase()}
          {profile.topics.length ? `, following ${profile.topics.join(", ").toLowerCase()}` : ""}.
        </p>
      </div>

      <nav className="timeline markets-nav" aria-label="Your markets">
        {legs.map((l) => {
          const m = marketFor(l.country);
          const n = feeds[l.id]?.articles.length ?? 0;
          return (
            <button key={l.id} className={`stop next ${l.id === leg.id ? "sel" : ""}`} aria-current={l.id === leg.id}
              onClick={() => { setSel(l.id); setFilter("top"); open(l); }}>
              <span className="stage next">{m?.code}</span>
              <span className="city">{l.country}</span>
              <span className="depth">{n ? `${n} stories` : l.id === leg.id ? "Loading…" : "Tap to load"}</span>
            </button>
          );
        })}
      </nav>

      <div className="city-head">
        <div className="kicker">Business news · {leg.city}</div>
        <h2>{leg.country}</h2>
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

      {(
        <div className="alert-card">
          {!alerts.push ? (
            <div className="alert-row">
              <div>
                <b>Get this briefing on your phone</b>
                <div className="small muted">A morning push with the top {leg.country} story, plus breaking news on your topics.</div>
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
                <span>Breaking alerts, only for {topicList.join(", ")}</span>
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
        {topicList.map((t) => {
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
      {feed?.note && filter === "top" && (
        <div className="summary">
          <div className="summary-label">This week in {leg.country}</div>
          <p>{feed.note}</p>
        </div>
      )}

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
            <button className="tag" onClick={() => topicList.includes(a.category) && pick(a.category)}>{a.category}</button>
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
        <div className="progress-title">Building your {leg.country} {topic ? topic : "briefing"}</div>
        <ol className="progress-steps">
          {steps.map((s, i) => (
            <li key={i} className={i < cur ? "done" : i === cur ? "on" : ""}>{i < cur ? "✓ " : ""}{s.text}</li>
          ))}
        </ol>
        <div className="small muted">Usually 20–40 seconds. You can switch topics or markets meanwhile.</div>
      </div>
    </div>
  );
}
