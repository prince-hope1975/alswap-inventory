"use client";

import { useEffect, useRef } from "react";
import { CheckCircle, Printer, Share2, X } from "lucide-react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { api } from "~/trpc/react";

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
        change?: number;
        amountPaid?: number;
    };
}

export function ReceiptModal({ isOpen, onClose, order }: ReceiptModalProps) {
    const { formatCurrency } = useCurrency();
    const receiptRef = useRef<HTMLDivElement>(null);
    const { data: settings } = api.settings.getTenantSettings.useQuery(undefined, {
        enabled: isOpen,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    const handlePrint = () => {
        const printContent = receiptRef.current?.innerHTML;

        if (printContent) {
             const printWindow = window.open('', '', 'height=600,width=400');
             if (printWindow) {
                 printWindow.document.write('<html><head><title>Receipt</title>');
                 printWindow.document.write('<style>');
                 // Base styles for all templates
                 printWindow.document.write(`
                    @page { margin: 0; }
                    body { font-family: 'Courier New', monospace; padding: 20px; margin: 0; font-size: 12px; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .text-xl { font-size: 16px; }
                    .text-xs { font-size: 10px; }
                    .my-2 { margin-top: 8px; margin-bottom: 8px; }
                    .py-2 { padding-top: 8px; padding-bottom: 8px; }
                    .mb-4 { margin-bottom: 16px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 4px 0; }
                    
                    /* Thermal Printer Specifics */
                    .thermal-mode body { padding: 0; width: 58mm; }
                    .thermal-mode .container { padding: 10px; }
                 `);
                 printWindow.document.write('</style></head><body>');
                 printWindow.document.write(printContent);
                 printWindow.document.write('</body></html>');
                 printWindow.document.close();
                 setTimeout(() => {
                     printWindow.print();
                     // printWindow.close(); // Optional: close after printing
                 }, 500);
             }
        }
    };

    if (!isOpen) return null;

    const template = settings?.receiptTemplate || "classic";
    const storeName = settings?.name || "STORE NAME";
    const address = settings?.address;
    const phone = settings?.phone;
    const footer = settings?.receiptFooter || "Thank you for your business!";
    const logo = settings?.logo;

    // Render different templates
    const renderReceiptContent = () => {
        if (template === "modern") {
            return (
                <div className="p-6 font-sans text-sm text-gray-800">
                     <div className="mb-6 text-center">
                        {logo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logo} alt="Logo" className="mx-auto mb-3 h-16 object-contain" />
                        )}
                        <h1 className="text-xl font-bold uppercase tracking-wide">{storeName}</h1>
                        {address && <p className="mt-1 text-gray-600">{address}</p>}
                        {phone && <p className="text-gray-600">{phone}</p>}
                    </div>

                    <div className="mb-6 rounded-lg bg-gray-50 p-4">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                            <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="mt-1 text-center font-mono text-xs text-gray-400">Order #{order.id.slice(0, 8)}</p>
                    </div>

                    <div className="mb-6 space-y-3">
                        {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between border-b border-gray-100 pb-2 last:border-0">
                                <div>
                                    <p className="font-medium">{item.product.name}</p>
                                    <p className="text-xs text-gray-500">{item.quantity} x {formatCurrency(item.price)}</p>
                                </div>
                                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2 border-t border-gray-200 pt-4">
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total</span>
                            <span>{formatCurrency(order.totalAmount)}</span>
                        </div>
                        {order.amountPaid !== undefined && (
                            <div className="flex justify-between text-gray-600">
                                <span>Paid ({order.paymentMethod})</span>
                                <span>{formatCurrency(order.amountPaid)}</span>
                            </div>
                        )}
                        {order.change !== undefined && (
                            <div className="flex justify-between text-gray-600">
                                <span>Change</span>
                                <span>{formatCurrency(order.change)}</span>
                            </div>
                        )}
                    </div>

                    {order.customer && (
                         <div className="mt-6 rounded-lg bg-gray-50 p-3 text-center text-sm">
                            <p className="font-medium text-gray-900">Customer</p>
                            <p className="text-gray-600">{order.customer.name}</p>
                        </div>
                    )}

                    <div className="mt-8 text-center">
                        <p className="text-sm font-medium italic text-gray-600">{footer}</p>
                    </div>
                </div>
            );
        }
        
        if (template === "thermal") {
            return (
                <div className="thermal-mode font-mono text-xs">
                    <div className="text-center">
                        <h1 className="text-xl font-bold">{storeName}</h1>
                        {address && <p>{address}</p>}
                        {phone && <p>{phone}</p>}
                        <div className="my-2 border-b border-dashed border-black"></div>
                        <p>{new Date(order.createdAt).toLocaleString()}</p>
                        <p>Order: #{order.id.slice(0, 8)}</p>
                        <div className="my-2 border-b border-dashed border-black"></div>
                    </div>

                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th className="text-right">Amt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, i) => (
                                <tr key={i}>
                                    <td className="pr-2">
                                        <div>{item.product.name}</div>
                                        <div className="text-[10px]">{item.quantity} x {formatCurrency(item.price)}</div>
                                    </td>
                                    <td className="text-right align-top">{formatCurrency(item.price * item.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="my-2 border-b border-dashed border-black"></div>

                    <div className="text-right">
                        <div className="flex justify-between font-bold text-sm">
                            <span>TOTAL</span>
                            <span>{formatCurrency(order.totalAmount)}</span>
                        </div>
                        {order.amountPaid !== undefined && (
                            <div className="flex justify-between">
                                <span>PAID ({order.paymentMethod})</span>
                                <span>{formatCurrency(order.amountPaid)}</span>
                            </div>
                        )}
                        {order.change !== undefined && (
                            <div className="flex justify-between">
                                <span>CHANGE</span>
                                <span>{formatCurrency(order.change)}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 text-center text-[10px]">
                         {order.customer && <p className="mb-2">Customer: {order.customer.name}</p>}
                        <p>{footer}</p>
                    </div>
                </div>
            );
        }

        // Classic (Default)
        return (
            <div className="p-6 font-mono text-sm text-gray-700 dark:text-gray-300">
                <div className="mb-4 text-center">
                    <p className="text-lg font-bold">{storeName}</p>
                    {address && <p className="text-xs">{address}</p>}
                    {phone && <p className="text-xs">{phone}</p>}
                    <p className="mt-2 text-xs">{new Date(order.createdAt).toLocaleString()}</p>
                    <p className="text-xs">Order #{order.id.slice(0, 8)}</p>
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
                    <p>{footer}</p>
                </div>
            </div>
        );
    };

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

                    {/* Receipt Preview Container */}
                    <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-white">
                         <div ref={receiptRef}>
                             {renderReceiptContent()}
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
