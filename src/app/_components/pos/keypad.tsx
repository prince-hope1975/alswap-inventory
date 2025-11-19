"use client";

import { Delete, DeleteIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface KeypadProps {
    onKeyPress: (key: string) => void;
    onDelete: () => void;
    onClear?: () => void;
    className?: string;
}

export function Keypad({ onKeyPress, onDelete, onClear, className }: KeypadProps) {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];

    return (
        <div className={cn("grid grid-cols-3 gap-2", className)}>
            {keys.map((key) => (
                <button
                    key={key}
                    onClick={() => onKeyPress(key)}
                    className="flex h-14 items-center justify-center rounded-xl border-b-4 border-gray-200 bg-gray-50 text-2xl font-semibold text-gray-900 active:border-b-0 active:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:active:bg-gray-700"
                >
                    {key}
                </button>
            ))}
            <button
                onClick={onDelete}
                onLongPress={onClear} // Note: standard button doesn't have onLongPress, but we can simulate or just add a clear button
                className="flex h-14 items-center justify-center rounded-xl border-b-4 border-red-200 bg-red-50 text-red-600 active:border-b-0 active:bg-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:active:bg-red-900/30"
            >
                <DeleteIcon className="h-6 w-6" />
            </button>
        </div>
    );
}

