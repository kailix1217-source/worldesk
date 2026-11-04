import type { Profile } from "./types";

// The "See a sample executive" account. The server searches for this profile only, once a day.
export const DEMO_PROFILE: Profile = {
  name: "Maya", email: "maya@example.com", title: "Marketing Director, EMEA & APAC", company: "",
  industry: "Automotive", func: "Marketing & Communications", markets: ["Germany", "Japan"],
  topics: ["Competitors", "Consumer Trends", "Regulation & Policy"], keywords: ["EV batteries", "Chinese EV brands"],
};
