import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  BatteryCharging,
  Cable,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  HardHat,
  MapPin,
  Phone,
  PlugZap,
  ShieldCheck,
  ShoppingBag,
  SolarPanel,
  Sun,
  Zap,
} from "lucide-react";

import { api } from "~/trpc/server";
import { SolarEstimator } from "./solar-estimator";

export const metadata: Metadata = {
  title: "Solar system sizing and installation survey | SPPD AMAKS",
  description:
    "Estimate the inverter, battery and solar panels needed for your home, shop or office, then request a verified installation survey.",
  alternates: { canonical: "/solar" },
  openGraph: {
    title: "Plan a solar system around what you need to power",
    description:
      "Build a practical load estimate and request an electrician site survey.",
    type: "website",
  },
};

const promises = [
  {
    icon: BadgeCheck,
    title: "Clear assumptions",
    copy: "See the load, daily usage and planning factors behind the recommendation.",
  },
  {
    icon: HardHat,
    title: "Survey verified",
    copy: "An electrician checks the final design, protection, cable route and installation site.",
  },
  {
    icon: ShieldCheck,
    title: "One tracked process",
    copy: "Your estimate moves into the store’s survey-to-install workflow without getting lost.",
  },
];

const steps = [
  {
    number: "01",
    icon: PlugZap,
    title: "List what stays on",
    copy: "Choose common appliances or enter your own wattage and daily usage.",
  },
  {
    number: "02",
    icon: ClipboardCheck,
    title: "Review the starting size",
    copy: "See estimated inverter, battery and panel capacity as your load changes.",
  },
  {
    number: "03",
    icon: HardHat,
    title: "Verify it on site",
    copy: "Request a survey so an electrician can confirm the final design and quotation.",
  },
];

const faqs = [
  {
    question: "Is the online estimate a final solar-system design?",
    answer:
      "No. It is a planning guide based on the appliances and usage you enter. A site survey is required to confirm cable sizes, protection, earthing, equipment compatibility, mounting space and installation conditions.",
  },
  {
    question: "What information should I have before starting?",
    answer:
      "A list of the appliances you need to power, each appliance wattage where available, the quantity, and roughly how many hours each runs per day.",
  },
  {
    question: "Can I size solar for a shop or office?",
    answer:
      "Yes. The planner accepts common and custom loads, so it can provide a starting point for homes, shops and offices. Larger or three-phase systems require additional engineering checks.",
  },
  {
    question: "What happens after I request a survey?",
    answer:
      "The store team reviews the load plan, confirms your location and contacts you to arrange a suitable survey slot with an available installation partner.",
  },
];

export default async function SolarPage() {
  const shopDetails = await api.shop.getShopDetails();
  const tenant = shopDetails.tenant;
  const storeName = tenant?.name ?? "Electrical Store";
  const phoneHref = tenant?.phone
    ? `tel:${tenant.phone.replace(/\s+/g, "")}`
    : "/find-us";
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <main
      id="main-content"
      className="min-h-screen overflow-hidden bg-[#f5f3ed] text-[#14212b]"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="bg-[#112b3c] px-4 py-2 text-center text-xs font-bold tracking-[0.14em] text-white uppercase sm:text-sm">
        Practical solar sizing for homes, shops and offices
      </div>

      <header className="border-b border-[#14212b]/15 bg-[#f5f3ed]">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-5 px-5 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none"
            aria-label={`${storeName} home`}
          >
            {tenant?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo}
                alt=""
                className="h-11 w-11 rounded-sm object-contain"
              />
            ) : (
              <span className="grid h-11 w-11 place-items-center bg-[#f5a623] text-[#14212b]">
                <PlugZap className="h-6 w-6" />
              </span>
            )}
            <span className="max-w-48 text-lg leading-tight font-black tracking-[-0.02em] uppercase">
              {storeName}
            </span>
          </Link>
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-7 text-sm font-bold md:flex"
          >
            <Link
              href="/shop"
              className="transition-colors hover:text-[#0b6e99]"
            >
              Shop
            </Link>
            <Link
              href="/#services"
              className="transition-colors hover:text-[#0b6e99]"
            >
              Services
            </Link>
            <Link
              href="/solar"
              aria-current="page"
              className="border-b-2 border-[#f5a623] py-2"
            >
              Solar
            </Link>
            <Link
              href="/about"
              className="transition-colors hover:text-[#0b6e99]"
            >
              About
            </Link>
            <Link
              href="/find-us"
              className="transition-colors hover:text-[#0b6e99]"
            >
              Find us
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={phoneHref}
              className="hidden min-h-11 items-center gap-2 border border-[#14212b] px-4 text-sm font-bold transition-colors hover:bg-[#14212b] hover:text-white sm:inline-flex"
            >
              <Phone className="h-4 w-4" /> Call store
            </Link>
            <Link
              href="/shop"
              className="inline-flex min-h-11 items-center gap-2 bg-[#f5a623] px-4 text-sm font-black text-[#14212b] transition-colors hover:bg-[#ffc04d]"
            >
              <ShoppingBag className="h-4 w-4" />{" "}
              <span className="hidden sm:inline">Shop products</span>
              <span className="sm:hidden">Shop</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative border-b border-[#14212b]/15">
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(#14212b_1px,transparent_1px),linear-gradient(90deg,#14212b_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.07]" />
        <div className="relative mx-auto grid max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="px-5 py-16 sm:py-24 lg:border-r lg:border-[#14212b]/15 lg:px-8 lg:py-28">
            <div className="inline-flex items-center gap-2 border border-[#0b6e99]/30 bg-[#dcecf2] px-3 py-2 text-xs font-black tracking-[0.15em] text-[#07597d] uppercase">
              <Sun className="h-4 w-4" /> Solar without guesswork
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl leading-[0.94] font-black tracking-[-0.055em] text-[#14212b] sm:text-7xl lg:text-[5.2rem]">
              Plan the load.
              <br />
              <span className="text-[#d88700]">Then plan the system.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#41515c] sm:text-xl">
              Build a practical estimate around the appliances you need every
              day—then have the final design checked on site.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#estimator"
                className="inline-flex min-h-13 items-center justify-center gap-3 bg-[#112b3c] px-6 font-black text-white transition-colors hover:bg-[#0b6e99] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Build my load plan <ArrowDown className="h-5 w-5" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex min-h-13 items-center justify-center gap-3 border-2 border-[#14212b] px-6 font-black transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none"
              >
                How it works <ChevronRight className="h-5 w-5" />
              </a>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm font-bold text-[#51606a]">
              <CheckCircle2 className="h-4 w-4 text-[#316548]" /> No purchase
              required to create an estimate
            </p>
          </div>

          <div className="relative min-h-[500px] overflow-hidden bg-[#112b3c] p-5 text-white sm:p-8 lg:min-h-full">
            <div
              aria-hidden="true"
              className="absolute inset-0 [background-image:radial-gradient(circle_at_center,#71b7d5_1px,transparent_1px)] [background-size:24px_24px] opacity-20"
            />
            <div className="relative flex h-full min-h-[460px] flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-[0.2em] text-[#71b7d5] uppercase">
                    Energy path
                  </p>
                  <p className="mt-2 max-w-xs text-2xl font-black">
                    A system works as one connected design.
                  </p>
                </div>
                <span className="grid h-14 w-14 place-items-center bg-[#f5a623] text-[#14212b]">
                  <Zap className="h-7 w-7" />
                </span>
              </div>

              <div className="relative my-10">
                <div className="absolute top-1/2 right-[16.5%] left-[16.5%] h-px bg-[#71b7d5]/55" />
                <div className="relative grid grid-cols-3 gap-3">
                  {[
                    {
                      icon: SolarPanel,
                      label: "Generate",
                      detail: "Solar array",
                    },
                    {
                      icon: BatteryCharging,
                      label: "Store",
                      detail: "Battery bank",
                    },
                    { icon: PlugZap, label: "Power", detail: "Your loads" },
                  ].map(({ icon: Icon, label, detail }) => (
                    <div
                      key={label}
                      className="relative border border-white/20 bg-[#112b3c] p-4 text-center sm:p-5"
                    >
                      <span className="mx-auto grid h-12 w-12 place-items-center border border-[#71b7d5]/40 bg-[#0d2230] text-[#f5a623]">
                        <Icon className="h-6 w-6" strokeWidth={1.7} />
                      </span>
                      <strong className="mt-4 block text-sm">{label}</strong>
                      <span className="mt-1 block text-[10px] tracking-wider text-white/50 uppercase">
                        {detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 border-t border-l border-white/20">
                {[
                  ["Load first", "Sizing starts with demand"],
                  ["Survey next", "Design ends on site"],
                ].map(([title, copy]) => (
                  <div
                    key={title}
                    className="border-r border-b border-white/20 p-5"
                  >
                    <strong className="text-[#f5a623]">{title}</strong>
                    <span className="mt-1 block text-xs leading-5 text-white/55">
                      {copy}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Service promises"
        className="border-b border-[#14212b]/15 bg-[#faf9f5]"
      >
        <div className="mx-auto grid max-w-7xl divide-y divide-[#14212b]/15 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-8">
          {promises.map(({ icon: Icon, title, copy }) => (
            <div
              key={title}
              className="flex gap-4 py-7 first:pl-0 last:pr-0 sm:px-6"
            >
              <Icon
                aria-hidden="true"
                className="mt-1 h-6 w-6 shrink-0 text-[#d88700]"
              />
              <div>
                <h2 className="font-black">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-[#5c6870]">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div id="estimator">
        <SolarEstimator />
      </div>

      <section
        id="how-it-works"
        className="border-y border-[#14212b]/15 bg-[#f5f3ed] py-20 lg:py-28"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-[#07597d] uppercase">
                From estimate to installation
              </p>
              <h2 className="mt-3 max-w-xl text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                A useful estimate. A verified final design.
              </h2>
              <p className="mt-6 max-w-lg leading-7 text-[#5c6870]">
                The calculator handles early planning. The site survey handles
                the details that cannot be safely decided through a screen.
              </p>
            </div>
            <div className="grid border-t border-l border-[#14212b]/20 sm:grid-cols-3">
              {steps.map(({ number, icon: Icon, title, copy }) => (
                <article
                  key={number}
                  className="flex min-h-72 flex-col border-r border-b border-[#14212b]/20 bg-[#faf9f5] p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-[0.15em] text-[#0b6e99]">
                      {number}
                    </span>
                    <Icon className="h-6 w-6 text-[#d88700]" />
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-xl font-black">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#5c6870]">
                      {copy}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#faf9f5] py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-[#07597d] uppercase">
              Before you request a survey
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
              Questions, answered plainly.
            </h2>
            <div className="mt-8 border-l-2 border-[#f5a623] pl-5 text-sm leading-6 text-[#5c6870]">
              Need help reading an appliance label? Call the store before
              entering the wattage.
            </div>
          </div>
          <div className="divide-y divide-[#14212b]/15 border-y border-[#14212b]/15">
            {faqs.map((faq, index) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-5 font-black text-[#14212b] focus-visible:ring-2 focus-visible:ring-[#0b6e99] focus-visible:outline-none">
                  <span>
                    <span className="mr-3 text-xs text-[#0b6e99]">
                      0{index + 1}
                    </span>
                    {faq.question}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none" />
                </summary>
                <p className="max-w-3xl pt-3 pr-8 pb-2 pl-9 leading-7 text-[#5c6870]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f5a623]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 px-5 py-12 sm:flex-row sm:items-center lg:px-8">
          <div>
            <p className="text-xs font-black tracking-[0.18em] uppercase">
              Prefer to talk first?
            </p>
            <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-[-0.035em] sm:text-4xl">
              Discuss the load with the store before you plan.
            </h2>
          </div>
          <Link
            href={phoneHref}
            className="inline-flex min-h-13 shrink-0 items-center justify-center gap-3 bg-[#14212b] px-6 font-black text-white transition-colors hover:bg-[#0b6e99]"
          >
            <Phone className="h-5 w-5" />
            {tenant?.phone ?? "Find our store"}
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#14212b]/20 bg-[#f5f3ed] px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div>
            <strong className="text-xl font-black uppercase">
              {storeName}
            </strong>
            <div className="mt-3 space-y-1 text-sm text-[#5c6870]">
              {tenant?.address && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {tenant.address}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-bold">
            <Link href="/">Home</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/solar">Solar</Link>
            <Link href="/about">About</Link>
            <Link href="/find-us">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
