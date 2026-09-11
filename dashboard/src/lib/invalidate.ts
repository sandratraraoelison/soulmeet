import type { QueryClient } from "@tanstack/react-query";
export async function invalidateAdmin(client: QueryClient) {
  await Promise.all(
    [
      "users",
      "user",
      "user-history",
      "user-sessions",
      "global-search",
      "reports",
      "report",
      "overview",
      "analytics",
      "insights",
      "audit-logs",
      "search",
    ].map((key) => client.invalidateQueries({ queryKey: [key] })),
  );
}
