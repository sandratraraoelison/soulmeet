"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Insights, rate } from "@/lib/insights";
import { ErrorState, Loading } from "./page-state";

export function EngagementPanel({ days }: { days: number }) {
  const [country, setCountry] = useState("");
  const q = useQuery({
    queryKey: ["insights", days, country],
    queryFn: ({ signal }) =>
      api<Insights>(
        `admin/insights?days=${days}&country=${encodeURIComponent(country)}`,
        { signal },
      ),
  });
  return (
    <section className="card section-gap">
      <div className="heading">
        <div>
          <h2>Activation and retention</h2>
          <p>
            Members registered in the selected period. Current profile
            milestones; deleted accounts excluded.
          </p>
        </div>
        <label className="field">
          <span>Country (this section)</span>
          <select
            className="select"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">All countries</option>
            {q.data?.countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : (
        q.data && (
          <>
            <div className="grid">
              {(
                [
                  ["Registered", q.data.current.registered],
                  ["Profile completed", q.data.current.completed],
                  ["With Soulprint", q.data.current.soulprints],
                  ["First member message", q.data.current.conversations],
                ] as const
              ).map(([label, value]) => (
                <div className="metric" key={label}>
                  <span className="muted">{label}</span>
                  <strong>{value}</strong>
                  <small>
                    {rate(value, q.data!.current.registered)} of cohort
                  </small>
                </div>
              ))}
            </div>
            <p className="muted">
              Each step includes the preceding milestones; this shows
              completion, not the chronological order of events.
            </p>
            <div className="detail-grid section-gap">
              {([7, 30] as const).map((day) => {
                const eligible =
                  day === 7
                    ? q.data!.current.eligible7
                    : q.data!.current.eligible30;
                const retained =
                  day === 7
                    ? q.data!.current.retained7
                    : q.data!.current.retained30;
                return (
                  <div className="card metric" key={day}>
                    <span>Day {day} retention</span>
                    <strong>{rate(retained, eligible)}</strong>
                    <small>
                      {retained} / {eligible} eligible members
                    </small>
                  </div>
                );
              })}
            </div>
            <p className="muted">
              Return = a non-deleted message to a member or coach between 7–8 or
              30–31 days after registration. Only fully observed windows count.
              Select 90 days to observe Day 30.
            </p>
            <div className="metric section-gap">
              <span>Conversations receiving a reply</span>
              <strong>
                {rate(q.data.replies.replied, q.data.replies.started)}
              </strong>
              <small>
                {q.data.replies.replied} / {q.data.replies.started}{" "}
                conversations created in this period with a message. Reply =
                messages from at least two senders. Country matches at least one
                participant.
              </small>
            </div>
            <h3>New members by country</h3>
            {q.data.geography.length ? (
              q.data.geography.map((row) => (
                <div className="list-row" key={row.country}>
                  <span>{row.country || "Unknown"}</span>
                  <strong>{row.users}</strong>
                </div>
              ))
            ) : (
              <p className="muted">No profiles in this cohort.</p>
            )}
          </>
        )
      )}
    </section>
  );
}
