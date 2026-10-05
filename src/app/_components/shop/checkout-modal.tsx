"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useCart } from "./cart-context";
import { api } from "~/trpc/react";
import {
  X,
  Loader2,
  MapPin,
  Truck,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Navigation,
  Clock,
  ChevronDown,
} from "lucide-react";
import { useShopCurrency } from "~/hooks/use-tenant-settings";
import {
  toAppleMapsDirectionsUrl,
  toGoogleMapsDirectionsUrl,
} from "~/lib/maps";
import {
  formatOpeningHours,
  validateCheckoutDetails,
  whatsAppUrl,
  type CheckoutErrors,
  type OpeningHours,
} from "~/lib/domain/checkout";
import { trackStorefrontEvent } from "~/components/analytics-consent";

const LocationPicker = dynamic(
  () =>
    import("~/app/_components/maps/location-picker").then(
      (module) => module.LocationPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
        aria-label="Loading map"
      />
    ),
  },
);

type PaystackSetupOptions = {
  key: string;
  email: string;
  amount: number;
  ref?: string;
  access_code?: string;
  callback: (resp: { reference: string }) => void;
  onClose: () => void;
};

type PaystackPop = {
  setup: (opts: PaystackSetupOptions) => { openIframe: () => void };
};

async function loadPaystackScript(): Promise<void> {
  if (typeof window === "undefined") return;
  if ((window as unknown as { PaystackPop?: unknown }).PaystackPop) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.paystack.co/v1/inline.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Paystack script")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Paystack script"));
    document.body.appendChild(s);
  });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

type OrderLine = { productId: string; name: string; quantity: number; price: number };

type PlacedOrder = {
  orderNumber: string;
  total: number;
  lines: OrderLine[];
  deliveryMethod: "PICKUP" | "DELIVERY";
  paymentMethod: "PAYSTACK" | "PAY_ON_PICKUP";
  needsAttention: boolean;
};

const inputClass =
  "w-full rounded-xl border bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#167da8] focus:ring-1 focus:ring-[#167da8] focus:outline-none dark:bg-white/5 dark:text-white dark:placeholder-gray-500";

function fieldClass(error?: string) {
  return `${inputClass} ${error ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-white/10"}`;
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-600 dark:text-red-400">
      {error}
    </p>
  );
}

export function CheckoutModal({ onClose }: { onClose: () => void }) {
  const { items, totalAmount, clearCart } = useCart();
  const [details, setDetails] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY">(
    "PICKUP",
  );
  const [paymentMethod, setPaymentMethod] = useState<
    "PAYSTACK" | "PAY_ON_PICKUP"
  >("PAYSTACK");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  /** Paystack took the money but we couldn't confirm the order. */
  const [paymentIssue, setPaymentIssue] = useState<{
    reference: string;
    message: string;
  } | null>(null);
  const paidRef = useRef(false);
  const { formatCurrency } = useShopCurrency();

  const { data: shopDetails } = api.shop.getShopDetails.useQuery();
  const tenant = shopDetails?.tenant;
  const storeConfig = tenant?.storeConfig as
    | {
        deliveryFee?: number;
        deliveryPricing?: { type: "flat" | "distance" };
        openingHours?: OpeningHours[];
      }
    | undefined;
  const openingHours = formatOpeningHours(storeConfig?.openingHours);
  const storeCoords =
    tenant?.latitude && tenant?.longitude
      ? { lat: Number(tenant.latitude), lng: Number(tenant.longitude) }
      : null;

  const deferredDeliveryAddress = useDeferredValue(deliveryAddress);

  const shouldEstimate =
    deliveryMethod === "DELIVERY" &&
    storeConfig?.deliveryPricing?.type === "distance" &&
    deferredDeliveryAddress.trim().length >= 5;

  const estimate = api.shop.estimateDeliveryFee.useQuery(
    { deliveryAddress: deferredDeliveryAddress.trim() },
    { enabled: shouldEstimate, retry: false },
  );

  const deliveryFee =
    deliveryMethod === "DELIVERY"
      ? storeConfig?.deliveryPricing?.type === "distance"
        ? Number(estimate.data?.fee ?? 0)
        : Number(storeConfig?.deliveryFee ?? 0)
      : 0;

  const computedTotal = useMemo(() => {
    return Number(totalAmount) + Number(deliveryFee || 0);
  }, [deliveryFee, totalAmount]);
  // Once the server has priced the order, show its number, not our estimate.
  const displayTotal = serverTotal ?? computedTotal;

  const initPaystack = api.shop.initPaystackPayment.useMutation();
  const createOrder = api.shop.createOrder.useMutation();

  const effectivePaymentMethod =
    deliveryMethod === "DELIVERY" ? "PAYSTACK" : paymentMethod;

  // Prices or options changed: any earlier server quote is stale.
  useEffect(() => {
    setServerTotal(null);
  }, [deliveryMethod, deliveryAddress, totalAmount]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isProcessing) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isProcessing, onClose]);

  const validate = () =>
    validateCheckoutDetails(details, {
      method: deliveryMethod,
      address: deliveryAddress,
    });

  const updateDetail = (field: keyof typeof details, value: string) => {
    const next = { ...details, [field]: value };
    setDetails(next);
    if (submitted) {
      setErrors(
        validateCheckoutDetails(next, {
          method: deliveryMethod,
          address: deliveryAddress,
        }),
      );
    }
  };

  const snapshotLines = (): OrderLine[] =>
    items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

  const finishOrder = (order: PlacedOrder) => {
    trackStorefrontEvent("purchase", {
      value: order.total,
      currency: "NGN",
      item_count: order.lines.length,
    });
    setPlaced(order);
    clearCart();
  };

  const confirmPaystackPayment = async (
    reference: string,
    lines: OrderLine[],
  ) => {
    try {
      const result = await createOrder.mutateAsync({
        paymentMethod: "PAYSTACK",
        reference,
      });
      finishOrder({
        orderNumber: result.orderNumber,
        total: result.total,
        lines,
        deliveryMethod,
        paymentMethod: "PAYSTACK",
        needsAttention: result.needsAttention,
      });
    } catch (error) {
      // The money left the customer's account; never leave them guessing.
      setPaymentIssue({
        reference,
        message: errorMessage(error, "We couldn't confirm your order."),
      });
      clearCart();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePay = async () => {
    setSubmitted(true);
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstField = Object.keys(found)[0];
      document.getElementById(`checkout-${firstField}`)?.focus();
      return;
    }
    if (items.length === 0) return;

    const customerDetails = {
      name: details.name.trim(),
      phone: details.phone.trim(),
      email: details.email.trim() || undefined,
    };
    const cartItems = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
    const lines = snapshotLines();

    trackStorefrontEvent("begin_checkout", {
      value: computedTotal,
      currency: "NGN",
      item_count: items.length,
      delivery_method: deliveryMethod.toLowerCase(),
    });

    setIsProcessing(true);
    paidRef.current = false;

    try {
      if (effectivePaymentMethod === "PAY_ON_PICKUP") {
        const result = await createOrder.mutateAsync({
          paymentMethod: "PAY_ON_PICKUP",
          items: cartItems,
          customerDetails,
        });
        finishOrder({
          orderNumber: result.orderNumber,
          total: result.total,
          lines,
          deliveryMethod: "PICKUP",
          paymentMethod: "PAY_ON_PICKUP",
          needsAttention: false,
        });
        setIsProcessing(false);
        return;
      }

      if (!tenant?.paystackPublicKey) {
        throw new Error(
          "Online payment isn't set up for this store yet. Choose Pay on Pickup or contact the store.",
        );
      }

      const init = await initPaystack.mutateAsync({
        items: cartItems,
        customerDetails,
        deliveryMethod,
        deliveryAddress:
          deliveryMethod === "DELIVERY" ? deliveryAddress.trim() : undefined,
      });
      setServerTotal(init.total);
      // Server prices are authoritative for the receipt.
      const pricedLines: OrderLine[] = init.lines.map((line) => ({
        productId: line.productId,
        name: line.name,
        quantity: line.quantity,
        price: line.unitPrice,
      }));

      await loadPaystackScript();
      const pop = (window as unknown as { PaystackPop?: unknown })
        .PaystackPop as PaystackPop | undefined;
      if (!pop) throw new Error("Paystack failed to load. Please try again.");

      const handler = pop.setup({
        key: tenant.paystackPublicKey,
        email: init.email,
        amount: Math.round(init.total * 100),
        access_code: init.accessCode,
        callback: (resp) => {
          paidRef.current = true;
          void confirmPaystackPayment(resp.reference || init.reference, pricedLines);
        },
        onClose: () => {
          if (!paidRef.current) setIsProcessing(false);
        },
      });
      handler.openIframe();
      // isProcessing stays on until the popup closes or payment confirms.
    } catch (error) {
      setFormError(
        errorMessage(error, "Something went wrong. Please try again."),
      );
      setIsProcessing(false);
    }
  };

  const whatsAppPhone = tenant?.phone ?? null;

  if (paymentIssue) {
    return (
      <Shell onClose={onClose} label="Payment received">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-2xl font-bold">Payment received</h2>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Your payment went through, but we couldn&apos;t confirm the order
            automatically. Keep this reference; the store will sort it out.
          </p>
          <p className="mb-6 rounded-xl bg-gray-100 px-4 py-3 font-mono text-sm break-all dark:bg-white/10">
            Ref: {paymentIssue.reference}
          </p>
          {whatsAppPhone && (
            <a
              href={whatsAppUrl(
                whatsAppPhone,
                `Hello, I paid for an order but it wasn't confirmed. Paystack ref: ${paymentIssue.reference}`,
              )}
              target="_blank"
              rel="noreferrer"
              className="mb-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-500"
            >
              <MessageCircle className="h-5 w-5" /> Message the store on WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 w-full rounded-xl border border-gray-200 font-semibold hover:bg-gray-100 dark:border-white/10 dark:hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </Shell>
    );
  }

  if (placed) {
    const itemsText = placed.lines
      .map((line) => `${line.quantity} × ${line.name}`)
      .join(", ");
    return (
      <Shell onClose={onClose} label="Order confirmed">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-500">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Order placed</h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Order <span className="font-mono font-semibold">#{placed.orderNumber}</span>
          </p>
        </div>

        <ul className="mt-6 divide-y divide-gray-200 rounded-xl border border-gray-200 text-sm dark:divide-white/10 dark:border-white/10">
          {placed.lines.map((line) => (
            <li key={line.productId} className="flex justify-between gap-3 px-4 py-3">
              <span>
                {line.quantity} × {line.name}
              </span>
              <span className="shrink-0 font-medium">
                {formatCurrency(line.price * line.quantity)}
              </span>
            </li>
          ))}
          <li className="flex justify-between px-4 py-3 text-base font-bold">
            <span>{placed.paymentMethod === "PAYSTACK" ? "Paid" : "To pay at pickup"}</span>
            <span>{formatCurrency(placed.total)}</span>
          </li>
        </ul>

        {placed.needsAttention && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            Some items sold out just as you paid. The store has been alerted and
            will contact you about a substitute or refund.
          </p>
        )}

        {placed.deliveryMethod === "PICKUP" ? (
          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm dark:bg-white/5">
            <p className="flex items-start gap-2 font-semibold">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {tenant?.address ?? tenant?.location ?? "Pickup at the store"}
            </p>
            {openingHours.length > 0 && (
              <div className="mt-2 flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  {openingHours.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            )}
            {storeCoords && (
              <a
                href={toGoogleMapsDirectionsUrl(storeCoords)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-[#0b6e99] underline-offset-4 hover:underline dark:text-[#8dc5dc]"
              >
                <Navigation className="h-4 w-4" /> Get directions
              </a>
            )}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm dark:bg-white/5">
            We&apos;ll call {details.phone} to arrange delivery.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {whatsAppPhone && (
            <a
              href={whatsAppUrl(
                whatsAppPhone,
                `Hello, please confirm my order #${placed.orderNumber}: ${itemsText}.`,
              )}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-500"
            >
              <MessageCircle className="h-5 w-5" /> Confirm order #{placed.orderNumber} on WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 w-full rounded-xl bg-[#0b6e99] font-semibold text-white transition hover:bg-[#167da8]"
          >
            Continue shopping
          </button>
        </div>
      </Shell>
    );
  }

  const optionClass = (active: boolean, activeColor: string) =>
    `flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
      active
        ? `${activeColor} text-white`
        : "border border-gray-200 bg-white text-gray-800 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
    }`;

  return (
    <Shell onClose={isProcessing ? undefined : onClose} label="Checkout">
      <h2 id="checkout-title" className="mb-4 text-2xl font-bold">
        Checkout
      </h2>

      {/* Order summary */}
      <section aria-label="Order summary" className="mb-5 rounded-xl border border-gray-200 dark:border-white/10">
        <ul className="divide-y divide-gray-200 text-sm dark:divide-white/10">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0">
                <span className="font-medium">{item.quantity} ×</span> {item.name}
              </span>
              <span className="shrink-0">{formatCurrency(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
      </section>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handlePay();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="checkout-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full name
          </label>
          <input
            id="checkout-name"
            type="text"
            autoComplete="name"
            value={details.name}
            onChange={(e) => updateDetail("name", e.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "checkout-name-error" : undefined}
            className={fieldClass(errors.name)}
            placeholder="John Doe"
          />
          <FieldError id="checkout-name-error" error={errors.name} />
        </div>
        <div>
          <label htmlFor="checkout-phone" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone number
          </label>
          <input
            id="checkout-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={details.phone}
            onChange={(e) => updateDetail("phone", e.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "checkout-phone-error" : undefined}
            className={fieldClass(errors.phone)}
            placeholder="0803 000 0000"
          />
          <FieldError id="checkout-phone-error" error={errors.phone} />
        </div>
        <div>
          <label htmlFor="checkout-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email <span className="font-normal text-gray-500">(optional, for a receipt)</span>
          </label>
          <input
            id="checkout-email"
            type="email"
            autoComplete="email"
            value={details.email}
            onChange={(e) => updateDetail("email", e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "checkout-email-error" : undefined}
            className={fieldClass(errors.email)}
            placeholder="you@example.com"
          />
          <FieldError id="checkout-email-error" error={errors.email} />
        </div>

        {/* Delivery method */}
        <fieldset className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <legend className="sr-only">How would you like to receive your order?</legend>
          <p className="mb-3 text-sm font-semibold" aria-hidden="true">
            How would you like to receive your order?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={deliveryMethod === "PICKUP"}
              onClick={() => setDeliveryMethod("PICKUP")}
              className={optionClass(deliveryMethod === "PICKUP", "bg-[#0b6e99]")}
            >
              <MapPin className="h-4 w-4" />
              Pickup
            </button>
            <button
              type="button"
              aria-pressed={deliveryMethod === "DELIVERY"}
              onClick={() => setDeliveryMethod("DELIVERY")}
              className={optionClass(deliveryMethod === "DELIVERY", "bg-[#0b6e99]")}
            >
              <Truck className="h-4 w-4" />
              Delivery
            </button>
          </div>

          {deliveryMethod === "DELIVERY" ? (
            <div className="mt-4">
              <label htmlFor="checkout-deliveryAddress" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Delivery address
              </label>
              <textarea
                id="checkout-deliveryAddress"
                rows={2}
                autoComplete="street-address"
                value={deliveryAddress}
                onChange={(e) => {
                  setDeliveryAddress(e.target.value);
                  if (submitted) {
                    setErrors(
                      validateCheckoutDetails(details, {
                        method: deliveryMethod,
                        address: e.target.value,
                      }),
                    );
                  }
                }}
                aria-invalid={Boolean(errors.deliveryAddress)}
                aria-describedby={errors.deliveryAddress ? "checkout-deliveryAddress-error" : undefined}
                className={fieldClass(errors.deliveryAddress)}
                placeholder="House number, street, area, city"
              />
              <FieldError id="checkout-deliveryAddress-error" error={errors.deliveryAddress} />
            </div>
          ) : (
            <div className="mt-4 text-sm">
              <p className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {tenant?.address ?? tenant?.location ?? "Pickup location is not configured yet."}
              </p>
              {openingHours.length > 0 && (
                <p className="mt-1 flex items-start gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  {openingHours.join(" · ")}
                </p>
              )}
              {storeCoords && (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={toGoogleMapsDirectionsUrl(storeCoords)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 hover:bg-gray-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                    >
                      Directions (Google Maps)
                    </a>
                    <a
                      href={toAppleMapsDirectionsUrl(storeCoords)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 hover:bg-gray-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                    >
                      Apple Maps
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowMap((open) => !open)}
                      aria-expanded={showMap}
                      className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-[#0b6e99] hover:underline dark:text-[#8dc5dc]"
                    >
                      {showMap ? "Hide map" : "Show map"}
                      <ChevronDown className={`h-4 w-4 transition ${showMap ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {showMap && (
                    <div className="mt-3">
                      <LocationPicker
                        label="Pickup location"
                        readOnly={true}
                        value={{
                          ...storeCoords,
                          address: tenant?.address ?? undefined,
                        }}
                        onChange={() => {
                          // read-only
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </fieldset>

        {/* Payment method */}
        <fieldset className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <legend className="sr-only">Payment</legend>
          <p className="mb-3 text-sm font-semibold" aria-hidden="true">
            Payment
          </p>
          {deliveryMethod === "DELIVERY" ? (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
              Delivery orders are paid online (Paystack).
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={paymentMethod === "PAYSTACK"}
                onClick={() => setPaymentMethod("PAYSTACK")}
                className={optionClass(paymentMethod === "PAYSTACK", "bg-green-600")}
              >
                <CreditCard className="h-4 w-4" />
                Pay online
              </button>
              <button
                type="button"
                aria-pressed={paymentMethod === "PAY_ON_PICKUP"}
                onClick={() => setPaymentMethod("PAY_ON_PICKUP")}
                className={optionClass(paymentMethod === "PAY_ON_PICKUP", "bg-green-600")}
              >
                <Wallet className="h-4 w-4" />
                Pay on pickup
              </button>
            </div>
          )}
        </fieldset>

        <div className="border-t border-gray-200 pt-4 dark:border-white/10">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Subtotal</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
          {deliveryMethod === "DELIVERY" && (
            <div className="mt-2 flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Delivery fee</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          {deliveryMethod === "DELIVERY" &&
            storeConfig?.deliveryPricing?.type === "distance" && (
              <div className="mt-1 text-xs text-gray-500">
                {estimate.isFetching
                  ? "Estimating delivery fee..."
                  : estimate.error
                    ? "Could not estimate delivery fee (we'll confirm before you pay)."
                    : estimate.data?.distanceKm != null
                      ? `Estimated distance: ${estimate.data.distanceKm.toFixed(1)} km`
                      : null}
              </div>
            )}
          <div className="mt-2 flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>{formatCurrency(displayTotal)}</span>
          </div>
          {serverTotal != null && serverTotal !== computedTotal && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Total updated to the store&apos;s current prices.
            </p>
          )}
        </div>

        {formError && (
          <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || items.length === 0}
          className="flex min-h-14 w-full items-center justify-center rounded-xl bg-green-600 font-bold text-white transition hover:bg-green-500 focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {createOrder.isPending ? "Confirming order…" : "Processing…"}
            </>
          ) : effectivePaymentMethod === "PAYSTACK" ? (
            `Pay ${formatCurrency(displayTotal)}`
          ) : (
            `Place order (${formatCurrency(totalAmount)})`
          )}
        </button>

        <p className="text-center text-xs text-gray-500">
          {effectivePaymentMethod === "PAYSTACK"
            ? "Secured by Paystack"
            : "You’ll pay when you arrive for pickup"}
        </p>
      </form>
    </Shell>
  );
}

function Shell({
  children,
  onClose,
  label,
}: {
  children: React.ReactNode;
  /** Omit to hide the close button (e.g. while a payment is in flight). */
  onClose?: () => void;
  label: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl dark:border-white/10 dark:bg-[#1a1b2e] dark:text-white"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 grid h-11 w-11 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-[#167da8] focus-visible:outline-none dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
