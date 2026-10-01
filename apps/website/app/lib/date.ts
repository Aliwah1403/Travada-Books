// Shared date formatting for legal "Last updated" lines and MDX-derived
// dates. Frontmatter dates are plain YYYY-MM-DD strings (no time, no zone),
// so parse as UTC to avoid the local-timezone off-by-one-day trap.
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}
