"use client";

import { useEffect } from "react";

// Define types properly based on your schema/API return type
interface ReceiptProps {
    order: {
        id: string;
        createdAt: Date;
        totalAmount: string; // Decimal is string in JS usually from drizzle
        items: Array<{
            id: number;
            quantity: number;
            price: string;
            product: {
                name: string;
            };
        }>;
    };
}

export function Receipt({ order }: ReceiptProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 500); // Slight delay to ensure rendering
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="mx-auto max-w-[80mm] bg-white p-4 font-mono text-sm text-black print:p-0">
            <div className="mb-4 text-center">
                <h1 className="text-xl font-bold uppercase">Alswap Store</h1>
                <p className="text-xs">Receipt #{order.id.slice(0, 8)}</p>
                <p className="text-xs">{new Date(order.createdAt).toLocaleString()}</p>
            </div>

            <div className="my-2 border-b-2 border-dashed border-black"></div>

            <div className="space-y-2">
                {order.items.map((item) => (
                    <div key={item.id} className="flex flex-col">
                        <div className="flex justify-between font-bold">
                            <span>{item.product.name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span>
                                {item.quantity} x ${Number(item.price).toFixed(2)}
                            </span>
                            <span>${(Number(item.price) * item.quantity).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="my-2 border-b-2 border-dashed border-black"></div>

            <div className="flex justify-between text-lg font-bold">
                <span>TOTAL</span>
                <span>${Number(order.totalAmount).toFixed(2)}</span>
            </div>

            <div className="mt-8 text-center text-xs">
                <p>Thank you for your business!</p>
                <p>Please visit again.</p>
            </div>
            
            <style jsx global>{`
                @page {
                    size: 80mm auto;
                    margin: 0;
                }
                @media print {
                    body {
                        background: white;
                    }
                }
            `}</style>
        </div>
    );
}

