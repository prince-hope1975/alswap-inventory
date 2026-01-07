import { env } from "~/env";

export interface StorageService {
    uploadImage(file: Blob): Promise<string>;
}

class CloudinaryStorageService implements StorageService {
    private cloudName: string;
    private uploadPreset: string;

    constructor() {
        this.cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        this.uploadPreset = env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    }

    async uploadImage(file: Blob): Promise<string> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", this.uploadPreset);
        // Apply server-side optimizations
        formData.append("transformation", "q_auto,f_auto,c_limit,w_1200,h_1200");

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error("Cloudinary upload failed:", error);
            throw new Error(error.error?.message || error.message || JSON.stringify(error) || "Failed to upload image");
        }

        const data = await response.json();
        return data.secure_url;
    }
}

// Future implementation for GCP
// class GcpStorageService implements StorageService { ... }

// Factory or Singleton
const storageService: StorageService = new CloudinaryStorageService();

export const uploadImage = (file: Blob) => storageService.uploadImage(file);

