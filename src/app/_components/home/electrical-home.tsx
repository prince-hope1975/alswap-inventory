import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BatteryCharging,
  Cable,
  ChevronRight,
  CircuitBoard,
  Drill,
  Fan,
  Headphones,
  Lightbulb,
  MapPin,
  Phone,
  PlugZap,
  ShieldCheck,
  ShoppingBag,
  Sun,
  Wrench,
  Zap,
} from "lucide-react";

type HomeTenant = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logo?: string | null;
};

const departments = [
  { name: "Cables & wiring", detail: "Copper cables, flex, conduits and fittings", icon: Cable },
  { name: "Lighting", detail: "Lamps, fittings and energy-saving solutions", icon: Lightbulb },
  { name: "Power & protection", detail: "Breakers, changeovers, stabilisers and UPS", icon: CircuitBoard },
  { name: "Tools & testing", detail: "Meters, hand tools and site equipment", icon: Drill },
  { name: "Cooling", detail: "Fans, controls, capacitors and accessories", icon: Fan },
  { name: "Solar & backup", detail: "Panels, inverters, batteries and installation", icon: BatteryCharging },
];

const services = [
  { icon: Wrench, label: "Project sourcing", text: "Send your bill of quantities. We help source compatible materials for the job." },
  { icon: Sun, label: "Solar sizing", text: "Get a practical system estimate based on the appliances you actually use." },
  { icon: Headphones, label: "Product guidance", text: "Talk to a real electrical retailer before choosing ratings, sizes or replacements." },
];

export function ElectricalHome({ tenant }: { tenant: HomeTenant }) {
  const phoneHref = tenant.phone ? `tel:${tenant.phone.replace(/\s+/g, "")}` : "/find-us";

  return (
    <main className="min-h-screen bg-[#f5f3ed] text-[#14212b]">
      <div className="bg-[#112b3c] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-white sm:text-sm">
        Reliable electrical supplies for homes, shops and project sites
      </div>

      <header className="border-b border-[#14212b]/15 bg-[#f5f3ed]">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-5 px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label={`${tenant.name} home`}>
            {tenant.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logo} alt="" className="h-11 w-11 rounded-sm object-contain" />
            ) : (
              <span className="grid h-11 w-11 place-items-center bg-[#f5a623] text-[#14212b]"><PlugZap className="h-6 w-6" /></span>
            )}
            <span className="max-w-48 text-lg font-black uppercase leading-tight tracking-[-0.02em]">{tenant.name}</span>
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-7 text-sm font-bold md:flex">
            <Link href="/shop" className="hover:text-[#0b6e99]">Shop</Link>
            <Link href="/#services" className="hover:text-[#0b6e99]">Services</Link>
            <Link href="/solar" className="hover:text-[#0b6e99]">Solar</Link>
            <Link href="/about" className="hover:text-[#0b6e99]">About</Link>
            <Link href="/find-us" className="hover:text-[#0b6e99]">Find us</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href={phoneHref} className="hidden min-h-11 items-center gap-2 border border-[#14212b] px-4 text-sm font-bold transition hover:bg-[#14212b] hover:text-white sm:inline-flex">
              <Phone className="h-4 w-4" /> Call store
            </Link>
            <Link href="/shop" className="inline-flex min-h-11 items-center gap-2 bg-[#f5a623] px-4 text-sm font-black text-[#14212b] transition hover:bg-[#ffc04d]">
              <ShoppingBag className="h-4 w-4" /> Shop products
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#14212b]/15">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#14212b_1px,transparent_1px),linear-gradient(90deg,#14212b_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative mx-auto grid max-w-7xl lg:grid-cols-[1.15fr_0.85fr]">
          <div className="px-5 py-20 sm:py-28 lg:border-r lg:border-[#14212b]/15 lg:px-8 lg:py-32">
            <div className="mb-7 inline-flex items-center gap-2 border border-[#0b6e99]/30 bg-[#dcecf2] px-3 py-2 text-xs font-black uppercase tracking-[0.15em] text-[#07597d]">
              <BadgeCheck className="h-4 w-4" /> Local stock. Practical advice.
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.93] tracking-[-0.055em] text-[#14212b] sm:text-7xl lg:text-[5.5rem]">
              Electrical supplies that fit the job.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#41515c] sm:text-xl">
              Dependable cables, lighting, tools, power protection and solar equipment—backed by people who understand what they sell.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/shop" className="inline-flex min-h-13 items-center justify-center gap-3 bg-[#112b3c] px-6 font-black text-white transition hover:bg-[#0b6e99]">
                Shop products <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/solar" className="inline-flex min-h-13 items-center justify-center gap-3 border-2 border-[#14212b] px-6 font-black transition hover:bg-white">
                Size a solar system <Sun className="h-5 w-5 text-[#d88700]" />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[440px] bg-[#112b3c] p-5 text-white sm:p-8 lg:min-h-full">
            <div className="absolute right-8 top-8 text-[#f5a623]"><Zap className="h-20 w-20 stroke-[1.2]" /></div>
            <div className="flex h-full flex-col justify-end">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#f5a623]">Built for real work</p>
              <p className="max-w-md text-3xl font-black leading-tight sm:text-4xl">From a replacement plug to a complete site order.</p>
              <div className="mt-10 grid grid-cols-2 border-l border-t border-white/25">
                {[['20+', 'product categories'], ['Fast', 'local fulfilment'], ['Direct', 'store support'], ['Trusted', 'product selection']].map(([value, label]) => (
                  <div key={label} className="border-b border-r border-white/25 p-5">
                    <strong className="block text-2xl text-[#f5a623]">{value}</strong>
                    <span className="mt-1 block text-xs uppercase tracking-wider text-white/65">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b6e99]">Browse the counter</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">What are you working on?</h2></div>
          <Link href="/shop" className="inline-flex items-center gap-2 font-black text-[#07597d]">View full shop <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid border-l border-t border-[#14212b]/20 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => (
            <Link key={department.name} href={`/shop?search=${encodeURIComponent(department.name)}`} className="group min-h-56 border-b border-r border-[#14212b]/20 bg-[#faf9f5] p-7 transition hover:bg-white">
              <department.icon className="h-9 w-9 text-[#d88700]" strokeWidth={1.7} />
              <h3 className="mt-9 text-xl font-black">{department.name}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-[#5c6870]">{department.detail}</p>
              <ChevronRight className="mt-5 h-5 w-5 transition-transform group-hover:translate-x-2" />
            </Link>
          ))}
        </div>
      </section>

      <section id="services" className="bg-[#dcecf2] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#07597d]">More than a shelf</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Support before and after you buy.</h2><p className="mt-6 leading-7 text-[#41515c]">Wrong ratings and mismatched components waste time. Start with the requirement, then choose the product.</p></div>
            <div className="space-y-3">{services.map((service, index) => <div key={service.label} className="grid grid-cols-[48px_1fr] gap-5 border-b border-[#14212b]/20 bg-[#f5f3ed] p-6 sm:grid-cols-[48px_180px_1fr]"><span className="grid h-12 w-12 place-items-center bg-[#112b3c] text-[#f5a623]"><service.icon className="h-6 w-6" /></span><h3 className="self-center text-lg font-black"><span className="mr-2 text-xs text-[#0b6e99]">0{index + 1}</span>{service.label}</h3><p className="self-center text-sm leading-6 text-[#5c6870] sm:col-auto col-start-2">{service.text}</p></div>)}</div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl lg:grid-cols-2">
        <div className="bg-[#f5a623] p-8 sm:p-14"><Sun className="h-10 w-10" /><p className="mt-16 text-xs font-black uppercase tracking-[0.18em]">Solar planning</p><h2 className="mt-3 max-w-lg text-4xl font-black tracking-[-0.04em]">Know what your appliances need before buying.</h2><p className="mt-5 max-w-lg leading-7">Build a quick load estimate, review the recommended capacity, and request a site survey.</p><Link href="/solar" className="mt-8 inline-flex min-h-12 items-center gap-3 bg-[#14212b] px-5 font-black text-white">Start solar estimate <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="bg-[#14212b] p-8 text-white sm:p-14"><ShieldCheck className="h-10 w-10 text-[#71b7d5]" /><p className="mt-16 text-xs font-black uppercase tracking-[0.18em] text-[#71b7d5]">Need help?</p><h2 className="mt-3 max-w-lg text-4xl font-black tracking-[-0.04em]">Talk through the requirement with the store.</h2><p className="mt-5 max-w-lg leading-7 text-white/65">For replacements, bulk quantities or compatibility questions, contact us before placing the order.</p><Link href={phoneHref} className="mt-8 inline-flex min-h-12 items-center gap-3 border border-white/40 px-5 font-black hover:bg-white hover:text-[#14212b]"><Phone className="h-4 w-4" />{tenant.phone ?? "Find our store"}</Link></div>
      </section>

      <footer className="border-t border-[#14212b]/20 px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 sm:flex-row sm:items-end"><div><strong className="text-xl font-black uppercase">{tenant.name}</strong><div className="mt-3 space-y-1 text-sm text-[#5c6870]">{tenant.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{tenant.address}</p>}{tenant.email && <p>{tenant.email}</p>}</div></div><div className="flex gap-5 text-sm font-bold"><Link href="/shop">Shop</Link><Link href="/solar">Solar</Link><Link href="/about">About</Link><Link href="/find-us">Contact</Link></div></div>
      </footer>
    </main>
  );
}
