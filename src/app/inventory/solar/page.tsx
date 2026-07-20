"use client";

import { useState } from "react";
import { ArrowRight, MapPin, Phone, Plus, Sun, UserRound } from "lucide-react";

import { nextSolarLeadStatus, type SolarLeadStatus } from "~/lib/domain/solar-workflow";
import { api } from "~/trpc/react";

const STATUS_LABEL: Record<SolarLeadStatus, string> = {
  NEW: "New",
  SURVEY_REQUESTED: "Survey requested",
  SURVEY_CONFIRMED: "Survey confirmed",
  QUOTED: "Quoted",
  DEPOSIT_PAID: "Deposit paid",
  INSTALLING: "Installing",
  COMPLETED: "Completed",
  LOST: "Lost",
};

export default function SolarProjectsPage() {
  const utils = api.useUtils();
  const leads = api.solar.listLeads.useQuery();
  const installers = api.solar.listInstallers.useQuery();
  const [showInstaller, setShowInstaller] = useState(false);
  const update = api.solar.updateLead.useMutation({ onSuccess: () => utils.solar.listLeads.invalidate() });
  const createInstaller = api.solar.createInstaller.useMutation({
    onSuccess: async () => { await utils.solar.listInstallers.invalidate(); setShowInstaller(false); },
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-3xl bg-stone-950 p-7 text-white sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Survey-to-install pipeline</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Solar projects</h1>
          <p className="mt-2 max-w-2xl text-stone-400">Own every lead from ad estimate through electrician survey, quote, deposit and customer sign-off.</p>
        </div>
        <button onClick={() => setShowInstaller(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber-400 px-5 font-bold text-stone-950">
          <Plus className="h-4 w-4" /> Add installer
        </button>
      </header>

      <section aria-label="Solar lead pipeline" className="grid gap-4 xl:grid-cols-2">
        {leads.isLoading && <p className="text-gray-500">Loading solar leads…</p>}
        {leads.data?.length === 0 && <div className="rounded-3xl border border-dashed p-12 text-center text-gray-500"><Sun className="mx-auto mb-3 h-8 w-8" />No solar leads yet.</div>}
        {leads.data?.map((lead) => {
          const result = lead.estimateResult as { recommendedInverterWatts?: number; recommendedBatteryWh?: number; recommendedPanelCount?: number };
          const next = nextSolarLeadStatus(lead.status);
          return (
            <article key={lead.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-4">
                <div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{STATUS_LABEL[lead.status]}</span><h2 className="mt-3 text-xl font-black text-gray-950 dark:text-white">{lead.name}</h2></div>
                <time className="font-mono text-xs text-gray-500">{new Date(lead.createdAt).toLocaleDateString()}</time>
              </div>
              <div className="mt-5 grid gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-amber-500" />{lead.phone}</p>
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-500" />{lead.location}</p>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-gray-50 p-4 text-center dark:bg-gray-800">
                <div><p className="font-mono text-[10px] uppercase text-gray-500">Inverter</p><p className="mt-1 font-bold">{((result.recommendedInverterWatts ?? 0) / 1000).toFixed(1)}kW</p></div>
                <div><p className="font-mono text-[10px] uppercase text-gray-500">Battery</p><p className="mt-1 font-bold">{((result.recommendedBatteryWh ?? 0) / 1000).toFixed(1)}kWh</p></div>
                <div><p className="font-mono text-[10px] uppercase text-gray-500">Panels</p><p className="mt-1 font-bold">{result.recommendedPanelCount ?? 0}</p></div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border px-3 text-sm"><UserRound className="h-4 w-4" /><span className="sr-only">Assigned installer</span><select value={lead.assignedInstallerId ?? ""} onChange={(event) => update.mutate({ id: lead.id, assignedInstallerId: event.target.value || null })} className="w-full bg-transparent outline-none"><option value="">Unassigned</option>{installers.data?.map((installer) => <option key={installer.id} value={installer.id}>{installer.name}</option>)}</select></label>
                {next && <button disabled={update.isPending} onClick={() => update.mutate({ id: lead.id, status: next })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-bold text-white dark:bg-amber-400 dark:text-stone-950">{STATUS_LABEL[next]} <ArrowRight className="h-4 w-4" /></button>}
              </div>
            </article>
          );
        })}
      </section>

      {showInstaller && <div role="dialog" aria-modal="true" aria-labelledby="installer-title" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); createInstaller.mutate({ name: String(form.get("name")), phone: String(form.get("phone")), email: String(form.get("email")) || undefined }); }} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-7 dark:bg-gray-900"><h2 id="installer-title" className="text-2xl font-black">Add installation partner</h2>{["name", "phone", "email"].map((field) => <label key={field} className="grid gap-2 text-sm font-semibold capitalize">{field}<input required={field !== "email"} type={field === "email" ? "email" : "text"} name={field} className="min-h-11 rounded-xl border bg-transparent px-3" /></label>)}<div className="flex justify-end gap-3"><button type="button" onClick={() => setShowInstaller(false)} className="min-h-11 px-4">Cancel</button><button type="submit" className="min-h-11 rounded-xl bg-amber-400 px-5 font-bold text-stone-950">Save partner</button></div></form></div>}
    </div>
  );
}
