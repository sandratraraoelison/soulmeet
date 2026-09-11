export type Engagement = {
  registered: number;
  completed: number;
  soulprints: number;
  conversations: number;
  eligible7: number;
  retained7: number;
  eligible30: number;
  retained30: number;
};
export type Insights = {
  days: number;
  generatedAt: string;
  current: Engagement;
  previous: Engagement;
  countries: string[];
  moderation: {
    urgent: number;
    unassigned: number;
    old: number;
    queue: {
      id: string;
      reason: string;
      priority: string;
      createdAt: string;
    }[];
  };
  replies: { started: number; replied: number };
  geography: { country: string; users: number }[];
};
export function changeLabel(current: number, previous: number) {
  if (!previous) return current ? `New activity (+${current})` : "No change";
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent >= 0 ? "+" : ""}${percent}% vs previous period`;
}
export function rate(part: number, total: number) {
  return total ? `${Math.round((part / total) * 100)}%` : "Not enough data";
}
