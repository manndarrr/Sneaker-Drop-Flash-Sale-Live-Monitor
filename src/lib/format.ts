export const money = (paise: number) =>
  `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const statusClass = (s: string) => {
  switch (s) {
    case "pending": return "bg-pending text-pending-foreground";
    case "shipped": return "bg-shipped text-shipped-foreground";
    case "delivered": return "bg-delivered text-delivered-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};
