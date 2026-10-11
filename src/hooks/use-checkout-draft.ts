"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

const schema = z.object({
  details: z.object({
    name: z.string().max(255),
    email: z.string().max(255),
    phone: z.string().max(50),
  }),
  deliveryChoice: z.enum(["PICKUP", "DELIVERY"]),
  paymentChoice: z.enum(["PAYSTACK", "PAY_ON_PICKUP"]).nullable(),
  deliveryAddress: z.string().max(2000),
});
type Draft = z.infer<typeof schema>;
const empty: Draft = {
  details: { name: "", email: "", phone: "" },
  deliveryChoice: "PICKUP",
  paymentChoice: null,
  deliveryAddress: "",
};

/** Session-only contact details, isolated by origin and tenant; never payment data. */
export function useCheckoutDraft(tenantId?: string) {
  const key = tenantId ? `alswap-checkout:v1:${tenantId}` : null;
  const [state, setState] = useState<{ key: string | null; draft: Draft }>({
    key: null,
    draft: empty,
  });
  const [cleared, setCleared] = useState(false);
  useEffect(() => {
    if (!key) return;
    let draft = empty;
    try {
      const stored = sessionStorage.getItem(key);
      const parsed = schema.safeParse(stored ? JSON.parse(stored) : null);
      if (parsed.success) draft = parsed.data;
    } catch {
      /* Storage may be blocked; keep a working in-memory form. */
    }
    setState({ key, draft });
    setCleared(false);
  }, [key]);
  useEffect(() => {
    if (!key || state.key !== key || cleared) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(state.draft));
    } catch {
      /* Optional persistence. */
    }
  }, [key, state, cleared]);
  const update = useCallback(
    (patch: Partial<Draft>) => {
      setState((previous) => ({
        key,
        draft: { ...(previous.key === key ? previous.draft : empty), ...patch },
      }));
    },
    [key],
  );
  const clear = useCallback(() => {
    setCleared(true);
    if (key) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Optional persistence. */
      }
    }
  }, [key]);
  return {
    draft: state.key === key ? state.draft : empty,
    ready: key !== null && state.key === key,
    update,
    clear,
  };
}
