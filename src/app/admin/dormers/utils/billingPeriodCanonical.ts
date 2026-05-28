// Canonicalise a billing-period header so that the same logical period written
// in different formats all match the same `Payable` value.
//
// Examples (all canonicalise to "2025-08"):
//   "August 2025"   ← system-generated label
//   "Aug 2025"
//   "Aug-25"        ← what Excel auto-formats "August 2025" into (MMM-YY)
//   "Aug-2025"
//   "August-25"
//   "2025-08"       ← Firestore-stored value
//
// Semester labels (e.g. "2nd Semester (Jan - May 2026)") don't fit this shape
// and are intentionally returned as `null` — the caller should fall back to
// exact-label matching for those.

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

// Expand a 2-digit year to 4 digits. Pivot at 50: 00-49 → 2000-2049, 50-99 → 1950-1999.
// This matches Excel's default behaviour.
const expandYear = (yy: number): number => (yy < 50 ? 2000 + yy : 1900 + yy);

export const canonicaliseBillingPeriod = (input: string): string | null => {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;

  // YYYY-MM (already canonical)
  let m = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    if (month >= 1 && month <= 12) return `${year}-${month.toString().padStart(2, "0")}`;
  }

  // MMM-YY or MMM-YYYY  (Aug-25, Aug-2025, August-25, August-2025)
  m = /^([A-Za-z]+)[-\s/](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month) {
      const raw = parseInt(m[2], 10);
      const year = m[2].length === 2 ? expandYear(raw) : raw;
      return `${year}-${month.toString().padStart(2, "0")}`;
    }
  }

  // YY-MMM or YYYY-MMM
  m = /^(\d{2}|\d{4})[-\s/]([A-Za-z]+)$/.exec(s);
  if (m) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) {
      const raw = parseInt(m[1], 10);
      const year = m[1].length === 2 ? expandYear(raw) : raw;
      return `${year}-${month.toString().padStart(2, "0")}`;
    }
  }

  // "August 2025" / "Aug 2025"
  m = /^([A-Za-z]+)\s+(\d{4})$/.exec(s);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month) {
      const year = parseInt(m[2], 10);
      return `${year}-${month.toString().padStart(2, "0")}`;
    }
  }

  return null;
};
