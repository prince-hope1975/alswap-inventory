import { AlertTriangle, Globe2, Store } from "lucide-react";

export function PublicStoreUnavailable() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f5f3ed] px-5 py-16 text-[#14212b]">
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(#14212b_1px,transparent_1px),linear-gradient(90deg,#14212b_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.07]" />
      <section
        className="relative w-full max-w-3xl border border-[#14212b]/20 bg-[#faf9f5] shadow-[0_24px_90px_rgba(17,43,60,0.12)]"
        aria-labelledby="store-unavailable-title"
      >
        <div className="grid sm:grid-cols-[180px_1fr]">
          <div className="flex min-h-44 items-center justify-center bg-[#112b3c] text-[#f5a623] sm:min-h-full">
            <Store
              aria-hidden="true"
              className="h-16 w-16"
              strokeWidth={1.35}
            />
          </div>
          <div className="p-7 sm:p-10">
            <div className="inline-flex items-center gap-2 bg-[#fff0cf] px-3 py-2 text-xs font-black tracking-[0.14em] text-[#855400] uppercase">
              <AlertTriangle aria-hidden="true" className="h-4 w-4" /> Domain
              not connected
            </div>
            <h1
              id="store-unavailable-title"
              className="mt-6 text-4xl font-black tracking-[-0.045em] sm:text-5xl"
            >
              Store unavailable
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#51606a]">
              No store is connected to this web address. Check the address you
              were given or contact the store directly.
            </p>
            <p className="mt-7 flex items-center gap-2 border-t border-[#14212b]/15 pt-5 text-sm font-bold text-[#07597d]">
              <Globe2 aria-hidden="true" className="h-4 w-4" /> Store owners can
              connect this hostname from Store Settings.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
