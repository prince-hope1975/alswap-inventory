"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Banknote, Wallet, MoreHorizontal, Check } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "~/lib/constants";
import { Keypad } from "./keypad";
import { cn } from "~/lib/utils";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    onConfirm: (paymentMethod: string, amountPaid: number) => void;
    isProcessing?: boolean;
}

export function PaymentModal({
    isOpen,
    onClose,
    totalAmount,
    onConfirm,
    isProcessing = false,
}: PaymentModalProps) {
    const { formatCurrency } = useCurrency();
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PAYMENT_METHODS.CASH);
    const [amountPaid, setAmountPaid] = useState<string>("");
    
    // Initialize amount paid with total when opening
    useEffect(() => {
        if (isOpen) {
            setAmountPaid(totalAmount.toString());
        }
    }, [isOpen, totalAmount]);

    const handleKeyPress = (key: string) => {
        if (key === "." && amountPaid.includes(".")) return;
        // If amount is exactly the total (default), overwrite it on first keypress
        if (amountPaid === totalAmount.toString()) {
             if (key === ".") {
                 setAmountPaid("0.");
             } else {
                 setAmountPaid(key);
             }
             return;
        }
        setAmountPaid((prev) => prev + key);
    };

    const handleDelete = () => {
        setAmountPaid((prev) => prev.slice(0, -1));
    };

    const handleSubmit = () => {
        const paid = parseFloat(amountPaid) || 0;
        if (paid < totalAmount && selectedMethod === PAYMENT_METHODS.CASH) {
            // Allow partial payment? For now, maybe warn or just proceed if logic supports it.
            // But typically POS blocks underpayment for single transaction unless split.
            // We'll assume full payment for now.
        }
        onConfirm(selectedMethod, paid);
    };

    if (!isOpen) return null;

    const numericAmountPaid = parseFloat(amountPaid) || 0;
    const change = Math.max(0, numericAmountPaid - totalAmount);
    const remaining = Math.max(0, totalAmount - numericAmountPaid);

    const methods = [
        { id: PAYMENT_METHODS.CASH, icon: Banknote, label: PAYMENT_METHOD_LABELS.CASH },
        { id: PAYMENT_METHODS.CARD, icon: CreditCard, label: PAYMENT_METHOD_LABELS.CARD },
        { id: PAYMENT_METHODS.TRANSFER, icon: Wallet, label: PAYMENT_METHOD_LABELS.TRANSFER },
        { id: PAYMENT_METHODS.OTHER, icon: MoreHorizontal, label: PAYMENT_METHOD_LABELS.OTHER },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
                {/* Left Side: Payment Methods & Summary */}
                <div className="flex w-1/2 flex-col border-r border-gray-200 p-8 dark:border-gray-800">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment</h2>
                        <p className="text-gray-500 dark:text-gray-400">Select payment method</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {methods.map((method) => {
                            const Icon = method.icon;
                            return (
                                <button
                                    key={method.id}
                                    onClick={() => {
                                        setSelectedMethod(method.id as PaymentMethod);
                                        // Reset amount to total when switching methods (optional UX choice)
                                        setAmountPaid(totalAmount.toString());
                                    }}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-6 transition-all",
                                        selectedMethod === method.id
                                            ? "border-[var(--brand-primary-500)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] dark:bg-[var(--brand-primary-900)]/20 dark:text-[var(--brand-primary-400)]"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-300"
                                    )}
                                >
                                    <Icon className="h-8 w-8" />
                                    <span className="font-semibold">{method.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-auto space-y-4 rounded-xl bg-gray-50 p-6 dark:bg-gray-800">
                        <div className="flex justify-between text-lg">
                            <span className="text-gray-600 dark:text-gray-400">Total Due</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                                {formatCurrency(totalAmount)}
                            </span>
                        </div>
                        <div className="flex justify-between text-lg">
                            <span className="text-gray-600 dark:text-gray-400">Tendered</span>
                            <span className={cn("font-bold", numericAmountPaid < totalAmount ? "text-red-500" : "text-green-600")}>
                                {formatCurrency(numericAmountPaid)}
                            </span>
                        </div>
                         {selectedMethod === PAYMENT_METHODS.CASH && (
                            <div className="flex justify-between border-t border-gray-200 pt-4 text-xl font-bold dark:border-gray-700">
                                <span className="text-gray-900 dark:text-white">Change</span>
                                <span className="text-[var(--brand-primary-600)]">
                                    {formatCurrency(change)}
                                </span>
                            </div>
                        )}
                        {numericAmountPaid < totalAmount && (
                             <div className="flex justify-between border-t border-gray-200 pt-4 text-sm font-medium dark:border-gray-700">
                                <span className="text-red-500">Remaining</span>
                                <span className="text-red-500">
                                    {formatCurrency(remaining)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Numpad */}
                <div className="flex w-1/2 flex-col bg-gray-50 p-8 dark:bg-gray-950/50">
                    <div className="mb-6 flex justify-end">
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-800"
                        >
                            <X className="h-6 w-6 text-gray-500" />
                        </button>
                    </div>

                    <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white px-6 py-8 text-right text-4xl font-bold tracking-tight shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white">
                        {amountPaid || "0"}
                    </div>

                    <div className="flex-1">
                        <Keypad
                            onKeyPress={handleKeyPress}
                            onDelete={handleDelete}
                            className="h-full"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || (numericAmountPaid < totalAmount && selectedMethod === PAYMENT_METHODS.CASH)}
                        className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-gradient-to)] py-5 text-xl font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {isProcessing ? "Processing..." : (
                            <>
                                <Check className="h-6 w-6" />
                                Complete Payment
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

