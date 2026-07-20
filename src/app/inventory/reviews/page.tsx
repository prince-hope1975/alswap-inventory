"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { CheckCircle, XCircle, Trash2, Star } from "lucide-react";

export default function ReviewsPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  const { data, isLoading, refetch } = api.reviews.listReviews.useQuery({
    isApproved: filter === "all" ? undefined : filter === "approved",
    limit: 100,
  });

  const approveReview = api.reviews.approveReview.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const deleteReview = api.reviews.deleteReview.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const reviews = data?.reviews ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Reviews</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage and moderate customer product reviews
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === "all"
              ? "bg-[var(--brand-primary-600)] text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          All ({data?.total ?? 0})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === "pending"
              ? "bg-[var(--brand-primary-600)] text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Pending Approval
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === "approved"
              ? "bg-[var(--brand-primary-600)] text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Approved
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < review.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-200 dark:text-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {review.customerName}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {review.customerEmail}
                    </span>
                    {!review.isApproved && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded">
                        Pending
                      </span>
                    )}
                    {review.isApproved && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">
                        Approved
                      </span>
                    )}
                  </div>

                  {review.product && (
                    <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      {review.product.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={review.product.image}
                          alt={review.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {review.product.name}
                      </span>
                    </div>
                  )}

                  {review.title && (
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {review.title}
                    </h3>
                  )}
                  {review.body && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{review.body}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(review.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  {!review.isApproved && (
                    <button
                      onClick={() => approveReview.mutate({ id: review.id })}
                      disabled={approveReview.isPending}
                      className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Approve"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this review?")) {
                        deleteReview.mutate({ id: review.id });
                      }
                    }}
                    disabled={deleteReview.isPending}
                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
