"use client";

import { useCurrency } from "~/hooks/use-tenant-settings";
import { RECEIPT_TEMPLATES, type ReceiptTemplate } from "~/lib/receipt-templates";
import { cn } from "~/lib/utils";

interface ReceiptPreviewProps {
    template: string;
    settings: {
        name: string;
        logo?: string | null;
        address?: string;
        phone?: string;
        receiptFooter?: string;
    };
    className?: string;
    order?: {
        id: string;
        createdAt: Date;
        items: {
            quantity: number;
            price: number;
            product: {
                name: string;
            };
        }[];
        totalAmount: number;
        change?: number;
        amountPaid?: number;
        paymentMethod?: string;
        customer?: {
            name: string;
        } | null;
    };
}

export function ReceiptPreview({ template: templateId, settings, className, order }: ReceiptPreviewProps) {
    const { formatCurrency } = useCurrency();
    const template = RECEIPT_TEMPLATES[templateId] || RECEIPT_TEMPLATES.classic;
    
    if (!template) return null;

    // Use provided order or mock data
    const displayOrder = order || {
        id: "ORD-12345678",
        createdAt: new Date(),
        items: [
            { product: { name: "Example Product" }, quantity: 2, price: 1500 },
            { product: { name: "Another Item" }, quantity: 1, price: 5000 },
        ],
        totalAmount: 8000,
        change: 2000,
        amountPaid: 10000,
        paymentMethod: "CASH",
        customer: { name: "John Doe" }
    };

    const storeName = settings.name || "STORE NAME";
    const address = settings.address;
    const phone = settings.phone;
    const footer = settings.receiptFooter || "Thank you for your business!";
    const logo = settings.logo;

    // Render content based on template styles
    // Check if this is a compact preview (has negative margin class)
    const isCompact = className?.includes("-mt-");
    
    // Override container padding for compact mode - remove padding classes and add minimal padding
    let containerClasses = template.styles.container;
    if (isCompact) {
        // Remove common padding classes
        containerClasses = containerClasses
            .replace(/\bp-\d+\b/g, "")
            .replace(/\bpt-\d+\b/g, "")
            .replace(/\bpb-\d+\b/g, "")
            .replace(/\bpx-\d+\b/g, "")
            .replace(/\bpy-\d+\b/g, "")
            .replace(/\bp-\[.*?\]\b/g, "")
            .trim();
        // Add minimal padding
        containerClasses = (containerClasses + " p-1").trim();
    }
    
    return (
        <div className={cn("overflow-hidden rounded shadow-sm ring-1 ring-gray-200 transition-all", containerClasses, className)}>
            {/* Header */}
            <div className={cn(template.styles.header, isCompact && "!mb-1 !mt-0")}>
                {logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                        src={logo} 
                        alt="Logo" 
                        className={cn(template.styles.logo)} 
                    />
                )}
                <div className={template.styles.storeName}>{storeName}</div>
                <div className={template.styles.meta}>
                    {address && <p>{address}</p>}
                    {phone && <p>{phone}</p>}
                    <p className="mt-1">{new Date(displayOrder.createdAt).toLocaleString()}</p>
                    <p>#{displayOrder.id.slice(0, 8)}</p>
                </div>
            </div>

            {template.styles.divider !== "hidden" && <div className={template.styles.divider}></div>}

            {/* Items */}
            <div className={template.styles.table}>
                {displayOrder.items.map((item, i) => (
                    <div key={i} className={template.styles.itemRow}>
                        <div>
                            <span>{item.product.name}</span>
                            {template.renderType !== "grid" && (
                                <div className="text-[0.8em] opacity-70">
                                    {item.quantity} x {formatCurrency(item.price)}
                                </div>
                            )}
                        </div>
                        <div className={template.styles.itemPrice}>
                            {formatCurrency(item.price * item.quantity)}
                        </div>
                    </div>
                ))}
            </div>

            {template.styles.divider !== "hidden" && <div className={template.styles.divider}></div>}

            {/* Totals */}
            <div className={template.styles.totals}>
                <div className="flex justify-between">
                    <span>Total</span>
                    <span>{formatCurrency(displayOrder.totalAmount)}</span>
                </div>
                {displayOrder.amountPaid !== undefined && (
                    <div className="flex justify-between text-[0.9em] opacity-80">
                        <span>Paid ({displayOrder.paymentMethod || "CASH"})</span>
                        <span>{formatCurrency(displayOrder.amountPaid)}</span>
                    </div>
                )}
                {displayOrder.change !== undefined && displayOrder.change > 0 && (
                    <div className="flex justify-between text-[0.9em] opacity-80">
                        <span>Change</span>
                        <span>{formatCurrency(displayOrder.change)}</span>
                    </div>
                )}
            </div>

            {/* Customer Info */}
            {displayOrder.customer && (
                <div className="mt-4 text-center text-xs border-t border-gray-200 pt-2">
                    <p>Customer: {displayOrder.customer.name}</p>
                </div>
            )}

            {/* Footer */}
            <div className={cn(template.styles.footer, isCompact && "!mt-2 !mb-0")}>
                <p>{footer}</p>
            </div>
        </div>
    );
}
