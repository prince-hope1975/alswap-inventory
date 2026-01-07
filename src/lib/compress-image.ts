import imageCompression from "browser-image-compression";

export interface CompressionOptions {
    /** Maximum file size in MB (default: 0.2 = 200KB) */
    maxSizeMB?: number;
    /** Maximum width or height in pixels (default: 1200) */
    maxWidthOrHeight?: number;
    /** Use web worker for compression (default: true) */
    useWebWorker?: boolean;
}

/**
 * Compresses an image file to target size (default 200KB)
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<File> {
    const {
        maxSizeMB = 0.2, // 200KB default
        maxWidthOrHeight = 1200,
        useWebWorker = true,
    } = options;

    // Skip compression if file is already under target size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB <= maxSizeMB) {
        console.log(`File already under ${maxSizeMB * 1000}KB, skipping compression`);
        return file;
    }

    console.log(`Compressing ${file.name}: ${(fileSizeMB * 1024).toFixed(0)}KB → target ${maxSizeMB * 1000}KB`);

    const compressedFile = await imageCompression(file, {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker,
        fileType: "image/jpeg", // Convert to JPEG for better compression
        initialQuality: 0.85,
    });

    const compressedSizeMB = compressedFile.size / (1024 * 1024);
    console.log(`Compressed ${file.name}: ${(compressedSizeMB * 1024).toFixed(0)}KB`);

    return compressedFile;
}

/**
 * Compresses multiple images in parallel
 * @param files - Array of image files
 * @param options - Compression options
 * @param onProgress - Callback for progress updates
 * @returns Array of compressed files
 */
export async function compressImages(
    files: File[],
    options: CompressionOptions = {},
    onProgress?: (completed: number, total: number) => void
): Promise<File[]> {
    let completed = 0;
    const total = files.length;

    const results = await Promise.all(
        files.map(async (file) => {
            const compressed = await compressImage(file, options);
            completed++;
            onProgress?.(completed, total);
            return compressed;
        })
    );

    return results;
}
