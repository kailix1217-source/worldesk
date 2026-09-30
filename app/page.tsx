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
  // Editing from Settings reuses a setup screen as a single-step editor, then returns to Settings.
  const [editFrom, setEditFrom] = useState<Profile | null>(null);
  const [briefView, setBriefView] = useState<View>("all");

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    // Profiles from before accounts existed count as signed in.
    setSignedIn(load<boolean | null>("wd.session", null) ?? !!(p.name && p.industry));
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { save("wd.profile", profile); save("wd.session", signedIn); } }, [ready, profile, signedIn]);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const openBriefing = (view: View = "all") => { setBriefView(view); setStep("briefing"); };
  const startDemo = () => { setDemo(true); openBriefing(); };
  const startEdit = (s: Step) => { setEditFrom(profile); setStep(s); };
  const saveEdit = () => { setEditFrom(null); openBriefing("settings"); };
  const cancelEdit = () => { if (editFrom) setProfile(editFrom); setEditFrom(null); openBriefing("settings"); };
  const exitDemo = () => { setDemo(false); setStep("welcome"); };
  const logOut = () => { setSignedIn(false); setStep("welcome"); };

  if (!ready) return null;
  const hasAccount = !!(profile.name && profile.email);
  const returning = !!(signedIn && hasAccount && profile.industry && profile.func && profile.markets.length);

  if (step === "welcome") {
    return (
      <Welcome
        returning={returning} name={profile.name.split(" ")[0]}
        onStart={() => setStep(signedIn && hasAccount ? "about" : "account")} onOpen={() => openBriefing()}
        onEdit={() => setStep("about")} onDemo={startDemo}
      />
    );
  }

  if (step === "briefing") {
    return (
      <BriefingView key={demo ? "demo" : profile.markets.join(",")} profile={demo ? DEMO_PROFILE : profile} demo={demo}
        initialView={briefView} onEdit={startEdit} onHome={() => setStep("welcome")} onLogout={logOut} onExitDemo={exitDemo} />
    );
  }

  const stepNo = editFrom ? -1 : ONBOARDING.indexOf(step);
  const edit = editFrom ? { onCancel: cancelEdit, onSave: saveEdit } : undefined;
  return (
    <main className="wrap">
      <header className="mast">
        <button className="wordmark" onClick={() => setStep("welcome")}>
          Worl<span>desk</span>
        </button>
        <div className="mast-meta">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
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
          onLoggedIn={(complete) => { setSignedIn(true); if (complete) openBriefing(); else setStep("about"); }} />
      )}
      {step === "about" && (
        <AboutStep profile={profile} setProfile={setProfile} edit={edit} onBack={() => setStep(hasAccount ? "welcome" : "account")} onNext={() => setStep("markets")} />
      )}
      {step === "markets" && (
        <MarketsStep profile={profile} setProfile={setProfile} edit={edit} onBack={() => setStep("about")} onNext={() => setStep("topics")} />
      )}
      {step === "topics" && (
        <TopicsStep profile={profile} setProfile={setProfile} edit={edit} onBack={() => setStep("markets")} onNext={() => openBriefing()} />
      )}
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
        <rect x="196" y="8" width="124" height="244" rx="28" className="bb-surface" />
        {tile(europe, 8, 28, 112, 152, "dark")}
        {tile(asia, 132, 96, 84, 112, "mist")}
        <rect x="214" y="28" width="92" height="36" rx="18" className="bb-fill" />
        <rect x="214" y="196" width="92" height="40" rx="20" className="bb-ink" />
      </svg>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EditMode = { onCancel: () => void; onSave: () => void };

function StepHead({ n, title, sub, center, editLabel }: { n: number; title: string; sub: string; center?: boolean; editLabel?: string }) {
  return (
    <div className={`ob-head ${center ? "center" : ""}`}>
      <div className="kicker">{editLabel ?? `Step ${n} of 4`}</div>
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

function EditActions({ edit, canSave }: { edit: EditMode; canSave: boolean }) {
  return (
    <div className="actions">
      <button className="btn link" onClick={edit.onCancel}>Cancel</button>
      <button className="btn" disabled={!canSave} onClick={edit.onSave}>Save changes</button>
    </div>
  );
}

function AboutStep({ profile, setProfile, edit, onBack, onNext }: {
  profile: Profile; setProfile: (p: Profile) => void; edit?: EditMode; onBack: () => void; onNext: () => void;
}) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile({ ...profile, [k]: v });
  const valid = profile.title.trim() && profile.func && profile.industry;
  return (
    <section className="ob">
      <StepHead n={2} title="About you" sub="We use this to order stories for your role and industry." editLabel={edit && "Edit profile"} />
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
      {edit ? <EditActions edit={edit} canSave={!!valid} /> : (
        <div className="actions">
          <button className="btn link" onClick={onBack}>Back</button>
          <button className="btn" disabled={!valid} onClick={onNext}>Continue</button>
        </div>
      )}
      <BrandBanner />
    </section>
  );
}

function MarketsStep({ profile, setProfile, edit, onBack, onNext }: {
  profile: Profile; setProfile: React.Dispatch<React.SetStateAction<Profile>>; edit?: EditMode; onBack: () => void; onNext: () => void;
}) {
  const toggle = (c: string) => setProfile((p) => ({
    ...p,
    markets: p.markets.includes(c) ? p.markets.filter((x) => x !== c) : [...p.markets, c],
  }));
  return (
    <section className="ob">
      <StepHead n={3} title="Choose your markets" sub="Your briefing will only show stories from the countries you select." editLabel={edit && "Edit markets"} />
      <div className="pick-grid markets">
        {ONBOARD_MARKETS.map((m) => {
          const on = profile.markets.includes(m.country);
          return (
            <button key={m.code} className={`pick ${on ? "on" : ""}`} role="checkbox" aria-checked={on} onClick={() => toggle(m.country)}>
              <span className="pick-code">{m.code}</span>
              <span className="pick-box" aria-hidden="true" />
              <span className="pick-name">{m.country}</span>
            </button>
          );
        })}
      </div>
      <div className="actions">
        <button className="btn link" onClick={edit ? edit.onCancel : onBack}>{edit ? "Cancel" : "Back"}</button>
        <span className="row" style={{ gap: 14 }}>
          <span className="small muted">{profile.markets.length} selected</span>
          <button className="btn" disabled={!profile.markets.length} onClick={edit ? edit.onSave : onNext}>{edit ? "Save changes" : "Continue"}</button>
        </span>
      </div>
    </section>
  );
}

function TopicsStep({ profile, setProfile, edit, onBack, onNext }: {
  profile: Profile; setProfile: React.Dispatch<React.SetStateAction<Profile>>; edit?: EditMode; onBack: () => void; onNext: () => void;
}) {
  const toggle = (t: string) => setProfile((p) => ({
    ...p,
    topics: p.topics.includes(t) ? p.topics.filter((x) => x !== t) : [...p.topics, t],
  }));
  return (
    <section className="ob">
      <StepHead n={4} title="Choose topics" sub="Optional. Selected topics appear first in your briefing." editLabel={edit && "Edit topics"} />
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
      {edit ? <EditActions edit={edit} canSave /> : (
        <div className="actions">
          <button className="btn link" onClick={onBack}>Back</button>
          <button className="btn" onClick={onNext}>Build my briefing</button>
        </div>
      )}
    </section>
  );
}

type Feed = { note: string; articles: Article[]; source?: "live" | "sample"; fetched: string[]; updatedAt: string };
type Alerts = { push: boolean; time: string; breaking: boolean };
type View = "all" | "saved" | "settings" | string; // any other string is a market's country
const ALERT_DEFAULT: Alerts = { push: false, time: "07:00", breaking: true };
const TIMEOUT_MS = 110_000;
const STORY_COUNT = 6;
const POOL = 3; // All markets never runs more than 3 searches at once

function relDate(d: string) {
  const day = d?.slice(0, 10);
  const diff = Math.round((Date.parse(iso(new Date())) - Date.parse(day)) / 86400000);
  if (!day || Number.isNaN(diff)) return "";
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return diff < 7 ? `${diff} days ago` : fmt(day);
}
const sourcesOf = (a: Article) => (a.sources?.length ? a.sources : [{ outlet: a.outlet, url: a.url }]);

// Only a view's lead story carries a picture; every other story is a compact text card.
function StoryCard({ a, lead, isNew, saved, onSave, onTag }: {
  a: Article; lead: boolean; isNew: boolean; saved: boolean; onSave: () => void; onTag: (t: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const country = a.country ?? "";
  const srcs = sourcesOf(a);
  const lang = marketFor(country)?.language;
  const showImage = lead && !!a.image && imgOk;
  return (
    <article className={`sc ${showImage ? "lead" : "compact"}`} data-url={a.url}>
      {showImage && (
        <div className="sc-media">
          <img src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImgOk(false)} />
        </div>
      )}
      <div className="sc-body">
        <div className="sc-meta">
          <button className="tag" onClick={() => onTag(a.category)}>{a.category}</button>
          {isNew && <span className="new">New</span>}
          <b>{a.outlet}</b>
          {country && <><i aria-hidden="true">·</i><span>{country}</span></>}
          {a.date && <><i aria-hidden="true">·</i><span>{relDate(a.date)}</span></>}
        </div>
        <button className={`sc-save ${saved ? "on" : ""}`} onClick={onSave} aria-pressed={saved}
          aria-label={saved ? "Remove from saved stories" : "Save story"} title={saved ? "Saved" : "Save"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
        </button>
        <h3>{a.english_headline}</h3>
        <div className="why"><b>Why it matters to you</b>{a.why_it_matters}</div>
        {open && <p className="sc-sum">{a.summary}</p>}
      </div>
      <footer className="sc-foot">
        <span className="sc-count">{srcs.length} {srcs.length === 1 ? "source" : "sources"}{lang && lang !== "English" ? ` · in ${lang}` : ""}</span>
        {srcs.map((s) => (
          <a key={s.url} className="sc-link" href={s.url} target="_blank" rel="noopener noreferrer">View {s.outlet} ↗</a>
        ))}
        <button className={`sc-toggle ${open ? "open" : ""}`} onClick={() => setOpen((v) => !v)} aria-expanded={open}
          aria-label={open ? "Hide summary" : "Show summary"} title={open ? "Less" : "Read summary"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </footer>
    </article>
  );
}

type Indicator = { code: string; label: string; kind: "rate" | "usd" | "count"; value: number; year: string; prev?: number; prevYear?: string };

function fmtValue(i: Indicator) {
  if (i.kind === "rate") return `${i.value.toFixed(1)}%`;
  const v = i.value;
  const big = (n: number) =>
    n >= 1e12 ? `${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `${(n / 1e9).toFixed(n >= 1e11 ? 0 : 1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.round(n).toLocaleString("en-US");
  if (i.kind === "usd") return v >= 1e6 ? `$${big(v)}` : `$${Math.round(v).toLocaleString("en-US")}`;
  return big(v);
}
// Rates change in percentage points; amounts change in percent.
function fmtChange(i: Indicator) {
  if (i.prev === undefined || i.prev === 0) return null;
  const d = i.kind === "rate" ? i.value - i.prev : ((i.value - i.prev) / Math.abs(i.prev)) * 100;
  const n = Math.abs(d) < 0.1 ? d.toFixed(2) : d.toFixed(1); // small moves (e.g. population) need two decimals
  const text = `${d >= 0 ? "+" : ""}${n}${i.kind === "rate" ? " pp" : "%"}`;
  return { up: d >= 0, text };
}

// World Bank key figures for one market, laid out like a market ticker.
function IndicatorStrip({ country }: { country: string }) {
  const m = marketFor(country);
  const [data, setData] = useState<Indicator[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: false });
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!m) return;
    const key = `wd.ind.${m.iso3}.${iso(new Date())}`;
    const cached = load<Indicator[] | null>(key, null);
    if (cached) { setData(cached); return; }
    fetch(`/api/indicators?iso=${m.iso3}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { indicators: Indicator[] }) => { setData(j.indicators); save(key, j.indicators); })
      .catch(() => setFailed(true));
  }, [m]);

  const measure = () => {
    const el = rail.current;
    if (el) setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [data]);
  const nudge = (dir: number) => rail.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  if (!m || failed) return null;
  const wbLink = `https://data.worldbank.org/country/${m.code === "UK" ? "GB" : m.code}`;
  return (
    <section className="tk" aria-label={`${country} key figures from the World Bank`}>
      <div className="tk-rail" ref={rail} onScroll={measure}>
        {!data
          ? [0, 1, 2, 3].map((i) => <span key={i} className="tk-item skel" style={{ width: 170, height: 18 }} />)
          : data.map((i) => {
              const ch = fmtChange(i);
              return (
                <div key={i.code} className="tk-item" title={ch ? `${i.label}: ${i.year} vs ${i.prevYear} (World Bank)` : `${i.label}: ${i.year} (World Bank)`}>
                  <span className="tk-label">{i.label}</span>
                  <b className="tk-value">{fmtValue(i)}</b>
                  {ch && <span className={`tk-change ${ch.up ? "up" : "down"}`}>{ch.text} <span aria-hidden="true">{ch.up ? "↑" : "↓"}</span></span>}
                </div>
              );
            })}
        <a className="tk-src" href={wbLink} target="_blank" rel="noopener noreferrer">World Bank ↗</a>
      </div>
      <div className="tk-nav">
        <button onClick={() => nudge(-1)} disabled={!edges.left} aria-label="Scroll key figures left">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button onClick={() => nudge(1)} disabled={!edges.right} aria-label="Scroll key figures right">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    </section>
  );
}

function BriefingView({ profile, demo, initialView, onEdit, onHome, onLogout, onExitDemo }: {
  profile: Profile; demo: boolean; initialView: View; onEdit: (s: Step) => void; onHome: () => void; onLogout: () => void; onExitDemo: () => void;
}) {
  const legs = useMemo(() => legsFor(profile.markets), [profile.markets]);
  // No topics chosen means no restriction: offer every topic as a filter.
  const topicList = profile.topics.length ? profile.topics : TOPICS;
  const [view, setView] = useState<View>(initialView);
  const [filter, setFilter] = useState("top");
  const [feeds, setFeeds] = useState<Record<string, Feed>>({});
  // Loading is tracked per market AND per filter, so one slow request never blocks another.
  const [busy, setBusy] = useState<Record<string, number>>({}); // "legId|filter" -> startedAt
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [notice, setNotice] = useState<Record<string, string | undefined>>({});
  const [alerts, setAlerts] = useState<Alerts>(() => ({ ...ALERT_DEFAULT, ...load<Partial<Alerts>>("wd.alerts", {}) }));
  const [alertMsg, setAlertMsg] = useState("");
  const [saved, setSaved] = useState<Article[]>(() => load<Article[]>("wd.saved", []));
  // Natural width of each story image, measured in the browser; only sharp images (>= 960px) can lead a view.
  const [imgWidth, setImgWidth] = useState<Record<string, number>>({});
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
    `wd.feed3.${leg.country}.${profile.industry}.${profile.func}.${profile.company}.${profile.topics.join(",")}.${iso(new Date())}`;
  const bkey = (leg: Leg, f: string) => `${leg.id}|${f}`;

  const fetchMore = async (leg: Leg, f: string, reset = false, preloadTopics = false) => {
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
        const added = json.articles.filter((a) => !urls.has(a.url)).map((a) => ({ ...a, origin: f, country: leg.country }));
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
      if (f === "top" && preloadTopics) {
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

  // Use today's cached feed for a market if there is one; true when nothing needs fetching.
  const fromCache = (l: Leg) => {
    if (feedsRef.current[l.id]) return true;
    const cached = load<Feed | null>(cacheKey(l), null);
    if (!cached) return false;
    feedsRef.current = { ...feedsRef.current, [l.id]: cached };
    setFeeds((all) => ({ ...all, [l.id]: cached }));
    return true;
  };
  // A market view also preloads the reader's topics, so topic taps there are instant.
  const openMarket = (l: Leg) => {
    if (fromCache(l)) {
      const f = feedsRef.current[l.id];
      profile.topics.filter((t) => !f?.fetched.includes(t)).forEach((t) => fetchMore(l, t));
    } else fetchMore(l, "top", false, true);
  };
  // All markets loads every market's top stories, at most POOL searches at a time.
  const loadAll = async () => {
    const todo = legs.filter((l) => !fromCache(l));
    let i = 0;
    const worker = async () => { while (i < todo.length) await fetchMore(todo[i++], "top"); };
    await Promise.all(Array.from({ length: Math.min(POOL, todo.length) }, worker));
  };

  const go = (v: View) => {
    setView(v);
    setFilter("top");
    window.scrollTo(0, 0);
    const l = legs.find((x) => x.id === v);
    if (l) openMarket(l);
  };
  // All markets searches only when that view is on screen (not, e.g., when returning to Settings).
  useEffect(() => { if (view === "all") loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [view]);

  useEffect(() => {
    const pending = [...new Set(Object.values(feeds).flatMap((f) => f.articles.map((a) => a.image)).filter((u): u is string => !!u && !(u in imgWidth)))];
    pending.forEach((u) => {
      const im = new Image();
      im.referrerPolicy = "no-referrer";
      im.onload = () => setImgWidth((w) => ({ ...w, [u]: im.naturalWidth }));
      im.onerror = () => setImgWidth((w) => ({ ...w, [u]: 0 }));
      im.src = u;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeds]);
  const LEAD_MIN_WIDTH = 960;

  const isNew = (url: string) => seenBefore.current.size > 0 && !seenBefore.current.has(url);
  const isSaved = (url: string) => saved.some((s) => s.url === url);
  const toggleSave = (a: Article) => {
    const next = isSaved(a.url) ? saved.filter((s) => s.url !== a.url) : [{ ...a }, ...saved];
    setSaved(next);
    save("wd.saved", next);
  };

  const saveAlerts = (next: Alerts) => { setAlerts(next); save("wd.alerts", next); };
  const firstStory = legs.map((l) => feeds[l.id]?.articles[0]).find(Boolean);
  // Push notification: readable on its own; tapping it opens the market and scrolls to the story.
  const notify = (a: Article | undefined) => {
    const country = a?.country ?? legs[0]?.country ?? "Worldesk";
    const n = new Notification(`${country} · today's briefing`, {
      body: a ? `${a.outlet}: ${a.english_headline}\n${a.why_it_matters}`.slice(0, 220) : `Your ${country} briefing is ready.`,
      tag: `worldesk-${country}`,
    });
    n.onclick = () => {
      window.focus();
      go(country);
      setTimeout(() => {
        const el = a && document.querySelector(`[data-url="${CSS.escape(a.url)}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
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
    notify(firstStory);
    setAlertMsg("Alerts on. We just sent you a sample.");
  };
  const testAlert = async () => {
    if (!(await permission())) return;
    notify(firstStory);
    setAlertMsg("Test alert sent.");
  };

  const hour = new Date().getHours();
  const greeting = `Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, ${profile.name.split(" ")[0] || "there"}`;
  const leg = legs.find((l) => l.id === view);
  const market = leg ? marketFor(leg.country) : undefined;
  const loadingMarkets = legs.filter((l) => busy[bkey(l, "top")]);

  // The lead is the highest-ranked story with a sharp, real image; it moves to the top. No such image, no lead.
  const renderCards = (list: Article[], withLead = true) => {
    const lead = withLead ? list.find((a) => a.image && (imgWidth[a.image] ?? 0) >= LEAD_MIN_WIDTH) : undefined;
    const ordered = lead ? [lead, ...list.filter((a) => a !== lead)] : list;
    return ordered.map((a) => (
      <StoryCard key={a.url} a={a} lead={a === lead} isNew={isNew(a.url)} saved={isSaved(a.url)} onSave={() => toggleSave(a)}
        onTag={(t) => { if (topicList.includes(t)) setFilter(t); }} />
    ));
  };
  const Chips = ({ onPick, counts }: { onPick: (t: string) => void; counts: (t: string) => number }) => (
    <div className="filters" role="tablist" aria-label="Filter stories">
      <button role="tab" aria-selected={filter === "top"} className={`chip ${filter === "top" ? "on" : ""}`} onClick={() => onPick("top")}>Top stories</button>
      {topicList.map((t) => {
        const loadingT = !!(leg && busy[bkey(leg, t)]);
        return (
          <button key={t} role="tab" aria-selected={filter === t} className={`chip ${filter === t ? "on" : ""}`} onClick={() => onPick(t)}>
            {t}{loadingT ? <span className="spin" aria-label="loading" /> : counts(t) > 0 && <span className="count">{counts(t)}</span>}
          </button>
        );
      })}
    </div>
  );

  let body: React.ReactNode;
  if (view === "all") {
    const merged = legs
      .flatMap((l) => (feeds[l.id]?.articles ?? []).filter((a) => a.origin === "top").map((a) => ({ ...a, country: l.country })))
      .sort((x, y) => (y.date || "").localeCompare(x.date || ""));
    const visible = filter === "top" ? merged : merged.filter((a) => a.category === filter);
    const firstLoading = loadingMarkets[0];
    body = (
      <>
        <header className="bf-head">
          <div className="kicker">{greeting}</div>
          <h1>All markets</h1>
          <p>{legs.length} selected {legs.length === 1 ? "market" : "markets"} · Latest developments
            {loadingMarkets.length > 0 && <> · <span className="spin" aria-hidden="true" /> Loading {loadingMarkets.map((l) => l.country).join(", ")}</>}
          </p>
        </header>
        <section className="summary">
          <div className="summary-label">This week across your markets</div>
          <ul className="summary-rows">
            {legs.map((l) => {
              const f = feeds[l.id];
              const err = errors[bkey(l, "top")];
              return (
                <li key={l.id}>
                  <button onClick={() => go(l.id)}>{marketFor(l.country)?.code}</button>
                  <span>{f?.note || (err ? `Couldn't load ${l.country} (${err}).` : busy[bkey(l, "top")] ? `Reading ${l.country}'s local press…` : "Waiting to load…")}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <Chips onPick={setFilter} counts={(t) => merged.filter((a) => a.category === t).length} />
        {merged.length === 0 && firstLoading && (
          <Progress startedAt={busy[bkey(firstLoading, "top")]} leg={firstLoading} profile={profile} />
        )}
        {merged.length > 0 && visible.length === 0 && <p className="muted bf-empty">No {filter} stories in your markets yet. Open a market to search for more.</p>}
        {renderCards(visible)}
        {merged.length > 0 && <p className="small muted bf-more">Open a market on the left for topic deep-dives and more stories.</p>}
      </>
    );
  } else if (leg && market) {
    const feed = feeds[leg.id];
    const k = bkey(leg, filter);
    const startedAt = busy[k];
    const error = errors[k];
    const mine = (feed?.articles ?? []).map((a) => ({ ...a, country: leg.country }));
    const visible = mine.filter((a) => (filter === "top" ? a.origin === "top" : a.category === filter));
    const newCount = mine.filter((a) => isNew(a.url)).length;
    const pick = (f: string) => {
      setFilter(f);
      if (f !== "top" && !(feed?.fetched.includes(f)) && !busy[bkey(leg, f)]) fetchMore(leg, f);
    };
    body = (
      <>
        <header className="bf-head">
          <div className="kicker">Business news · {leg.city}</div>
          <h1>{leg.country}</h1>
          <p>
            Read in {market.language} from {market.outlets.map((o) => o.name).join(", ")}
            {feed?.updatedAt && <> · Updated {new Date(feed.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>}
            {newCount > 0 && lastVisit.current && (
              <> · <b className="new-count">{newCount} new since {new Date(lastVisit.current).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</b></>
            )}
            {" · "}
            <button className="btn link small" style={{ padding: 0, fontSize: 13 }} disabled={!!busy[bkey(leg, "top")]}
              onClick={() => { setFilter("top"); fetchMore(leg, "top", true); }}>Refresh</button>
          </p>
        </header>
        <IndicatorStrip country={leg.country} />
        {feed?.source === "sample" && (
          <div className="banner">Sample mode: no API key is configured, so these are placeholders. Live mode pulls real articles.</div>
        )}
        {feed?.note && (
          <section className="summary">
            <div className="summary-label">This week in {leg.country}</div>
            <p>{feed.note}</p>
          </section>
        )}
        <Chips onPick={pick} counts={(t) => mine.filter((a) => a.category === t).length} />
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
          <p className="muted bf-empty">No {filter === "top" ? "" : filter + " "}stories from our {leg.country} outlets yet. Try &quot;Load more&quot;.</p>
        )}
        {renderCards(visible)}
        {notice[k] && <p className="small muted" style={{ textAlign: "center", marginTop: 16 }}>{notice[k]}</p>}
        {feed && visible.length > 0 && (
          <div className="more">
            {startedAt ? (
              <Progress startedAt={startedAt} leg={leg} profile={profile} topic={filter === "top" ? undefined : filter} compact />
            ) : (
              <button className="btn ghost" onClick={() => fetchMore(leg, filter)}>Load 5 more {filter === "top" ? "stories" : filter}</button>
            )}
          </div>
        )}
      </>
    );
  } else if (view === "saved") {
    body = (
      <>
        <header className="bf-head">
          <div className="kicker">Your library</div>
          <h1>Saved stories</h1>
          <p>{saved.length ? `${saved.length} saved ${saved.length === 1 ? "story" : "stories"}, newest first. Kept in this browser.` : "Tap the bookmark on any story to keep it here."}</p>
        </header>
        {renderCards(saved, false)}
      </>
    );
  } else {
    const rows: [string, string][] = [
      ["Name", profile.name], ["Email", profile.email || "—"], ["Job title", profile.title],
      ["Company", profile.company || "—"], ["Industry", profile.industry], ["Function", profile.func],
      ["Markets", profile.markets.join(", ")], ["Topics", profile.topics.join(", ") || "All topics"],
    ];
    body = (
      <>
        <header className="bf-head">
          <div className="kicker">Your account</div>
          <h1>Settings</h1>
          <p>What your briefing is tuned to, and how it reaches you.</p>
        </header>
        <section className="set-card">
          <h2>Profile</h2>
          <dl className="set-rows">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {demo ? <p className="small muted">This is the sample executive, so editing is off.</p> : (
            <div className="row">
              <button className="btn ghost small-btn" onClick={() => onEdit("about")}>Edit profile</button>
              <button className="btn ghost small-btn" onClick={() => onEdit("markets")}>Edit markets</button>
              <button className="btn ghost small-btn" onClick={() => onEdit("topics")}>Edit topics</button>
            </div>
          )}
        </section>
        <section className="set-card">
          <h2>Push alerts</h2>
          {!alerts.push ? (
            <div className="alert-row">
              <div className="small muted">A morning push with your top story, plus breaking news on your topics.</div>
              <button className="btn small-btn" onClick={turnOn}>Turn on alerts</button>
            </div>
          ) : (
            <>
              <div className="field" style={{ maxWidth: 220 }}>
                <label htmlFor="al-time">Daily briefing time</label>
                <select id="al-time" value={alerts.time} onChange={(e) => saveAlerts({ ...alerts, time: e.target.value })}>
                  {["06:00", "06:30", "07:00", "07:30", "08:00", "12:00", "18:00"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <label className="check">
                <input type="checkbox" checked={alerts.breaking} onChange={(e) => saveAlerts({ ...alerts, breaking: e.target.checked })} />
                <span>Breaking alerts, only for {topicList.join(", ")}</span>
              </label>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn ghost small-btn" onClick={testAlert}>Send test alert</button>
                <button className="btn link small" onClick={() => { saveAlerts({ ...alerts, push: false }); setAlertMsg(""); }}>Turn off</button>
              </div>
            </>
          )}
          {alertMsg && <p className="small muted" style={{ margin: "8px 0 0" }}>{alertMsg}</p>}
          <p className="small muted" style={{ marginBottom: 0 }}>
            Prototype: scheduled daily and breaking pushes aren&apos;t connected yet. Test alerts are real notifications; tap one to jump to the story.
          </p>
        </section>
      </>
    );
  }

  return (
    <div className="bf">
      <aside className="sb">
        <button className="wordmark sb-brand" onClick={onHome}>Worl<span>desk</span></button>
        <nav className="sb-nav" aria-label="Briefing">
          <div className="sb-label">Briefing</div>
          <button className={`sb-item ${view === "all" ? "on" : ""}`} aria-current={view === "all"} onClick={() => go("all")}>
            <span className="sb-dot" aria-hidden="true" />All markets
          </button>
          <div className="sb-label">Selected markets</div>
          {legs.map((l) => {
            const n = feeds[l.id]?.articles.length ?? 0;
            return (
              <button key={l.id} className={`sb-item ${view === l.id ? "on" : ""}`} aria-current={view === l.id} onClick={() => go(l.id)}>
                <span className="sb-code">{marketFor(l.country)?.code}</span>
                <span className="sb-name">{l.country}</span>
                {busy[bkey(l, "top")] ? <span className="spin" aria-label="loading" /> : n > 0 && <span className="sb-n">{n}</span>}
              </button>
            );
          })}
        </nav>
        <div className="sb-foot">
          <button className={`sb-item ${view === "saved" ? "on" : ""}`} onClick={() => go("saved")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>Saved stories
            {saved.length > 0 && <span className="sb-n">{saved.length}</span>}
          </button>
          <button className={`sb-item ${view === "settings" ? "on" : ""}`} onClick={() => go("settings")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>Settings
          </button>
          <button className="sb-item" onClick={demo ? onExitDemo : onLogout}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            {demo ? "Exit sample" : "Log out"}
          </button>
        </div>
      </aside>
      <main className="bf-main">
        <div className="bf-col">
          {body}
          <footer className="foot">
            Worldesk prototype · Stories are selected and translated by AI from a fixed list of local outlets. Always check the original before you quote it.
          </footer>
        </div>
      </main>
    </div>
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
