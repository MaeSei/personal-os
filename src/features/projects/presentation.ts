function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatActivity(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatRemainingEffort(minutes: number, points: number): string {
  if (minutes === 0) return `${points} effort ${points === 1 ? "point" : "points"}`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const time = [hours ? `${hours}h` : "", remainder ? `${remainder}m` : ""]
    .filter(Boolean)
    .join(" ");
  return `${time} · ${points} ${points === 1 ? "point" : "points"}`;
}

export { formatActivity, formatCalendarDate, formatRemainingEffort };
