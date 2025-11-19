"use client";

import { useRef } from "react";
import { CheckCircle, Printer, X } from "lucide-react";
import { api } from "~/trpc/react";
import { ReceiptPreview } from "./receipt-preview";

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
    const receiptRef = useRef<HTMLDivElement>(null);
    const { data: settings } = api.settings.getTenantSettings.useQuery(undefined, {
        enabled: isOpen,
        staleTime: 1000 * 60 * 5,
    });

    const handlePrint = () => {
        const printContent = receiptRef.current?.innerHTML;

        if (printContent) {
             const printWindow = window.open('', '', 'height=600,width=400');
             if (printWindow) {
                 printWindow.document.write('<html><head><title>Receipt</title>');
                 printWindow.document.write('<style>');
                 printWindow.document.write(`
                    @page { margin: 0; }
                    body { font-family: sans-serif; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    * { box-sizing: border-box; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    .font-bold { font-weight: bold; }
                    .font-mono { font-family: 'Courier New', monospace; }
                    .font-serif { font-family: serif; }
                    .font-sans { font-family: sans-serif; }
                    .text-xs { font-size: 10px; }
                    .text-sm { font-size: 12px; }
                    .text-base { font-size: 14px; }
                    .text-lg { font-size: 16px; }
                    .text-xl { font-size: 20px; }
                    .text-2xl { font-size: 24px; }
                    .text-3xl { font-size: 30px; }
                    .uppercase { text-transform: uppercase; }
                    .lowercase { text-transform: lowercase; }
                    .italic { font-style: italic; }
                    .flex { display: flex; }
                    .justify-between { justify-content: space-between; }
                    .items-center { align-items: center; }
                    .mb-2 { margin-bottom: 8px; }
                    .mb-4 { margin-bottom: 16px; }
                    .mb-6 { margin-bottom: 24px; }
                    .mb-8 { margin-bottom: 32px; }
                    .mt-1 { margin-top: 4px; }
                    .mt-2 { margin-top: 8px; }
                    .mt-4 { margin-top: 16px; }
                    .mt-6 { margin-top: 24px; }
                    .mt-8 { margin-top: 32px; }
                    .mt-12 { margin-top: 48px; }
                    .p-4 { padding: 16px; }
                    .p-6 { padding: 24px; }
                    .p-8 { padding: 32px; }
                    .px-2 { padding-left: 8px; padding-right: 8px; }
                    .py-1 { padding-top: 4px; padding-bottom: 4px; }
                    .py-2 { padding-top: 8px; padding-bottom: 8px; }
                    .py-3 { padding-top: 12px; padding-bottom: 12px; }
                    .border-b { border-bottom: 1px solid #e5e7eb; }
                    .border-t { border-top: 1px solid #e5e7eb; }
                    .border-t-2 { border-top: 2px solid #000; }
                    .border-b-2 { border-bottom: 2px solid #000; }
                    .border-dashed { border-style: dashed; }
                    .border-dotted { border-style: dotted; }
                    .border-double { border-style: double; }
                    .rounded { border-radius: 4px; }
                    .rounded-lg { border-radius: 8px; }
                    .rounded-xl { border-radius: 12px; }
                    .bg-white { background-color: white; }
                    .bg-gray-50 { background-color: #f9fafb; }
                    .bg-gray-100 { background-color: #f3f4f6; }
                    .bg-gray-900 { background-color: #111827; }
                    .text-black { color: #000; }
                    .text-gray-400 { color: #9ca3af; }
                    .text-gray-500 { color: #6b7280; }
                    .text-gray-600 { color: #4b5563; }
                    .text-gray-700 { color: #374151; }
                    .text-gray-800 { color: #1f2937; }
                    .text-green-600 { color: #16a34a; }
                    .text-green-700 { color: #15803d; }
                    .text-green-800 { color: #166534; }
                    .text-green-900 { color: #14532d; }
                    .opacity-60 { opacity: 0.6; }
                    .opacity-70 { opacity: 0.7; }
                    .opacity-80 { opacity: 0.8; }
                    .grayscale { filter: grayscale(100%); }
                    .space-y-1 > * + * { margin-top: 4px; }
                    .space-y-2 > * + * { margin-top: 8px; }
                    .space-y-3 > * + * { margin-top: 12px; }
                    .w-full { width: 100%; }
                    .h-8 { height: 32px; }
                    .h-10 { height: 40px; }
                    .h-12 { height: 48px; }
                    .h-14 { height: 56px; }
                    .h-16 { height: 64px; }
                    .object-contain { object-fit: contain; }
                    .mx-auto { margin-left: auto; margin-right: auto; }
                    .tracking-wide { letter-spacing: 0.025em; }
                    .tracking-widest { letter-spacing: 0.1em; }
                    .tracking-tighter { letter-spacing: -0.05em; }
                    img { max-width: 100%; height: auto; }
                 `);
                 printWindow.document.write('</style></head><body>');
                 printWindow.document.write(printContent);
                 printWindow.document.write('</body></html>');
                 printWindow.document.close();
                 
                 setTimeout(() => {
                     printWindow.print();
                 }, 500);
             }
        }
    };

    if (!isOpen) return null;

    const templateId = settings?.receiptTemplate || "classic";

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

                    <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-white">
                         <div ref={receiptRef}>
                             <ReceiptPreview 
                                template={templateId}
                                settings={{
                                    name: settings?.name || "STORE NAME",
                                    logo: settings?.logo,
                                    address: settings?.address,
                                    phone: settings?.phone,
                                    receiptFooter: settings?.receiptFooter,
                                }}
                                order={order}
                             />
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
