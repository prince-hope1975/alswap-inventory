"use client";

import { useState } from "react";
import { useCart } from "./cart-context";
import { api } from "~/trpc/react";
import { X, Loader2 } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";

export function CheckoutModal({ onClose }: { onClose: () => void }) {
    const { items, totalAmount, clearCart } = useCart();
    const [step, setStep] = useState<"details" | "payment" | "success">("details");
    const [details, setDetails] = useState({ name: "", email: "", phone: "" });
    const [isProcessing, setIsProcessing] = useState(false);
    const { formatCurrency } = useCurrency();

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
        setIsProcessing(true);

        // Simulate Paystack Popup
        // In a real app, we would call PaystackPop.setup() here

        // For this demo, we'll simulate a successful payment reference
        const reference = `ref_${Date.now()}`;

        // Call backend to create order
        createOrder.mutate({
            items: items.map(item => ({ productId: item.productId, quantity: item.quantity })),
            customerDetails: details,
            reference,
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

                    <div className="mt-6 border-t border-white/10 pt-4">
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>Subtotal</span>
                            <span>{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="mt-2 flex justify-between text-xl font-bold text-white">
                            <span>Total</span>
                            <span>{formatCurrency(totalAmount)}</span>
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
                            `Pay ${formatCurrency(totalAmount)}`
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-500 mt-2">
                        Secured by Paystack
                    </p>
                </div>
            </div>
        </div>
    );
}
