"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * Client component that injects CSS variables for brand colors
 * Updates dynamically when settings change
 */
export function RouterProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { data: session, status } = useSession();
    // useEffect(() => {
    //     if (status === "unauthenticated" || (session && session?.user?.role !== "ADMIN")) {
    //         router.push("/");
    //     }
    // }, [session?.user?.role, status]);

    return <>{children}</>;
}

