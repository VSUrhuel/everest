export const generateBillingPeriods = () => {
  const periods: { value: string; label: string }[] = [];

  const now = new Date();
  const year = now.getFullYear()-1;

  // const firstSemStart = new Date(year, 7, 1); 
  // const firstSemEnd = new Date(year, 11, 1); 
  // const firstSemLabel = `${firstSemStart.toLocaleString("en-US", { month: "short" })} - ${firstSemEnd.toLocaleString("en-US", { month: "short", year: "numeric" })}`;
  // periods.push({
  //   value: `1st-semester (${firstSemLabel})`,
  //   label: `1st Semester (${firstSemLabel})`,
  // });
  
  const secondSemYear = year + 1;
  const secondSemStart = new Date(secondSemYear, 0, 1); // January
  const secondSemEnd = new Date(secondSemYear, 4, 1); // May
  const secondSemLabel = `${secondSemStart.toLocaleString("en-US", { month: "short" })} - ${secondSemEnd.toLocaleString("en-US", { month: "short", year: "numeric" })}`;
  periods.push({
    value: `2nd-semester (${secondSemLabel})`,
    label: `2nd Semester (${secondSemLabel})`,
  });

  for (let i = 0; i < 12; i++) {
    const date = new Date(2025, i + 7, 1);

    const year = date.getFullYear();
    // Format month for the 'value' (e.g., "2025-08")
    const monthValue = (date.getMonth() + 1).toString().padStart(2, "0");

    // Format a human-readable label (e.g., "August 2025")
    const monthLabel = date.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    periods.push({
      value: `${year}-${monthValue}`,
      label: monthLabel,
    });
  }
  return periods;
};

export const getBillingPeriodLabel = (billingPeriod: string): string => {
  // Check if it's a semester period
  if (billingPeriod.includes("semester")) {
    // Extract the label part (e.g., "1st Semester (Aug - Dec 2024)")
    const match = billingPeriod.match(/\d(?:st|nd)-semester\s*\((.*?)\)/);
    if (match) {
      return `${billingPeriod.substring(0, billingPeriod.indexOf("(") - 1)} (${match[1]})`;
    }
    return billingPeriod;
  }

  // Check if it's a month-year format (e.g., "2025-08")
  if (/^\d{4}-\d{2}$/.test(billingPeriod)) {
    const [year, month] = billingPeriod.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  }

  // Fallback: return as is
  return billingPeriod;
};