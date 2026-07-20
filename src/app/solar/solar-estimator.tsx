"use client";

import { useMemo, useState } from "react";
import { BatteryCharging, Check, Plus, SolarPanel, Zap } from "lucide-react";

import { estimateSolarSystem, type SolarApplianceInput } from "~/lib/domain/solar";

const PRESETS: Array<SolarApplianceInput & { id: string }> = [
  { id: "fan", name: "Standing fan", watts: 75, quantity: 1, hoursPerDay: 8, surgeMultiplier: 1.2 },
  { id: "lights", name: "LED lights", watts: 10, quantity: 6, hoursPerDay: 6, surgeMultiplier: 1 },
  { id: "tv", name: "Television", watts: 120, quantity: 1, hoursPerDay: 6, surgeMultiplier: 1 },
  { id: "fridge", name: "Refrigerator", watts: 180, quantity: 1, hoursPerDay: 12, surgeMultiplier: 2.5 },
  { id: "laptop", name: "Laptop", watts: 65, quantity: 2, hoursPerDay: 8, surgeMultiplier: 1 },
  { id: "pump", name: "Water pump", watts: 750, quantity: 1, hoursPerDay: 1, surgeMultiplier: 2 },
];

const formatPower = (watts: number) => (watts >= 1000 ? `${(watts / 1000).toFixed(1)} kW` : `${watts} W`);
const formatEnergy = (wattHours: number) => `${(wattHours / 1000).toFixed(1)} kWh`;

export function SolarEstimator() {
  const [appliances, setAppliances] = useState<SolarApplianceInput[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const estimate = useMemo(
    () =>
      appliances.length
        ? estimateSolarSystem({ appliances, backupHours: 8, peakSunHours: 5 })
        : null,
    [appliances],
  );

  const addAppliance = (preset: (typeof PRESETS)[number]) => {
    setShowResult(false);
    setAppliances((current) => {
      const existing = current.find((item) => item.name === preset.name);
      if (!existing) return [...current, preset];
      return current.map((item) =>
        item.name === preset.name ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  };

  return (
    <section aria-labelledby="estimator-title" className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr]">
        <div>
          <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
            Load planning tool · Nigeria
          </p>
          <h2 id="estimator-title" className="max-w-xl text-4xl font-black tracking-[-0.04em] text-stone-50 sm:text-6xl">
            Build around what you actually use.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-stone-300">
            Pick appliances. We estimate daily energy, inverter headroom, battery storage and panel capacity—then an electrician verifies your site.
          </p>
          <div className="mt-8 border-l-2 border-amber-400 pl-5 text-sm leading-6 text-stone-400">
            Planning estimate only. Final cable sizing, protection, earthing, roof loading and installation design require a site survey.
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-stone-700 bg-stone-900/90 shadow-2xl shadow-black/30">
          <div className="border-b border-stone-700 px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-stone-500">Step 01</p>
                <h3 className="mt-1 text-xl font-bold text-white">What do you want to power?</h3>
              </div>
              <span aria-live="polite" className="rounded-full bg-stone-800 px-3 py-1 font-mono text-xs text-amber-300">
                {appliances.reduce((sum, item) => sum + item.quantity, 0)} selected
              </span>
            </div>
          </div>

          <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-6">
            {PRESETS.map((preset) => {
              const selected = appliances.find((item) => item.name === preset.name);
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-label={`Add ${preset.name}`}
                  onClick={() => addAppliance(preset)}
                  className="group flex min-h-16 items-center justify-between rounded-2xl border border-stone-700 bg-stone-950 px-4 text-left transition hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <span>
                    <span className="block font-semibold text-stone-100">{preset.name}</span>
                    <span className="font-mono text-xs text-stone-500">{preset.watts}W · {preset.hoursPerDay}h/day</span>
                  </span>
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-stone-800 text-sm font-bold text-stone-200 group-hover:bg-amber-400 group-hover:text-stone-950">
                    {selected ? selected.quantity : <Plus aria-hidden="true" className="h-4 w-4" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-stone-700 p-4 sm:p-6">
            <button
              type="button"
              disabled={!estimate}
              onClick={() => setShowResult(true)}
              className="min-h-12 w-full rounded-full bg-amber-400 px-6 font-black text-stone-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Calculate my system
            </button>
          </div>
        </div>
      </div>

      {showResult && estimate && (
        <div aria-live="polite" className="mt-10 rounded-[2rem] border border-amber-300/30 bg-amber-300 p-1 text-stone-950">
          <div className="rounded-[1.75rem] bg-[#f4ba22] px-6 py-8 sm:px-10">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em]">Planning estimate</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Your starting system</h3>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Zap, label: "Peak demand", value: formatPower(estimate.peakLoadWatts) },
                { icon: BatteryCharging, label: "Battery target", value: formatEnergy(estimate.recommendedBatteryWh) },
                { icon: SolarPanel, label: "Solar array", value: formatPower(estimate.recommendedSolarWatts) },
                { icon: Check, label: "Inverter class", value: formatPower(estimate.recommendedInverterWatts) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl bg-stone-950 p-5 text-white">
                  <Icon aria-hidden="true" className="h-5 w-5 text-amber-300" />
                  <p className="mt-5 font-mono text-xs uppercase tracking-wider text-stone-500">{label}</p>
                  <p className="mt-1 text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowSurvey(true)}
              className="mt-8 min-h-12 rounded-full bg-stone-950 px-7 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Request a site survey
            </button>
          </div>
        </div>
      )}

      {showSurvey && (
        <form
          className="mt-6 grid gap-4 rounded-[2rem] border border-stone-700 bg-stone-900 p-6 sm:grid-cols-2 sm:p-8"
          aria-labelledby="survey-title"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setSubmitState("sending");
            const attribution = Object.fromEntries(
              [...new URLSearchParams(window.location.search)].filter(([key]) => key.startsWith("utm_")),
            );
            const response = await fetch("/api/solar/leads", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                name: form.get("name"),
                phone: form.get("phone"),
                email: form.get("email"),
                location: form.get("location"),
                website: form.get("website"),
                appliances,
                attribution,
              }),
            }).catch(() => null);
            setSubmitState(response?.ok ? "sent" : "error");
          }}
        >
          <div className="sm:col-span-2">
            <h3 id="survey-title" className="text-2xl font-black text-white">Save estimate and request survey</h3>
            <p className="mt-2 text-stone-400">Our team confirms location and an available electrician before booking.</p>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Full name
            <input required name="name" autoComplete="name" className="min-h-12 rounded-xl border border-stone-600 bg-stone-950 px-4 text-white focus:border-amber-300 focus:outline-none" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Email <span className="font-normal text-stone-500">(optional)</span>
            <input name="email" type="email" autoComplete="email" className="min-h-12 rounded-xl border border-stone-600 bg-stone-950 px-4 text-white focus:border-amber-300 focus:outline-none" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200">
            Phone or WhatsApp
            <input required name="phone" inputMode="tel" autoComplete="tel" className="min-h-12 rounded-xl border border-stone-600 bg-stone-950 px-4 text-white focus:border-amber-300 focus:outline-none" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-200 sm:col-span-2">
            Installation location
            <input required name="location" autoComplete="street-address" className="min-h-12 rounded-xl border border-stone-600 bg-stone-950 px-4 text-white focus:border-amber-300 focus:outline-none" />
          </label>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <button disabled={submitState === "sending" || submitState === "sent"} type="submit" className="min-h-12 rounded-full bg-amber-400 px-7 font-black text-stone-950 disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
            {submitState === "sending" ? "Sending…" : submitState === "sent" ? "Survey request received" : "Send survey request"}
          </button>
          <p role="status" aria-live="polite" className="text-sm text-stone-300 sm:col-span-2">
            {submitState === "sent" && "Our team will call or message you to confirm a suitable survey slot."}
            {submitState === "error" && "We could not save the request. Check your details or contact the store directly."}
          </p>
        </form>
      )}
    </section>
  );
}
