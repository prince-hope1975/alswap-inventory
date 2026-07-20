import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, HardHat, ShieldCheck, Sun } from "lucide-react";

import { SolarEstimator } from "./solar-estimator";

export const metadata: Metadata = {
  title: "Solar Power Sizing & Installation | SPPD AMAKS",
  description:
    "Estimate the inverter, battery and solar panels needed for your home or business, then book a verified installation survey.",
  alternates: { canonical: "/solar" },
  openGraph: {
    title: "Plan a solar system around what you need to power",
    description: "Get a transparent starting estimate and verified electrician site survey.",
    type: "website",
  },
};

export default function SolarPage() {
  return (
    <main id="main-content" className="min-h-screen overflow-hidden bg-[#11110f] text-white">
      <nav aria-label="Solar navigation" className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-stone-950"><Sun aria-hidden="true" /></span>
          <span className="font-black tracking-tight">SPPD AMAKS <span className="text-amber-300">SOLAR</span></span>
        </Link>
        <a href="#estimator" className="flex min-h-11 items-center rounded-full border border-stone-600 px-5 text-sm font-bold hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
          Size my system
        </a>
      </nav>

      <header className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:pb-28 lg:pt-24">
        <div className="relative z-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-amber-300">Solar without guesswork</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.055em] sm:text-7xl lg:text-8xl">
            Power your day.<br /><span className="text-amber-300">Plan it properly.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-stone-300 sm:text-xl">
            Tell us what must stay on. Get a transparent system range, product plan and site survey from an installation partner.
          </p>
          <a href="#estimator" className="mt-9 inline-flex min-h-14 items-center gap-3 rounded-full bg-amber-400 px-7 font-black text-stone-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            Start load estimate <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </a>
        </div>

        <div aria-hidden="true" className="relative min-h-80">
          <div className="absolute inset-4 rotate-6 rounded-[3rem] border border-amber-300/20 bg-[radial-gradient(circle_at_30%_20%,#facc15_0,transparent_30%),linear-gradient(145deg,#292524,#0c0a09)] shadow-2xl shadow-amber-500/10" />
          <div className="absolute bottom-8 left-0 right-8 rounded-3xl border border-white/10 bg-black/50 p-6 backdrop-blur">
            <p className="font-mono text-xs uppercase tracking-widest text-stone-400">Designed for</p>
            <p className="mt-2 text-2xl font-black">Homes · Shops · Offices</p>
          </div>
        </div>
      </header>

      <section aria-label="Service promises" className="border-y border-stone-800 bg-stone-950">
        <div className="mx-auto grid max-w-7xl divide-y divide-stone-800 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
          {[
            [BadgeCheck, "Clear assumptions", "See how load and storage shape the estimate."],
            [HardHat, "Survey verified", "A partner electrician checks the final design."],
            [ShieldCheck, "Tracked installation", "Quote, deposit, milestones and sign-off stay connected."],
          ].map(([Icon, title, copy]) => {
            const PromiseIcon = Icon as typeof BadgeCheck;
            return <div key={String(title)} className="flex gap-4 py-7 sm:px-7"><PromiseIcon aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-amber-300" /><div><h2 className="font-bold">{String(title)}</h2><p className="mt-1 text-sm leading-6 text-stone-400">{String(copy)}</p></div></div>;
          })}
        </div>
      </section>

      <div id="estimator"><SolarEstimator /></div>
    </main>
  );
}
