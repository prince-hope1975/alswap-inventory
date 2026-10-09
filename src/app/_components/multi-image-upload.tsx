"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Cropper from "react-easy-crop";
import { type Point, type Area } from "react-easy-crop";
import { uploadImage } from "~/lib/storage";
import { compressImage } from "~/lib/compress-image";
import { Dialog } from "~/components/ui/dialog";
import { btnPrimary, btnSecondary } from "~/components/ui/styles";
import {
    Loader2,
    Check,
    X,
    Crop as CropIcon,
    Plus,
    Star,
} from "lucide-react";

const MAX_IMAGES = 10;
const RECOMMENDED_IMAGES = 5;

interface ImageItem {
    id: string;
    url: string;
    isUploading: boolean;
    progress: number;
    error?: string;
    isHeic?: boolean;
}

interface MultiImageUploadProps {
    /** Array of image URLs (first is primary) */
    value: string[];
    /** Called when images change */
    onChange: (urls: string[]) => void;
    /** Called on blur for form validation */
    onBlur?: () => void;
    /** Maximum number of images allowed */
    maxImages?: number;
    /** Reports whether any image is still uploading (disable form submit meanwhile). */
    onUploadingChange?: (uploading: boolean) => void;
}

export function MultiImageUpload({
    value = [],
    onChange,
    onBlur,
    maxImages = MAX_IMAGES,
    onUploadingChange,
}: MultiImageUploadProps) {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [cropState, setCropState] = useState<{
        imageId: string;
        imageSrc: string;
        crop: Point;
        zoom: number;
        croppedAreaPixels: Area | null;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const anyUploading = images.some((img) => img.isUploading);
    const onUploadingChangeRef = useRef(onUploadingChange);
    onUploadingChangeRef.current = onUploadingChange;
    useEffect(() => {
        onUploadingChangeRef.current?.(anyUploading);
    }, [anyUploading]);
    useEffect(() => () => onUploadingChangeRef.current?.(false), []);

    // Initialize images from value prop
    useEffect(() => {
        const existingUrls = new Set(images.map((img) => img.url));
        const valueUrls = new Set(value);

        // Only update if there's a difference
        if (
            value.length !== images.filter((img) => !img.isUploading).length ||
            value.some((url) => !existingUrls.has(url))
        ) {
            const newImages: ImageItem[] = value.map((url, index) => ({
                id: `existing-${index}-${url.slice(-10)}`,
                url,
                isUploading: false,
                progress: 100,
            }));
            // Keep any currently uploading images
            const uploadingImages = images.filter((img) => img.isUploading);
            setImages([...newImages, ...uploadingImages]);
        }
    }, [value]);

    // Sync changes back to parent
    const syncToParent = useCallback(
        (newImages: ImageItem[]) => {
            const urls = newImages
                .filter((img) => !img.isUploading && img.url)
                .map((img) => img.url);
            onChange(urls);
        },
        [onChange]
    );

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener("load", () => resolve(image));
            image.addEventListener("error", () => reject(new Error("Could not load image")));
            image.setAttribute("crossOrigin", "anonymous");
            image.src = url;
        });

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: Area
    ): Promise<Blob> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            throw new Error("No 2d context");
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Canvas is empty"));
                    return;
                }
                resolve(blob);
            }, "image/jpeg");
        });
    };

    const processAndUpload = async (file: File): Promise<string> => {
        // Compress the image first
        const compressedFile = await compressImage(file);
        // Upload compressed image
        const url = await uploadImage(compressedFile);
        return url;
    };

    const handleFiles = useCallback(
        async (files: File[]) => {
            const currentCount = images.filter((img) => !img.error).length;
            const availableSlots = maxImages - currentCount;

            if (availableSlots <= 0) {
                return;
            }

            const filesToProcess = files.slice(0, availableSlots);

            // Create placeholder items for uploading images
            const newItems: ImageItem[] = filesToProcess.map((file, index) => {
                const isHeic = file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
                return {
                    id: `upload-${Date.now()}-${index}`,
                    url: isHeic ? "" : URL.createObjectURL(file),
                    isUploading: true,
                    progress: 0,
                    isHeic,
                };
            });

            setImages((prev) => [...prev, ...newItems]);

            // Process each file
            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];
                const itemId = newItems[i]!.id;

                try {
                    // Update progress
                    setImages((prev) =>
                        prev.map((img) =>
                            img.id === itemId ? { ...img, progress: 30 } : img
                        )
                    );

                    const url = await processAndUpload(file!);

                    // Update with final URL
                    setImages((prev) => {
                        const updated = prev.map((img) =>
                            img.id === itemId
                                ? { ...img, url, isUploading: false, progress: 100 }
                                : img
                        );
                        syncToParent(updated);
                        return updated;
                    });
                } catch (error) {
                    console.error("Failed to upload image", error);
                    setImages((prev) =>
                        prev.map((img) =>
                            img.id === itemId
                                ? {
                                    ...img,
                                    isUploading: false,
                                    error: error instanceof Error ? error.message : "Upload failed"
                                }
                                : img
                        )
                    );
                }
            }
        },
        [images, maxImages, syncToParent]
    );

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            void handleFiles(acceptedFiles);
        },
        [handleFiles]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"],
        },
        multiple: true,
        noClick: true,
    });

    const handleRemove = (id: string) => {
        setImages((prev) => {
            const updated = prev.filter((img) => img.id !== id);
            syncToParent(updated);
            return updated;
        });
    };

    const handleSetPrimary = (id: string) => {
        setImages((prev) => {
            const index = prev.findIndex((img) => img.id === id);
            if (index <= 0) return prev;

            const updated = [...prev];
            const [item] = updated.splice(index, 1);
            updated.unshift(item!);
            syncToParent(updated);
            return updated;
        });
    };

    const handleStartCrop = (id: string, url: string) => {
        setCropState({
            imageId: id,
            imageSrc: url,
            crop: { x: 0, y: 0 },
            zoom: 1,
            croppedAreaPixels: null,
        });
    };

    const handleCropSave = async () => {
        if (!cropState?.croppedAreaPixels) return;

        const { imageId, imageSrc, croppedAreaPixels } = cropState;

        // Mark as uploading
        setImages((prev) =>
            prev.map((img) =>
                img.id === imageId ? { ...img, isUploading: true, progress: 0 } : img
            )
        );

        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            const croppedFile = new File([croppedBlob], "cropped.jpg", {
                type: "image/jpeg",
            });
            const url = await processAndUpload(croppedFile);

            setImages((prev) => {
                const updated = prev.map((img) =>
                    img.id === imageId
                        ? { ...img, url, isUploading: false, progress: 100 }
                        : img
                );
                syncToParent(updated);
                return updated;
            });
        } catch (error) {
            console.error("Failed to crop/upload", error);
            setImages((prev) =>
                prev.map((img) =>
                    img.id === imageId
                        ? { ...img, isUploading: false, error: "Crop failed" }
                        : img
                )
            );
        }

        setCropState(null);
    };

    const availableSlots = maxImages - images.filter((img) => !img.error).length;

    return (
        <div className="w-full" {...getRootProps()}>
            <input {...getInputProps()} ref={fileInputRef} onBlur={onBlur} />

            {/* Crop dialog (portalled, so it sits outside the dropzone and form DOM) */}
            <Dialog
                open={!!cropState}
                onClose={() => setCropState(null)}
                title="Crop image"
                closeLabel="Close crop dialog"
                className="max-w-2xl"
                bodyClassName="p-0"
            >
                {cropState && (
                    <>
                        <div className="relative h-[min(380px,55dvh)] w-full bg-black">
                            <Cropper
                                image={cropState.imageSrc}
                                crop={cropState.crop}
                                zoom={cropState.zoom}
                                aspect={1}
                                onCropChange={(crop) =>
                                    setCropState((prev) => (prev ? { ...prev, crop } : null))
                                }
                                onCropComplete={(_, croppedAreaPixels) =>
                                    setCropState((prev) =>
                                        prev ? { ...prev, croppedAreaPixels } : null
                                    )
                                }
                                onZoomChange={(zoom) =>
                                    setCropState((prev) => (prev ? { ...prev, zoom } : null))
                                }
                            />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                            <label className="flex min-w-40 flex-1 items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                Zoom
                                <input
                                    type="range"
                                    value={cropState.zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    onChange={(e) =>
                                        setCropState((prev) =>
                                            prev ? { ...prev, zoom: Number(e.target.value) } : null
                                        )
                                    }
                                    className="h-2 w-full cursor-pointer accent-[var(--brand-primary-600)]"
                                />
                            </label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setCropState(null)} className={btnSecondary}>
                                    Cancel
                                </button>
                                <button type="button" onClick={() => void handleCropSave()} className={btnPrimary}>
                                    <Check className="h-4 w-4" aria-hidden="true" />
                                    Save
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </Dialog>

            {/* Thumbnail Grid */}
            <div
                className={`rounded-lg border-2 border-dashed p-3 transition-colors ${isDragActive
                    ? "border-[var(--brand-primary-500)] bg-[var(--brand-primary-50)] dark:bg-[var(--brand-primary-900)]/20"
                    : "border-gray-200 dark:border-gray-700"
                    }`}
            >
                <div className="flex flex-wrap gap-3">
                    {/* Image Thumbnails */}
                    {images.map((image, index) => (
                        <div
                            key={image.id}
                            className={`group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${index === 0
                                ? "border-[var(--brand-primary-500)] ring-2 ring-[var(--brand-primary-200)] dark:ring-[var(--brand-primary-800)]"
                                : "border-gray-200 dark:border-gray-700"
                                } ${image.error ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-800"}`}
                        >
                            {/* Image Preview */}
                            {!image.error && image.url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={image.url}
                                    alt={`Product image ${index + 1}`}
                                    className="h-full w-full object-cover"
                                />
                            )}

                            {/* Error State */}
                            {image.error && (
                                <div className="flex h-full flex-col items-center justify-center p-1 text-center" title={image.error}>
                                    <X className="h-6 w-6 text-red-500" />
                                    <span className="text-[10px] text-red-500 line-clamp-2 leading-tight">{image.error}</span>
                                </div>
                            )}

                            {/* Loading Overlay */}
                            {image.isUploading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-1 text-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                                    {image.isHeic && (
                                        <span className="mt-1 text-[10px] leading-tight text-white">
                                            Converting...
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Primary Badge */}
                            {index === 0 && !image.isUploading && !image.error && (
                                <div className="absolute left-1 top-1 rounded-full bg-[var(--brand-primary-500)] p-1 shadow-md">
                                    <Star className="h-3 w-3 fill-white text-white" />
                                </div>
                            )}

                            {/* Actions: shown on hover, on keyboard focus, and always on touch screens */}
                            {!image.isUploading && !image.error && (
                                <div className="absolute inset-0 flex items-end justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent pb-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                                    {/* Set Primary */}
                                    {index !== 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleSetPrimary(image.id)}
                                            aria-label={`Make image ${index + 1} the main image`}
                                            className="rounded-full bg-white/90 p-1.5 text-gray-700 transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                                        >
                                            <Star className="h-3.5 w-3.5" aria-hidden="true" />
                                        </button>
                                    )}

                                    {/* Crop */}
                                    <button
                                        type="button"
                                        onClick={() => handleStartCrop(image.id, image.url)}
                                        aria-label={`Crop image ${index + 1}`}
                                        className="rounded-full bg-white/90 p-1.5 text-gray-700 transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                                    >
                                        <CropIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>

                                    {/* Remove */}
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(image.id)}
                                        aria-label={`Remove image ${index + 1}`}
                                        className="rounded-full bg-white/90 p-1.5 text-red-600 transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                                    >
                                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>
                                </div>
                            )}

                            {/* Remove button for errors */}
                            {image.error && (
                                <button
                                    type="button"
                                    onClick={() => handleRemove(image.id)}
                                    aria-label={`Remove failed image ${index + 1}`}
                                    className="absolute right-1 top-1 rounded-full bg-white p-1 shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none"
                                >
                                    <X className="h-3 w-3 text-red-600" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Add Button */}
                    {availableSlots > 0 && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            aria-label="Add images"
                            className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-[var(--brand-primary-400)] hover:text-[var(--brand-primary-500)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none dark:border-gray-600 dark:hover:border-[var(--brand-primary-500)]"
                        >
                            <Plus className="h-6 w-6" />
                            <span className="mt-0.5 text-xs">Add</span>
                        </button>
                    )}
                </div>

                {/* Help Text */}
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                        {images.length === 0
                            ? "Drag images here or use Add"
                            : `${images.filter((i) => !i.error).length}/${maxImages} images`}
                        {images.length > 0 &&
                            images.length < RECOMMENDED_IMAGES &&
                            ` (${RECOMMENDED_IMAGES} recommended)`}
                    </span>
                    {images.length > 0 && (
                        <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-[var(--brand-primary-500)] text-[var(--brand-primary-500)]" aria-hidden="true" />
                            Main image
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
