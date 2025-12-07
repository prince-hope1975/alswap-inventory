"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "~/trpc/react";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const resetPasswordMutation = api.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
    },
    onError: (err) => {
      setError(err.message || "Invalid or expired token");
    },
  });

  const onSubmit = (data: ResetPasswordValues) => {
    if (!token) {
      setError("Missing reset token");
      return;
    }
    setError(null);
    resetPasswordMutation.mutate({
      token,
      password: data.password,
    });
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              Invalid Link
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              This password reset link is invalid or missing the token.
            </p>
            <Link
              href="/auth/forgot-password"
              className="mt-6 inline-block rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Set New Password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Please enter your new password below
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-200">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-md bg-green-50 p-6 text-center text-green-700 dark:bg-green-900/30 dark:text-green-200">
            <CheckCircle className="h-12 w-12" />
            <div>
              <h3 className="text-lg font-medium">Password Reset Successful</h3>
              <p className="mt-2 text-sm">
                Your password has been updated. Redirecting to sign in...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                New Password
              </label>
              <input
                id="password"
                type="password"
                {...register("password")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={resetPasswordMutation.isPending}
              className="flex w-full justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetPasswordMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}

