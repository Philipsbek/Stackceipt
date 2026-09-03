import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/data/access";
import { can } from "@/lib/domain/permissions";
import { listSubscriptions } from "@/lib/data/subscriptions";
import { listFindings } from "@/lib/data/janitor";
import { csvMoney, toCsv } from "@/lib/domain/csv";
import { noticeDeadline } from "@/lib/domain/dates";

/**
 * CSV export route. Applies the same authorization and filtering as the on-screen
 * report, and uses the formula-injection-safe CSV builder. Money is exact integer-
 * derived text with the currency included.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) return new NextResponse("Not found", { status: 404 });
  const { org, actor, members } = ctx;

  if (!can(actor, "report.export")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const report = url.searchParams.get("report") ?? "subscriptions";
  const currency = org.baseCurrency;

  let filename = "report.csv";
  let csv = "";

  if (report === "subscriptions") {
    const subs = await listSubscriptions(org.id, members, { includeArchived: true });
    filename = `${org.slug}-subscriptions.csv`;
    csv = toCsv(
      ["Vendor", "Product", "Status", "Department", "Owner", "Cadence", "Currency", "Monthly", "Annualized", "Renews", "Notice deadline", "Seats purchased", "Seats used"],
      subs.map((s) => [
        s.vendorName, s.productName, s.status, s.departmentName ?? "", s.ownerName ?? "",
        s.billingCadence, currency, csvMoney(s.monthlyMinor), csvMoney(s.annualizedMinor),
        s.nextRenewalDate ?? "", noticeDeadline(s.nextRenewalDate, s.noticePeriodDays) ?? "",
        s.seatsPurchased ?? "", s.seatsUsed ?? "",
      ]),
    );
  } else if (report === "seats") {
    const subs = (await listSubscriptions(org.id, members)).filter((s) => s.seats.known);
    filename = `${org.slug}-seat-utilization.csv`;
    csv = toCsv(
      ["Vendor", "Product", "Seats purchased", "Seats used", "Unused", "Utilization %", "Currency", "Annualized"],
      subs.map((s) => [
        s.vendorName, s.productName, s.seats.purchased ?? "", s.seats.used ?? "", s.seats.unused ?? "",
        s.seats.utilizationPercent !== null ? Math.round(s.seats.utilizationPercent) : "",
        currency, csvMoney(s.annualizedMinor),
      ]),
    );
  } else if (report === "findings") {
    const findings = await listFindings(org);
    filename = `${org.slug}-janitor-findings.csv`;
    csv = toCsv(
      ["Rule", "Severity", "Title", "Description", "Currency", "Potential savings"],
      findings.map((f) => [
        f.ruleKey, f.severity, f.title, f.description, currency,
        f.estimatedSavingsMinor != null ? csvMoney(f.estimatedSavingsMinor) : "",
      ]),
    );
  } else {
    return new NextResponse("Unknown report", { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
