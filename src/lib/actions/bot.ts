"use server";

import { getOrgContext } from "@/lib/data/access";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { cadenceSuffix } from "@/lib/domain/enums";
import type { DataMetric } from "@/lib/bot/intents";

const SIGN_IN =
  "Sign in (or open the live demo) and tell me which workspace, and I can answer that from your real data. I can still explain how anything works in the meantime.";

/**
 * Answer a live-data question for the given organization. Reads only through
 * getOrgContext, so it respects membership and row-level security — there are
 * no writes and nothing leaves the user's own workspace.
 */
export async function botDataAnswer(metric: DataMetric, orgSlug: string): Promise<string> {
  if (!orgSlug) return SIGN_IN;

  const ctx = await getOrgContext(orgSlug);
  if (!ctx) return SIGN_IN;

  const data = await getDashboardData(ctx.org, ctx.members);
  const money = (minor: number) => formatMoney(minor, data.currency, { showCents: false });
  const pct = (minor: number, total: number) => (total > 0 ? Math.round((minor / total) * 100) : 0);

  switch (metric) {
    case "total_annual":
      return `Your committed annual cost is ${money(data.annualCommittedMinor)} across ${data.activeCount} active subscription${data.activeCount === 1 ? "" : "s"}.`;

    case "monthly_spend":
      return `You're spending about ${money(data.monthlyRecurringMinor)} per month on recurring software (${money(data.annualCommittedMinor)} per year).`;

    case "active_count":
      return `You have ${data.activeCount} active subscription${data.activeCount === 1 ? "" : "s"}, totaling ${money(data.annualCommittedMinor)} per year.`;

    case "renewals_next": {
      const list = data.renewalsInWindow;
      if (list.length === 0) {
        return `Nothing renews in the next ${data.renewalWindowDays} days. You're clear for now.`;
      }
      const lines = list.slice(0, 5).map((s) => {
        const amount = `${formatMoney(s.amountMinor, s.currency, { showCents: false })}${cadenceSuffix(s.billingCadence, s.billingIntervalMonths)}`;
        return `• ${s.vendorName} ${s.productName} — ${formatDate(s.nextRenewalDate)} (${amount})`;
      });
      const more = list.length > 5 ? `\n…and ${list.length - 5} more.` : "";
      return `${list.length} subscription${list.length === 1 ? "" : "s"} renew in the next ${data.renewalWindowDays} days:\n${lines.join("\n")}${more}`;
    }

    case "top_department": {
      const top = data.byDepartment[0];
      if (!top) return "No department spend to report yet.";
      return `${top.name} spends the most: ${money(top.annualizedMinor)} per year (${pct(top.annualizedMinor, data.annualCommittedMinor)}% of total).`;
    }

    case "top_category": {
      const top = data.byCategory[0];
      if (!top) return "No category spend to report yet.";
      return `${top.name} is your largest category: ${money(top.annualizedMinor)} per year (${pct(top.annualizedMinor, data.annualCommittedMinor)}% of total).`;
    }

    case "open_requests":
      return data.openRequests === 0
        ? "There are no requests awaiting a decision right now."
        : `${data.openRequests} request${data.openRequests === 1 ? "" : "s"} ${data.openRequests === 1 ? "is" : "are"} awaiting a decision.`;

    case "reviews_due":
      return data.reviewsDue === 0
        ? "No reviews are due right now."
        : `${data.reviewsDue} review${data.reviewsDue === 1 ? "" : "s"} ${data.reviewsDue === 1 ? "is" : "are"} scheduled or in progress.`;

    case "janitor_findings":
      return data.openFindings === 0
        ? "The Janitor has no open findings — nothing flagged as waste right now."
        : `The Janitor has ${data.openFindings} open finding${data.openFindings === 1 ? "" : "s"} worth reviewing for potential savings.`;

    default:
      return SIGN_IN;
  }
}
