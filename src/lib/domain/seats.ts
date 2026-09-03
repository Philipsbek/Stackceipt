/**
 * Seat utilization calculations (see master spec §9.3).
 * Missing seat counts must read as "unknown", never as zero.
 */

export interface SeatSummary {
  purchased: number | null;
  used: number | null;
  unused: number | null;
  utilizationPercent: number | null;
  known: boolean;
}

export function seatSummary(
  seatsPurchased: number | null | undefined,
  seatsUsed: number | null | undefined,
): SeatSummary {
  const purchased =
    seatsPurchased === null || seatsPurchased === undefined
      ? null
      : seatsPurchased;
  const used = seatsUsed === null || seatsUsed === undefined ? null : seatsUsed;

  const unused =
    purchased !== null && used !== null ? Math.max(purchased - used, 0) : null;

  const utilizationPercent =
    purchased !== null && used !== null && purchased > 0
      ? (used / purchased) * 100
      : null;

  return {
    purchased,
    used,
    unused,
    utilizationPercent,
    known: purchased !== null && used !== null,
  };
}

/** Whole-number utilization for display; null when unknown. */
export function utilizationRounded(summary: SeatSummary): number | null {
  return summary.utilizationPercent === null
    ? null
    : Math.round(summary.utilizationPercent);
}
