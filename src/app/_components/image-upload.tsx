"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Cropper from "react-easy-crop";
import { type Point, type Area } from "react-easy-crop";
import { api } from "~/trpc/react";
import { uploadImage } from "~/lib/storage";
import { Image as ImageIcon, Loader2, Check, X, Crop as CropIcon, Upload } from "lucide-react";

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    onBlur?: () => void;
}

export function ImageUpload({ value, onChange, onBlur }: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(value || null);
    
    // Sync preview with value prop changes (e.g. when data is loaded)
    useEffect(() => {
        setPreview(value || null);
    }, [value]);

    const [isUploading, setIsUploading] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [urlInput, setUrlInput] = useState("");
    
    // Cropping state
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

    const validateMutation = api.inventory.validateImageUrl.useMutation();

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener("load", () => resolve(image));
            image.addEventListener("error", (error) => reject(error));
            image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
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

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            if (file) {
              const reader = new FileReader();
              reader.addEventListener("load", () => {
                  setImageToCrop(reader.result as string);
                  setIsCropping(true);
              });
              reader.readAsDataURL(file);
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".png", ".jpg", ".jpeg", ".webp"],
        },
        multiple: false,
    });

    const handleCropSave = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;

        try {
            setIsUploading(true);
            const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            const url = await uploadImage(croppedImageBlob);
            
            onChange(url);
            setPreview(url);
            setIsCropping(false);
            setImageToCrop(null);
        } catch (error) {
            console.error("Failed to crop/upload image", error);
            alert("Failed to process image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleUrlVerify = async () => {
        if (!urlInput) return;

        setIsValidating(true);
        try {
            const result = await validateMutation.mutateAsync({ url: urlInput });
            if (result.isValid) {
                onChange(urlInput);
                setPreview(urlInput);
                setUrlInput("");
            } else {
                alert(result.error || "Invalid image URL");
            }
        } catch (error) {
            console.error("Validation error", error);
            alert("Failed to validate URL");
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div className="w-full space-y-4">
            {/* Crop Modal */}
            {isCropping && imageToCrop && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="relative h-[500px] w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800">
                        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between rounded-t-lg bg-white p-4 px-6 shadow-sm dark:bg-gray-800">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Crop Image</h3>
                            <button
                                onClick={() => setIsCropping(false)}
                                className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="relative h-[380px] w-full bg-black">
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <div className="flex w-1/2 items-center gap-2">
                                <span className="text-sm text-gray-500">Zoom</span>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsCropping(false)}
                                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCropSave}
                                    disabled={isUploading}
                                    className="inline-flex items-center gap-2 rounded-md bg-[var(--brand-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Upload UI */}
            <div className="flex gap-6">
                {/* Preview Box */}
                <div className="relative flex h-32 w-32 flex-none items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={preview}
                            alt="Preview"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <ImageIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                    )}
                    {preview && (
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setPreview(null);
                            }}
                            className="absolute right-1 top-1 rounded-full bg-white/80 p-1 text-gray-600 hover:bg-white hover:text-red-600 shadow-sm"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>

                <div className="flex-1 space-y-4">
                    {/* Drag & Drop Area */}
                    <div
                        {...getRootProps()}
                        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-4 transition-colors ${
                            isDragActive
                                ? "border-[var(--brand-primary-500)] bg-[var(--brand-primary-50)] dark:bg-[var(--brand-primary-900)]/20"
                                : "border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
                        }`}
                    >
                        <input {...getInputProps()} onBlur={onBlur} />
                        <Upload className="mb-2 h-6 w-6 text-gray-400" />
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-[var(--brand-primary-600)]">Click to upload</span> or
                            drag and drop
                        </p>
                        <p className="mt-1 text-xs text-gray-400">SVG, PNG, JPG or GIF</p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-2 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                                or
                            </span>
                        </div>
                    </div>

                    {/* URL Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="Paste image URL"
                            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--brand-primary-500)] focus:outline-none focus:ring-[var(--brand-primary-focus)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                            type="button"
                            onClick={handleUrlVerify}
                            disabled={isValidating || !urlInput}
                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-500)] focus:ring-offset-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            {isValidating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Verify"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

