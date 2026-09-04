// Deterministic intent matching for the in-app assistant.
//
// No AI, no API, no third party — just keyword rules. A question either maps to
// a static help answer (`text`) or to a live-data lookup (`data`) that the
// server computes from the current organization. Pure and client-safe.

export type DataMetric =
  | "total_annual"
  | "monthly_spend"
  | "renewals_next"
  | "active_count"
  | "top_department"
  | "top_category"
  | "open_requests"
  | "reviews_due"
  | "janitor_findings";

export type BotMatch =
  | { kind: "text"; answer: string }
  | { kind: "data"; metric: DataMetric };

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w));

// ---- Static help answers -------------------------------------------------

const GREETING =
  "Hi! I'm the Stackceipt assistant. Ask me how something works — like adding a subscription or who can approve requests — or, once you're signed in, about your live spend and renewals.";

const CAPABILITIES =
  "I can help two ways:\n• How things work — adding subscriptions, requests, reviews, offboarding, permissions, the Janitor.\n• Your numbers (when signed in) — total annual spend, monthly cost, what's renewing soon, top department or category, open requests.\n\nTry: \"What renews soon?\" or \"Who can approve requests?\"";

const ADD_SUB =
  "To add a subscription: go to Subscriptions → Add subscription, then enter the vendor, cost, billing cadence, and renewal date. Owners and admins can add records directly; everyone else can raise a request instead.";

const PERMISSIONS =
  "Only organization Owners and Admins can approve requests or edit subscription records. Managers and Members have read access and can raise requests, but can't approve or change records.";

const COST_CALC =
  "Stackceipt normalizes every billing cycle — monthly, quarterly, annual, or custom — into a single recurring monthly and annual figure, so totals are always comparable regardless of how each tool bills you.";

const IMPORT =
  "You can add subscriptions manually one by one, or import several at once from a CSV file. Each row becomes a tracked subscription with its cost and renewal date.";

const SECURITY =
  "Every organization's data is isolated at the database level with row-level security, so one workspace can never see another's. Writes are additionally restricted to Owners and Admins.";

const SETUP =
  "Setup takes just a few minutes: create your organization, add (or import) your subscriptions, and you'll immediately see spend, renewals, and cost-control findings.";

const DEMO =
  "You can explore without signing up: choose \"View the live demo\" on the landing page to open a ready-made read-only workspace in guest mode.";

const REQUESTS =
  "Requests are how anyone asks for new software. You submit a request; it goes to the Owners and Admins who can approve or deny it, with a full audit trail. Approved requests can be converted into tracked subscriptions.";

const REVIEWS =
  "Reviews are periodic checks that a subscription is still needed and correctly configured. They can be scheduled or in progress, and completing one records who verified it and when.";

const OFFBOARDING =
  "Offboarding tracks the tasks that must happen when someone leaves — like reassigning or cancelling their software seats — so access and cost don't linger after they're gone.";

const JANITOR =
  "The Janitor is a deterministic rules engine that flags likely waste — unused seats, forgotten trials, duplicate tools, upcoming auto-renewals — so you can act before money is wasted. No AI, just clear rules.";

/**
 * Match a free-text question to a help answer or a live-data lookup.
 * Returns null when nothing matches (the caller shows a fallback).
 */
export function matchIntent(raw: string): BotMatch | null {
  const t = raw.toLowerCase().trim();
  if (!t) return null;

  // Meta
  if (has(t, "what can you do", "what do you do", "who are you", "how can you help")) {
    return { kind: "text", answer: CAPABILITIES };
  }
  if (/^(hi|hey|hello|yo|sup|howdy|good morning|good afternoon)\b/.test(t)) {
    return { kind: "text", answer: GREETING };
  }

  // ---- Live-data lookups (checked before overlapping help topics) --------
  if (has(t, "renew", "expiring", "expire", "coming up", "due soon", "renewing")) {
    return { kind: "data", metric: "renewals_next" };
  }
  if (has(t, "month") && has(t, "spend", "spending", "cost", "pay", "paying", "much")) {
    return { kind: "data", metric: "monthly_spend" };
  }
  if (has(t, "annual", "yearly", "a year", "per year", "committed", "overall", "in total", "total spend", "total cost") &&
      has(t, "spend", "spending", "cost", "pay", "paying", "much", "total", "committed")) {
    return { kind: "data", metric: "total_annual" };
  }
  if (has(t, "how many", "number of", "count") && has(t, "subscription", "sub", "tool", "app", "license", "active")) {
    return { kind: "data", metric: "active_count" };
  }
  if (has(t, "department", "dept", "team") && has(t, "most", "top", "highest", "biggest", "spend", "which")) {
    return { kind: "data", metric: "top_department" };
  }
  if (has(t, "category", "categories") && has(t, "most", "top", "highest", "biggest", "which", "spend")) {
    return { kind: "data", metric: "top_category" };
  }
  if (has(t, "request") && has(t, "open", "pending", "awaiting", "how many", "queue", "to approve")) {
    return { kind: "data", metric: "open_requests" };
  }
  if (has(t, "review") && has(t, "due", "how many", "pending", "scheduled", "outstanding")) {
    return { kind: "data", metric: "reviews_due" };
  }
  if (has(t, "finding", "findings") || (has(t, "janitor") && has(t, "how many", "open", "count"))) {
    return { kind: "data", metric: "janitor_findings" };
  }

  // ---- Static help topics ------------------------------------------------
  if (has(t, "add") && has(t, "subscription", "sub", "tool", "software", "app", "license")) {
    return { kind: "text", answer: ADD_SUB };
  }
  if (has(t, "who can", "approve", "permission", "role", "edit", "access level", "admin", "owner")) {
    return { kind: "text", answer: PERMISSIONS };
  }
  if (has(t, "calculate", "annualized", "normalize", "billing cycle", "billing cadence", "how do you compute", "how is cost")) {
    return { kind: "text", answer: COST_CALC };
  }
  if (has(t, "import", "csv", "upload", "migrate", "bulk add")) {
    return { kind: "text", answer: IMPORT };
  }
  if (has(t, "secure", "security", "isolat", "rls", "privacy", "private", "separate", "safe")) {
    return { kind: "text", answer: SECURITY };
  }
  if (has(t, "setup", "set up", "get started", "how long", "onboard", "begin")) {
    return { kind: "text", answer: SETUP };
  }
  if (has(t, "demo", "guest", "try it", "try the", "without signing", "without sign")) {
    return { kind: "text", answer: DEMO };
  }
  if (has(t, "request")) return { kind: "text", answer: REQUESTS };
  if (has(t, "review")) return { kind: "text", answer: REVIEWS };
  if (has(t, "offboard", "leaving", "deprovision", "someone leaves", "quit")) {
    return { kind: "text", answer: OFFBOARDING };
  }
  if (has(t, "janitor", "waste", "unused", "duplicate", "savings")) {
    return { kind: "text", answer: JANITOR };
  }

  return null;
}

// Suggestion chips shown in the panel, tailored to whether we're in the app.
export const HELP_SUGGESTIONS = [
  "Who can approve requests?",
  "How are costs calculated?",
  "Can I try the demo?",
  "How do I add a subscription?",
];

export const DATA_SUGGESTIONS = [
  "What renews soon?",
  "What's my annual spend?",
  "Which department spends most?",
  "How many active subscriptions?",
];

export const FALLBACK =
  "I'm not sure about that one. I can explain how Stackceipt works (subscriptions, requests, reviews, permissions, the Janitor) or, when you're signed in, answer questions about your spend and renewals. Try one of the suggestions below.";
