function formatActualDuration(seconds: number | null): string {
  if (seconds === null) return "Not recorded";
  if (seconds < 60) return "<1m";
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${minutes}m`;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

export { formatActualDuration };
