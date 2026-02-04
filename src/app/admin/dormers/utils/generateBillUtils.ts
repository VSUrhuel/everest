export const generateBillingPeriods = () => {
  const periods: { value: string; label: string }[] = [];

  const now = new Date();
  const year = now.getFullYear()-1;

  const firstSemStart = new Date(year, 7, 1); 
  const firstSemEnd = new Date(year, 11, 1); 
  const firstSemLabel = `${firstSemStart.toLocaleString("en-US", { month: "short" })} - ${firstSemEnd.toLocaleString("en-US", { month: "short", year: "numeric" })}`;
  periods.push({
    value: `1st-semester (${firstSemLabel})`,
    label: `1st Semester (${firstSemLabel})`,
  });
  
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
