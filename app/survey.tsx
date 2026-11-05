"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import {
  EMPTY_ANSWERS, FEATURES, FREQUENCY, IDEA_MAX, PAY, QUESTIONS, RATING_ROWS,
  stepComplete, validEmail, type FeatureKey, type SurveyAnswers,
} from "@/lib/survey";

// After submitting, the browser keeps the response id, its edit token and a copy of the answers,
// so the reader can reopen and change them later from the sidebar.
type Meta = {
  status: "new" | "done"; invites: number; snoozeUntil?: number; sid?: string;
  responseId?: number; editToken?: string; submitted?: SurveyAnswers;
};
type Draft = { step: number; answers: SurveyAnswers; startedAt: number; edit?: boolean };
type Ui = "hidden" | "invite" | "panel" | "pill" | "thanks";

// The sample account keeps its own survey state, separate from the reader's real account.
const metaKey = (demo: boolean) => (demo ? "wd.survey.sample" : "wd.survey");
const draftKey = (demo: boolean) => `${metaKey(demo)}.draft`;
const MAX_INVITES = 2;
const SNOOZE_MS = 24 * 3600_000;
const INVITE_AFTER_MS = 15_000;
const STEPS = 5;
// Rough seconds each step takes, for the "time left" line under the progress bar.
const STEP_SECONDS = [30, 35, 8, 8, 20];

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

const timeLeft = (step: number) => {
  const s = STEP_SECONDS.slice(step).reduce((a, b) => a + b, 0);
  return step === STEPS - 1 ? "Last step" : s > 60 ? "Less than 2 min left" : s > 30 ? "Under a minute left" : "Under 30 seconds left";
};

export function useSurveyDone(demo: boolean) {
  const [done, setDone] = useState(false);
  useEffect(() => { setDone(load<Meta>(metaKey(demo), { status: "new", invites: 0 }).status === "done"); }, [demo]);
  return [done, setDone] as const;
}

// Invitation card, survey panel and minimized pill. The briefing stays usable the whole time.
export function Survey({ profile, demo, storiesReady, openReq, onDone }: {
  profile: Profile; demo: boolean; storiesReady: boolean; openReq: number; onDone: () => void;
}) {
  const [ui, setUi] = useState<Ui>("hidden");
  const [meta, setMeta] = useState<Meta>({ status: "new", invites: 0 });
  const [draft, setDraft] = useState<Draft>({ step: 0, answers: EMPTY_ANSWERS, startedAt: 0 });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [trap, setTrap] = useState("");
  const browsedMs = useRef(0);
  const [loaded, setLoaded] = useState(false);

  const sid = () => meta.sid ?? "";
  const track = (type: string, step?: number) => {
    fetch("/api/survey/event", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ type, step, session: sid(), demo }),
    }).catch(() => {});
  };
  const META = metaKey(demo), DRAFT = draftKey(demo);
  const updateMeta = (m: Meta) => { setMeta(m); save(META, m); };
  // Functional updates, so quick successive taps never overwrite each other with a stale draft.
  const updateDraft = (f: (d: Draft) => Draft) => setDraft((d) => { const n = f(d); save(DRAFT, n); return n; });

  // Restore: a half-finished survey comes back as the resume pill, never as a new invitation.
  useEffect(() => {
    const m = load<Meta>(META, { status: "new", invites: 0 });
    if (!m.sid) { m.sid = crypto.randomUUID?.() ?? String(Math.random()).slice(2); save(META, m); }
    setMeta(m);
    const d = load<Draft | null>(DRAFT, null);
    if (d && m.status !== "done") { setDraft(d); setUi("pill"); }
    else if (d) save(DRAFT, null); // an unsaved edit is dropped on reload
    // A signed-in reader's answers live with their account, so they show on any device.
    if (!demo) {
      fetch("/api/survey").then((r) => (r.ok ? r.json() : null)).then((j) => {
        if (!j?.submitted) return;
        const next = { ...m, status: "done" as const, submitted: j.submitted };
        setMeta(next); save(META, next); save(DRAFT, null); setUi("hidden"); onDone();
      }).catch(() => {}).finally(() => setLoaded(true));
    } else setLoaded(true);
  }, []);

  // The clock runs only while stories are showing and the page is on screen. First searches can take up to a
  // minute, and readers can't rate a briefing they haven't seen; a tab left in the background doesn't count either.
  useEffect(() => {
    if (!storiesReady) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") browsedMs.current += 1000; }, 1000);
    return () => clearInterval(t);
  }, [storiesReady]);

  // Invite after 15 seconds with stories on screen,
  // never while a story is expanded, once per session, at most twice in total.
  useEffect(() => {
    const check = () => {
      if (!loaded || ui !== "hidden" || meta.status === "done" || meta.invites >= MAX_INVITES) return;
      if (meta.snoozeUntil && Date.now() < meta.snoozeUntil) return;
      try { if (sessionStorage.getItem("wd.survey.asked")) return; } catch { /* ignore */ }
      if (browsedMs.current < INVITE_AFTER_MS) return;
      if (document.querySelector(".sc-toggle.open")) return;
      try { sessionStorage.setItem("wd.survey.asked", "1"); } catch { /* ignore */ }
      updateMeta({ ...meta, invites: meta.invites + 1 });
      setUi("invite");
      track("invite_shown");
    };
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, ui, meta]);

  // Sidebar "Give feedback" opens the panel directly; after submitting, it reopens the answers for editing.
  useEffect(() => {
    if (openReq <= 0) return;
    if (meta.status !== "done") start();
    else if (meta.submitted && (!demo || meta.editToken)) startEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openReq]);

  // Wide screens make room for the drawer so the story column isn't covered.
  useEffect(() => {
    document.body.classList.toggle("survey-open", ui === "panel" || ui === "thanks");
    return () => document.body.classList.remove("survey-open");
  }, [ui]);

  const start = () => {
    if (!draft.startedAt) { updateDraft((d) => ({ ...d, startedAt: d.startedAt || Date.now() })); track("started"); }
    setUi("panel");
  };
  const startEdit = () => {
    if (!draft.edit) updateDraft(() => ({ step: 0, answers: meta.submitted!, startedAt: Date.now(), edit: true }));
    setError("");
    setUi("panel");
  };
  const closeEdit = () => { save(DRAFT, null); setDraft({ step: 0, answers: EMPTY_ANSWERS, startedAt: 0 }); setUi("hidden"); };
  const later = () => { updateMeta({ ...meta, snoozeUntil: Date.now() + SNOOZE_MS }); setUi("hidden"); track("later"); };
  const minimize = () => { setUi("pill"); track("minimized", draft.step); };
  const setAnswers = (f: (a: SurveyAnswers) => Partial<SurveyAnswers>) =>
    updateDraft((d) => ({ ...d, answers: { ...d.answers, ...f(d.answers) } }));
  const goStep = (step: number) => {
    updateDraft((d) => ({ ...d, step }));
    if (step > draft.step && !draft.edit) track("step", step);
    setError("");
  };
  // Single-choice questions move on by themselves after a short beat.
  const pick = (patch: Partial<SurveyAnswers>) => {
    const from = draft.step;
    setAnswers(() => patch);
    setTimeout(() => {
      updateDraft((d) => (d.step === from ? { ...d, step: from + 1 } : d)); // unless the reader already moved
      if (!draft.edit) track("step", from + 1);
    }, 260);
  };

  const submit = async () => {
    const a = draft.answers;
    if (!validEmail(a.email)) { setError("That email address doesn't look right."); return; }
    const edit = !!draft.edit;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/survey", {
        method: edit ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...a, session: sid(), website: trap, demo,
          ...(edit ? { id: meta.responseId, token: meta.editToken } : {}),
          seconds: draft.startedAt ? (Date.now() - draft.startedAt) / 1000 : 0,
          device: window.innerWidth < 900 ? "mobile" : "desktop",
          profile: a.shareProfile && !demo ? { func: profile.func, industry: profile.industry, markets: profile.markets } : undefined,
          shareProfile: a.shareProfile && !demo,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "We couldn't send your answers. Please try again.");
      updateMeta({
        ...meta, status: "done", submitted: a,
        ...(json.id && !edit ? { responseId: json.id, editToken: json.token } : {}),
      });
      save(DRAFT, null);
      setUi("thanks");
      onDone();
      setTimeout(() => { setUi("hidden"); setDraft({ step: 0, answers: EMPTY_ANSWERS, startedAt: 0 }); }, 4000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (ui === "hidden") return null;

  if (ui === "invite") {
    return (
      <aside className="sv-invite" role="dialog" aria-label="Feedback survey invitation">
        <span className="sv-kicker">Feedback</span>
        <h2>Help shape Worldesk</h2>
        <p>5 quick questions · less than 2 min</p>
        <div className="sv-row">
          <button className="btn" onClick={start}>Start</button>
          <button className="btn ghost" onClick={later}>Later</button>
        </div>
      </aside>
    );
  }

  if (ui === "pill") {
    return (
      <button className="sv-pill" onClick={start}>
        <span className="sv-pill-dot" aria-hidden="true" />
        Feedback {Math.min(draft.step + 1, STEPS)}/{STEPS} · Resume
      </button>
    );
  }

  const { step, answers: a, edit } = draft;
  return (
    <aside className="sv-panel" role="dialog" aria-label="Worldesk feedback survey">
      <header className="sv-head">
        <div>
          <span className="sv-kicker">{edit ? "Edit your feedback" : "Help shape Worldesk"}</span>
          {ui === "panel" && <div className="sv-meta">Step {step + 1} of {STEPS} · {timeLeft(step)}</div>}
        </div>
        {ui === "panel" && (edit ? (
          // Editing can't lose anything: the saved answers stay as they were.
          <button className="sv-min" onClick={closeEdit} aria-label="Close without saving" title="Close without saving">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        ) : (
          <button className="sv-min" onClick={minimize} aria-label="Minimize survey" title="Minimize">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        ))}
      </header>
      {ui === "panel" && <div className="sv-bar" aria-hidden="true"><i style={{ width: `${((step + 1) / STEPS) * 100}%` }} /></div>}

      {ui === "thanks" ? (
        <div className="sv-body sv-thanks" role="status">
          <div className="sv-check" aria-hidden="true">✓</div>
          <h3>{edit ? "Your changes are saved." : <>Thanks — you&apos;re shaping what we build next.</>}</h3>
          {!edit && (!demo || meta.editToken) && <p className="sv-hint">Changed your mind? You can edit your answers from the sidebar.</p>}
        </div>
      ) : (
        <>
          <div className="sv-body">
            {step === 0 && (
              <fieldset className="sv-q">
                <legend>{QUESTIONS.ratings}<span className="sv-req" aria-label="required">*</span></legend>
                <p className="sv-hint">1 = Poor, 5 = Excellent</p>
                {RATING_ROWS.map((r) => (
                  <div key={r.key} className={`sv-rate ${a.ratings[r.key] ? "done" : ""}`} role="radiogroup" aria-label={r.label}>
                    <span className="sv-rate-label">{r.label}</span>
                    <div className="sv-scale">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} role="radio" aria-checked={a.ratings[r.key] === n}
                          className={a.ratings[r.key] === n ? "on" : ""}
                          onClick={() => setAnswers((x) => ({ ratings: { ...x.ratings, [r.key]: n } }))}>{n}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="sv-ends" aria-hidden="true"><span>Poor</span><span>Excellent</span></div>
              </fieldset>
            )}

            {step === 1 && (
              <fieldset className="sv-q">
                <legend>{QUESTIONS.ranking}<span className="sv-req" aria-label="required">*</span></legend>
                <p className="sv-hint">Tap in order of importance, most wanted first. Tap again to undo.</p>
                <ol className="sv-rank">
                  {FEATURES.map((f) => {
                    const pos = a.ranking.indexOf(f.key);
                    return (
                      <li key={f.key}>
                        <button className={pos >= 0 ? "on" : ""} aria-pressed={pos >= 0}
                          onClick={() => setAnswers((x) => {
                            const ranked = x.ranking.includes(f.key);
                            let next: FeatureKey[] = ranked ? x.ranking.filter((k) => k !== f.key) : [...x.ranking, f.key];
                            // Once five are ranked, the last one can only go last.
                            const rest = FEATURES.filter((y) => !next.includes(y.key));
                            if (!ranked && rest.length === 1) next = [...next, rest[0].key];
                            return { ranking: next };
                          })}>
                          <span className="sv-badge">{pos >= 0 ? pos + 1 : ""}</span>
                          <span>{f.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                {a.ranking.length > 0 && <button className="btn link small" onClick={() => setAnswers(() => ({ ranking: [] }))}>Reset order</button>}
              </fieldset>
            )}

            {step === 2 && (
              <fieldset className="sv-q">
                <legend>{QUESTIONS.frequency}<span className="sv-req" aria-label="required">*</span></legend>
                <div className="sv-opts" role="radiogroup">
                  {FREQUENCY.map((o) => (
                    <button key={o} role="radio" aria-checked={a.frequency === o} className={a.frequency === o ? "on" : ""}
                      onClick={() => pick({ frequency: o })}>{o}</button>
                  ))}
                </div>
              </fieldset>
            )}

            {step === 3 && (
              <fieldset className="sv-q">
                <legend>{QUESTIONS.pay}<span className="sv-req" aria-label="required">*</span></legend>
                <div className="sv-opts" role="radiogroup">
                  {PAY.map((o) => (
                    <button key={o} role="radio" aria-checked={a.pay === o} className={a.pay === o ? "on" : ""}
                      onClick={() => pick({ pay: o })}>{o}</button>
                  ))}
                </div>
              </fieldset>
            )}

            {step === 4 && (
              <div className="sv-q">
                <label className="sv-legend" htmlFor="sv-idea">{QUESTIONS.idea} <span className="sv-opt">Optional</span></label>
                <p className="sv-hint">Share any idea the questions above did not cover. Your input will help shape what we build next.</p>
                <textarea id="sv-idea" rows={4} maxLength={IDEA_MAX} value={a.idea} onChange={(e) => { const idea = e.target.value; setAnswers(() => ({ idea })); }} />
                <label className="sv-legend" htmlFor="sv-email">{QUESTIONS.email}</label>
                <input id="sv-email" type="email" autoComplete="email" placeholder="you@example.com" value={a.email}
                  onChange={(e) => { const email = e.target.value; setAnswers(() => ({ email })); }} />
                {!demo && (
                  <label className="check sv-share">
                    <input type="checkbox" checked={a.shareProfile} onChange={(e) => { const shareProfile = e.target.checked; setAnswers(() => ({ shareProfile })); }} />
                    <span>Include my role, industry and markets with my answers</span>
                  </label>
                )}
                <input className="sv-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
              </div>
            )}
            {error && <p className="sv-error" role="alert">{error}</p>}
          </div>

          <footer className="sv-foot">
            {step > 0 ? <button className="btn ghost" onClick={() => goStep(step - 1)}>Back</button> : <span />}
            {edit ? (
              // Every answer is already complete, so changes can be saved from any step.
              <div className="sv-row">
                {step < STEPS - 1 && <button className="btn ghost" disabled={!stepComplete(step, a)} onClick={() => goStep(step + 1)}>Next</button>}
                <button className="btn" disabled={sending || ![0, 1, 2, 3, 4].every((n) => stepComplete(n, a))} onClick={submit}>{sending ? "Saving…" : "Save changes"}</button>
              </div>
            ) : step < STEPS - 1
              ? <button className="btn" disabled={!stepComplete(step, a)} onClick={() => goStep(step + 1)}>Next</button>
              : <button className="btn" disabled={sending || !stepComplete(step, a)} onClick={submit}>{sending ? "Sending…" : "Submit"}</button>}
          </footer>
        </>
      )}
    </aside>
  );
}
