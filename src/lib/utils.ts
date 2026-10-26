// `cn` belongs to Parabola (it knows the design system's custom classes);
// re-exported here so app code keeps importing it from one place.
export { cn } from "@beltechi/parabola"

/**
 * When something changed, in words: "just now", "6 minutes ago", "3 hours
 * ago", "1 day ago" for the last week, then the date ("24 February", with
 * the year when it isn't this one).
 */
export function formatChangedAt(dateString: string, now = new Date()): string {
  const date = new Date(dateString);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  const ago = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (minutes < 1) return "just now";
  if (minutes < 60) return ago(minutes, "minute");
  if (minutes < 24 * 60) return ago(Math.floor(minutes / 60), "hour");
  if (minutes < 7 * 24 * 60) return ago(Math.floor(minutes / (24 * 60)), "day");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/**
 * Format a date string to relative time, short (e.g., "2h ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

