"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";

const signInSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInValues>({
        resolver: zodResolver(signInSchema),
    });

    const onSubmit = async (data: SignInValues) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password");
            } else {
                router.push("/inventory");
                router.refresh();
            }
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-900">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Sign in to Alswap
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Enter your credentials to access the inventory
                    </p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-200">
                        <AlertTriangle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            {...register("email")}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Password
                            </label>
                            <Link
                                href="/auth/forgot-password"
                                className="text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            {...register("password")}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Sign in
                    </button>

                    <div className="text-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                            Don&apos;t have an account?{" "}
                        </span>
                        <Link
                            href="/auth/signup"
                            className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400"
                        >
                            Sign up
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
