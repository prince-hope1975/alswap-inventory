"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";

interface ArticleFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  authorName: string;
  isPublished: boolean;
}

const emptyForm: ArticleFormData = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  authorName: "",
  isPublished: false,
};

export default function ArticlesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleFormData>(emptyForm);

  const utils = api.useUtils();
  const { data, isLoading, refetch } = api.articles.listArticles.useQuery({
    limit: 100,
  });

  const createArticle = api.articles.createArticle.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.articles.listArticles.invalidate();
      resetForm();
    },
  });

  const updateArticle = api.articles.updateArticle.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.articles.listArticles.invalidate();
      resetForm();
    },
  });

  const deleteArticle = api.articles.deleteArticle.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.articles.listArticles.invalidate();
    },
  });

  const articles = data?.articles ?? [];

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (article: (typeof articles)[number]) => {
    setForm({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt ?? "",
      content: article.content ?? "",
      coverImage: article.coverImage ?? "",
      authorName: article.authorName ?? "",
      isPublished: article.isPublished,
    });
    setEditingId(article.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateArticle.mutate({ id: editingId, ...form });
    } else {
      createArticle.mutate(form);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Articles
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage blog posts and articles for your storefront
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-[var(--brand-primary-600)] px-4 py-2 text-white transition-colors hover:bg-[var(--brand-primary-700)]"
        >
          <Plus className="h-5 w-5" />
          New Article
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">
            {editingId ? "Edit Article" : "New Article"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm({
                      ...form,
                      title,
                      slug: generateSlug(title),
                    });
                  }}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--brand-primary-500)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--brand-primary-500)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Author Name
                </label>
                <input
                  type="text"
                  value={form.authorName}
                  onChange={(e) =>
                    setForm({ ...form, authorName: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--brand-primary-500)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={form.coverImage}
                  onChange={(e) =>
                    setForm({ ...form, coverImage: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--brand-primary-500)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Excerpt
              </label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--brand-primary-500)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Content
              </label>
              <p className="mb-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                Formatting: <code>## Heading</code>, <code>### Subheading</code>
                , <code>- List item</code>, <code>[link](https://...)</code>,{" "}
                <code>![alt](https://...)</code>, and pipe tables.
              </p>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={10}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--brand-primary-500)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublished"
                checked={form.isPublished}
                onChange={(e) =>
                  setForm({ ...form, isPublished: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-[var(--brand-primary-600)] focus:ring-[var(--brand-primary-500)]"
              />
              <label
                htmlFor="isPublished"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Publish immediately
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createArticle.isPending || updateArticle.isPending}
                className="rounded-lg bg-[var(--brand-primary-600)] px-6 py-2 text-white transition-colors hover:bg-[var(--brand-primary-700)] disabled:opacity-50"
              >
                {editingId ? "Update Article" : "Create Article"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg bg-gray-100 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Loading articles...
          </p>
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No articles yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {articles.map((article) => (
            <div
              key={article.id}
              className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {article.title}
                    </h3>
                    {article.isPublished ? (
                      <span className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <Eye className="h-3 w-3" />
                        Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        <EyeOff className="h-3 w-3" />
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    /{article.slug}
                  </p>
                  {article.excerpt && (
                    <p className="mb-3 text-gray-600 dark:text-gray-400">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    {article.authorName && <span>By {article.authorName}</span>}
                    <span>
                      Created {new Date(article.createdAt).toLocaleDateString()}
                    </span>
                    {article.publishedAt && (
                      <span>
                        Published{" "}
                        {new Date(article.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(article)}
                    className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    title="Edit"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm("Are you sure you want to delete this article?")
                      ) {
                        deleteArticle.mutate({ id: article.id });
                      }
                    }}
                    disabled={deleteArticle.isPending}
                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
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
