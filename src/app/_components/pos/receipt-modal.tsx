"use client";

import { useEffect, useRef } from "react";
import { CheckCircle, Printer, Share2, X } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: {
        id: string;
        totalAmount: number;
        paymentMethod: string;
        createdAt: Date;
        items: {
            quantity: number;
            price: number;
            product: {
                name: string;
            };
        }[];
        customer?: {
            name: string;
        } | null;
        change?: number; // Calculated client-side or passed
        amountPaid?: number;
    };
}

export function ReceiptModal({ isOpen, onClose, order }: ReceiptModalProps) {
    const { formatCurrency } = useCurrency();
    const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        // Create a hidden iframe or new window to print just the receipt content
        // For simplicity in this component, we'll just use window.print() but typically 
        // you'd want to target just the receipt area. 
        // A better approach for POS is a dedicated print window.
        const printContent = receiptRef.current?.innerHTML;
        const originalContents = document.body.innerHTML;

        if (printContent) {
             const printWindow = window.open('', '', 'height=600,width=400');
             if (printWindow) {
                 printWindow.document.write('<html><head><title>Receipt</title>');
                 printWindow.document.write('<style>');
                 printWindow.document.write(`
                    body { font-family: 'Courier New', monospace; padding: 20px; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .border-b { border-bottom: 1px dashed #000; }
                    .my-2 { margin-top: 8px; margin-bottom: 8px; }
                    .py-2 { padding-top: 8px; padding-bottom: 8px; }
                    table { width: 100%; }
                 `);
                 printWindow.document.write('</style></head><body>');
                 printWindow.document.write(printContent);
                 printWindow.document.write('</body></html>');
                 printWindow.document.close();
                 printWindow.print();
             }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Receipt</h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6 flex flex-col items-center text-center text-green-500">
                        <CheckCircle className="h-16 w-16" />
                        <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">Payment Successful</h2>
                    </div>

                    {/* Receipt Preview */}
                    <div 
                        ref={receiptRef}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-6 font-mono text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                        <div className="mb-4 text-center">
                            <p className="text-lg font-bold">STORE NAME</p>
                            <p>{new Date(order.createdAt).toLocaleString()}</p>
                            <p>Order #{order.id.slice(0, 8)}</p>
                        </div>

                        <div className="mb-4 border-b border-dashed border-gray-300 pb-2 dark:border-gray-600">
                            {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between py-1">
                                    <span>{item.quantity}x {item.product.name}</span>
                                    <span>{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1 text-right">
                            <div className="flex justify-between font-bold">
                                <span>Total</span>
                                <span>{formatCurrency(order.totalAmount)}</span>
                            </div>
                            {order.amountPaid !== undefined && (
                                <div className="flex justify-between">
                                    <span>Paid ({order.paymentMethod})</span>
                                    <span>{formatCurrency(order.amountPaid)}</span>
                                </div>
                            )}
                            {order.change !== undefined && (
                                <div className="flex justify-between">
                                    <span>Change</span>
                                    <span>{formatCurrency(order.change)}</span>
                                </div>
                            )}
                        </div>

                        {order.customer && (
                            <div className="mt-4 border-t border-dashed border-gray-300 pt-2 text-center dark:border-gray-600">
                                <p>Customer: {order.customer.name}</p>
                            </div>
                        )}
                        
                        <div className="mt-6 text-center text-xs">
                            <p>Thank you for your business!</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 border-t border-gray-100 p-4 dark:border-gray-800">
                    <button
                        onClick={handlePrint}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                    >
                        <Printer className="h-5 w-5" />
                        Print
                    </button>
                    <button
                        onClick={onClose}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

