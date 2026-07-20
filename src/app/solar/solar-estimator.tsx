"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  Check,
  ChevronDown,
  CircleAlert,
  Gauge,
  Minus,
  Plus,
  SolarPanel,
  Trash2,
  Zap,
} from "lucide-react";

import {
  estimateSolarSystem,
  type SolarApplianceInput,
} from "~/lib/domain/solar";

const PRESETS: Array<SolarApplianceInput & { id: string }> = [
  {
    id: "fan",
    name: "Standing fan",
    watts: 75,
    quantity: 1,
    hoursPerDay: 8,
    surgeMultiplier: 1.2,
  },
  {
    id: "lights",
    name: "LED lights",
    watts: 10,
    quantity: 6,
    hoursPerDay: 6,
    surgeMultiplier: 1,
  },
  {
    id: "tv",
    name: "Television",
    watts: 120,
    quantity: 1,
    hoursPerDay: 6,
    surgeMultiplier: 1,
  },
  {
    id: "fridge",
    name: "Refrigerator",
    watts: 180,
    quantity: 1,
    hoursPerDay: 12,
    surgeMultiplier: 2.5,
  },
  {
    id: "laptop",
    name: "Laptop",
    watts: 65,
    quantity: 2,
    hoursPerDay: 8,
    surgeMultiplier: 1,
  },
  {
    id: "pump",
    name: "Water pump",
    watts: 750,
    quantity: 1,
    hoursPerDay: 1,
    surgeMultiplier: 2,
  },
];

const formatPower = (watts: number) =>
  watts >= 1000 ? `${(watts / 1000).toFixed(1)} kW` : `${watts} W`;
const formatEnergy = (wattHours: number) =>
  `${(wattHours / 1000).toFixed(1)} kWh`;
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2";

export function SolarEstimator() {
  const [appliances, setAppliances] = useState<SolarApplianceInput[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [submitState, setSubmitState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [requestId, setRequestId] = useState<string | null>(null);

  const estimate = useMemo(
    () =>
      appliances.length
        ? estimateSolarSystem({ appliances, backupHours: 8, peakSunHours: 5 })
        : null,
    [appliances],
  );

  const selectedCount = appliances.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const addAppliance = (appliance: SolarApplianceInput) => {
    setShowSurvey(false);
    setSubmitState("idle");
    setAppliances((current) => {
      const existing = current.find(
        (item) =>
          item.name.toLocaleLowerCase() === appliance.name.toLocaleLowerCase(),
      );
      if (!existing) return [...current, appliance];
      return current.map((item) =>
        item.name === existing.name
          ? { ...item, quantity: item.quantity + appliance.quantity }
          : item,
      );
    });
  };

  const updateAppliance = (
    name: string,
    change: Partial<SolarApplianceInput>,
  ) => {
    setAppliances((current) =>
      current.map((item) =>
        item.name === name ? { ...item, ...change } : item,
      ),
    );
  };

  const changeQuantity = (name: string, amount: number) => {
    setAppliances((current) =>
      current.flatMap((item) => {
        if (item.name !== name) return [item];
        const quantity = item.quantity + amount;
        return quantity > 0 ? [{ ...item, quantity }] : [];
      }),
    );
  };

  const removeAppliance = (name: string) => {
    setAppliances((current) => current.filter((item) => item.name !== name));
  };

  return (
    <section
      aria-labelledby="estimator-title"
      className="bg-[#eef4f6] py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="text-xs font-black tracking-[0.18em] text-[#07597d] uppercase">
            Solar load planner · Nigeria
          </p>
          <h2
            id="estimator-title"
            className="mt-3 text-4xl font-black tracking-[-0.045em] text-[#14212b] sm:text-5xl lg:text-6xl"
          >
            Start with what must stay on.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#41515c]">
            Add your everyday appliances. Your starting system updates instantly
            as the load changes.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <div className="border border-[#14212b]/15 bg-[#faf9f5] shadow-[0_18px_70px_rgba(17,43,60,0.08)]">
            <div className="flex flex-col gap-3 border-b border-[#14212b]/15 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <p className="text-[11px] font-black tracking-[0.17em] text-[#0b6e99] uppercase">
                  Step 01
                </p>
                <h3 className="mt-1 text-xl font-black text-[#14212b]">
                  Choose common appliances
                </h3>
              </div>
              <span
                aria-live="polite"
                className="w-fit bg-[#dcecf2] px-3 py-2 text-xs font-black text-[#07597d]"
              >
                {selectedCount} {selectedCount === 1 ? "item" : "items"} in plan
              </span>
            </div>

            <div className="grid gap-px bg-[#14212b]/15 sm:grid-cols-2 xl:grid-cols-3">
              {PRESETS.map((preset) => {
                const selected = appliances.find(
                  (item) => item.name === preset.name,
                );
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-label={`Add ${preset.name}`}
                    onClick={() => addAppliance(preset)}
                    className={`group min-h-28 cursor-pointer bg-[#faf9f5] p-5 text-left transition-colors duration-200 hover:bg-white ${focusRing}`}
                  >
                    <span className="flex items-start justify-between gap-4">
                      <span>
                        <span className="block font-black text-[#14212b]">
                          {preset.name}
                        </span>
                        <span className="mt-2 block text-sm text-[#5c6870]">
                          {preset.watts}W · {preset.hoursPerDay}h/day
                        </span>
                      </span>
                      <span
                        className={`grid h-9 min-w-9 place-items-center border text-sm font-black transition-colors ${selected ? "border-[#0b6e99] bg-[#0b6e99] text-white" : "border-[#14212b]/20 text-[#14212b] group-hover:border-[#f5a623] group-hover:bg-[#f5a623]"}`}
                      >
                        {selected ? (
                          selected.quantity
                        ) : (
                          <Plus aria-hidden="true" className="h-4 w-4" />
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-[#14212b]/15 p-5 sm:p-7">
              <button
                type="button"
                aria-expanded={showCustom}
                onClick={() => setShowCustom((current) => !current)}
                className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-4 text-left font-black text-[#07597d] ${focusRing}`}
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add custom appliance
                </span>
                <ChevronDown
                  className={`h-5 w-5 transition-transform duration-200 ${showCustom ? "rotate-180" : ""}`}
                />
              </button>

              {showCustom && (
                <form
                  className="mt-5 grid gap-4 border-t border-[#14212b]/15 pt-5 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    addAppliance({
                      name: String(form.get("applianceName")).trim(),
                      watts: Number(form.get("watts")),
                      quantity: Number(form.get("quantity")),
                      hoursPerDay: Number(form.get("hoursPerDay")),
                      surgeMultiplier: 1,
                    });
                    event.currentTarget.reset();
                    setShowCustom(false);
                  }}
                >
                  <label className="grid gap-2 text-sm font-bold text-[#31414c] sm:col-span-2">
                    Appliance name
                    <input
                      required
                      name="applianceName"
                      maxLength={120}
                      placeholder="e.g. Freezer"
                      className={`min-h-12 border border-[#14212b]/25 bg-white px-4 text-base text-[#14212b] placeholder:text-[#71808a] ${focusRing}`}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#31414c]">
                    Watts
                    <input
                      required
                      name="watts"
                      type="number"
                      min="1"
                      max="20000"
                      inputMode="numeric"
                      placeholder="300"
                      className={`min-h-12 border border-[#14212b]/25 bg-white px-4 text-base text-[#14212b] ${focusRing}`}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#31414c]">
                    Quantity
                    <input
                      required
                      name="quantity"
                      type="number"
                      min="1"
                      max="100"
                      defaultValue="1"
                      inputMode="numeric"
                      className={`min-h-12 border border-[#14212b]/25 bg-white px-4 text-base text-[#14212b] ${focusRing}`}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#31414c] sm:col-span-2">
                    Hours used per day
                    <input
                      required
                      name="hoursPerDay"
                      type="number"
                      min="0.1"
                      max="24"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="8"
                      className={`min-h-12 border border-[#14212b]/25 bg-white px-4 text-base text-[#14212b] ${focusRing}`}
                    />
                  </label>
                  <button
                    type="submit"
                    className={`min-h-12 cursor-pointer bg-[#112b3c] px-5 font-black text-white transition-colors hover:bg-[#0b6e99] sm:col-span-2 sm:justify-self-start ${focusRing}`}
                  >
                    Save appliance
                  </button>
                </form>
              )}
            </div>

            <div className="border-t border-[#14212b]/15 px-5 py-6 sm:px-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black tracking-[0.17em] text-[#0b6e99] uppercase">
                    Step 02
                  </p>
                  <h3 className="mt-1 text-xl font-black text-[#14212b]">
                    Review your load
                  </h3>
                </div>
                {appliances.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAppliances([])}
                    className={`min-h-11 cursor-pointer text-sm font-bold text-[#a33a27] hover:underline ${focusRing}`}
                  >
                    Clear plan
                  </button>
                )}
              </div>

              {appliances.length === 0 ? (
                <div className="mt-5 border border-dashed border-[#14212b]/25 bg-white px-5 py-9 text-center text-[#5c6870]">
                  <Gauge className="mx-auto h-7 w-7 text-[#0b6e99]" />
                  <p className="mt-3 font-bold text-[#31414c]">
                    Your load plan is empty
                  </p>
                  <p className="mt-1 text-sm">
                    Choose an appliance above to begin.
                  </p>
                </div>
              ) : (
                <div className="mt-5 divide-y divide-[#14212b]/15 border-y border-[#14212b]/15">
                  {appliances.map((appliance) => (
                    <div
                      key={appliance.name}
                      className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                    >
                      <div>
                        <p className="font-black text-[#14212b]">
                          {appliance.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#5c6870]">
                          <span>
                            {formatPower(appliance.watts * appliance.quantity)}
                          </span>
                          <label className="flex items-center gap-2">
                            <span className="sr-only">
                              {appliance.name} hours used per day
                            </span>
                            <input
                              aria-label={`${appliance.name} hours used per day`}
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={appliance.hoursPerDay}
                              onChange={(event) =>
                                updateAppliance(appliance.name, {
                                  hoursPerDay: Math.min(
                                    24,
                                    Math.max(0, Number(event.target.value)),
                                  ),
                                })
                              }
                              className={`h-10 w-16 border border-[#14212b]/20 bg-white px-2 text-[#14212b] ${focusRing}`}
                            />
                            h/day
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center border border-[#14212b]/20 bg-white">
                        <button
                          type="button"
                          aria-label={`Decrease ${appliance.name} quantity`}
                          onClick={() => changeQuantity(appliance.name, -1)}
                          className={`grid min-h-11 min-w-11 cursor-pointer place-items-center hover:bg-[#eef4f6] ${focusRing}`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span
                          className="min-w-9 text-center text-sm font-black"
                          aria-label={`${appliance.quantity} ${appliance.name}`}
                        >
                          {appliance.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase ${appliance.name} quantity`}
                          onClick={() => changeQuantity(appliance.name, 1)}
                          className={`grid min-h-11 min-w-11 cursor-pointer place-items-center hover:bg-[#eef4f6] ${focusRing}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${appliance.name}`}
                        onClick={() => removeAppliance(appliance.name)}
                        className={`grid min-h-11 min-w-11 cursor-pointer place-items-center text-[#a33a27] hover:bg-[#fff1ed] ${focusRing}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside aria-live="polite" className="lg:sticky lg:top-6">
            <div className="overflow-hidden bg-[#112b3c] text-white shadow-[0_22px_70px_rgba(17,43,60,0.24)]">
              <div className="border-b border-white/15 p-6 sm:p-7">
                <p className="text-[11px] font-black tracking-[0.17em] text-[#71b7d5] uppercase">
                  Planning estimate
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.035em]">
                  Your starting system
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  Capacity updates as you change your appliance plan.
                </p>
              </div>

              {estimate ? (
                <>
                  <div className="grid grid-cols-2 border-b border-white/15">
                    {[
                      {
                        icon: Zap,
                        label: "Peak demand",
                        value: formatPower(estimate.peakLoadWatts),
                      },
                      {
                        icon: Gauge,
                        label: "Daily energy",
                        value: formatEnergy(estimate.dailyEnergyWh),
                      },
                      {
                        icon: Check,
                        label: "Inverter",
                        value: formatPower(estimate.recommendedInverterWatts),
                      },
                      {
                        icon: BatteryCharging,
                        label: "Battery",
                        value: formatEnergy(estimate.recommendedBatteryWh),
                      },
                      {
                        icon: SolarPanel,
                        label: "Solar array",
                        value: formatPower(estimate.recommendedSolarWatts),
                      },
                      {
                        icon: SolarPanel,
                        label: "550W panels",
                        value: String(estimate.recommendedPanelCount),
                      },
                    ].map(({ icon: Icon, label, value }) => (
                      <div
                        key={label}
                        className="min-h-32 border-r border-b border-white/15 p-5 last:border-b-0 even:border-r-0"
                      >
                        <Icon
                          aria-hidden="true"
                          className="h-5 w-5 text-[#f5a623]"
                        />
                        <p className="mt-5 text-[10px] font-bold tracking-[0.13em] text-white/50 uppercase">
                          {label}
                        </p>
                        <p className="mt-1 text-xl font-black">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 sm:p-7">
                    <button
                      type="button"
                      onClick={() => setShowSurvey(true)}
                      className={`flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 bg-[#f5a623] px-5 font-black text-[#14212b] transition-colors hover:bg-[#ffc04d] ${focusRing}`}
                    >
                      Request a site survey <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="mt-4 flex gap-2 text-xs leading-5 text-white/55">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#f5a623]" />
                      Planning guide only. Final cable, protection, earthing,
                      roof and equipment choices require a site survey.
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-7">
                  <div className="grid min-h-72 place-items-center border border-dashed border-white/25 p-8 text-center">
                    <div>
                      <SolarPanel
                        className="mx-auto h-10 w-10 text-[#f5a623]"
                        strokeWidth={1.5}
                      />
                      <p className="mt-5 font-black">
                        Add your first appliance
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/60">
                        Your inverter, battery and panel estimate will appear
                        here.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="border-x border-b border-[#14212b]/15 bg-[#faf9f5] px-5 py-4 text-xs leading-5 text-[#5c6870]">
              <strong className="text-[#31414c]">Assumptions:</strong> 5
              peak-sun hours, 550W panels, system losses and inverter headroom
              included.
            </div>
          </aside>
        </div>

        {showSurvey && estimate && (
          <form
            className="mt-8 grid gap-5 border border-[#14212b]/15 bg-[#faf9f5] p-6 shadow-[0_18px_70px_rgba(17,43,60,0.08)] sm:grid-cols-2 sm:p-8 lg:p-10"
            aria-labelledby="survey-title"
            onSubmit={async (event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              const form = new FormData(formElement);
              setSubmitState("sending");
              setRequestId(null);
              const attribution = Object.fromEntries(
                [...new URLSearchParams(window.location.search)].filter(
                  ([key]) => key.startsWith("utm_"),
                ),
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
              const payload = response?.ok
                ? ((await response.json().catch(() => null)) as {
                    id?: string;
                  } | null)
                : null;
              if (response?.ok) {
                setRequestId(payload?.id ?? null);
                setSubmitState("sent");
              } else {
                setSubmitState("error");
              }
            }}
          >
            <div className="sm:col-span-2 lg:grid lg:grid-cols-[0.7fr_1.3fr] lg:gap-12">
              <div>
                <p className="text-[11px] font-black tracking-[0.17em] text-[#0b6e99] uppercase">
                  Step 03 · Site verification
                </p>
                <h3
                  id="survey-title"
                  className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#14212b]"
                >
                  Request your site survey
                </h3>
              </div>
              <p className="mt-3 max-w-2xl leading-7 text-[#5c6870] lg:mt-0">
                We confirm your location and arrange an electrician to verify
                the load, installation route, protection, earthing and available
                mounting area.
              </p>
            </div>
            <label className="grid gap-2 text-sm font-bold text-[#31414c]">
              Full name
              <input
                required
                name="name"
                autoComplete="name"
                className={`min-h-12 border border-[#14212b]/25 bg-white px-4 text-base ${focusRing}`}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#31414c]">
              Email{" "}
              <span className="font-normal text-[#71808a]">(optional)</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                className={`min-h-12 border border-[#14212b]/25 bg-white px-4 text-base ${focusRing}`}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#31414c]">
              Phone or WhatsApp
              <input
                required
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                className={`min-h-12 border border-[#14212b]/25 bg-white px-4 text-base ${focusRing}`}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#31414c]">
              Installation location
              <input
                required
                name="location"
                autoComplete="street-address"
                className={`min-h-12 border border-[#14212b]/25 bg-white px-4 text-base ${focusRing}`}
              />
            </label>
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />
            <div className="sm:col-span-2">
              <button
                disabled={submitState === "sending" || submitState === "sent"}
                type="submit"
                className={`min-h-13 cursor-pointer bg-[#112b3c] px-7 font-black text-white transition-colors hover:bg-[#0b6e99] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
              >
                {submitState === "sending"
                  ? "Sending request…"
                  : submitState === "sent"
                    ? "Survey request received"
                    : "Send survey request"}
              </button>
              <p
                role="status"
                aria-live="polite"
                className={`mt-4 text-sm font-semibold ${submitState === "error" ? "text-[#a33a27]" : "text-[#316548]"}`}
              >
                {submitState === "sent" &&
                  `Request saved${requestId ? ` · Reference ${requestId}` : ""}. Our team will call or message you to confirm a suitable survey slot.`}
                {submitState === "error" &&
                  "We could not save the request. Check your details or contact the store directly."}
              </p>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
