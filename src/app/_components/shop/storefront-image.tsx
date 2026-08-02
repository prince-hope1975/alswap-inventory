"use client";

import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

type StorefrontImageProps = Omit<ImageProps, "src" | "unoptimized"> & {
  src: string;
};

function isCloudinaryImage(src: string) {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

export function StorefrontImage({
  src,
  alt,
  className,
  onError,
  onLoad,
  ...props
}: StorefrontImageProps) {
  const [useOriginal, setUseOriginal] = useState(!isCloudinaryImage(src));
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setUseOriginal(!isCloudinaryImage(src));
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} unavailable`}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#e7e4dc] px-4 text-center text-xs font-medium text-[#5c6870] dark:bg-gray-800 dark:text-gray-400"
      >
        <ImageOff aria-hidden="true" className="h-6 w-6" />
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <div
      aria-busy={!loaded}
      className={props.fill ? "absolute inset-0" : "relative inline-block"}
      style={props.fill ? { position: "absolute", inset: 0 } : undefined}
    >
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#dedbd3] via-[#efede7] to-[#d8d5ce] dark:from-gray-800 dark:via-gray-700 dark:to-gray-800"
        />
      )}
      <Image
        {...props}
        src={src}
        alt={alt}
        unoptimized={useOriginal}
        className={className}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          setLoaded(false);
          if (!useOriginal) {
            setUseOriginal(true);
            return;
          }
          setFailed(true);
          onError?.(event);
        }}
      />
    </div>
  );
}
