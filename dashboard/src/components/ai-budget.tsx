"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SessionUser } from "@/lib/types";
import { can } from "@/lib/permissions";
import { useToast } from "./toast";

export function AiBudget({
  budget,
  spent,
}: {
  budget: number | null;
  spent: number;
}) {
  const [amount, setAmount] = useState(budget?.toString() ?? "");
  const client = useQueryClient();
  const { notify } = useToast();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api<SessionUser>("auth/me"),
  });
  const save = useMutation({
    mutationFn: () =>
      api("admin/settings/ai.monthlyBudget", {
        method: "PATCH",
        body: JSON.stringify({
          value: { amount: Number(amount) },
          description: "Monthly AI budget in USD (monitoring only)",
        }),
      }),
    onSuccess: async () => {
      await Promise.all(
        ["ai-usage", "settings", "audit-logs"].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      notify("success", "Monthly budget updated.");
    },
    onError: (error) => notify("error", error.message),
  });
  return (
    <section className="card section-gap">
      <h2>Monthly AI budget</h2>
      <p>
        Current calendar month (UTC): <strong>${spent.toFixed(4)}</strong>
        {budget
          ? ` of $${budget.toFixed(2)} (${Math.round((spent / budget) * 100)}%)`
          : " · No budget configured"}
      </p>
      {budget && (
        <>
          <progress
            className="budget-progress"
            max={budget}
            value={Math.min(spent, budget)}
            aria-label="Monthly budget consumption"
          />
          {spent >= budget * 0.8 && (
            <p role="status" className={spent >= budget ? "error" : "muted"}>
              {spent >= budget
                ? "Budget exceeded."
                : "80% of the monthly budget has been used."}
            </p>
          )}
        </>
      )}
      <p className="muted">
        Monitoring only; this budget does not block AI requests. Unpriced
        requests are excluded from costs.
      </p>
      {can(session.data?.role, "settings") && (
        <form
          className="toolbar filters"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number.isFinite(Number(amount)) && Number(amount) > 0)
              save.mutate();
          }}
        >
          <label className="field">
            <span>Monthly limit (USD)</span>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <button className="button primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save budget"}
          </button>
        </form>
      )}
    </section>
  );
}
