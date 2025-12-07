"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "~/trpc/react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const forgotPasswordMutation = api.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err) => {
      setError(err.message || "An unexpected error occurred");
    },
  });

  const onSubmit = (data: ForgotPasswordValues) => {
    setError(null);
    forgotPasswordMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your email to receive a reset link
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-200">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center gap-4 rounded-md bg-green-50 p-6 text-center text-green-700 dark:bg-green-900/30 dark:text-green-200">
              <CheckCircle className="h-12 w-12" />
              <div>
                <h3 className="text-lg font-medium">Check your email</h3>
                <p className="mt-2 text-sm">
                  We've sent a password reset link to your email address.
                </p>
              </div>
            </div>
            <Link
              href="/auth/signin"
              className="flex w-full justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
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
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={forgotPasswordMutation.isPending}
              className="flex w-full justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {forgotPasswordMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Send Reset Link
            </button>
          </form>
        )}

        <div className="text-center text-sm">
          <Link
            href="/auth/signin"
            className="flex items-center justify-center gap-2 font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

