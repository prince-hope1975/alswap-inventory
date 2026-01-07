import imageCompression from "browser-image-compression";
import heic2any from "heic2any";

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

    let fileToCompress = file;

    // Convert HEIC/HEIF to JPEG first
    if (
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif")
    ) {
        console.log(`Converting HEIC file: ${file.name}`);
        try {
            const convertedBlob = await heic2any({
                blob: file,
                toType: "image/jpeg",
                quality: 0.85,
            });

            const jpegBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            fileToCompress = new File([jpegBlob as Blob], newName, { type: "image/jpeg" });

            console.log(`Converted to JPEG: ${fileToCompress.name}`);
        } catch (error) {
            console.error("HEIC conversion failed, skipping compression to avoid crash:", error);
            // Return original file so we can determine what to do (e.g. try uploading original)
            // proceeding to imageCompression with HEIC will crash it, so we stop here.
            return file;
        }
    }

    // Skip compression if file is already under target size
    const fileSizeMB = fileToCompress.size / (1024 * 1024);
    if (fileSizeMB <= maxSizeMB) {
        console.log(`File already under ${maxSizeMB * 1000}KB, skipping compression`);
        return fileToCompress;
    }

    console.log(`Compressing ${fileToCompress.name}: ${(fileSizeMB * 1024).toFixed(0)}KB → target ${maxSizeMB * 1000}KB`);

    try {
        const compressedFile = await imageCompression(fileToCompress, {
            maxSizeMB,
            maxWidthOrHeight,
            useWebWorker,
            fileType: "image/jpeg", // Convert to JPEG for better compression
            initialQuality: 0.85,
        });

        const compressedSizeMB = compressedFile.size / (1024 * 1024);
        console.log(`Compressed ${fileToCompress.name}: ${(compressedSizeMB * 1024).toFixed(0)}KB`);

        return compressedFile;
    } catch (error) {
        console.error("Image compression failed, returning original:", error);
        return fileToCompress;
    }
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
