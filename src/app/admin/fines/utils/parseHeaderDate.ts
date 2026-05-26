// Parses date column headers in the attendance CSV. Supports:
//   - `Jan-26`, `Feb-26`, ...  (MMM-DD; day-of-month after a month abbreviation)
//   - `26-Feb`, `26-Mar`, ...  (DD-MMM; day-of-month before a month abbreviation)
//   - `Jan 26`, `January 26`   (whitespace-separated month and day)
//   - Any ISO / RFC date string the native `Date` constructor accepts
//     (e.g. `2024-01-15`, `01/15/2024`)
//
// Short forms without a year default to the current year.

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const tryShortForm = (str: string): Date | null => {
  const cleaned = str.trim().replace(/\s+/g, "-");

  // MMM-DD  e.g. Jan-26
  const monthDay = /^([A-Za-z]+)[-\s/](\d{1,2})$/.exec(cleaned);
  if (monthDay) {
    const month = MONTHS[monthDay[1].toLowerCase()];
    const day = parseInt(monthDay[2], 10);
    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(new Date().getFullYear(), month, day);
    }
  }

  // DD-MMM  e.g. 26-Feb
  const dayMonth = /^(\d{1,2})[-\s/]([A-Za-z]+)$/.exec(cleaned);
  if (dayMonth) {
    const day = parseInt(dayMonth[1], 10);
    const month = MONTHS[dayMonth[2].toLowerCase()];
    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(new Date().getFullYear(), month, day);
    }
  }

  return null;
};

export const parseHeaderDate = (str: string): Date | null => {
  if (!str) return null;
  const trimmed = str.trim();

  const shortForm = tryShortForm(trimmed);
  if (shortForm && !isNaN(shortForm.getTime())) return shortForm;

  const native = new Date(trimmed);
  if (!isNaN(native.getTime())) return native;

  return null;
};
