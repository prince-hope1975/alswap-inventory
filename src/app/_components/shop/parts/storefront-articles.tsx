"use client";

import { api } from "~/trpc/react";
import { Calendar, User } from "lucide-react";

interface StorefrontArticlesProps {
  limit?: number;
}

export function StorefrontArticles({ limit = 6 }: StorefrontArticlesProps) {
  const { data, isLoading } = api.articles.getPublishedArticles.useQuery({
    limit,
  });

  const articles = data?.articles ?? [];

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Latest Articles
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(limit)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse"
              >
                <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
                <div className="p-6 space-y-3">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          Latest Articles
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
          Discover tips, insights, and stories from our team
        </p>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <article
              key={article.id}
              className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
            >
              {article.coverImage && (
                <div className="aspect-video overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-[var(--brand-primary-600)] dark:group-hover:text-[var(--brand-primary-400)] transition-colors">
                  {article.title}
                </h3>

                {article.excerpt && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                  {article.authorName && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{article.authorName}</span>
                    </div>
                  )}
                  {article.publishedAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
