"use client";

// Signed-in usage tracking. Events go out in batches about once a minute and when the reader leaves,
// so the database isn't kept awake. Nothing is recorded for signed-out visitors or the sample account.
// The server attaches the user ID from the session; the browser never sends it.

type Props = Record<string, string | number | boolean>;
type Event = { type: string; at: string; props?: Props };

const FLUSH_MS = 60_000;
const IDLE_MS = 2 * 60_000; // no input for this long stops the active-time clock
const VISIT_GAP_MS = 30 * 60_000;
const VISIT_KEY = "wd.visit";

let enabled = false;
let listening = false;
let queue: Event[] = [];
let activeSeconds = 0;
let storiesLoaded = false;
let lastInput = 0;

function visitId() {
  const now = Date.now();
  try {
    const v = JSON.parse(sessionStorage.getItem(VISIT_KEY) ?? "null") as { id: string; last: number } | null;
    const id = v && now - v.last < VISIT_GAP_MS ? v.id : crypto.randomUUID();
    sessionStorage.setItem(VISIT_KEY, JSON.stringify({ id, last: now }));
    return id;
  } catch {
    return "";
  }
}

export function track(type: string, props?: Props) {
  if (enabled) queue.push({ type, at: new Date().toISOString(), props });
}

function pushActiveTime() {
  if (activeSeconds > 0) track("active_time", { seconds: activeSeconds, loaded: storiesLoaded });
  activeSeconds = 0;
}

function send(useBeacon: boolean) {
  pushActiveTime();
  if (!queue.length) return Promise.resolve();
  const body = JSON.stringify({ session: visitId(), events: queue.splice(0, 50) });
  if (useBeacon && navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return Promise.resolve();
  return fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
    .then(() => undefined).catch(() => undefined); // analytics must never bother the reader
}

export const flushNow = () => send(false);

export function setTracking(on: boolean) {
  if (enabled && !on) void send(false);
  enabled = on;
  if (!on) queue = [];
  if (!on || listening) return;
  listening = true;
  setInterval(() => void send(false), FLUSH_MS);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void send(true); });
  window.addEventListener("pagehide", () => void send(true));
}

// Counts seconds on the briefing while the page is on screen and the reader has recently done something.
export function watchActiveTime() {
  storiesLoaded = false;
  lastInput = Date.now();
  const onInput = () => { lastInput = Date.now(); };
  const events = ["pointerdown", "pointermove", "keydown", "scroll", "wheel", "touchstart"];
  events.forEach((e) => window.addEventListener(e, onInput, { passive: true }));
  const tick = setInterval(() => {
    if (document.visibilityState === "visible" && Date.now() - lastInput < IDLE_MS) activeSeconds += 1;
  }, 1000);
  return () => {
    clearInterval(tick);
    events.forEach((e) => window.removeEventListener(e, onInput));
    pushActiveTime();
  };
}

export function markStoriesLoaded(seconds: number) {
  pushActiveTime(); // time so far was spent waiting, so it stays separate from reading time
  storiesLoaded = true;
  track("stories_loaded", { seconds });
}
