import { useEffect, useRef } from "react";

interface UseScanDetectionOptions {
    onScan: (code: string) => void;
    minLength?: number;
    timeLimit?: number; // Max time between keystrokes in ms
}

export function useScanDetection({
    onScan,
    minLength = 3,
    timeLimit = 50,
}: UseScanDetectionOptions) {
    const buffer = useRef<string>("");
    const lastKeyTime = useRef<number>(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            const timeDiff = currentTime - lastKeyTime.current;

            // If meaningful time passed, reset buffer (it was manual typing)
            if (timeDiff > timeLimit && buffer.current.length > 0) {
                buffer.current = "";
            }

            lastKeyTime.current = currentTime;

            // Handle Enter key - end of scan
            if (e.key === "Enter") {
                if (buffer.current.length >= minLength) {
                    onScan(buffer.current);
                    buffer.current = "";
                    // Optional: prevent default behavior if needed, but careful with forms
                    // e.preventDefault(); 
                } else {
                    buffer.current = "";
                }
                return;
            }

            // Ignore special keys, only alphanumeric/printable
            if (e.key.length === 1) {
                buffer.current += e.key;
            }
        };

        // Attach to document to catch scans anywhere
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onScan, minLength, timeLimit]);
}




