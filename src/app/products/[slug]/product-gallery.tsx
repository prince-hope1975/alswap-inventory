"use client";

import { useState } from "react";

import { StorefrontImage } from "~/app/_components/shop/storefront-image";

/** Main image plus thumbnails that swap it, like the quick-look modal. */
export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-[2rem] border border-stone-300 bg-white dark:border-white/10">
        {current ? (
          <div className="relative h-full w-full">
            <StorefrontImage
              src={current}
              alt={index === 0 ? name : `${name} view ${index + 1}`}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={index === 0}
              className="object-contain p-8"
            />
          </div>
        ) : (
          <div className="grid h-full place-items-center text-stone-400">
            Product image coming soon
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {images.slice(0, 10).map((image, i) => (
            <button
              key={image}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-current={i === index}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-white transition focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none ${
                i === index
                  ? "border-amber-600"
                  : "border-stone-300 hover:border-stone-500 dark:border-white/10 dark:hover:border-white/30"
              }`}
            >
              <StorefrontImage
                src={image}
                alt=""
                fill
                sizes="12vw"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
