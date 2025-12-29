"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useCart } from "./cart-context";
import { api } from "~/trpc/react";
import { X, Loader2, MapPin, Truck, CreditCard, Wallet } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { LocationPicker } from "~/app/_components/maps/location-picker";
import { toAppleMapsDirectionsUrl, toGoogleMapsDirectionsUrl } from "~/lib/maps";

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((window as unknown as { PaystackPop?: unknown }).PaystackPop) return;

    await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.paystack.co/v1/inline.js"]');
        if (existing) {
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("Failed to load Paystack script")));
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

    export function CheckoutModal({ onClose }: { onClose: () => void }) {
        const { items, totalAmount, clearCart } = useCart();
        const [step, setStep] = useState<"details" | "payment" | "success">("details");
        const [details, setDetails] = useState({ name: "", email: "", phone: "" });
        const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY">("PICKUP");
        const [paymentMethod, setPaymentMethod] = useState<"PAYSTACK" | "PAY_ON_PICKUP">("PAYSTACK");
        const [deliveryAddress, setDeliveryAddress] = useState("");
        const [isProcessing, setIsProcessing] = useState(false);
        const { formatCurrency } = useCurrency();

        const { data: shopDetails } = api.shop.getShopDetails.useQuery();
        const tenant = shopDetails?.tenant;
        const storeConfig = tenant?.storeConfig as { deliveryFee?: number; deliveryPricing?: { type: "flat" | "distance" } } | undefined;

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

        const initPaystack = api.shop.initPaystackPayment.useMutation({
            onError: (error) => {
                alert(`Failed to initialize payment: ${error.message}`);
                setIsProcessing(false);
            },
        });

        const createOrder = api.shop.createOrder.useMutation({
            onSuccess: () => {
                setStep("success");
                clearCart();
            },
            onError: (error) => {
                alert(`Failed to create order: ${error.message}`);
                setIsProcessing(false);
            }
        });

        const handlePay = async () => {
            // Basic validation before processing
            if (!details.name || !details.email) return;
            if (deliveryMethod === "DELIVERY" && !deliveryAddress.trim()) {
                alert("Please enter a delivery address.");
                return;
            }
            const effectivePaymentMethod = deliveryMethod === "DELIVERY" ? "PAYSTACK" : paymentMethod;

            setIsProcessing(true);

            if (effectivePaymentMethod === "PAY_ON_PICKUP") {
                const reference = `pay_on_pickup_${Date.now()}`;
                createOrder.mutate({
                    items: items.map(item => ({ productId: item.productId, quantity: item.quantity })),
                    customerDetails: details,
                    reference,
                    deliveryMethod,
                    deliveryAddress: deliveryMethod === "DELIVERY" ? deliveryAddress.trim() : undefined,
                    paymentMethod: "PAY_ON_PICKUP",
                });
                return;
            }

            // Paystack flow (initialize on server, open popup, then verify+create order on server)
            if (!tenant?.paystackPublicKey) {
                alert("Online payments are not configured for this store yet.");
                setIsProcessing(false);
                return;
            }

            const init = await initPaystack.mutateAsync({
                items: items.map(item => ({ productId: item.productId, quantity: item.quantity })),
                customerDetails: details,
                deliveryMethod,
                deliveryAddress: deliveryMethod === "DELIVERY" ? deliveryAddress.trim() : undefined,
            });

            await loadPaystackScript();

            const pop = (window as unknown as { PaystackPop?: unknown }).PaystackPop as PaystackPop | undefined;
            if (!pop) {
                alert("Paystack failed to load. Please try again.");
                setIsProcessing(false);
                return;
            }

            const amountKobo = Math.round(computedTotal * 100);

            const handler = pop.setup({
                key: tenant.paystackPublicKey,
                email: details.email,
                amount: amountKobo,
                access_code: init.accessCode,
                callback: (resp) => {
                    createOrder.mutate({
                        items: items.map(item => ({ productId: item.productId, quantity: item.quantity })),
                        customerDetails: details,
                        reference: resp.reference || init.reference,
                        deliveryMethod,
                        deliveryAddress: deliveryMethod === "DELIVERY" ? deliveryAddress.trim() : undefined,
                        paymentMethod: "PAYSTACK",
                    });
                },
                onClose: () => {
                    setIsProcessing(false);
                },
            });

            handler.openIframe();
        };

        if (step === "success") {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center border border-gray-200 text-gray-900 dark:bg-[#1a1b2e] dark:border-white/10 dark:text-white">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-500">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Order Successful!</h2>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                            Thank you for your purchase. We have received your order and will process it shortly.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-500"
                        >
                            Continue Shopping
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="relative max-h-[90vh] overflow-scroll w-full max-w-md rounded-2xl bg-white p-6 text-gray-900 border border-gray-200 shadow-2xl dark:bg-[#1a1b2e] dark:text-white dark:border-white/10">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Checkout</h2>

                    <div className="space-y-4">
                        {/* Delivery method */}
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">How would you like to receive your order?</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryMethod("PICKUP")}
                                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                                        deliveryMethod === "PICKUP"
                                            ? "bg-purple-600 text-white"
                                            : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/10"
                                    }`}
                                >
                                    <MapPin className="h-4 w-4" />
                                    Pickup
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeliveryMethod("DELIVERY")}
                                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                                        deliveryMethod === "DELIVERY"
                                            ? "bg-purple-600 text-white"
                                            : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/10"
                                    }`}
                                >
                                    <Truck className="h-4 w-4" />
                                    Delivery
                                </button>
                            </div>

                            {deliveryMethod === "DELIVERY" ? (
                                <div className="mt-4">
                                    <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Delivery Address</label>
                                    <textarea
                                        rows={2}
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-500"
                                        placeholder="Enter your full delivery address"
                                    />
                                </div>
                            ) : (
                                <div className="mt-4">
                                    {tenant?.latitude && tenant?.longitude ? (
                                        <>
                                            <div className="mb-3 flex flex-wrap gap-2">
                                                <a
                                                    href={toGoogleMapsDirectionsUrl({
                                                        lat: Number(tenant.latitude),
                                                        lng: Number(tenant.longitude),
                                                    })}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-800 border border-gray-200 hover:bg-gray-100 dark:bg-white/10 dark:text-white dark:border-white/10 dark:hover:bg-white/15"
                                                >
                                                    Get Directions (Google Maps)
                                                </a>
                                                <a
                                                    href={toAppleMapsDirectionsUrl({
                                                        lat: Number(tenant.latitude),
                                                        lng: Number(tenant.longitude),
                                                    })}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-800 border border-gray-200 hover:bg-gray-100 dark:bg-white/10 dark:text-white dark:border-white/10 dark:hover:bg-white/15"
                                                >
                                                    Open in Apple Maps
                                                </a>
                                            </div>
                                            <LocationPicker
                                                label="Pickup location"
                                                readOnly={true}
                                                value={{
                                                    lat: Number(tenant.latitude),
                                                    lng: Number(tenant.longitude),
                                                    address: tenant.address ?? undefined,
                                                }}
                                                onChange={() => {
                                                    // read-only
                                                }}
                                            />
                                        </>
                                    ) : (
                                        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                                            Pickup location is not configured yet.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Full Name</label>
                            <input
                                type="text"
                                value={details.name}
                                onChange={(e) => setDetails({ ...details, name: e.target.value })}
                                className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-500"
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Email Address</label>
                            <input
                                type="email"
                                value={details.email}
                                onChange={(e) => setDetails({ ...details, email: e.target.value })}
                                className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-500"
                                placeholder="john@example.com"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Phone Number</label>
                            <input
                                type="tel"
                                value={details.phone}
                                onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                                className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-500"
                                placeholder="+234..."
                            />
                        </div>

                        {/* Payment method */}
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Payment</p>
                            {deliveryMethod === "DELIVERY" ? (
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                    <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    Delivery orders must be paid online (Paystack).
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("PAYSTACK")}
                                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                                            paymentMethod === "PAYSTACK"
                                                ? "bg-green-600 text-white"
                                                : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/10"
                                        }`}
                                    >
                                        <CreditCard className="h-4 w-4" />
                                        Pay Online
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("PAY_ON_PICKUP")}
                                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                                            paymentMethod === "PAY_ON_PICKUP"
                                                ? "bg-green-600 text-white"
                                                : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-200 dark:border-white/10 dark:hover:bg-white/10"
                                        }`}
                                    >
                                        <Wallet className="h-4 w-4" />
                                        Pay on Pickup
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 border-t border-white/10 pt-4">
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
                            {deliveryMethod === "DELIVERY" && storeConfig?.deliveryPricing?.type === "distance" && (
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                                    {estimate.isFetching
                                        ? "Estimating delivery fee..."
                                        : estimate.error
                                            ? "Could not estimate delivery fee (we'll confirm at payment)."
                                            : estimate.data?.distanceKm != null
                                                ? `Estimated distance: ${estimate.data.distanceKm.toFixed(1)} km`
                                                : null}
                                </div>
                            )}
                            <div className="mt-2 flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                                <span>Total</span>
                                <span>{formatCurrency(computedTotal)}</span>
                            </div>
                        </div>

                        <button
                            onClick={handlePay}
                            disabled={!details.name || !details.email || isProcessing}
                            className="mt-4 flex w-full items-center justify-center rounded-xl bg-green-600 py-4 font-bold text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                deliveryMethod === "DELIVERY" || paymentMethod === "PAYSTACK"
                                    ? `Pay ${formatCurrency(computedTotal)}`
                                    : `Place Order (${formatCurrency(totalAmount)})`
                            )}
                        </button>

                        <p className="text-center text-xs text-gray-500 mt-2 dark:text-gray-500">
                            {deliveryMethod === "DELIVERY" || paymentMethod === "PAYSTACK" ? "Secured by Paystack" : "You’ll pay when you arrive for pickup"}
                        </p>
                    </div>
                </div>
            </div>
        );
    }
