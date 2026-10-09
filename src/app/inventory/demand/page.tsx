"use client";

import { cn } from "~/lib/utils";
import { useState } from "react";
import Link from "next/link";
import { Line, LineChart, ResponsiveContainer, Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Plus, RefreshCw, Search, Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";

import { api, type RouterOutputs } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { LoadError } from "~/components/ui/load-error";
import { Tabs } from "~/components/ui/tabs";
import { useConfirm } from "~/components/ui/confirm-dialog";
import { Skeleton, SkeletonCards } from "~/components/ui/skeleton";
import { btnSecondary, iconBtn, inputCls, labelCls } from "~/components/ui/styles";

type TrendTerm = RouterOutputs["demand"]["getTrends"]["terms"][number];

const card =
  "rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800";
const muted = "text-sm text-gray-500 dark:text-gray-400";
const button = btnSecondary;
const input = inputCls;

function formatDate(value: Date | string | null) {
  if (!value) return "never";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function DemandPage() {
  const [tab, setTab] = useState<"searches" | "trends">("searches");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Demand</h1>
        <p className="text-gray-500 dark:text-gray-400">
          What customers look for: searches on your shop and Google search trends in your area.
        </p>
      </div>

      <Tabs
        label="Demand sources"
        items={[
          { key: "searches", label: "Shop searches" },
          { key: "trends", label: "Google Trends" },
        ]}
        value={tab}
        onChange={setTab}
      >
        {tab === "searches" ? <SearchesTab /> : <TrendsTab />}
      </Tabs>
    </div>
  );
}

function SearchesTab() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error, refetch, isRefetching } = api.demand.getSearchInsights.useQuery({ days });

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Period" className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={days === d}
            onClick={() => setDays(d)}
            className={cn(button, days === d && "border-[var(--brand-primary-500)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] dark:border-[var(--brand-primary-500)] dark:bg-[var(--brand-primary-900)]/30 dark:text-[var(--brand-primary-300)]")}
          >
            Last {d} days
          </button>
        ))}
      </div>

      {error ? (
        <LoadError message={error.message} onRetry={() => void refetch()} retrying={isRefetching} />
      ) : isLoading || !data ? (
        <div className="space-y-6">
          <SkeletonCards count={3} label="Loading searches" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : data.totals.searches === 0 ? (
        <div className={card}>
          <p className={muted}>
            No shop searches recorded in this period yet. Searches typed into the online shop
            appear here once customers start using it.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Stat label="Searches" value={data.totals.searches} />
            <Stat label="Different terms" value={data.totals.distinctTerms} />
            <Stat
              label="Found nothing"
              value={data.totals.zeroResultSearches}
              note={`${Math.round((data.totals.zeroResultSearches / data.totals.searches) * 100)}% of searches`}
            />
          </div>

          <div className={card}>
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Searches per day</h3>
            <div className="h-56 text-gray-500 dark:text-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily}>
                  <XAxis dataKey="day" fontSize={12} tick={{ fill: "currentColor" }} />
                  <YAxis allowDecimals={false} fontSize={12} tick={{ fill: "currentColor" }} />
                  <Tooltip />
                  <Bar dataKey="searches" name="Searches" fill="var(--brand-primary-600)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="zeroResultSearches" name="Found nothing" fill="var(--brand-primary-300)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TermTable
              title="Searched but not found"
              hint="Customers wanted these and the shop showed nothing. Consider stocking them or listing what you already have."
              rows={data.unmet.map((t) => ({ term: t.term, count: t.zeroResultSearches, total: t.searches }))}
              countLabel="Not found"
              createProductLinks
            />
            <TermTable
              title="Most searched"
              rows={data.topTerms.map((t) => ({ term: t.term, count: t.searches, total: t.searches }))}
              countLabel="Searches"
            />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className={card}>
      <h3 className={muted}>{label}</h3>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</div>
      {note && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{note}</p>}
    </div>
  );
}

function TermTable({
  title,
  hint,
  rows,
  countLabel,
  createProductLinks = false,
}: {
  title: string;
  hint?: string;
  rows: { term: string; count: number; total: number }[];
  countLabel: string;
  /** Offer "Create product" prefilled with the term (for unmet searches). */
  createProductLinks?: boolean;
}) {
  return (
    <div className={card}>
      <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      {hint && <p className={`mt-1 ${muted}`}>{hint}</p>}
      {rows.length === 0 ? (
        <p className={`mt-4 ${muted}`}>Nothing yet.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th className="pb-2 font-medium">Term</th>
              <th className="pb-2 text-right font-medium">{countLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.term} className="border-t border-gray-100 dark:border-gray-700">
                <td className="py-2 text-gray-900 dark:text-white">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{r.term}</span>
                    {createProductLinks && (
                      <Link
                        href={`/inventory/products/new?name=${encodeURIComponent(r.term)}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-primary-600)] hover:underline dark:text-[var(--brand-primary-400)]"
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                        Create product
                      </Link>
                    )}
                  </div>
                </td>
                <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TrendsTab() {
  const utils = api.useUtils();
  const confirm = useConfirm();
  const { data, isLoading, error, refetch, isRefetching } = api.demand.getTrends.useQuery();
  const refresh = api.demand.refreshNow.useMutation({
    onSuccess: (r) => {
      if (r.status === "OK") toast.success(`Updated ${r.termsUpdated} terms`);
      else if (r.status === "PARTIAL") toast.warning(`Updated ${r.termsUpdated} terms before Google blocked the rest`);
      else toast.error(r.error ?? "Refresh failed");
      void utils.demand.getTrends.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const setActive = api.demand.setTermActive.useMutation({
    onSuccess: () => utils.demand.getTrends.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const remove = api.demand.removeTerm.useMutation({
    onSuccess: () => {
      toast.success("Term removed");
      void utils.demand.getTrends.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const confirmRemove = async (t: { id: number; term: string }) => {
    const ok = await confirm({
      title: `Remove "${t.term}"?`,
      message: "Its saved trend history is deleted. You can add the term again later.",
      confirmLabel: "Remove term",
      destructive: true,
    });
    if (ok) remove.mutate({ id: t.id });
  };

  if (error) return <LoadError message={error.message} onRetry={() => void refetch()} retrying={isRefetching} />;
  if (isLoading || !data)
    return (
      <div role="status" aria-label="Loading trends" className="space-y-6">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );

  const anchors = data.terms.filter((t) => t.kind === "ANCHOR" && t.isActive);
  const compare = data.terms
    .filter((t) => t.kind === "COMPARE")
    .sort((a, b) => (b.yearScore ?? -1) - (a.yearScore ?? -1));
  const seeds = data.terms.filter((t) => t.kind === "SEED");
  const lastRun = data.runs[0];

  return (
    <div className="space-y-6">
      <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <p className="text-sm text-gray-900 dark:text-white">
            Last updated: <strong>{formatDate(data.lastSuccess)}</strong>
          </p>
          <p className={muted}>
            Refreshes automatically each day, a few terms at a time.
            {anchors.length > 0 &&
              ` Scores compare each term with ${anchors.map((a) => `"${a.term}" (${a.geo})`).join(", ")} = 100.`}
          </p>
        </div>
        <button type="button" className={button} disabled={refresh.isPending} onClick={() => refresh.mutate()}>
          <RefreshCw className={`h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
          {refresh.isPending ? "Refreshing…" : "Refresh now"}
        </button>
      </div>

      {lastRun && lastRun.status !== "OK" && (
        <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">
              Last refresh ({formatDate(lastRun.startedAt)}):{" "}
              {lastRun.status === "BLOCKED"
                ? "Google temporarily blocked the request."
                : lastRun.status === "PARTIAL"
                  ? "some terms could not be updated."
                  : "the refresh failed."}
            </p>
            <p>
              The figures below are from the last successful update. Google Trends has no free
              official API, so blocks happen; the next daily run usually succeeds.
              {lastRun.error && ` (${lastRun.error})`}
            </p>
          </div>
        </div>
      )}

      {data.terms.length > 0 && anchors.length === 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Add an anchor term for each region below; compared terms are only fetched once their region has one.
        </p>
      )}

      <div className={card}>
        <h3 className="font-semibold text-gray-900 dark:text-white">Ranked terms</h3>
        <p className={`mt-1 ${muted}`}>
          “12 months” and “last 8 weeks” are search interest as a % of the anchor. Momentum compares the two.
        </p>
        {compare.length === 0 ? (
          <p className={`mt-4 ${muted}`}>No terms yet. Add some below.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-2 font-medium">Term</th>
                  <th className="pb-2 text-right font-medium">12 months</th>
                  <th className="pb-2 text-right font-medium">Last 8 weeks</th>
                  <th className="pb-2 font-medium">Momentum</th>
                  <th className="pb-2 font-medium">Trend</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {compare.map((t) => (
                  <TrendRow
                    key={t.id}
                    term={t}
                    onToggle={() => setActive.mutate({ id: t.id, isActive: !t.isActive })}
                    onRemove={() => void confirmRemove(t)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {seeds.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {seeds.map((s) => (
            <div key={s.id} className={`${card} ${s.isActive ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    <Search className="mr-1 inline h-4 w-4" />
                    {s.term} <span className={muted}>({s.geo})</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Updated {formatDate(s.fetchedAt)}</p>
                </div>
                <button
                  type="button"
                  className={`${iconBtn} text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20`}
                  aria-label={`Remove ${s.term}`}
                  onClick={() => void confirmRemove(s)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {!s.related ? (
                <p className={`mt-4 ${muted}`}>Not fetched yet.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <RelatedList title="Rising" items={s.related.rising.map((r) => [r.query, r.value])} />
                  <RelatedList title="Top" items={s.related.top.map((r) => [r.query, String(r.value)])} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddTermsForm />
    </div>
  );
}

function MomentumBadge({ value }: { value: TrendTerm["momentum"] }) {
  const map = {
    rising: ["text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300", TrendingUp, "Rising"],
    falling: ["text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300", TrendingDown, "Falling"],
    steady: ["text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300", Minus, "Steady"],
    unknown: ["text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400", Minus, "Too little data"],
  } as const;
  const [cls, Icon, label] = map[value];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function TrendRow({ term, onToggle, onRemove }: { term: TrendTerm; onToggle: () => void; onRemove: () => void }) {
  return (
    <tr className={`border-t border-gray-100 dark:border-gray-700 ${term.isActive ? "" : "opacity-50"}`}>
      <td className="py-2 text-gray-900 dark:text-white">
        {term.term} <span className="text-xs text-gray-400">{term.geo}</span>
      </td>
      <td className="py-2 text-right tabular-nums">{term.yearScore ?? "–"}</td>
      <td className="py-2 text-right tabular-nums">{term.recentScore ?? "–"}</td>
      <td className="py-2">
        <MomentumBadge value={term.momentum} />
      </td>
      <td className="w-32 py-2">
        {term.series && term.series.length > 0 && (
          <div className="h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={term.series}>
                <Line type="monotone" dataKey="value" stroke="var(--brand-primary-600)" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={onToggle}
            aria-label={`${term.isActive ? "Pause" : "Resume"} ${term.term}`}
          >
            {term.isActive ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            className={`${iconBtn} text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20`}
            aria-label={`Remove ${term.term}`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function RelatedList({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-2 font-medium text-gray-700 dark:text-gray-300">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">Not enough data</p>
      ) : (
        <ul className="space-y-1">
          {items.map(([q, v]) => (
            <li key={q} className="flex justify-between gap-2">
              <span className="text-gray-900 dark:text-white">{q}</span>
              <span className="shrink-0 text-xs text-gray-500">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddTermsForm() {
  const utils = api.useUtils();
  const [text, setText] = useState("");
  const [geo, setGeo] = useState("");
  const [kind, setKind] = useState<"COMPARE" | "SEED" | "ANCHOR">("COMPARE");
  const add = api.demand.addTerms.useMutation({
    onSuccess: (r) => {
      toast.success(`Saved ${r.added} term${r.added === 1 ? "" : "s"}. They will be fetched on the next refresh.`);
      setText("");
      void utils.demand.getTrends.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const terms = text
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  return (
    <div className={card}>
      <h3 className="font-semibold text-gray-900 dark:text-white">Add terms</h3>
      <p className={`mt-1 ${muted}`}>
        <strong>Ranked</strong> terms are scored against the region’s anchor. <strong>Explore</strong> terms
        show the top and rising searches around them. The <strong>anchor</strong> is the yardstick (one per
        region). Region uses Google Trends codes: a country such as <code>NG</code>, or a state such as{" "}
        <code>NG-DE</code>.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_200px]">
        <label className={labelCls}>
          Terms
          <textarea
          className={`mt-1 ${input} h-32`}
          placeholder={"One term per line, e.g.\nlithium battery\nhybrid inverter"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="space-y-3">
          <label className={labelCls}>
            Type
            <select className={`mt-1 ${input}`} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="COMPARE">Ranked</option>
              <option value="SEED">Explore</option>
              <option value="ANCHOR">Anchor</option>
            </select>
          </label>
          <label className={labelCls}>
            Region
            <input className={`mt-1 ${input}`} placeholder="e.g. NG-DE" value={geo} onChange={(e) => setGeo(e.target.value)} />
          </label>
          <button
            type="button"
            className={`${button} w-full`}
            disabled={terms.length === 0 || !geo.trim() || add.isPending}
            onClick={() => add.mutate({ terms, geo, kind })}
          >
            Add {terms.length || ""} {terms.length === 1 ? "term" : "terms"}
          </button>
        </div>
      </div>
    </div>
  );
}
