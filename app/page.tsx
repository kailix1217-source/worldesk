"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ONBOARD_MARKETS, marketFor } from "@/lib/sources";
import { DEMO_PROFILE } from "@/lib/demo";
import { authClient } from "@/lib/auth/client";
import { flushNow, markStoriesLoaded, setTracking, track, watchActiveTime } from "@/lib/track";
import { DOTS, PINS, WORLD } from "@/lib/worldDots";
import { Survey, useSurveyDone } from "./survey";
import {
  FUNCTIONS, INDUSTRIES, KEYWORD_SUGGESTIONS, MAX_KEYWORDS, TOPICS,
  type Article, type Briefing, type Leg, type Profile,
} from "@/lib/types";

type Step = "welcome" | "account" | "about" | "markets" | "topics" | "briefing";
const ONBOARDING: Step[] = ["account", "about", "markets", "topics"];

const EMPTY_PROFILE: Profile = {
  name: "", email: "", title: "", company: "", industry: "", func: "", markets: [], topics: [], keywords: [],
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (d: string) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";


function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

// Profiles saved by the trip-based version have no markets: derive them from the old trip stops.
function loadProfile(): Profile {
  const stored = load<Partial<Profile>>("wd.profile", {});
  const p: Profile = { ...EMPTY_PROFILE, ...stored, markets: stored.markets ?? [], topics: stored.topics ?? [], keywords: stored.keywords ?? [] };
  if (!p.markets.length) {
    const legs = load<Leg[]>("wd.legs", []);
    const offered = new Set(ONBOARD_MARKETS.map((m) => m.country));
    p.markets = [...new Set(legs.map((l) => l.country).filter((c) => offered.has(c)))];
  }
  return p;
}

// Onboarding time starts at "Set up my briefing". The browser holds the start time and only sends
// the total once the reader has signed in and finished, so signed-out visitors aren't tracked.
const SESSION_TIMEOUT_MS = 10_000;
const OB_CLOCK = "wd.ob.start";
const OB_CLOCK_MAX_MS = 24 * 3600_000;
const startOnboardingClock = () => {
  const started = load<number | null>(OB_CLOCK, null);
  if (!started || Date.now() - started > OB_CLOCK_MAX_MS) save(OB_CLOCK, Date.now());
};
const clearOnboardingClock = () => { try { localStorage.removeItem(OB_CLOCK); } catch { /* storage unavailable */ } };
const stepDone = (step: string) => { if (load<number | null>(OB_CLOCK, null)) track("step_complete", { step }); };
const finishOnboarding = () => {
  const started = load<number | null>(OB_CLOCK, null);
  if (started) track("onboarding_complete", { seconds: (Date.now() - started) / 1000 });
  clearOnboardingClock();
};

// Saves part of a signed-in reader's data to their account. Failures are quiet: the browser still has it.
const syncAccount = (part: { profile?: Profile; saved?: Article[]; alerts?: unknown }) => {
  fetch("/api/account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(part), keepalive: true }).catch(() => {});
};

// The briefing is organised by market; each market is searched through its business hub.
const legsFor = (markets: string[]): Leg[] =>
  markets.map((c) => marketFor(c)).filter((m): m is NonNullable<typeof m> => !!m)
    .map((m) => ({ id: m.country, city: m.hub, country: m.country, arrive: "", depart: "" }));

export default function Home() {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("welcome");
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [accountError, setAccountError] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [demo, setDemo] = useState(false); // the sample executive never overwrites the user's own account
  // Editing from Settings reuses a setup screen as a single-step editor, then returns to Settings.
  const [editFrom, setEditFrom] = useState<Profile | null>(null);
  const [briefView, setBriefView] = useState<View>("all");

  // On load: is there a Google session? If so, open the reader's Worldesk account (created on the first visit).
  const started = useRef(false); // React's development mode runs effects twice; sign-in must only run once
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const local = loadProfile();
      setProfile(local);
      const params = new URLSearchParams(window.location.search);
      const justSignedIn = params.has("signedIn");
      const signInError = params.get("error");
      const token = params.get("reset") ? params.get("token") : null;
      // Neon finishes the Google sign-in from a one-time value in the address, so tidy the address only after this.
      // A session check that never answers must not leave the reader on a blank page.
      const noSession = new Promise<{ data: null }>((r) => setTimeout(() => r({ data: null }), SESSION_TIMEOUT_MS));
      const { data } = await Promise.race([authClient.getSession().catch(() => ({ data: null })), noSession]);
      if (justSignedIn || signInError || params.has("reset")) window.history.replaceState(null, "", "/");
      if (token) { setResetToken(token); setStep("account"); }
      const user = data?.user;
      if ((justSignedIn || signInError) && !user) {
        setAccountError(signInError === "account_not_linked"
          ? "That email already has a Worldesk account. Sign in with the button you used before."
          : "We couldn't finish signing you in. Please try again.");
        setStep("account");
      }
      if (user) {
        const email = user.email.toLowerCase();
        // A profile set up in this browser before accounts existed moves into the account if the email matches.
        const carried = local.email === email ? { profile: local, saved: load("wd.saved", []), alerts: load("wd.alerts", null) } : {};
        const res = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(carried) }).catch(() => null);
        const json = await res?.json().catch(() => null);
        if (res?.ok && json) {
          const p: Profile = { ...EMPTY_PROFILE, ...json.profile, name: json.profile?.name || user.name || "", email };
          setProfile(p);
          save("wd.saved", json.saved ?? []);
          save("wd.alerts", json.alerts ?? {});
          setSignedIn(true);
          setTracking(true);
          if (justSignedIn) {
            track("signed_in", { created: !!json.created });
            if (p.industry && p.func && p.markets.length) { clearOnboardingClock(); openBriefing(); } else setStep("about");
          }
        } else {
          if (res?.status === 403) await authClient.signOut().catch(() => {}); // today's new accounts are used up
          setAccountError(json?.error || "We couldn't open your account. Please try again.");
          setStep("account");
        }
      }
    })().catch((e) => console.error("account load failed", e)).finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (ready) save("wd.profile", profile); }, [ready, profile]);
  useEffect(() => { if (ready) setTracking(signedIn && !demo); }, [ready, signedIn, demo]);
  // Keep the account's copy of the profile up to date, a moment after the last change.
  useEffect(() => {
    if (!ready || !signedIn) return;
    const t = setTimeout(() => syncAccount({ profile }), 800);
    return () => clearTimeout(t);
  }, [ready, signedIn, profile]);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const openBriefing = (view: View = "all") => { setBriefView(view); setStep("briefing"); };
  const startDemo = () => { setDemo(true); openBriefing(); };
  const startEdit = (s: Step) => { setEditFrom(profile); setStep(s); };
  const saveEdit = () => { setEditFrom(null); openBriefing("settings"); };
  const cancelEdit = () => { if (editFrom) setProfile(editFrom); setEditFrom(null); openBriefing("settings"); };
  const switchAccount = async () => { await logOut(); setStep("account"); };
  const sessionLost = () => { setSignedIn(false); setAccountError("Please sign in again to load your briefing."); setStep("account"); };
  const exitDemo = () => { setDemo(false); setStep("welcome"); };
  // Signing out leaves nothing personal behind, in case the computer is shared.
  const logOut = async () => {
    track("logout");
    await flushNow();
    setTracking(false);
    await authClient.signOut().catch(() => {});
    try {
      Object.keys(localStorage).filter((k) => k.startsWith("wd.") && !k.startsWith("wd.ind.")).forEach((k) => localStorage.removeItem(k));
    } catch { /* storage unavailable */ }
    setProfile(EMPTY_PROFILE);
    setSignedIn(false);
    setStep("welcome");
  };

  if (!ready) return null;
  const returning = !!(signedIn && profile.industry && profile.func && profile.markets.length);

  if (step === "welcome") {
    return (
      <Welcome
        returning={returning} name={profile.name.split(" ")[0]}
        onStart={() => { if (!returning) startOnboardingClock(); setStep("account"); }} onOpen={() => openBriefing()}
        onEdit={() => setStep("about")} onDemo={startDemo}
      />
    );
  }

  if (step === "briefing") {
    return (
      <BriefingView key={demo ? "demo" : profile.markets.join(",")} profile={demo ? DEMO_PROFILE : profile} demo={demo}
        initialView={briefView} onEdit={startEdit} onHome={() => setStep("welcome")} onLogout={logOut} onExitDemo={exitDemo} onSessionLost={sessionLost} />
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
        <AccountStep error={accountError} email={signedIn ? profile.email : ""} resetToken={resetToken} onContinue={() => setStep("about")} onSwitch={switchAccount} />
      )}
      {step === "about" && (
        <AboutStep profile={profile} setProfile={setProfile} edit={edit} onBack={() => setStep("account")} onNext={() => { stepDone("about"); setStep("markets"); }} />
      )}
      {step === "markets" && (
        <MarketsStep profile={profile} setProfile={setProfile} edit={edit} onBack={() => setStep("about")} onNext={() => { stepDone("markets"); setStep("topics"); }} />
      )}
      {step === "topics" && (
        <TopicsStep profile={profile} setProfile={setProfile} edit={edit} onBack={() => setStep("markets")} onNext={() => { stepDone("topics"); finishOnboarding(); openBriefing(); }} />
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
        <h1 className="ld-title">Know your markets like a local.</h1>
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
              <a href="/privacy">Privacy</a>
            </div>
          </>
        ) : (
          <>
            <button className="ld-cta" onClick={onStart}>SET UP MY BRIEFING <span aria-hidden="true">→</span></button>
            <div className="ld-links">
              <button onClick={onDemo}>See a sample executive</button>
              <a href="/privacy">Privacy</a>
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
        <div className="bb-tag">Know your markets like a local.</div>
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

// Readers sign in with Google, or with an email and password. Google's button creates an account or logs back in;
// the form below it switches between creating an account, logging in and resetting a password.
// Step 1 always shows, so a reader who is already signed in can see which account they're using.
const SHORT_PASSWORD = "Use at least 8 characters.";
// Neon's client can rename the server's error codes (USER_ALREADY_EXISTS becomes user_already_exists),
// so match on the code in any case and fall back to the server's message.
const authMessage = (e: { code?: string; status?: number; message?: string }) => {
  const code = (e.code ?? "").toUpperCase();
  const text = (e.message ?? "").toLowerCase();
  if (code.includes("ALREADY_EXISTS") || text.includes("already exists")) return "That email already has an account. Log in instead, or use Google if you signed up that way.";
  if (code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_CREDENTIALS" || text.includes("invalid email or password")) return "That email or password isn't right. If you signed up with Google, use the Google button.";
  if (code === "PASSWORD_TOO_SHORT" || code === "WEAK_PASSWORD") return SHORT_PASSWORD;
  if (code === "INVALID_TOKEN" || code === "BAD_JWT") return "That reset link has expired. Request a new one.";
  if (e.status === 429 || code === "OVER_REQUEST_RATE_LIMIT") return "Too many attempts. Wait a minute and try again.";
  return "That didn't work. Please try again.";
};

function AccountStep({ error, email, resetToken, onContinue, onSwitch }: {
  error: string; email: string; resetToken: string; onContinue: () => void; onSwitch: () => void;
}) {
  const [mode, setMode] = useState<"create" | "login" | "forgot" | "reset">(resetToken ? "reset" : "create");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [notice, setNotice] = useState("");
  const google = async () => {
    setBusy(true);
    setFailed("");
    const { error: e } = await authClient.signIn.social({ provider: "google", callbackURL: "/?signedIn=1", errorCallbackURL: "/" })
      .catch(() => ({ error: { message: "" } }));
    if (e) { setFailed("We couldn't reach Google. Please try again."); setBusy(false); }
  };
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFailed("");
    setNotice("");
    const addr = address.trim().toLowerCase();
    if (mode !== "reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) { setFailed("Enter a valid email address."); return; }
    if (mode === "create" && !name.trim()) { setFailed("Enter your name."); return; }
    if (mode !== "forgot" && password.length < 8) { setFailed(SHORT_PASSWORD); return; }
    setBusy(true);
    // Neon's client throws on an error response instead of returning it.
    const thrown = (x: unknown) => ({ error: x as { code?: string; status?: number; message?: string } });
    if (mode === "forgot") {
      const { error: e } = await authClient.requestPasswordReset({ email: addr, redirectTo: "/?reset=1" }).catch(thrown);
      setBusy(false);
      if (e) setFailed(authMessage(e)); else setNotice("If that email has an account, a reset link is on its way. Check your spam folder too.");
      return;
    }
    if (mode === "reset") {
      const { error: e } = await authClient.resetPassword({ newPassword: password, token: resetToken }).catch(thrown);
      setBusy(false);
      if (e) { setFailed(authMessage(e)); return; }
      setPassword("");
      setMode("login");
      setNotice("Password updated. Log in with your new password.");
      return;
    }
    const { error: e } = await (mode === "create"
      ? authClient.signUp.email({ email: addr, password, name: name.trim() })
      : authClient.signIn.email({ email: addr, password })).catch(thrown);
    if (e) { setFailed(authMessage(e)); setBusy(false); return; }
    window.location.assign("/?signedIn=1"); // the page opens the Worldesk account, or stops at the daily limit
  };
  const go = (m: typeof mode) => { setMode(m); setFailed(""); setNotice(""); };
  if (email) {
    return (
      <section className="ob ob-narrow">
        <StepHead n={1} center title="You're signed in" sub={email} />
        <div className="ob-form">
          <button className="btn ob-full" onClick={onContinue}>Continue</button>
        </div>
        <p className="ob-switch"><button className="btn link" onClick={onSwitch}>Use a different account</button></p>
      </section>
    );
  }
  const heading = mode === "create" ? "Create an account or sign in" : mode === "login" ? "Log in" : mode === "forgot" ? "Reset your password" : "Choose a new password";
  const action = mode === "create" ? "Create account" : mode === "login" ? "Log in" : mode === "forgot" ? "Send reset link" : "Save new password";
  return (
    <section className="ob ob-narrow">
      <StepHead n={1} center title={heading} sub="Set up your personalized briefing." />
      <div className="ob-form">
        {(failed || error) && <p className="field-err" role="alert">{failed || error}</p>}
        {notice && <p className="ob-notice" role="status">{notice}</p>}
        {(mode === "create" || mode === "login") && (
          <>
            <button className="btn ghost ob-full btn-google" disabled={busy} onClick={google}>
              <svg viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
          </svg>
              Continue with Google
            </button>
            <p className="ob-or" aria-hidden="true"><span>or use any email</span></p>
          </>
        )}
      </div>
      <form className="ob-form" onSubmit={submit} noValidate>
        {mode === "create" && (
          <div className="field">
            <label htmlFor="acc-name">Full name</label>
            <input id="acc-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
        )}
        {mode !== "reset" && (
          <div className="field">
            <label htmlFor="acc-email">Email</label>
            <input id="acc-email" type="email" autoComplete="email" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="you@example.com" />
          </div>
        )}
        {mode !== "forgot" && (
          <div className="field">
            <label htmlFor="acc-pw">{mode === "reset" ? "New password" : "Password"}</label>
            <input id="acc-pw" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
        )}
        <button type="submit" className="btn ob-full" disabled={busy}>{busy ? "One moment…" : action}</button>
      </form>
      <p className="ob-switch">
        {mode === "create" && <>Already have an account? <button className="btn link" onClick={() => go("login")}>Log in</button></>}
        {mode === "login" && <>
          <button className="btn link" onClick={() => go("forgot")}>Forgot password?</button>{" · "}
          <button className="btn link" onClick={() => go("create")}>Create an account</button>
        </>}
        {(mode === "forgot" || mode === "reset") && <button className="btn link" onClick={() => go("login")}>Back to log in</button>}
      </p>
      <p className="ob-note">With Google, Worldesk receives only your name, email and profile picture, and can&apos;t read your Gmail. <a href="/privacy">Privacy</a></p>
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

// Free-text keywords as removable chips: Enter or comma adds one, Backspace on an empty field removes the last.
function KeywordInput({ value, onChange, industry }: { value: string[]; onChange: (v: string[]) => void; industry: string }) {
  const [draft, setDraft] = useState("");
  const full = value.length >= MAX_KEYWORDS;
  // Adds one or many (a pasted "a, b, c" list) in a single update, skipping blanks and duplicates.
  const add = (...raws: string[]) => {
    const next = [...value];
    for (const raw of raws) {
      const k = raw.replace(/\s+/g, " ").trim().slice(0, 40);
      if (k && next.length < MAX_KEYWORDS && !next.some((v) => v.toLowerCase() === k.toLowerCase())) next.push(k);
    }
    if (next.length !== value.length) onChange(next);
  };
  const suggestions = (KEYWORD_SUGGESTIONS[industry] ?? []).filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <div className="field">
      <label htmlFor="ab-kw">Keywords to track (optional)</label>
      <div className="kw-box" onClick={() => document.getElementById("ab-kw")?.focus()}>
        {value.map((k) => (
          <span key={k} className="kw-chip">
            {k}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== k))} aria-label={`Remove ${k}`}>×</button>
          </span>
        ))}
        <input id="ab-kw" value={draft} disabled={full} maxLength={40}
          placeholder={full ? `Up to ${MAX_KEYWORDS} keywords` : value.length ? "Add another…" : "e.g. BYD, battery recycling, EU tariffs"}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) {
              const parts = v.split(",");
              const rest = parts.pop() ?? ""; // text after the last comma keeps being typed
              add(...parts);
              setDraft(rest.trimStart());
            } else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(draft); setDraft(""); }
            else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => { if (draft.trim()) { add(draft); setDraft(""); } }} />
      </div>
      <span className="kw-help">Companies, products, policies or people. Press Enter to add. We search for them in each market&apos;s language.</span>
      {suggestions.length > 0 && !full && (
        <div className="kw-suggest">
          <span>Suggested for {industry}:</span>
          {suggestions.map((s) => <button type="button" key={s} className="chip" onClick={() => add(s)}>+ {s}</button>)}
        </div>
      )}
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
        <KeywordInput value={profile.keywords ?? []} onChange={(v) => set("keywords", v)} industry={profile.industry} />
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
  const toggle = (via: "button" | "headline") => {
    if (!open) { track("story_open", { market: country, topic: a.category, outlet: a.outlet, via }); }
    setOpen((v) => !v);
  };
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
          {(a.keywords ?? []).map((k) => <span key={k} className="kw-hit" title="Matches a keyword you track">{k}</span>)}
          <b>{a.outlet}</b>
          {country && <><i aria-hidden="true">·</i><span>{country}</span></>}
          {lang && lang !== "English" && <><i aria-hidden="true">·</i><span>in {lang}</span></>}
        </div>
        <button className={`sc-save ${saved ? "on" : ""}`} onClick={onSave} aria-pressed={saved}
          aria-label={saved ? "Remove from saved stories" : "Save story"} title={saved ? "Saved" : "Save"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
        </button>
        <h3><button className="sc-head" onClick={() => toggle("headline")} aria-expanded={open}>{a.english_headline}</button></h3>
        <div className="why"><b>Why it matters to you</b>{a.why_it_matters}</div>
        {open && <p className="sc-sum">{a.summary}</p>}
      </div>
      <button className={`sc-toggle ${open ? "open" : ""}`} onClick={() => toggle("button")} aria-expanded={open}>
        {open ? "Hide summary" : "Read summary"}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <footer className="sc-foot">
        {a.date && <span className="sc-date">{relDate(a.date)}</span>}
        <div className="sc-links">
          {srcs.map((s) => (
            <a key={s.url} className="sc-link" href={s.url} target="_blank" rel="noopener noreferrer"
              onClick={() => track("source_click", { market: country, topic: a.category, outlet: s.outlet })}>View {s.outlet} ↗</a>
          ))}
        </div>
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

function BriefingView({ profile, demo, initialView, onEdit, onHome, onLogout, onExitDemo, onSessionLost }: {
  profile: Profile; demo: boolean; initialView: View; onEdit: (s: Step) => void; onHome: () => void; onLogout: () => void; onExitDemo: () => void; onSessionLost: () => void;
}) {
  const legs = useMemo(() => legsFor(profile.markets), [profile.markets]);
  // No topics chosen means no restriction: offer every topic as a filter.
  const topicList = profile.topics.length ? profile.topics : TOPICS;
  const [view, setView] = useState<View>(initialView);
  const [filter, setFilter] = useState("top");
  const [feeds, setFeeds] = useState<Record<string, Feed>>({});
  useEffect(() => {
    if (demo || storiesSeen.current || !Object.values(feeds).some((f) => f.articles.length)) return;
    storiesSeen.current = true;
    markStoriesLoaded((Date.now() - mountedAt.current) / 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeds]);
  // Loading is tracked per market AND per filter, so one slow request never blocks another.
  const [busy, setBusy] = useState<Record<string, number>>({}); // "legId|filter" -> startedAt
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [notice, setNotice] = useState<Record<string, string | undefined>>({});
  const [alerts, setAlerts] = useState<Alerts>(() => ({ ...ALERT_DEFAULT, ...load<Partial<Alerts>>("wd.alerts", {}) }));
  const [alertMsg, setAlertMsg] = useState("");
  const [saved, setSaved] = useState<Article[]>(() => load<Article[]>("wd.saved", []));
  // Feedback survey: stories opened this visit (an invitation trigger) and sidebar requests to open it.
  // Usage clock for the briefing: opened, how long stories took to appear, then time actually spent reading.
  const mountedAt = useRef(Date.now());
  const opened = useRef(false);
  const storiesSeen = useRef(false);
  useEffect(() => {
    if (demo) return;
    if (!opened.current) { opened.current = true; track("briefing_open", { view: String(initialView) }); }
    return watchActiveTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [surveyReq, setSurveyReq] = useState(0);
  const [surveyDone, setSurveyDone] = useSurveyDone(demo);
  // Size of each candidate picture, measured in the browser (0 = failed to load or blocked).
  const [imgSize, setImgSize] = useState<Record<string, { w: number; h: number }>>({});
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
    `wd.feed4.${leg.country}.${profile.industry}.${profile.func}.${profile.company}.${profile.topics.join(",")}.${(profile.keywords ?? []).join(",")}.${iso(new Date())}`;
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
          profile, leg, demo,
          count: f === "top" ? STORY_COUNT : 5,
          topic: f === "top" ? undefined : f,
          exclude: existing?.articles.map((a) => a.url) ?? [],
        }),
      });
      const json = (await res.json().catch(() => ({}))) as Briefing & { error?: string };
      if (res.status === 401) { onSessionLost(); return; }
      if (!res.ok) throw new Error(json.error || "The news search is temporarily unavailable.");
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
      const msg = (e as Error).name === "AbortError" ? "The search took too long."
        : e instanceof TypeError ? "We couldn't reach the news search. Check your connection." : (e as Error).message;
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
    if (l) { track("market_switch", { market: l.country }); openMarket(l); } else track("view_open", { view: String(v) });
  };
  // All markets searches only when that view is on screen (not, e.g., when returning to Settings).
  useEffect(() => { if (view === "all") loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [view]);

  useEffect(() => {
    const all = Object.values(feeds).flatMap((f) => f.articles.flatMap((a) => a.images ?? (a.image ? [a.image] : [])));
    [...new Set(all)].filter((u) => !(u in imgSize)).forEach((u) => {
      const im = new Image();
      im.referrerPolicy = "no-referrer";
      im.onload = () => setImgSize((m) => ({ ...m, [u]: { w: im.naturalWidth, h: im.naturalHeight } }));
      im.onerror = () => setImgSize((m) => ({ ...m, [u]: { w: 0, h: 0 } }));
      im.src = u;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeds]);
  // A lead picture must fill the 800px column and be landscape (rules out QR codes, logos and tall charts).
  const leadImage = (a: Article) =>
    (a.images ?? (a.image ? [a.image] : [])).find((u) => {
      const z = imgSize[u];
      return !!z && z.w >= 800 && z.w / z.h >= 1.2 && z.w / z.h <= 2.4;
    });

  const isNew = (url: string) => seenBefore.current.size > 0 && !seenBefore.current.has(url);
  const isSaved = (url: string) => saved.some((s) => s.url === url);
  const toggleSave = (a: Article) => {
    const next = isSaved(a.url) ? saved.filter((s) => s.url !== a.url) : [{ ...a }, ...saved];
    track(isSaved(a.url) ? "story_unsave" : "story_save", { market: a.country ?? "", topic: a.category, outlet: a.outlet });
    setSaved(next);
    save("wd.saved", next);
    if (!demo) syncAccount({ saved: next });
  };

  const saveAlerts = (next: Alerts) => { setAlerts(next); save("wd.alerts", next); if (!demo) syncAccount({ alerts: next }); track("alerts_change", { on: next.push }); };
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
    const lead = withLead ? list.find((a) => leadImage(a)) : undefined;
    const ordered = lead ? [lead, ...list.filter((a) => a !== lead)] : list;
    return ordered.map((a) => (
      <StoryCard key={a.url} a={a === lead ? { ...a, image: leadImage(a) } : a} lead={a === lead} isNew={isNew(a.url)} saved={isSaved(a.url)} onSave={() => toggleSave(a)}
        onTag={(t) => { if (topicList.includes(t)) { track("topic_filter", { topic: t }); setFilter(t); } }} />
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
                  <span>
                    {f?.note || (err ? `Couldn't load ${l.country}. ${err} ` : busy[bkey(l, "top")] ? `Reading ${l.country}'s local press…` : "Waiting to load…")}
                    {!f?.note && err && <button className="summary-retry" onClick={() => fetchMore(l, "top", false, true)}>Try again</button>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <Chips onPick={(t) => { track("topic_filter", { topic: t }); setFilter(t); }} counts={(t) => merged.filter((a) => a.category === t).length} />
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
      track("topic_filter", { topic: f, market: leg.country });
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
              onClick={() => { track("refresh", { market: leg.country }); setFilter("top"); fetchMore(leg, "top", true); }}>Refresh</button>
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
            Couldn&apos;t load stories. {error}{" "}
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
              <button className="btn ghost" onClick={() => { track("load_more", { market: leg.country, topic: filter }); fetchMore(leg, filter); }}>Load 5 more {filter === "top" ? "stories" : filter}</button>
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
      ["Keywords", (profile.keywords ?? []).join(", ") || "—"],
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
          <button className={`sb-item sb-feedback ${surveyDone ? "sent" : ""}`} onClick={() => { track("feedback_open"); setSurveyReq((n) => n + 1); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" /></svg>
            {surveyDone
              ? <span className="sb-fb">Feedback sent ✓<small>edit answers</small></span>
              : <span className="sb-fb">Give feedback<small>less than 2 min</small></span>}
          </button>
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
            Worldesk prototype · Stories are selected and translated by AI from a fixed list of local outlets. Always check the original before you quote it. <a href="/privacy">Privacy</a>
          </footer>
        </div>
      </main>
      <Survey profile={profile} demo={demo} storiesReady={Object.values(feeds).some((f) => f.articles.length > 0)} openReq={surveyReq} onDone={() => setSurveyDone(true)} />
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
