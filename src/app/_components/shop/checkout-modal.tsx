"use client";

import { useMemo, useState } from "react";
import { useCart } from "./cart-context";
import { api } from "~/trpc/react";
import { X, Loader2, MapPin, Truck, CreditCard, Wallet } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { LocationPicker } from "~/app/_components/maps/location-picker";

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
    const storeConfig = tenant?.storeConfig as { deliveryFee?: number } | undefined;
    const deliveryFee = deliveryMethod === "DELIVERY" ? Number(storeConfig?.deliveryFee ?? 0) : 0;

    const computedTotal = useMemo(() => {
        return Number(totalAmount) + Number(deliveryFee || 0);
    }, [deliveryFee, totalAmount]);

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
        if (deliveryMethod === "DELIVERY") {
            // Delivery must be paid online.
            setPaymentMethod("PAYSTACK");
        }

        setIsProcessing(true);

        // Simulate Paystack Popup (and also allow pay-on-pickup for pickup orders)

        const reference =
            paymentMethod === "PAYSTACK"
                ? `paystack_ref_${Date.now()}`
                : `pay_on_pickup_${Date.now()}`;

        // Call backend to create order
        createOrder.mutate({
            items: items.map(item => ({ productId: item.productId, quantity: item.quantity })),
            customerDetails: details,
            reference,
            deliveryMethod,
            deliveryAddress: deliveryMethod === "DELIVERY" ? deliveryAddress.trim() : undefined,
            paymentMethod,
        });
    };

    if (step === "success") {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-2xl bg-[#1a1b2e] p-8 text-center border border-white/10">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-white">Order Successful!</h2>
                    <p className="mb-6 text-gray-400">
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
            <div className="relative w-full max-w-md rounded-2xl bg-[#1a1b2e] p-6 border border-white/10 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-white"
                >
                    <X className="h-6 w-6" />
                </button>

                <h2 className="mb-6 text-2xl font-bold text-white">Checkout</h2>

                <div className="space-y-4">
                    {/* Delivery method */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-3 text-sm font-semibold text-white">How would you like to receive your order?</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setDeliveryMethod("PICKUP")}
                                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                                    deliveryMethod === "PICKUP"
                                        ? "bg-purple-600 text-white"
                                        : "bg-white/5 text-gray-200 hover:bg-white/10"
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
                                        : "bg-white/5 text-gray-200 hover:bg-white/10"
                                }`}
                            >
                                <Truck className="h-4 w-4" />
                                Delivery
                            </button>
                        </div>

                        {deliveryMethod === "DELIVERY" ? (
                            <div className="mt-4">
                                <label className="mb-1 block text-sm font-medium text-gray-400">Delivery Address</label>
                                <textarea
                                    rows={2}
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    placeholder="Enter your full delivery address"
                                />
                            </div>
                        ) : (
                            <div className="mt-4">
                                {tenant?.latitude && tenant?.longitude ? (
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
                                ) : (
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                                        Pickup location is not configured yet.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">Full Name</label>
                        <input
                            type="text"
                            value={details.name}
                            onChange={(e) => setDetails({ ...details, name: e.target.value })}
                            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">Email Address</label>
                        <input
                            type="email"
                            value={details.email}
                            onChange={(e) => setDetails({ ...details, email: e.target.value })}
                            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="john@example.com"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">Phone Number</label>
                        <input
                            type="tel"
                            value={details.phone}
                            onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="+234..."
                        />
                    </div>

                    {/* Payment method */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-3 text-sm font-semibold text-white">Payment</p>
                        {deliveryMethod === "DELIVERY" ? (
                            <div className="flex items-center gap-2 text-sm text-gray-200">
                                <CreditCard className="h-4 w-4 text-green-400" />
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
                                            : "bg-white/5 text-gray-200 hover:bg-white/10"
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
                                            : "bg-white/5 text-gray-200 hover:bg-white/10"
                                    }`}
                                >
                                    <Wallet className="h-4 w-4" />
                                    Pay on Pickup
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-4">
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>Subtotal</span>
                            <span>{formatCurrency(totalAmount)}</span>
                        </div>
                        {deliveryMethod === "DELIVERY" && (
                            <div className="mt-2 flex justify-between text-sm text-gray-400">
                                <span>Delivery fee</span>
                                <span>{formatCurrency(deliveryFee)}</span>
                            </div>
                        )}
                        <div className="mt-2 flex justify-between text-xl font-bold text-white">
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

                    <p className="text-center text-xs text-gray-500 mt-2">
                        {deliveryMethod === "DELIVERY" || paymentMethod === "PAYSTACK" ? "Secured by Paystack" : "You’ll pay when you arrive for pickup"}
                    </p>
                </div>
            </div>
        </div>
    );
}
