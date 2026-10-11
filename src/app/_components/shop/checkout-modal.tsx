"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
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
  deliveryFeeText,
  formatOpeningHours,
  storefrontOptions,
  validateCheckoutDetails,
  whatsAppUrl,
  type CheckoutErrors,
  type OpeningHours,
} from "~/lib/domain/checkout";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
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
        className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5"
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
  const [deliveryChoice, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY">(
    "PICKUP",
  );
  // null = the shopper hasn't picked; the store's default applies. Store
  // details load async, so the default can't be baked into useState.
  const [paymentChoice, setPaymentMethod] = useState<
    "PAYSTACK" | "PAY_ON_PICKUP" | null
  >(null);
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
  const titleId = useId();

  const { data: shopDetails } = api.shop.getShopDetails.useQuery();
  const tenant = shopDetails?.tenant;
  // One rule for what this store offers (same as the product page/server).
  const options = storefrontOptions(tenant);
  const deliveryMethod = options.offersDelivery ? deliveryChoice : "PICKUP";
  const paymentMethod = !options.canPayOnline
    ? "PAY_ON_PICKUP"
    : (paymentChoice ?? options.defaultPaymentMethod);

  // Re-price the cart on the server as soon as checkout opens, so the button
  // shows what the order will actually charge and dead lines surface early.
  const quoteItems = useMemo(
    () => items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    [items],
  );
  const quote = api.shop.quoteCart.useQuery(
    { items: quoteItems },
    { enabled: quoteItems.length > 0, retry: false, staleTime: 30_000 },
  );
  const quotedPrice = useMemo(
    () => new Map((quote.data?.lines ?? []).map((line) => [line.productId, line.unitPrice])),
    [quote.data],
  );
  const cartProblems = quote.data?.problems ?? [];
  const subtotal = quote.data && cartProblems.length === 0 ? quote.data.subtotal : totalAmount;
  const pricesChanged =
    quote.data != null &&
    cartProblems.length === 0 &&
    Math.round(quote.data.subtotal) !== Math.round(totalAmount);
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
    options.deliveryPricing === "distance" &&
    deferredDeliveryAddress.trim().length >= 5;

  const estimate = api.shop.estimateDeliveryFee.useQuery(
    { deliveryAddress: deferredDeliveryAddress.trim() },
    { enabled: shouldEstimate, retry: false },
  );

  const deliveryFee =
    deliveryMethod === "DELIVERY"
      ? options.deliveryPricing === "distance"
        ? Number(estimate.data?.fee ?? 0)
        : Number(options.flatDeliveryFee ?? 0)
      : 0;
  const deliveryFeeKnown =
    deliveryMethod !== "DELIVERY" || options.deliveryPricing !== "distance" || estimate.data != null;

  const computedTotal = useMemo(() => {
    return Number(subtotal) + Number(deliveryFee || 0);
  }, [deliveryFee, subtotal]);
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
    if (cartProblems.length > 0) {
      setFormError("Some items in your cart can't be ordered. Update your cart first.");
      return;
    }

    const customerDetails = {
      name: details.name.trim(),
      phone: details.phone.trim(),
      email: details.email.trim() || undefined,
    };
    const cartItems = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

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
          // Server prices, not the cart's (possibly stale) snapshot.
          lines: (result.lines ?? []).map((line) => ({
            productId: line.productId,
            name: line.name,
            quantity: line.quantity,
            price: line.unitPrice,
          })),
          deliveryMethod: "PICKUP",
          paymentMethod: "PAY_ON_PICKUP",
          needsAttention: false,
        });
        setIsProcessing(false);
        return;
      }

      if (!options.canPayOnline || !tenant?.paystackPublicKey) {
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
      <Shell onClose={onClose} labelledBy={`${titleId}-issue`}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-8 w-8" aria-hidden />
          </div>
          <h2 id={`${titleId}-issue`} className="mb-2 text-2xl font-bold">Payment received</h2>
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
      <Shell onClose={onClose} labelledBy={`${titleId}-done`}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-500">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </div>
          <h2 id={`${titleId}-done`} className="text-2xl font-bold">Order placed</h2>
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
    <Shell
      onClose={isProcessing ? undefined : onClose}
      labelledBy={titleId}
      title="Checkout"
      // Paystack's popup owns the screen while a payment is in flight.
      paused={isProcessing}
      footer={
        <div className="space-y-2">
          {formError && (
            <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {formError}
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              {effectivePaymentMethod === "PAYSTACK" ? "Total" : "To pay at pickup"}
            </span>
            <span className="text-xl font-bold" aria-live="polite">
              {quote.isLoading ? (
                <span className="text-sm font-medium text-gray-500">Checking prices…</span>
              ) : (
                formatCurrency(displayTotal)
              )}
            </span>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={isProcessing || items.length === 0 || cartProblems.length > 0 || quote.isLoading}
            className="flex min-h-14 w-full items-center justify-center rounded-xl bg-green-700 font-bold text-white transition hover:bg-green-600 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-[#0f1a22]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                {createOrder.isPending ? "Confirming order…" : "Processing…"}
              </>
            ) : effectivePaymentMethod === "PAYSTACK" ? (
              deliveryFeeKnown ? `Pay ${formatCurrency(displayTotal)}` : "Continue to payment"
            ) : (
              `Place order · ${formatCurrency(subtotal)}`
            )}
          </button>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            {effectivePaymentMethod === "PAYSTACK"
              ? "Secured by Paystack"
              : "You’ll pay when you arrive for pickup"}
          </p>
        </div>
      }
    >
      {/* Order summary */}
      <section aria-label="Order summary" className="mb-5 rounded-xl border border-gray-200 dark:border-white/10">
        <ul className="divide-y divide-gray-200 text-sm dark:divide-white/10">
          {items.map((item) => {
            const unit = quotedPrice.get(item.productId) ?? item.price;
            const problem = cartProblems.find((entry) => entry.productId === item.productId);
            return (
              <li key={item.productId} className="px-4 py-2.5">
                <div className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-medium">{item.quantity} ×</span> {item.name}
                  </span>
                  <span className="shrink-0">{formatCurrency(unit * item.quantity)}</span>
                </div>
                {problem && (
                  <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">{problem.message}</p>
                )}
              </li>
            );
          })}
        </ul>
        {cartProblems.length > 0 && (
          <p role="alert" className="border-t border-gray-200 px-4 py-2.5 text-sm text-red-700 dark:border-white/10 dark:text-red-300">
            Remove or change the marked items in your cart to continue.
          </p>
        )}
        {pricesChanged && (
          <p className="border-t border-gray-200 px-4 py-2.5 text-xs text-amber-800 dark:border-white/10 dark:text-amber-300">
            Prices updated to the store&apos;s current prices.
          </p>
        )}
        {quote.isError && (
          <p className="border-t border-gray-200 px-4 py-2.5 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
            We couldn&apos;t check the latest prices; they&apos;ll be confirmed when you order.
          </p>
        )}
      </section>

      <form
        id="checkout-form"
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
          <legend className="sr-only">
            {options.offersDelivery ? "How would you like to receive your order?" : "Pickup"}
          </legend>
          <p className="mb-3 text-sm font-semibold" aria-hidden="true">
            {options.offersDelivery ? "How would you like to receive your order?" : "Pick up from the store"}
          </p>
          {options.offersDelivery && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={deliveryMethod === "PICKUP"}
                onClick={() => setDeliveryMethod("PICKUP")}
                className={optionClass(deliveryMethod === "PICKUP", "bg-[#0b6e99]")}
              >
                <MapPin className="h-4 w-4" aria-hidden />
                Pickup
              </button>
              <button
                type="button"
                aria-pressed={deliveryMethod === "DELIVERY"}
                onClick={() => setDeliveryMethod("DELIVERY")}
                className={`${optionClass(deliveryMethod === "DELIVERY", "bg-[#0b6e99]")} flex-col gap-0`}
              >
                <span className="inline-flex items-center gap-2">
                  <Truck className="h-4 w-4" aria-hidden />
                  Delivery
                </span>
                {options.deliveryLabel && (
                  <span className="text-[11px] font-medium opacity-80">{options.deliveryLabel}</span>
                )}
              </button>
            </div>
          )}

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
            <div className={`${options.offersDelivery ? "mt-4" : ""} text-sm`}>
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
              <CreditCard className="h-4 w-4 text-green-700 dark:text-green-400" aria-hidden />
              Delivery orders are paid online (Paystack).
            </div>
          ) : !options.canPayOnline ? (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <Wallet className="h-4 w-4 text-green-700 dark:text-green-400" aria-hidden />
              Pay when you collect your order.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={paymentMethod === "PAYSTACK"}
                onClick={() => setPaymentMethod("PAYSTACK")}
                className={optionClass(paymentMethod === "PAYSTACK", "bg-green-700")}
              >
                <CreditCard className="h-4 w-4" aria-hidden />
                Pay online
              </button>
              <button
                type="button"
                aria-pressed={paymentMethod === "PAY_ON_PICKUP"}
                onClick={() => setPaymentMethod("PAY_ON_PICKUP")}
                className={optionClass(paymentMethod === "PAY_ON_PICKUP", "bg-green-700")}
              >
                <Wallet className="h-4 w-4" aria-hidden />
                Pay on pickup
              </button>
            </div>
          )}
        </fieldset>

        <div className="space-y-2 border-t border-gray-200 pt-4 text-sm text-gray-600 dark:border-white/10 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {deliveryMethod === "DELIVERY" && (
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>
                {deliveryFeeKnown
                  ? deliveryFeeText(deliveryFee, tenant?.currency)
                  : "Enter your address"}
              </span>
            </div>
          )}
          {deliveryMethod === "DELIVERY" && options.deliveryPricing === "distance" && (
            <div className="text-xs text-gray-500">
              {estimate.isFetching
                ? "Estimating delivery fee…"
                : estimate.error
                  ? "Could not estimate delivery fee (we'll confirm before you pay)."
                  : estimate.data?.distanceKm != null
                    ? `Estimated distance: ${estimate.data.distanceKm.toFixed(1)} km`
                    : null}
            </div>
          )}
          {serverTotal != null && serverTotal !== computedTotal && (
            <p className="text-xs text-amber-800 dark:text-amber-400">
              Total updated to the store&apos;s current prices.
            </p>
          )}
        </div>
      </form>
    </Shell>
  );
}

function Shell({
  children,
  onClose,
  labelledBy,
  title,
  footer,
  paused = false,
}: {
  children: React.ReactNode;
  /** Omit to hide the close button and disable Esc (e.g. mid-payment). */
  onClose?: () => void;
  /** Id of the heading that names the dialog. */
  labelledBy: string;
  /** Header title; when omitted the body supplies the heading. */
  title?: string;
  /** Sticky actions (total + pay button), pinned above the keyboard/home bar. */
  footer?: React.ReactNode;
  paused?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ open: true, onClose, panelRef, paused });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      {/* Phones: a near-full-height bottom sheet; larger screens: a centred card. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative flex ${footer ? "h-[94dvh]" : "max-h-[94dvh]"} w-full flex-col overflow-hidden rounded-t-2xl bg-white text-gray-900 shadow-2xl focus:outline-none sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200 dark:bg-[#0f1a22] dark:text-white sm:dark:border-white/10`}
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-200 py-2 pr-2 pl-5 dark:border-white/10">
          {title ? (
            <h2 id={labelledBy} className="text-lg font-bold">
              {title}
            </h2>
          ) : (
            <span aria-hidden="true" />
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-11 w-11 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-[#167da8] focus-visible:outline-none dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-6 w-6" aria-hidden />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-gray-200 bg-white px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 dark:border-white/10 dark:bg-[#0f1a22]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
